"""Author synthetic specification data only. No hashes, application imports or network.
Reference encoders are separate programs; this author is never the output oracle.
"""
import copy
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
C = "cccccccc-cccc-cccc-cccc-cccccccccccc"
PROFILES = {
    "codec": "cp-c14n-typed-json-draft1", "root": "cp-binding-manifest-draft1",
    "assets": "cp-render-assets-draft1", "party": "cp-party-plan-draft1", "raw": "cp-pdf-raw-sha256-draft1",
}
DOMAINS = {k: "cp." + v + ".draft1" for k, v in {
    "snapshot": "snapshot.typed-json", "pdf": "pdf.exact-bytes", "asset": "asset.exact-bytes",
    "assets": "render-assets.typed-json", "party": "party-plan.typed-json", "root": "binding-manifest.typed-json",
}.items()}
BUDGETS = {"snapshotBytes": 2097152, "coreBytes": 262144, "pdfBytes": 16777216,
           "assetBytes": 4194304, "assets": 128, "packageBytes": 67108864,
           "depth": 32, "nodes": 50000, "members": 256, "entries": 1024,
           "keyBytes": 256, "stringBytes": 524288, "bigintDigits": 256}


def obj(fields, optional=()):
    return {"kind": "object", "fields": fields, "optional": list(optional), "closed": True}


def arr(item, maximum=1024):
    return {"kind": "array", "items": item, "maximum": maximum}


def union(*items):
    return {"kind": "union", "alternatives": list(items)}


def lit(value):
    return {"kind": "literal", "value": value}


def enum(*values):
    return {"kind": "enum", "values": list(values)}


defs = {
    "text": {"kind": "string", "maxUtf8": BUDGETS["stringBytes"]},
    "null": {"kind": "null"}, "true": lit(True), "false": lit(False),
    "token": {"kind": "string", "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"},
    "uuid": {"kind": "string", "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$", "not": "00000000-0000-0000-0000-000000000000"},
    "positive": {"kind": "number", "integer": True, "min": 1, "max": 9007199254740991},
    "nonnegative": {"kind": "number", "integer": True, "min": 0, "max": 9007199254740991},
    "settingsRevision": {"kind": "number", "integer": True, "min": 0, "max": 9007199254740990},
    "finite": {"kind": "number"}, "coordinate": {"kind": "number", "min": 0, "max": 100},
    "bigint": {"kind": "bigint", "maxDigits": 256},
    "byteLength": {"kind": "bigint", "minDecimal": "0", "maxDigits": 256},
    "template": enum("classic", "luxury", "modern", "detailed", "bilingual"),
    "mode": lit("offline-synthetic"), "one": lit(1), "two": lit(2), "three": lit(3),
    "nullableText": union("null", "text"), "nullableToken": union("null", "token"),
    "color": {"kind": "string", "pattern": "^#[0-9a-fA-F]{6}$"},
    "logo": union("null", {"kind": "string", "maxUtf16": 280000, "pattern": "^data:image/png;base64,[A-Za-z0-9+/]+={0,2}$", "predicate": "png-structural-screen"}),
    "conditions": {"kind": "string", "maxUtf16": 8000, "predicate": "conditions-text"},
    "footer": {"kind": "string", "maxUtf16": 500, "predicate": "source-text-controls"},
    "company": obj({k: "text" for k in ("name", "ice", "ifNumber", "rc", "address", "city", "phone", "email")}),
    "oldDriver": obj({k: "text" for k in ("name", "identity", "licence", "licenceDates", "address")}),
    "driver": obj({"fullName": "text", **{k: "nullableText" for k in ("cin", "passportNumber", "drivingLicenseNumber", "city", "nationality", "licenceDates", "address")}}),
    "oldVehicle": obj({k: "text" for k in ("registration", "makeModel", "vin")}),
    "vehicle": obj({k: "nullableText" for k in ("make", "model", "registrationNumber", "vin")}),
    "rental": obj({**{k: "text" for k in ("start", "end", "duration", "pickup", "returnLocation", "mileage", "allowance")}, **{k: "bigint" for k in ("dailyRateMinor", "amountMinor", "depositMinor")}}),
    "oldMarker": obj({"view": enum("avant", "arrière", "gauche", "droite"), "x": "finite", "y": "finite"}),
    "marker": obj({"id": {"kind": "string", "pattern": "^[a-zA-Z0-9_-]{1,40}$"}, "view": enum("top", "front", "rear", "left", "right"), "category": enum("scratch", "dent", "other"), "x": "coordinate", "y": "coordinate"}),
    "oldInspection": obj({"fuel": enum("vide", "quart", "demi", "trois-quarts", "plein"), "notes": "text", "damage": arr("oldMarker")}),
    "notes": union("null", {"kind": "string", "maxUtf16": 2000, "predicate": "source-text-controls"}),
    "signatures": obj({"customer": lit("not-signed"), "agency": lit("not-signed")}),
}
defs["company"]["predicate"] = "agency-profile-validation-view"
defs["settings"] = obj({"agencyId": "uuid", "revision": "settingsRevision", "template": "template", "logo": "logo", "primary": "color", "accent": "color", "company": "company", "conditions": "conditions", "footer": "footer"})
for stage in ("departure", "return"):
    defs[stage] = obj({"stage": lit(stage), "provenance": enum("demonstration", "recorded"), "fuelLevel": union("null", enum(0, 1, 2, 3, 4)), "mileageKm": union("null", "nonnegative"), "notes": "notes", "damage": arr("marker", 50)})
    defs[stage]["predicate"] = "unique-marker-ids"
