"""New-directory-only fixture author/replay preparation. Earlier artifacts are read-only."""
import base64
import binascii
import copy
import hashlib
import json
from pathlib import Path
import struct
import zlib

HERE = Path(__file__).resolve().parent
BASE = HERE.parent / 'offline-digest-preimplementation-v1'
read = lambda p: json.loads(p.read_text(encoding='utf-8'))
original = read(BASE / 'corpus-input.json')
old_answers = read(BASE / 'known-answers.json')
by_id = {v['id']: v for v in old_answers['vectors']}
new_vectors = read(HERE / 'native-accepted-inputs.json')


def chunk(kind, payload):
    body = kind.encode('ascii') + payload
    return struct.pack('>I', len(payload)) + body + struct.pack('>I', binascii.crc32(body) & 0xffffffff)


sig = bytes([137, 80, 78, 71, 13, 10, 26, 10])


def png(width=1, height=1, extra=b''):
    header = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    # Positive 1x1/2x2 fixtures have matching synthetic transparent scanlines.
    scan = b'\0' * (height * (1 + width * 4)) if width <= 2 and height <= 2 else b'\0' * 5
    return sig + chunk('IHDR', header) + extra + chunk('IDAT', zlib.compress(scan)) + chunk('IEND', b'')


minimal = png()
png_cases = [
    ('minimal-1x1', minimal, True), ('bounded-2x2', png(2, 2), True),
    ('bad-signature', b'BADIMAGE' + minimal[8:], False), ('missing-ihdr', sig + minimal[33:], False),
    ('zero-width', png(0, 1), False), ('zero-height', png(1, 0), False), ('width-2048-structure-only', png(2048, 1), True),
    ('width-2049', png(2049, 1), False), ('trailing-byte', minimal + b'X', False),
    ('actl', png(extra=chunk('acTL', struct.pack('>II', 1, 0))), False),
    ('malformed-chunk-length', minimal[:33] + b'\xff\xff\xff\xffIDAT' + b'\0' * 20, False),
    ('missing-idat', minimal[:33] + chunk('IEND', b''), False),
    ('bad-idat-content-screen-not-decoder', minimal[:33] + chunk('IDAT', b'NOT-ZLIB') + chunk('IEND', b''), True),
    ('crc-not-screened', minimal[:29] + bytes([minimal[29] ^ 1]) + minimal[30:], True),
]
for size in (204799, 204800, 204801):
    padded = png(extra=chunk('tEXt', b'x' * (size - len(minimal) - 12)))
    assert len(padded) == size
    png_cases.append(('decoded-' + str(size), padded, size <= 204800))
png_manifest = []
for name, data, accept in png_cases:
    uri = 'data:image/png;base64,' + base64.b64encode(data).decode('ascii')
    png_manifest.append(dict(id=name, uri=uri, decodedBytes=len(data), expected=accept, scope='proposed-structure-screen-only'))
for name, uri in (('invalid-base64', 'data:image/png;base64,!!!!'), ('noncanonical-padbits', 'data:image/png;base64,AB=='), ('oversized-uri', 'data:image/png;base64,' + 'A' * 280000)):
    png_manifest.append(dict(id=name, uri=uri, expected=False, scope='proposed-structure-screen-only'))
for p in png_manifest:
    new_vectors.append(dict(id='png-' + p['id'], sourceRows=['R02', 'U09'], kind='schema-probe', schema='logo', input={'type': 'string', 'value': p['uri']}, expectedStatus='integrity-match-unverified' if p['expected'] else 'invalid-input'))
    if p['expected']:
        new_vectors.append(dict(id='png-asset-' + p['id'], sourceRows=['R02', 'P01'], kind='bytes', domain='cp.asset.exact-bytes.draft1', hex=base64.b64decode(p['uri'][22:]).hex()))

