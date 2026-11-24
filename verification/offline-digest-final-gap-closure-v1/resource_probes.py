"""Bounded Windows Job children + independent streamed byte/frame comparison.
No application calls. On unavailable limits/measurement, report UNVERIFIED, do not
fall back to uncontrolled heavy work. Every process handles one finite fixture.
"""
import ctypes
from ctypes import wintypes
import hashlib
import json
import os
from pathlib import Path
import platform
import struct
import subprocess
import sys
import threading
import time

HERE = Path(__file__).resolve().parent
SPEC = json.loads((HERE.parent / 'offline-digest-preimplementation-v1' / 'schemas-and-registry.proposed.json').read_text(encoding='utf-8'))
B, D = SPEC['budgets'], SPEC['domains']
MEMORY_BYTES, WALL_SECONDS = 384 * 1024 * 1024, 15


class Basic(ctypes.Structure):
    _fields_ = [('ProcessTime', ctypes.c_int64), ('JobTime', ctypes.c_int64), ('Flags', wintypes.DWORD),
                ('MinWS', ctypes.c_size_t), ('MaxWS', ctypes.c_size_t), ('Active', wintypes.DWORD),
                ('Affinity', ctypes.c_size_t), ('Priority', wintypes.DWORD), ('Scheduling', wintypes.DWORD)]


class IO(ctypes.Structure):
    _fields_ = [(name, ctypes.c_uint64) for name in ('ReadOps', 'WriteOps', 'OtherOps', 'ReadBytes', 'WriteBytes', 'OtherBytes')]


class Extended(ctypes.Structure):
    _fields_ = [('Basic', Basic), ('IO', IO), ('ProcessMemory', ctypes.c_size_t), ('JobMemory', ctypes.c_size_t), ('PeakProcess', ctypes.c_size_t), ('PeakJob', ctypes.c_size_t)]


class Memory(ctypes.Structure):
    _fields_ = [('cb', wintypes.DWORD), ('PageFaultCount', wintypes.DWORD)] + [(name, ctypes.c_size_t) for name in ('PeakWorkingSetSize', 'WorkingSetSize', 'QuotaPeakPagedPoolUsage', 'QuotaPagedPoolUsage', 'QuotaPeakNonPagedPoolUsage', 'QuotaNonPagedPoolUsage', 'PagefileUsage', 'PeakPagefileUsage')]


def jobs():
    if os.name != 'nt': raise RuntimeError('Windows Job memory control unavailable')
    kernel = ctypes.WinDLL('kernel32', use_last_error=True)
    kernel.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]; kernel.CreateJobObjectW.restype = wintypes.HANDLE
    kernel.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]; kernel.SetInformationJobObject.restype = wintypes.BOOL
    kernel.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]; kernel.AssignProcessToJobObject.restype = wintypes.BOOL
    kernel.CloseHandle.argtypes = [wintypes.HANDLE]
    kernel.TerminateJobObject.argtypes = [wintypes.HANDLE, wintypes.UINT]
    job = kernel.CreateJobObjectW(None, None)
    info = Extended(); info.Basic.Flags = 0x100 | 0x2000; info.ProcessMemory = MEMORY_BYTES
    if not job or not kernel.SetInformationJobObject(job, 9, ctypes.byref(info), ctypes.sizeof(info)): raise RuntimeError('Job limit setup failed: ' + str(ctypes.get_last_error()))
    psapi = ctypes.WinDLL('psapi', use_last_error=True)
    psapi.GetProcessMemoryInfo.argtypes = [wintypes.HANDLE, ctypes.POINTER(Memory), wintypes.DWORD]; psapi.GetProcessMemoryInfo.restype = wintypes.BOOL
    return kernel, psapi, job


def quoted_string_parts(size, fill=b'x'):
    yield b'["string","'
    while size:
        amount = min(size, 65536); yield fill * amount; size -= amount
    yield b'"]'


def exact_array_parts(size):
    # Independently derive overhead by the actual constant tokens, not worker bytes.
    count = 4
    fixed = len(b'["array",[') + len(b']]') + (count - 1) + count * (len(b'["string","') + len(b'"]'))
    rest = size - fixed
    yield b'["array",['
    for i in range(count):
        if i: yield b','
        amount = min(B['stringBytes'], rest); yield from quoted_string_parts(amount); rest -= amount
    assert rest == 0
    yield b']]'


def repeated_byte(size):
    while size:
        amount = min(65536, size); yield b'a' * amount; size -= amount