defs["inspection"] = obj({s: union("null", s) for s in ("departure", "return")})
for name, version, tagged in (("v1-untagged", 1, False), ("v1-tagged", 1, True), ("v2", 2, True), ("v3", 3, True)):
    fields = {"demonstration": "true", "agencyId": "uuid", "rentalId": "uuid", "number": "nullableText",
              "primaryDriver": "oldDriver" if version == 1 else "driver", "secondaryDriver": union("null", "oldDriver" if version == 1 else "driver"),
              "vehicle": "oldVehicle" if version == 1 else "vehicle", "rental": "rental", "inspection": "inspection" if version == 3 else "oldInspection", "signatures": "signatures"}
    if tagged:
        fields["schemaVersion"] = lit(version)
    defs["document-" + name] = obj(fields)
    defs["snapshot-" + name] = obj({"demonstration": "true", "settings": "settings", "document": "document-" + name})
    defs["snapshot-" + name]["predicate"] = "snapshot-agency-equality"
defs["internalDigest"] = obj({"algorithm": lit("sha-256"), "encoding": lit("hex"), "domainVersion": enum(*DOMAINS.values()), "value": {"kind": "string", "pattern": "^[0-9a-f]{64}$"}})
for kind, domain in DOMAINS.items():
    defs["digest-" + kind] = copy.deepcopy(defs["internalDigest"])
    defs["digest-" + kind]["fields"]["domainVersion"] = lit(domain)
defs["rawPdfChecksum"] = obj({"profileId": lit(PROFILES["raw"]), "algorithm": lit("sha-256"), "encoding": lit("hex"), "value": {"kind": "string", "pattern": "^[0-9a-f]{64}$"}})
scope = {"schemaVersion": "one", "mode": "mode", "agencyId": "uuid", "contractId": "uuid", "documentRevisionId": "token"}
defs["assetEntry"] = obj({"assetId": "token", "role": enum("renderer", "css", "font", "diagram", "image"), "version": "token", "byteLength": "byteLength", "digest": "digest-asset"})
defs["printProfile"] = obj({"profileId": lit("cp-a4-print-draft1"), "paper": lit("A4"), "marginMm": obj({k: lit(10) for k in ("top", "right", "bottom", "left")}), "scale": lit(1), "backgrounds": "true", "browserHeadersFooters": "false"})
defs["assets"] = obj({**scope, "profileId": lit(PROFILES["assets"]), "assetManifestId": "token", "rendererVersion": "token", "templateId": "template", "templateVersion": "token", "locale": enum("fr", "ar", "fr-ar"), "timeZone": enum("UTC", "Africa/Casablanca"), "printProfile": "printProfile", "entries": arr("assetEntry", 128)})
for i, role in enumerate(("agency-representative", "customer")):
    defs["party-" + str(i)] = obj({"partyInstanceId": "token", "role": lit(role), "subjectRef": "token", "required": "true", "sequenceIndex": lit(i)})