good_digest = by_id['bytes-asset-abc']['digest']['value']
precedence_cases = [
    ('valid', [], 'integrity-match-unverified'),
    ('unsupported-and-malformed', ['unsupported', 'malformed'], 'unsupported-profile'),
    ('malformed-and-missing', ['malformed', 'missing'], 'invalid-input'),
    ('cycle-and-missing', ['cycle', 'missing'], 'ambiguous-input'),
    ('missing-and-binding', ['missing', 'binding'], 'unavailable-input'),
    ('binding-and-digest', ['binding', 'digest'], 'binding-mismatch'),
    ('two-digest-mismatches', ['digest'], 'digest-mismatch'),
    ('all-faults', ['unsupported', 'malformed', 'cycle', 'missing', 'binding', 'digest'], 'unsupported-profile'),
    ('malformed-and-cycle', ['malformed', 'cycle'], 'invalid-input'),
    ('cycle-binding-digest', ['cycle', 'binding', 'digest'], 'ambiguous-input'),
    ('missing-and-digest', ['missing', 'digest'], 'unavailable-input'),
]
for name, faults, expected in precedence_cases:
    nodes = [dict(id='synthetic-a', requires=[], agencyId='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', payloadHex='616263', expectedDigest=good_digest),
             dict(id='synthetic-b', requires=[], agencyId='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', payloadHex='616263', expectedDigest=good_digest)]
    if 'cycle' in faults:
        nodes[0]['requires'] = ['synthetic-b']; nodes[1]['requires'] = ['synthetic-a']
    if 'missing' in faults:
        nodes.append(dict(id='synthetic-c', requires=['synthetic-missing'], agencyId=nodes[0]['agencyId'], payloadHex='616263', expectedDigest=good_digest))
    if 'binding' in faults: nodes[0]['agencyId'] = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    if 'digest' in faults:
        nodes[0]['expectedDigest'] = '0' * 64; nodes[1]['expectedDigest'] = '1' * 64
    new_vectors.append(dict(id='precedence-' + name, sourceRows=['D02', 'A01', 'A02'], kind='combined-fault', profile='cp-unknown' if 'unsupported' in faults else 'cp-c14n-typed-json-draft1',
        value={'type': 'undefined'} if 'malformed' in faults else {'type': 'string', 'value': 'synthetic'}, nodes=nodes, expectedAgency='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', expectedStatus=expected))


def ast_from_canonical(v):
    tag = v[0]
    if tag == 'null': return {'type': 'null'}
    if tag in ('string', 'boolean'): return {'type': tag, 'value': v[1]}
    if tag == 'binary64': return {'type': 'number', 'decimal': repr(struct.unpack('>d', bytes.fromhex(v[1]))[0])}
    if tag == 'bigint': return {'type': 'bigint', 'decimal': v[1]}
    if tag == 'array': return {'type': 'array', 'elements': [ast_from_canonical(x) for x in v[1]]}
    return {'type': 'object', 'entries': [[k, ast_from_canonical(x)] for k, x in v[1]]}


def node(value):
    if value is None: return {'type': 'null'}
    if isinstance(value, str): return {'type': 'string', 'value': value}
    if isinstance(value, int): return {'type': 'number', 'decimal': str(value)}
    return {'type': 'object', 'entries': [[k, node(v)] for k, v in value.items()]}


def put(value, key, new):
    for entry in value['entries']:
        if entry[0] == key: entry[1] = new; return
    raise ValueError(key)


def at(value, *keys):
    for key in keys:
        value = next(v for k, v in value['entries'] if k == key)
    return value


# Validation-view and historical-type witnesses, not business eligibility claims.
for label in ('trim-view-preserves-original', 'signed-money-type-not-eligibility'):
    case = copy.deepcopy(next(v for v in original['vectors'] if v['id'] == 'v3-classic'))
    case['id'] = label
    if label.startswith('trim'):
        put(at(case['snapshot'], 'settings', 'company'), 'name', {'type': 'string', 'value': '  Agence synthétique  '})
    else:
        put(at(case['snapshot'], 'document', 'rental'), 'amountMinor', {'type': 'bigint', 'decimal': '-1'})
    case['sourceRows'] = ['R02', 'N02']
    new_vectors.append(case)


prior = ast_from_canonical(json.loads(by_id['v3-classic']['records'][-1]['canonicalUtf8']))
current = ast_from_canonical(json.loads(by_id['new-edition']['records'][-1]['canonicalUtf8']))
prior_digest = by_id['v3-classic']['records'][-1]['digest']
link = dict(documentRevisionId='synthetic-edition-1', manifestRef='synthetic-root', manifestDigest=prior_digest)
put(current, 'priorEdition', node(link)); put(current, 'aggregateRevisionAtFinalization', node(6))
lineage_cases = [
    ('valid-prior', 'integrity-match-unverified'), ('self-reference', 'ambiguous-input'),
    ('missing-prior', 'unavailable-input'), ('cross-agency-prior', 'binding-mismatch'),
    ('conflicting-digest', 'digest-mismatch'), ('duplicate-edition', 'ambiguous-input'),
    ('cyclic-lineage', 'ambiguous-input'), ('changed-live-cas', 'integrity-match-unverified'),
]
for name, expected in lineage_cases:
    old, new = copy.deepcopy(prior), copy.deepcopy(current)
    entries = [dict(manifest=old, declaredDigest=prior_digest['value']), dict(manifest=new, declaredDigest=None)]
    if name == 'self-reference':
        put(new, 'priorEdition', node({**link, 'documentRevisionId': 'synthetic-edition-2'}))
    if name == 'missing-prior': entries = entries[1:]
    if name == 'cross-agency-prior': put(old, 'agencyId', node('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'))
    if name == 'conflicting-digest': put(new, 'priorEdition', node({**link, 'manifestDigest': {**prior_digest, 'value': '0' * 64}}))
    if name == 'duplicate-edition': entries.append(copy.deepcopy(entries[0]))
    if name == 'cyclic-lineage': put(old, 'priorEdition', node({**link, 'documentRevisionId': 'synthetic-edition-2', 'manifestDigest': {**prior_digest, 'value': '0' * 64}}))
    new_vectors.append(dict(id='lineage-' + name, sourceRows=['R01', 'R04', 'R05', 'A01'], kind='lineage', editions=entries,
                            currentEdition='synthetic-edition-2', expectedAgency='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', expectedContract='cccccccc-cccc-cccc-cccc-cccccccccccc', liveCasRevision=8 if name == 'changed-live-cas' else 7, expectedStatus=expected))