def canonical_parts(metric, n):
    if metric in ('snapshotBytes', 'coreBytes'): yield from exact_array_parts(n); return
    if metric == 'depth':
        for _ in range(n - 1): yield b'["array",['
        yield b'["null"]'
        for _ in range(n - 1): yield b']]'
    elif metric == 'nodes':
        yield b'["array",['; remaining = n - 51
        for i in range(50):
            if i: yield b','
            yield b'["array",['; amount = min(1000, remaining); remaining -= amount
            for j in range(amount):
                if j: yield b','
                yield b'["null"]'
            yield b']]'
        assert remaining == 0
        yield b']]'
    elif metric == 'members':
        yield b'["object",['
        for i in range(n):
            if i: yield b','
            yield ('["k%04d",["null"]]' % i).encode('ascii')
        yield b']]'
    elif metric == 'entries':
        yield b'["array",['
        for i in range(n):
            if i: yield b','
            yield b'["null"]'
        yield b']]'
    elif metric == 'keyBytes': yield b'["object",[["' + b'k' * n + b'",["null"]]]]'
    elif metric == 'stringBytes': yield from quoted_string_parts(n)
    elif metric == 'bigintDigits': yield b'["bigint","' + b'9' * n + b'"]'


def components(metric, value):
    # Each entry supplies exact bytes independently; no worker frame is reused.
    if metric in ('pdfBytes', 'assetBytes'): return [(metric, D['pdf' if metric == 'pdfBytes' else 'asset'], value, lambda: repeated_byte(value))]
    if metric == 'assets': return [('asset-' + str(i), D['asset'], 1, lambda: iter((b'a',))) for i in range(value)]
    if metric == 'packageBytes':
        result = []
        for name, length in [('snapshot', B['snapshotBytes']), ('assets', B['coreBytes']), ('party', B['coreBytes']), ('root', B['coreBytes'])]:
            result.append((name, D[name], length, lambda size=length: exact_array_parts(size)))
        result.append(('pdf', D['pdf'], B['pdfBytes'], lambda: repeated_byte(B['pdfBytes'])))
        remaining = value - B['snapshotBytes'] - 3 * B['coreBytes'] - B['pdfBytes']; index = 0
        while remaining:
            amount = min(B['assetBytes'], remaining)
            result.append(('asset-' + str(index), D['asset'], amount, lambda size=amount: repeated_byte(size)))
            index += 1; remaining -= amount
        return result
    native_metric, native_value = ('nodes', value - 9) if metric == 'contextNodes' else (metric, value)
    length = sum(len(piece) for piece in canonical_parts(native_metric, native_value))
    return [(metric, D['snapshot'], length, lambda: canonical_parts(native_metric, native_value))]


def compare_witness(row, witness):
    definitions = components(row['metric'], row['value'])
    if len(definitions) != len(row['components']): raise ValueError('Component count mismatch')
    total = 0
    with witness.open('rb') as stream:
        for (name, domain, size, pieces), observed in zip(definitions, row['components']):
            tag = domain.encode('utf-8')
            prefix = b'CONTRATPRO-DIGEST\x00' + struct.pack('>I', len(tag)) + tag + struct.pack('>Q', size)
            digest = hashlib.sha256()
            if stream.read(len(prefix)) != prefix: raise ValueError('Independent frame prefix mismatch')
            digest.update(prefix); actual_size = 0
            for expected in pieces():
                if stream.read(len(expected)) != expected: raise ValueError('Independent payload byte mismatch')
                digest.update(expected); actual_size += len(expected)
            if actual_size != size or observed['name'] != name or observed['domain'] != domain or observed['payloadBytes'] != size or observed['digest'] != digest.hexdigest(): raise ValueError('Component length/digest mismatch')
            total += len(prefix) + size
        if stream.read(1) or total != row['witnessBytes']: raise ValueError('Witness trailing bytes/length mismatch')
    return total