defs["party"] = obj({**scope, "profileId": lit(PROFILES["party"]), "partyPlanId": "token", "planVersion": "token", "requiredParties": {"kind": "tuple", "items": ["party-0", "party-1"]}})
defs["priorEdition"] = union("null", obj({"documentRevisionId": "token", "manifestRef": "token", "manifestDigest": "digest-root"}))
defs["root"] = obj({**scope, "profileId": lit(PROFILES["root"]), "manifestId": "token", "canonicalizationProfile": lit(PROFILES["codec"]),
                    "aggregateRevisionAtFinalization": "positive", "sourceSchema": enum("v1-untagged", "v1-tagged", "v2", "v3"), "sourceTagPresence": enum("absent", "explicit"),
                    "snapshotRef": "token", "snapshotDigest": "digest-snapshot", "baseArtifactRef": "token", "baseArtifactDigest": "digest-pdf", "rawPdfChecksum": "rawPdfChecksum",
                    "byteLength": "byteLength", "mediaType": lit("application/pdf"), "assetManifestRef": "token", "assetManifestDigest": "digest-assets",
                    "partyPlanRef": "token", "partyPlanDigest": "digest-party", "policyBinding": "null", "priorEdition": "priorEdition"})
defs["expectedContext"] = obj({**scope, "aggregateRevisionAtFinalization": "positive", "liveAggregateRevision": "positive", "capturedSettingsRevision": "settingsRevision"})
codes = ["unsupported-profile", "invalid-input", "ambiguous-input", "unavailable-input", "binding-mismatch", "digest-mismatch", "integrity-match-unverified"]
reasons = dict(zip(codes, ("profile-not-supported", "malformed-or-limit", "conflicting-or-cyclic", "required-input-missing", "scope-or-revision", "computed-digest-differs", "reference-match")))
defs["result"] = {"kind": "union", "alternatives": [obj({"schemaVersion": "one", "profileId": lit("cp-integrity-result-draft1"), "status": lit(code), "trust": lit("unverified"), "canActivateSigned": "false", "reasonCode": lit(reasons[code]), "targetIds": arr("token", 128), "digests": arr("internalDigest", 128)}) for code in codes]}
defs["registryEntry"] = obj({"id": "token", "status": lit("PROPOSED"), "category": enum("codec", "record", "domain", "checksum", "source-schema", "print", "result", "budget"), "schemaRef": "nullableToken", "domain": "nullableToken", "algorithm": union("null", lit("sha-256")), "encoding": union("null", lit("hex"))})
defs["registry"] = obj({"registryVersion": "one", "status": lit("PROPOSED"), "ownerApproved": "false", "entries": arr("registryEntry", 128)})
registry_entries = []
for key, identifier in PROFILES.items():
    domain = DOMAINS.get(key)
    registry_entries.append({"id": identifier, "status": "PROPOSED", "category": "codec" if key == "codec" else "checksum" if key == "raw" else "record", "schemaRef": None if key == "codec" else "rawPdfChecksum" if key == "raw" else key, "domain": domain, "algorithm": None if key == "codec" else "sha-256", "encoding": None if key == "codec" else "hex"})
for key, domain in DOMAINS.items():
    registry_entries.append({"id": domain, "status": "PROPOSED", "category": "domain", "schemaRef": key if key in ("root", "assets", "party") else None, "domain": domain, "algorithm": "sha-256", "encoding": "hex"})
