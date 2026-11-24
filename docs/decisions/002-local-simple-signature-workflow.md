# ADR-002 — local simple-signature evidence profile

Status: implemented locally, activation and legal/method acceptance pending.
Date: 2026-11-24 UTC.

The current build-first request authorizes a functional hybrid signing engine.
ADR-001 remains the historical stronger-assurance proposal; its synthetic evidence
validators and rejection of simulated Signed transitions are unchanged.

The local profile `local-simple-v1-no-ip-device` records typed names, explicit review,
identity assertions and versioned FR/AR consent, agency authentication and signing
authority, client invitation/code possession, and exact immutable artifact hashes.
It uses a separate persistent signing-session `completed` state. It does not add a
Signed rental state, claim predicate S has been met, or treat the old synthetic
schema/resolver as an operational verifier.

The actual agency signer is the authenticated initiating membership, which must
still possess explicit `contracts.sign` authority at signing. Ownership alone does
not grant that capability. The client is bound to the captured primary-client ID;
their typed name must match that captured identity. Possession and self-assertion
are recorded as such, not as independently verified legal identity.

Both parties consent against the same issued content. The client also acknowledges
the hash of the preserved agency-appearance revision. The final PDF is a separate
local visual derivative, with both typed appearances, not a cryptographic PDF
signature. Original, intermediate and final bytes/hashes remain distinct.

Higher-assurance selection requires a configured compatible provider; no downgrade
is allowed. An authenticated callback is an observation, never proof of a person's
signature or authority to complete. Provider-specific identity, certificate, trusted
time, evidence verification and byte-preserving external completion remain required.
No provider is configured or activated by this work.

Server timestamps and append-only database/hash-chain evidence are technical
evidence, not independently certified timestamps or absolute tamper-proof records.
No IP address or device information is collected by this profile. Moroccan legal,
identity/method, consent, privacy, retention and provider recognition reviews remain
separate prerequisites for operational activation and any legal assurance claim.