rows = []
witness = HERE / 'resource-witness.bin'
initial = HERE / 'resource-initial-report.json'
if (HERE / 'resource-report.json').exists() and not initial.exists(): initial.write_bytes((HERE / 'resource-report.json').read_bytes())
for metric, cap in [*B.items(), ('contextNodes', B['nodes'])]:
    for offset in (-1, 0, 1):
        value = cap + offset; started = time.monotonic(); child = None; kernel = job = None
        row = dict(metric=metric, value=value, cap=cap, offset=offset, memoryLimitBytes=MEMORY_BYTES, wallLimitSeconds=WALL_SECONDS)
        try:
            if witness.exists(): witness.unlink()  # fixed new-directory transient path only
            kernel, psapi, job = jobs()
            child = subprocess.Popen(['node', '--max-old-space-size=128', 'resource-worker.mjs'], cwd=HERE, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if not kernel.AssignProcessToJobObject(job, wintypes.HANDLE(child._handle)): raise RuntimeError('Job assignment failed: ' + str(ctypes.get_last_error()))
            captures, output_overflow = {'out': [], 'err': []}, threading.Event()

            def drain(pipe, key):
                length = 0
                while True:
                    chunk = pipe.read(4096)
                    if not chunk: break
                    length += len(chunk)
                    if length > 262144: output_overflow.set(); break
                    captures[key].append(chunk)

            readers = [threading.Thread(target=drain, args=(child.stdout, 'out'), daemon=True), threading.Thread(target=drain, args=(child.stderr, 'err'), daemon=True)]
            for thread in readers: thread.start()
            # No workload is admitted until memory controls have been attached.
            child.stdin.write(json.dumps(dict(metric=metric, value=value)) + '\n'); child.stdin.flush(); child.stdin.close(); child.stdin = None
            peak = None
            while True:
                memory = Memory(); memory.cb = ctypes.sizeof(memory)
                if psapi.GetProcessMemoryInfo(wintypes.HANDLE(child._handle), ctypes.byref(memory), memory.cb): peak = max(peak or 0, memory.PeakWorkingSetSize)
                if child.poll() is not None: break
                if time.monotonic() - started > WALL_SECONDS or output_overflow.is_set():
                    kernel.TerminateJobObject(job, 1); raise RuntimeError('Probe wall limit reached')
                time.sleep(0.005)
            for thread in readers: thread.join(timeout=2)
            if any(thread.is_alive() for thread in readers): raise RuntimeError('Output drain did not complete')
            out, err = ''.join(captures['out']), ''.join(captures['err'])
            if child.returncode: raise RuntimeError('Child failed under bounded probe: ' + err[:300])
            actual = json.loads(out)
            expected = 'invalid-input' if offset == 1 else 'integrity-match-unverified'
            if actual['status'] != expected: raise ValueError('Boundary rejection mismatch')
            if offset == 1:
                if actual['hashCalls'] != 0 or witness.exists() or actual.get('partialSuccess') is not False: raise ValueError('Partial success or hashing on rejected input')
                compared = 0
            else:
                compared = compare_witness(actual, witness)
                if metric == 'packageBytes' and actual['chargedBytes'] != value: raise ValueError('Package charge mismatch')
                if metric == 'contextNodes' and actual['nodes'] != value: raise ValueError('Expected-context node accounting mismatch')
            row.update(status='MEASURED-AND-INDEPENDENTLY-COMPARED', expectedDisposition=expected, actual=actual, peakResidentBytes=peak, memoryMeasurement='Windows GetProcessMemoryInfo.PeakWorkingSetSize' if peak is not None else 'UNVERIFIED', wallMs=(time.monotonic() - started) * 1000, byteComparisonCount=compared)
        except Exception as exc:
            row.update(status='UNVERIFIED', reason=str(exc), wallMs=(time.monotonic() - started) * 1000)
        finally:
            if child is not None and child.poll() is None: child.kill(); child.wait(timeout=2)
            if job is not None: kernel.CloseHandle(job)
            if witness.exists(): witness.unlink()
        rows.append(row)
report = dict(status='BOUNDED-COMPONENT-RESOURCE-PROBES-NOT-APPROVAL', ownerApproved=False,
              environment=dict(python=sys.version, platform=platform.platform(), node=subprocess.check_output(['node', '--version'], text=True).strip()),
              scope='Actual ASCII codec/component byte workloads, not full-schema package rendering or production engine cost acceptance',
              controls='Anonymous Windows Job process-commit limit 384 MiB + kill-on-close; Node old-space 128 MiB; 15-second parent wall timeout, one fixture per process',
              rows=rows, verified=sum(x['status'] == 'MEASURED-AND-INDEPENDENTLY-COMPARED' for x in rows), unverified=sum(x['status'] == 'UNVERIFIED' for x in rows))
(HERE / 'resource-report.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
print(json.dumps({key: report[key] for key in ('verified', 'unverified')}))
if report['unverified']: print('UNVERIFIED probes are retained explicitly; no uncontrolled fallback used.')