for identifier, category, ref in (("cp-integrity-result-draft1", "result", "result"), ("cp-a4-print-draft1", "print", "printProfile"), ("cp-budget-draft1", "budget", None)):
    registry_entries.append({"id": identifier, "status": "PROPOSED", "category": category, "schemaRef": ref, "domain": None, "algorithm": None, "encoding": None})
for variant in ("v1-untagged", "v1-tagged", "v2", "v3"):
    registry_entries.append({"id": "cp-native-snapshot-" + variant + "-draft1", "status": "PROPOSED", "category": "source-schema", "schemaRef": "snapshot-" + variant, "domain": DOMAINS["snapshot"], "algorithm": "sha-256", "encoding": "hex"})
proposal = {"schemaId": "cp-native-schema-proposals-draft1", "status": "PROPOSED", "ownerApproved": False,
            "notation": "Native typed schema DSL, NOT JSON Schema and NOT a runtime validator",
            "profiles": {k: {"id": v, "status": "PROPOSED"} for k, v in PROFILES.items()}, "domains": DOMAINS,
            "resultProfile": "cp-integrity-result-draft1", "printProfile": "cp-a4-print-draft1", "budgets": BUDGETS,
            "errorPrecedence": codes[:-1], "reasonCodes": reasons,
            "newDecisionStatus": {"sidecar-field-inventory": "OPEN-owner-review", "error-precedence": "OPEN-owner-review", "trim-validation-view": "OPEN-owner-review", "asset-coverage-and-logo-transform": "OPEN-owner-review", "lineage-eligibility": "OPEN-owner-review", "source-business-ranges": "OPEN-owner-review", "node-accounting-includes-context": "OPEN-owner-review"},
            "profileDomainRegistry": {"registryVersion": 1, "status": "PROPOSED", "ownerApproved": False, "entries": registry_entries}, "definitions": defs}


def node(value):
    if value is None:
        return {"type": "null"}
    if isinstance(value, bool):
        return {"type": "boolean", "value": value}
    if isinstance(value, str):
        return {"type": "string", "value": value}
    if isinstance(value, int):
        return {"type": "number", "decimal": str(value)}
    if isinstance(value, float):
        return {"type": "number", "decimal": repr(value)}
    if isinstance(value, list):
        return {"type": "array", "elements": [node(v) for v in value]}
    if isinstance(value, dict):
        if set(value) == {"$bigint"}:
            return {"type": "bigint", "decimal": value["$bigint"]}
        return {"type": "object", "entries": [[k, node(v)] for k, v in value.items()]}
    raise TypeError(type(value))


def snapshot(schema, template):
    version = 1 if schema.startswith("v1") else int(schema[-1])
    driver = {k: "Donnée synthétique" for k in ("name", "identity", "licence", "licenceDates", "address")} if version == 1 else {"fullName": "Conducteur synthétique", **{k: None for k in ("cin", "passportNumber", "drivingLicenseNumber", "city", "nationality", "licenceDates", "address")}}
    vehicle = {k: "SYNTHETIQUE" for k in ("registration", "makeModel", "vin")} if version == 1 else {"make": "Synthétique", "model": "Fixture", "registrationNumber": "SYNTHETIQUE", "vin": None}
    old = {"fuel": "demi", "notes": "أ بَشّ — état synthétique", "damage": [{"view": "avant", "x": 12.5, "y": 25}]}
    inspection = {"departure": {"stage": "departure", "provenance": "demonstration", "fuelLevel": 0, "mileageKm": 0, "notes": None, "damage": [{"id": "fixture-marker", "view": "top", "category": "scratch", "x": 12.5, "y": 12.500000000000002}]}, "return": None} if version == 3 else old
    doc = {"demonstration": True, "agencyId": A, "rentalId": C, "number": None, "primaryDriver": driver, "secondaryDriver": None, "vehicle": vehicle,
           "rental": {"start": "2026-01-01T00:00:00Z", "end": "2026-01-02T00:00:00Z", "duration": "1 jour synthétique", "pickup": "Lieu synthétique", "returnLocation": "Lieu synthétique",
                      "dailyRateMinor": {"$bigint": "9007199254740993"}, "amountMinor": {"$bigint": "9007199254740993"}, "depositMinor": {"$bigint": "0"}, "mileage": "0 km", "allowance": "Fixture"},
           "inspection": inspection, "signatures": {"customer": "not-signed", "agency": "not-signed"}}
    if schema != "v1-untagged":
        doc["schemaVersion"] = version
    return {"demonstration": True, "settings": {"agencyId": A, "revision": 0, "template": template, "logo": None, "primary": "#173b56", "accent": "#b68a35",
            "company": {"name": "Agence synthétique", "ice": "", "ifNumber": "", "rc": "", "address": "Adresse synthétique", "city": "Ville synthétique", "phone": "+00000000", "email": "fixture@example.invalid"},
            "conditions": "Conditions synthétiques intégrales.\r\nشروط اصطناعية — غير موقعة.", "footer": "Synthétique — non signé"}, "document": doc}