combined = copy.deepcopy(original)
combined['baselinePendingVectors'] = combined.pop('pendingVectors')
combined.update(corpusVersion='cp-final-gap-reference-corpus-draft1', status='PROPOSED-FINAL-GAP-REFERENCE', vectors=original['vectors'] + new_vectors)
(HERE / 'corpus-input.json').write_text(json.dumps(combined, ensure_ascii=True, indent=2) + '\n', encoding='utf-8')
(HERE / 'png-fixtures.json').write_text(json.dumps(png_manifest, ensure_ascii=True, indent=2) + '\n', encoding='utf-8')

# Copy references only into this NEW isolated directory. The original files are
# never executed as writers or edited. Replacements leave encoder/frame blocks intact.
js = (BASE / 'reference-node.mjs').read_text(encoding='utf-8')
js = "import { screenLogo, evaluateGap } from './gap-node.mjs';\n" + js
js = js.replace("const read = name => JSON.parse(fs.readFileSync(path.join(here, name), 'utf8'));", "const read = name => JSON.parse(fs.readFileSync(path.join(name === 'schemas-and-registry.proposed.json' ? path.join(here, '../offline-digest-preimplementation-v1') : here, name), 'utf8'));")
js = js.replace("if (name === 'png-structural-screen') fail('unavailable-input'); // Intentionally no non-null image vectors/decoder.", "if (name === 'png-structural-screen') return screenLogo(value);")
js = js.replace("function evaluate(v) {", "function evaluate(v) {\n  if (['combined-fault', 'lineage'].includes(v.kind)) return evaluateGap(v, { canonical, native, record, descriptor, frame, conforms, result, fail, spec, D, P, B });")
js = js.replace('pendingVectors: corpus.pendingVectors', 'baselinePendingVectors: corpus.baselinePendingVectors')
(HERE / 'replay-node.mjs').write_text(js, encoding='utf-8', newline='\n')
py = (BASE / 'reference-python.py').read_text(encoding='utf-8')
py = 'import sys\nsys.dont_write_bytecode = True\n' + py
py = py.replace("from pathlib import Path", "from pathlib import Path\nfrom gap_python import screen_logo, evaluate_gap")
py = py.replace("(HERE / 'schemas-and-registry.proposed.json')", "(HERE.parent / 'offline-digest-preimplementation-v1' / 'schemas-and-registry.proposed.json')")
py = py.replace("if name == 'png-structural-screen': reject('unavailable-input')", "if name == 'png-structural-screen': return screen_logo(value)")
py = py.replace("def evaluate(v):", "def evaluate(v):\n    if v['kind'] in ('combined-fault', 'lineage'):\n        return evaluate_gap(v, dict(canonical=canonical, native=native, record=record, descriptor=descriptor, frame=frame, conforms=conforms, result=result, reject=reject, spec=spec, D=D, P=P, B=B))")
(HERE / 'replay-python.py').write_text(py, encoding='utf-8', newline='\n')
provenance = {'baselineVectorCount': len(original['vectors']), 'newVectorCount': len(new_vectors), 'pngCases': len(png_manifest), 'baselineReadOnly': True,
              'originalScripts': {n: hashlib.sha256((BASE / n).read_bytes()).hexdigest() for n in ('reference-node.mjs', 'reference-python.py')},
              'transformations': ['New isolated output directory', 'Read original schema proposal in place', 'Local PNG predicate', 'Additional fixed-corpus combined-fault/lineage cases; original codec/framing untouched']}
(HERE / 'preparation-report.json').write_text(json.dumps(provenance, indent=2) + '\n', encoding='utf-8')
print(json.dumps(provenance))
