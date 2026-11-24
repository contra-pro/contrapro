"""Second isolated oracle: native Python scalar sorting, struct framing/float bits,
JSON-library character escaping and hashlib. No Node/application helper imports.
Reads original typed inputs, independently builds every intermediate record/frame,
then compares complete answers. This is not a production API.
"""
import hashlib
import json
import math
import platform
from pathlib import Path
import re
import ssl
import struct
import sys

HERE = Path(__file__).resolve().parent
spec = json.loads((HERE / 'schemas-and-registry.proposed.json').read_text(encoding='utf-8'))
corpus = json.loads((HERE / 'corpus-input.json').read_text(encoding='utf-8'))
candidate = json.loads((HERE / 'known-answers.json').read_text(encoding='utf-8'))
B, D = spec['budgets'], spec['domains']
P = {k: v['id'] for k, v in spec['profiles'].items()}


class Rejection(Exception):
    pass


class BI(int):
    """Distinguish native bigint from Number in the reference transport."""


def reject(code):
    raise Rejection(code)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def scalar(text):
    if not isinstance(text, str) or any(0xD800 <= ord(c) <= 0xDFFF for c in text):
        reject('invalid-input')
    return text


def quote(text):
    # Library escapes each non-control scalar, independently of the Node escaper.
    return '"' + ''.join('\\u%04x' % ord(c) if ord(c) < 32 else json.dumps(c, ensure_ascii=False)[1:-1] for c in scalar(text)) + '"'


def json_tree(tree):
    if isinstance(tree, str):
        return quote(tree)
    if isinstance(tree, bool):
        return json.dumps(tree)
    return '[' + ','.join(json_tree(child) for child in tree) + ']'


def native(n):
    kind = n['type']
    if kind == 'null': return None
    if kind in ('boolean', 'string'): return n['value']
    if kind == 'number': return float(n['decimal'])
    if kind == 'bigint': return BI(n['decimal'])
    if kind == 'array': return [native(x) for x in n['elements']]
    if kind == 'object': return {k: native(v) for k, v in n['entries']}
    reject('invalid-input')


def transport(value):
    if value is None: return {'type': 'null'}
    if isinstance(value, bool): return {'type': 'boolean', 'value': value}
    if isinstance(value, str): return {'type': 'string', 'value': value}
    if isinstance(value, BI): return {'type': 'bigint', 'decimal': str(value)}
    if isinstance(value, (float, int)): return {'type': 'number', 'decimal': repr(value)}
    if isinstance(value, list): return {'type': 'array', 'elements': [transport(x) for x in value]}
    return {'type': 'object', 'entries': [[k, transport(v)] for k, v in value.items()]}


def canonical(source, maximum):
    counts = {'nodes': 0, 'depth': 0}

    def typed(n, depth):
        counts['nodes'] += 1
        counts['depth'] = max(counts['depth'], depth)
        if counts['nodes'] > B['nodes'] or depth > B['depth']: reject('invalid-input')
        kind = n['type']
        if kind == 'null': return ['null']
        if kind == 'boolean':
            if type(n['value']) is not bool: reject('invalid-input')
            return ['boolean', n['value']]
        if kind == 'string':
            text = scalar(n['value'])
            if len(text.encode('utf-8')) > B['stringBytes']: reject('invalid-input')
            return ['string', text]
        if kind == 'number':
            value = float(n['decimal'])
            if not math.isfinite(value): reject('invalid-input')
            return ['binary64', struct.pack('>d', value).hex()]
        if kind == 'bigint':
            text = n['decimal']
            if not re.fullmatch(r'(0|-?[1-9][0-9]*)', text) or len(text.lstrip('-')) > B['bigintDigits']: reject('invalid-input')
            return ['bigint', str(int(text))]
        if kind == 'array':
            if len(n['elements']) > B['entries']: reject('invalid-input')
            return ['array', [typed(x, depth + 1) for x in n['elements']]]
        if kind == 'object':
            pairs = n['entries']
            if len(pairs) > B['members']: reject('invalid-input')
            seen = set()
            for key, _ in pairs:
                scalar(key)
                if key in seen: reject('ambiguous-input')
                seen.add(key)
                if len(key.encode('utf-8')) > B['keyBytes']: reject('invalid-input')
            return ['object', [[key, typed(value, depth + 1)] for key, value in sorted(pairs, key=lambda p: p[0])]]
        reject('invalid-input')

    text = json_tree(typed(source, 1))
    encoded = text.encode('utf-8')
    if len(encoded) > maximum: reject('invalid-input')
    return text, encoded, counts


def frame(tag, data):
    if tag not in D.values(): reject('unsupported-profile')
    tag_bytes = tag.encode('utf-8')
    return b'CONTRATPRO-DIGEST\x00' + struct.pack('>I', len(tag_bytes)) + tag_bytes + struct.pack('>Q', len(data)) + data