vectors = []


def add(id, rows, kind="codec", **values):
    vectors.append({"id": id, "sourceRows": rows.split(","), "kind": kind, **values})


for suffix, value in (("ba", {"b": None, "a": True}), ("ab", {"a": True, "b": None}), ("scalar", {"\U00010000": "x", "\ue000": "y"}), ("prefix", {"aa": 0, "a": 0, "A": 0}), ("numeric-keys", {"2": 0, "10": 0})):
    add("keys-" + suffix, "K01,K02,K03", input=node(value))
add("duplicate-decoded-keys", "K04", input={"type": "object", "entries": [["a", node(True)], ["a", node(False)]]}, expectedStatus="ambiguous-input")
for id, text, rows in [
    ("french-precomposed", "é", "U01,U02"), ("french-decomposed", "e\u0301", "U01"),
    ("arabic-composed", "\u0623", "U03"), ("arabic-decomposed", "\u0627\u0654", "U03"),
    ("arabic-marks-a", "\u0628\u064e\u0651", "U04"), ("arabic-marks-b", "\u0628\u0651\u064e", "U04"),
    ("arabic-lam-alef", "\u0644\u0627", "U05"), ("arabic-presentation", "\ufefb", "U05"),
    ("arabic-joiners", "\u0628\u0640\u200d\u200c", "U06"), ("bidi", "\u2067\u0628\u2069", "U07"),
    ("lf", "x\ny", "U08,U09"), ("crlf", "x\r\ny", "U08"), ("nbsp", "x\u00a0 ", "U08"),
    ("escapes", '\"\\\n\t\x00\x1f/<> &\u2028\u2029', "U09"), ("astral", "\U0001f697", "U10"),
    ("lone-high", "\ud800", "U10"), ("lone-low", "\udfff", "U10"), ("embedded-bom", "x\ufeffy", "U11")]:
    add(id, rows, input=node(text), **({"expectedStatus": "invalid-input"} if id.startswith("lone-") else {}))
for id, value in (("empty-object", {}), ("null-key", {"a": None}), ("empty-array", []), ("array-ab", ["a", "b"]), ("array-ba", ["b", "a"]), ("tag-looking-data", ["null"])):
    add(id, "V01,K05", input=node(value))
add("own-undefined", "V01", input={"type": "object", "entries": [["a", {"type": "undefined"}]]}, expectedStatus="invalid-input")
for decimal in ("0", "-0", "1", "1.0", "1e0", "12.5", "12.500000000000002", "5e-324", "1.7976931348623157e308", "NaN", "Infinity", "-Infinity"):
    add("number-" + decimal, "N02,N03,N04,N05,N06", input={"type": "number", "decimal": decimal}, **({"expectedStatus": "invalid-input"} if "Infinity" in decimal or decimal == "NaN" else {}))
