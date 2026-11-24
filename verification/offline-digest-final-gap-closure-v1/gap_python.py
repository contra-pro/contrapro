"""Independent Python PNG/chunk parser, DFS and staged finite-fixture checks."""
import base64
import binascii
import re
import struct


def screen_logo(uri):
    if not isinstance(uri, str) or len(uri) > 280000 or not re.fullmatch(r'data:image/png;base64,[A-Za-z0-9+/]+={0,2}', uri): return False
    text = uri[22:]
    try: image = base64.b64decode(text, validate=True)
    except (ValueError, binascii.Error): return False
    if base64.b64encode(image).decode('ascii') != text or not 57 <= len(image) <= 204800: return False
    if image[:8] != b'\x89PNG\r\n\x1a\n' or image[8:16] != b'\x00\x00\x00\rIHDR': return False
    width, height = struct.unpack('>II', image[16:24])
    if not (1 <= width <= 2048 and 1 <= height <= 2048): return False
    position, idat = 8, False
    while len(image) - position >= 12:
        amount = int.from_bytes(image[position:position + 4], 'big')
        name = image[position + 4:position + 8]
        if amount + 12 > len(image) - position or name == b'acTL': return False
        idat = idat or name == b'IDAT'
        position += amount + 12
        if name == b'IEND': return amount == 0 and idat and position == len(image)
    return False


def cyclic(names, edges):
    allowed, active, done = set(names), set(), set()
    adjacency = {name: [] for name in names}
    for source, target in edges:
        if source in allowed and target in allowed: adjacency[source].append(target)

    def walk(name):
        if name in active: return True
        if name in done: return False
        active.add(name)
        if any(walk(x) for x in adjacency[name]): return True
        active.remove(name); done.add(name)
        return False
    return any(walk(n) for n in names)


def evaluate_gap(v, c):
    phases = []

    def finish(status, **extra):
        return dict(result=c['result'](status), evidenceClass='new-gap-reference', phases=phases, **extra)

    phases.append('profile')
    if v['kind'] == 'combined-fault':
        if v['profile'] != c['P']['codec']: return finish('unsupported-profile', hashCalls=0)
        phases.append('structure')
        try: c['canonical'](v['value'], c['B']['snapshotBytes'])
        except Exception: return finish('invalid-input', hashCalls=0)
        if not isinstance(v['nodes'], list) or any(not isinstance(n['id'], str) or not isinstance(n['requires'], list) or not re.fullmatch(r'(?:[0-9a-f]{2})*', n['payloadHex']) or not re.fullmatch(r'[0-9a-f]{64}', n['expectedDigest']) for n in v['nodes']): return finish('invalid-input', hashCalls=0)
        phases.append('ambiguity')
        names = [n['id'] for n in v['nodes']]
        edges = [(n['id'], dep) for n in v['nodes'] for dep in n['requires']]
        if len(set(names)) != len(names) or cyclic(names, edges): return finish('ambiguous-input', hashCalls=0)
        phases.append('availability')
        if any(dep not in names for _, dep in edges): return finish('unavailable-input', hashCalls=0)
        phases.append('binding')
        if any(n['agencyId'] != v['expectedAgency'] for n in v['nodes']): return finish('binding-mismatch', hashCalls=0)
        phases.append('digests')
        checked = []
        for n in v['nodes']:
            payload = bytes.fromhex(n['payloadHex']); framed = c['frame'](c['D']['asset'], payload)
            checked.append(dict(id=n['id'], payloadHex=n['payloadHex'], framedHex=framed.hex(), framedByteLength=len(framed), digest=c['descriptor'](c['D']['asset'], payload), expectedDigest=n['expectedDigest']))
        wrong = sorted(n['id'] for n in checked if n['digest']['value'] != n['expectedDigest'])
        return finish('digest-mismatch' if wrong else 'integrity-match-unverified', hashCalls=len(checked), checkedBytes=checked, digestMismatchIds=wrong)
    phases.append('structure')
    manifests = []
    for edition in v['editions']:
        c['canonical'](edition['manifest'], c['B']['coreBytes'])
        manifests.append(c['native'](edition['manifest']))
    if any(not c['conforms'](m, 'root') for m in manifests): return finish('invalid-input', hashCalls=0)
    phases.append('ambiguity')
    keys = [m['documentRevisionId'] + '|' + m['manifestId'] for m in manifests]
    if len(set(keys)) != len(keys): return finish('ambiguous-input', hashCalls=0)
    edges = [(m['documentRevisionId'] + '|' + m['manifestId'], m['priorEdition']['documentRevisionId'] + '|' + m['priorEdition']['manifestRef']) for m in manifests if m['priorEdition'] is not None]
    if cyclic(keys, edges): return finish('ambiguous-input', hashCalls=0)
    phases.append('availability')
    current = next((m for m in manifests if m['documentRevisionId'] == v['currentEdition']), None)
    if current is None or any(target not in keys for _, target in edges): return finish('unavailable-input', hashCalls=0)
    phases.append('binding')
    if any(m['agencyId'] != v['expectedAgency'] or m['contractId'] != v['expectedContract'] for m in manifests) or v['liveCasRevision'] < current['aggregateRevisionAtFinalization']: return finish('binding-mismatch', hashCalls=0)
    phases.append('digests')
    records = [c['record'](key, e['manifest'], c['D']['root'], c['B']['coreBytes']) for key, e in zip(keys, v['editions'])]
    wrong = set()
    for index, manifest in enumerate(manifests):
        asserted = v['editions'][index]['declaredDigest']
        if asserted is not None and asserted != records[index]['digest']['value']: wrong.add(keys[index])
        prior = manifest['priorEdition']
        if prior is not None:
            target = keys.index(prior['documentRevisionId'] + '|' + prior['manifestRef'])
            if prior['manifestDigest']['value'] != records[target]['digest']['value']: wrong.add(keys[index])
    return finish('digest-mismatch' if wrong else 'integrity-match-unverified', hashCalls=len(records), records=records, frozenCurrentDigest=records[manifests.index(current)]['digest'], digestMismatchIds=sorted(wrong), historicalAuthority='not-established')