def descriptor(tag, data):
    return dict(algorithm='sha-256', encoding='hex', domainVersion=tag, value=sha(frame(tag, data)))


def record(name, source, tag, maximum):
    text, encoded, counts = canonical(source, maximum)
    framed = frame(tag, encoded)
    return dict(name=name, canonicalUtf8=text, canonicalHex=encoded.hex(), canonicalByteLength=len(encoded), framedHex=framed.hex(), framedByteLength=len(framed), digest=descriptor(tag, encoded), counts=counts)


WS = '\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680' + ''.join(chr(n) for n in range(0x2000, 0x200B)) + '\u2028\u2029\u202f\u205f\u3000\ufeff'


def predicate(name, value):
    if name in ('source-text-controls', 'conditions-text'):
        return not any(ord(c) in (*range(0, 9), 11, 12, *range(14, 32)) for c in value) and (name != 'conditions-text' or bool(value.strip(WS)))
    if name == 'snapshot-agency-equality':
        if value['settings']['agencyId'] != value['document']['agencyId']: reject('binding-mismatch')
        return True
    if name == 'unique-marker-ids': return len({x['id'] for x in value['damage']}) == len(value['damage'])
    if name == 'png-structural-screen': reject('unavailable-input')
    if name == 'agency-profile-validation-view':
        limits = dict(name=200, ice=15, ifNumber=20, rc=50, address=400, city=100, phone=16, email=320)
        for key, limit in limits.items():
            text = value[key].strip(WS)
            if len(text.encode('utf-16-be')) // 2 > limit or any(ord(c) < 32 or ord(c) == 127 for c in text) or (not text and key not in ('ice', 'ifNumber', 'rc')): return False
            pattern = {'ice': r'[0-9]{15}', 'ifNumber': r'[0-9]{1,20}', 'phone': r'\+?[0-9]{8,15}', 'email': '[^' + re.escape(WS) + '@]+@[^' + re.escape(WS) + '@]+\\.[^' + re.escape(WS) + '@]+'}.get(key)
            if text and pattern and not re.fullmatch(pattern, text): return False
        return True
    reject('invalid-input')


def literal_equal(value, expected):
    if type(expected) is bool: return type(value) is bool and value == expected
    if isinstance(expected, (int, float)): return type(value) in (int, float) and value == expected
    return type(value) is type(expected) and value == expected