for decimal in ("0", "1", "-1", "9007199254740992", "9007199254740993", "01", "+1", "1e0", "-0"):
    add("bigint-" + decimal, "N01,N02,N07", input={"type": "bigint", "decimal": decimal}, **({"expectedStatus": "invalid-input"} if decimal in ("01", "+1", "1e0", "-0") else {}))
add("string-one", "N02", input=node("1"))
for i, stamp in enumerate(("2026-01-01T00:00:00Z", "2026-01-01T01:00:00+01:00", "2026-01-01T00:00:00.000Z")):
    add("timestamp-" + str(i), "T01,T02,T03", input=node(stamp))
for schema in ("v1-untagged", "v1-tagged", "v2", "v3"):
    for template in ("classic", "luxury", "modern", "detailed", "bilingual"):
        add(schema + "-" + template, "V02,V03,V04,R02,R03,P01,A02", "package", snapshot=node(snapshot(schema, template)), sourceSchema=schema,
            documentRevisionId="synthetic-edition-1", expectedDocumentRevisionId="synthetic-edition-1", aggregateRevisionAtFinalization=2, expectedSettingsRevision=0, expectedAgencyId=A, expectedContractId=C, liveCasRevision=3, pdfHex=b"NOT-A-PDF:synthetic-byte-target".hex(), assets=[{"id": "synthetic-asset", "role": "renderer", "version": "synthetic-v1", "hex": b"NOT-A-RENDERER:synthetic-asset".hex()}])
base = copy.deepcopy(next(v for v in vectors if v["id"] == "v3-classic"))
for id, rows, change in (("new-edition", "R01", {"documentRevisionId": "synthetic-edition-2", "expectedDocumentRevisionId": "synthetic-edition-2"}), ("new-live-cas", "R05", {"liveCasRevision": 4}),
                         ("foreign-context", "R04", {"expectedAgencyId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "expectedStatus": "binding-mismatch"}),
                         ("unknown-source", "V05", {"sourceSchema": "v4", "expectedStatus": "unsupported-profile"}),
                         ("root-self-field", "D05", {"rootExtraField": True, "expectedStatus": "invalid-input"})):
    case = copy.deepcopy(base); case.update(id=id, sourceRows=rows.split(","), **change); vectors.append(case)
for id, change in (("foreign-contract", {"expectedContractId": "dddddddd-dddd-dddd-dddd-dddddddddddd"}), ("stale-edition", {"expectedDocumentRevisionId": "synthetic-old-edition"})):
    case = copy.deepcopy(base); case.update(id=id, sourceRows=["R01", "R04"], expectedStatus="binding-mismatch", **change); vectors.append(case)
for id, flag in (("asset-context-mismatch", "assetContextMismatch"), ("render-template-mismatch", "renderTemplateMismatch"), ("party-context-mismatch", "partyContextMismatch")):
    case = copy.deepcopy(base); case.update(id=id, sourceRows=["R03", "R04"], expectedStatus="binding-mismatch", **{flag: True}); vectors.append(case)
for tag in ("pdf", "asset", "snapshot"):
    for label, blob in (("empty", b""), ("abc", b"abc"), ("metadata-change", b"abc\n")):
        add("bytes-" + tag + "-" + label, "P01,P02,P04,D01,D04", "bytes", domain=DOMAINS[tag], hex=blob.hex())
add("unknown-domain", "D02,V05", "bytes", domain="cp.unknown.draft1", hex="", expectedStatus="unsupported-profile")
add("expected-hash-mismatch", "D03", "bytes", domain=DOMAINS["pdf"], hex="616263", expectedDigest="0" * 64, expectedStatus="digest-mismatch")
add("missing-bytes", "P04", "bytes", domain=DOMAINS["pdf"], expectedStatus="unavailable-input")
for id, edges, expected in (("acyclic", [["snapshot", "root"], ["plan", "root"]], "integrity-match-unverified"),
                            ("cycle", [["plan", "root"], ["root", "plan"]], "ambiguous-input"),
                            ("self-cycle", [["root", "root"]], "ambiguous-input")):
    add("graph-" + id, "A01,D05", "graph-probe", edges=edges, expectedStatus=expected)
for metric, maximum in BUDGETS.items():
    for offset in (-1, 0, 1):
        add("budget-" + metric + "-" + str(offset), "D04,N06", "budget-counter-probe", metric=metric, measured=maximum + offset, expectedStatus="invalid-input" if offset == 1 else "integrity-match-unverified")
for length in (255, 256, 257):
    add("actual-key-bytes-" + str(length), "K03", input={"type": "object", "entries": [["k" * length, node(None)]]}, **({"expectedStatus": "invalid-input"} if length > 256 else {}))
for length in (255, 256, 257):
    add("actual-bigint-digits-" + str(length), "N07", input={"type": "bigint", "decimal": "9" * length}, **({"expectedStatus": "invalid-input"} if length > 256 else {}))
for depth in (31, 32, 33):
    val = node(None)
    for _ in range(depth - 1):
        val = {"type": "array", "elements": [val]}
    add("actual-depth-" + str(depth), "V01", input=val, **({"expectedStatus": "invalid-input"} if depth > 32 else {}))
for id, value, schema in (("unsafe-revision", {"type": "number", "decimal": "9007199254740992"}, "positive"),
                          ("negative-revision", node(-1), "positive"), ("zero-settings-revision", node(0), "settingsRevision"),
                          ("unknown-result-key", node({"status": "signed"}), "result")):
    add(id, "N06,A02", "schema-probe", input=value, schema=schema, expectedStatus="integrity-match-unverified" if id == "zero-settings-revision" else "invalid-input")
rows = [f"{letter}{i:02}" for letter, count in (("K", 5), ("U", 11), ("V", 5), ("N", 7), ("T", 3), ("R", 5), ("P", 6), ("D", 5), ("A", 2)) for i in range(1, count + 1)]
corpus = {"corpusVersion": "cp-reference-corpus-draft1", "status": "PROPOSED", "ownerApproved": False,
          "sourceRows": rows, "vectors": vectors,
          "deferredRows": {"K04": "Raw JSON import is excluded; only duplicate decoded-key semantics probed", "U11": "Raw UTF-8/canonical-byte admission not implemented; embedded-BOM preservation only", "P03": "No PDF generation/re-rendering permitted", "P05": "Real signed incremental-update verifier deferred", "P06": "Content/authority verifier deferred"},
          "pendingVectors": [{"id": name, "status": "UNVERIFIED", "scope": scope} for name, scope in (
              ("native-js-property-boundary", "Applicable: AST corpus does not independently verify native JS descriptors/prototypes/accessors"),
              ("populated-png-screen", "Applicable: exact source predicate specified but non-null logo screening not independently exercised"),
              ("combined-error-precedence", "Applicable: full multi-fault pipeline precedence not independently exercised"),
              ("actual-budget-cost-boundaries", "Applicable: counter models do not prove allocations/work at all byte/node caps"),
              ("populated-prior-edition", "Applicable: non-null lineage shape is specified but binding/history reference cases are not independently exercised"),
              ("raw-json-duplicate-import", "Deferred/excluded raw importer, K04"),
              ("invalid-raw-utf8-admission", "Deferred/excluded raw importer, U11"),
              ("rerendered-pdf-comparison", "Deferred/excluded artifact generation, P03"),
              ("signed-incremental-update", "Deferred real signing verifier, P05"),
              ("pdf-content-authorization", "Deferred content/authority verification, P06"))]}
for name, data in (("schemas-and-registry.proposed.json", proposal), ("corpus-input.json", corpus)):
    (HERE / name).write_text(json.dumps(data, ensure_ascii=True, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"vectors": len(vectors), "sourceRows": len(rows), "schemas": len(defs)}))