def conforms(value, schema):
    s = spec['definitions'].get(schema) if isinstance(schema, str) else schema
    if s is None: reject('unsupported-profile')
    kind = s['kind']
    if kind == 'null': ok = value is None
    elif kind == 'literal': ok = literal_equal(value, s['value'])
    elif kind == 'enum': ok = any(literal_equal(value, x) for x in s['values'])
    elif kind == 'string': ok = isinstance(value, str) and ('pattern' not in s or re.fullmatch(s['pattern'].removeprefix('^').removesuffix('$'), value)) and value != s.get('not') and ('maxUtf16' not in s or len(value.encode('utf-16-be')) // 2 <= s['maxUtf16']) and ('maxUtf8' not in s or len(value.encode('utf-8')) <= s['maxUtf8'])
    elif kind == 'number': ok = type(value) in (int, float) and math.isfinite(value) and (not s.get('integer') or (float(value).is_integer() and abs(value) <= 9007199254740991)) and ('min' not in s or value >= s['min']) and ('max' not in s or value <= s['max'])
    elif kind == 'bigint': ok = isinstance(value, BI) and len(str(value).lstrip('-')) <= s['maxDigits'] and ('minDecimal' not in s or value >= int(s['minDecimal']))
    elif kind == 'union': ok = any(conforms(value, x) for x in s['alternatives'])
    elif kind == 'array': ok = isinstance(value, list) and len(value) <= s['maximum'] and all(conforms(x, s['items']) for x in value)
    elif kind == 'tuple': ok = isinstance(value, list) and len(value) == len(s['items']) and all(conforms(v, t) for v, t in zip(value, s['items']))
    elif kind == 'object': ok = type(value) is dict and set(value) <= set(s['fields']) and all(conforms(value[k], t) if k in value else k in s['optional'] for k, t in s['fields'].items())
    else: reject('invalid-input')
    return bool(ok and ('predicate' not in s or predicate(s['predicate'], value)))


def result(status):
    return dict(schemaVersion=1, profileId=spec['resultProfile'], status=status, trust='unverified', canActivateSigned=False, reasonCode=spec['reasonCodes'][status], targetIds=[], digests=[])


def evaluate(v):
    kind = v['kind']
    if kind == 'budget-counter-probe':
        maximum = B[v['metric']]
        return dict(result=result('integrity-match-unverified' if type(v['measured']) is int and 0 <= v['measured'] <= maximum else 'invalid-input'), measured=v['measured'], maximum=maximum, evidenceClass='counter-model-only')
    if kind == 'graph-probe':
        # DFS recursion stack, independent of Node's incoming-edge elimination.
        edges = {}
        for source, target in v['edges']: edges.setdefault(source, []).append(target)
        completed, active = set(), set()

        def visit(x):
            if x in active: return False
            if x in completed: return True
            active.add(x)
            if not all(visit(y) for y in edges.get(x, [])): return False
            active.remove(x); completed.add(x)
            return True

        good = all(visit(x) for x in list(edges))
        return dict(result=result('integrity-match-unverified' if good else 'ambiguous-input'), evidenceClass='graph-model-only')
    if kind in ('codec', 'schema-probe'):
        output = record('value', v['input'], D['snapshot'], B['snapshotBytes'])
        if kind == 'schema-probe' and not conforms(native(v['input']), v['schema']): reject('invalid-input')
        return dict(result=result('integrity-match-unverified'), records=[output], evidenceClass='exact-byte-reference')
    if kind == 'bytes':
        if v['domain'] not in D.values(): reject('unsupported-profile')
        if 'hex' not in v: reject('unavailable-input')
        data = bytes.fromhex(v['hex']); framed = frame(v['domain'], data); digest = descriptor(v['domain'], data)
        if 'expectedDigest' in v and digest['value'] != v['expectedDigest']: reject('digest-mismatch')
        return dict(result=result('integrity-match-unverified'), payloadHex=data.hex(), payloadByteLength=len(data), framedHex=framed.hex(), framedByteLength=len(framed), rawSha256=sha(data), digest=digest, evidenceClass='exact-byte-reference')
    if kind != 'package': reject('invalid-input')
    if v['sourceSchema'] not in ('v1-untagged', 'v1-tagged', 'v2', 'v3'): reject('unsupported-profile')
    snapshot = native(v['snapshot'])
    records = [record('snapshot', v['snapshot'], D['snapshot'], B['snapshotBytes'])]
    if not conforms(snapshot, 'snapshot-' + v['sourceSchema']): reject('invalid-input')
    context = dict(schemaVersion=1, mode='offline-synthetic', agencyId=v['expectedAgencyId'], contractId=v['expectedContractId'], documentRevisionId=v['expectedDocumentRevisionId'], aggregateRevisionAtFinalization=v['aggregateRevisionAtFinalization'], liveAggregateRevision=v['liveCasRevision'], capturedSettingsRevision=v['expectedSettingsRevision'])
    if not conforms(context, 'expectedContext'): reject('invalid-input')
    context_counts = canonical(transport(context), B['coreBytes'])[2]
    if context['liveAggregateRevision'] < context['aggregateRevisionAtFinalization'] or snapshot['settings']['revision'] != context['capturedSettingsRevision']: reject('binding-mismatch')
    if snapshot['settings']['agencyId'] != v['expectedAgencyId'] or snapshot['document']['rentalId'] != v['expectedContractId'] or v['documentRevisionId'] != v['expectedDocumentRevisionId']: reject('binding-mismatch')
    scope = dict(mode='offline-synthetic', schemaVersion=1, contractId=snapshot['document']['rentalId'], documentRevisionId=v['documentRevisionId'], agencyId=snapshot['document']['agencyId'])
    pdf = bytes.fromhex(v['pdfHex'])
    if len(pdf) > B['pdfBytes'] or len(v['assets']) > B['assets']: reject('invalid-input')
    raw = dict(profileId=P['raw'], algorithm='sha-256', encoding='hex', value=sha(pdf)); internal = descriptor(D['pdf'], pdf)
    entries = []
    for a in v['assets']:
        data = bytes.fromhex(a['hex'])
        if len(data) > B['assetBytes']: reject('invalid-input')
        entries.append(dict(digest=descriptor(D['asset'], data), byteLength=BI(len(data)), role=a['role'], assetId=a['id'], version=a['version']))
    if any(entries[i - 1]['assetId'] >= entries[i]['assetId'] for i in range(1, len(entries))): reject('ambiguous-input')
    assets = dict(scope, profileId=P['assets'], assetManifestId='synthetic-assets', rendererVersion='synthetic-renderer-v1', templateId=snapshot['settings']['template'], templateVersion='synthetic-template-v1', locale='fr-ar', timeZone='UTC',
                  printProfile=dict(profileId=spec['printProfile'], paper='A4', marginMm=dict(bottom=10, left=10, top=10, right=10), scale=1, backgrounds=True, browserHeadersFooters=False), entries=entries)
    party = dict(scope, profileId=P['party'], partyPlanId='synthetic-plan', planVersion='synthetic-plan-v1', requiredParties=[dict(partyInstanceId='synthetic-party-' + str(i), role=role, subjectRef='synthetic-subject-' + str(i), required=True, sequenceIndex=i) for i, role in enumerate(('agency-representative', 'customer'))])
    if not conforms(assets, 'assets') or not conforms(party, 'party'): reject('invalid-input')
    if v.get('assetContextMismatch'): assets['agencyId'] = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
    if v.get('partyContextMismatch'): party['documentRevisionId'] = 'synthetic-old-edition'
    if v.get('renderTemplateMismatch'): assets['templateId'] = 'bilingual' if snapshot['settings']['template'] == 'classic' else 'classic'
    if any(assets[k] != scope[k] or party[k] != scope[k] for k in ('agencyId', 'contractId', 'documentRevisionId')) or assets['templateId'] != snapshot['settings']['template']: reject('binding-mismatch')
    records.extend([record('assets', transport(assets), D['assets'], B['coreBytes']), record('party', transport(party), D['party'], B['coreBytes'])])
    root = dict(scope, profileId=P['root'], manifestId='synthetic-root', canonicalizationProfile=P['codec'], aggregateRevisionAtFinalization=v['aggregateRevisionAtFinalization'], sourceSchema=v['sourceSchema'], sourceTagPresence='absent' if v['sourceSchema'] == 'v1-untagged' else 'explicit',
                snapshotRef='synthetic-snapshot', snapshotDigest=records[0]['digest'], baseArtifactRef='synthetic-base-pdf', baseArtifactDigest=internal, rawPdfChecksum=raw, byteLength=BI(len(pdf)), mediaType='application/pdf',
                assetManifestRef=assets['assetManifestId'], assetManifestDigest=records[1]['digest'], partyPlanRef=party['partyPlanId'], partyPlanDigest=records[2]['digest'], policyBinding=None, priorEdition=None)
    if v.get('rootExtraField'): root['manifestDigest'] = records[0]['digest']
    if not conforms(root, 'root'): reject('invalid-input')
    records.append(record('root', transport(root), D['root'], B['coreBytes']))
    total = len(pdf) + sum(len(bytes.fromhex(a['hex'])) for a in v['assets']) + sum(x['canonicalByteLength'] for x in records)
    if total > B['packageBytes'] or context_counts['nodes'] + sum(x['counts']['nodes'] for x in records) > B['nodes']: reject('invalid-input')
    return dict(result=result('integrity-match-unverified'), records=records, rawPdfChecksum=raw, internalPdfDigest=internal, packageChargedBytes=total, contextNodeCount=context_counts['nodes'], evidenceClass='exact-byte-reference', artifactValidity='not-evaluated')


# Independently transcribed primitive input constants; not read from Node outputs.
if not conforms(spec['profileDomainRegistry'], 'registry'):
    raise ValueError('Proposed registry/schema mismatch')
primitive = [('', 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
             ('abc', 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'),
             ('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq', '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1')]
discrepancies = []
for text, expected in primitive:
    if sha(text.encode('ascii')) != expected: discrepancies.append({'primitive': text})
expected_by_id = {x['id']: x for x in candidate['vectors']}
counts = {}
for v in corpus['vectors']:
    try: answer = evaluate(v)
    except Rejection as e: answer = dict(result=result(str(e)), evidenceClass='rejection-reference')
    actual = dict(id=v['id'], sourceRows=v['sourceRows'], **answer)
    if actual != expected_by_id.get(v['id']): discrepancies.append({'id': v['id'], 'actual': actual})
    if actual['result']['status'] != v.get('expectedStatus', 'integrity-match-unverified'): discrepancies.append({'id': v['id'], 'expectedDispositionMismatch': True})
    counts[answer['evidenceClass']] = counts.get(answer['evidenceClass'], 0) + 1
report = dict(status='INDEPENDENT-REFERENCE-COMPARISON-NOT-APPROVAL', ownerApproved=False, environment=dict(python=sys.version, platform=platform.platform(), openssl=ssl.OPENSSL_VERSION),
              comparedVectors=len(corpus['vectors']), sourceRows=corpus['sourceRows'], primitiveKnownAnswers=len(primitive), comparison='Full canonical UTF-8 text, hex, frame hex/length, counts, complete digests, schemas and result objects', classes=counts, discrepancies=discrepancies,
              corpusInputSha256=sha((HERE / 'corpus-input.json').read_bytes()), schemaProposalSha256=sha((HERE / 'schemas-and-registry.proposed.json').read_bytes()), candidateAnswersSha256=sha((HERE / 'known-answers.json').read_bytes()))
(HERE / 'independent-python-report.json').write_text(json.dumps(report, ensure_ascii=True, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'comparedVectors': report['comparedVectors'], 'classes': counts, 'discrepancies': len(discrepancies)}))
sys.exit(bool(discrepancies))
