# ADR-001: Require verified evidence before an operational Signed transition

## Status

**Proposed — design only.** No implementation, provider selection or activation is authorized. Production and real signing remain NO-GO.

## Date

2026-11-21 UTC.

## Context

The offline lifecycle supports Draft → Finalized → Signing pending and rejects Signed. Its V1/V2/V3 presentation snapshots are demonstrations, and the browser PDF action cannot attest which bytes a user saved. The [accepted offline review](../rental-contracts-offline-lifecycle-acceptance-audit-v1.md) did not authorize authentication, durable evidence or real signing.

The [repository architecture](../architecture.md) already preserves agency-first/customer-second signing against immutable document revisions. The [audit-event proposal](../rental-contracts-future-audit-event-contract-v1.md) separates actual state/evidence from requested intent and untrusted recording claims. A future integration must preserve those boundaries and undergo separate Moroccan legal/privacy/method review.

## Proposed decision

Use a provider-neutral application boundary with authoritative identity/agency/capability checks, immutable operational data and rendered-artifact packages, durable scoped command receipts/outbox/inbox, independent evidence verification and consistent state/audit commitment. Preserve agency-person verification before customer dispatch.

An operational Signed transition is reserved for the complete conjunctive [predicate S](../rental-contracts-electronic-signature-architecture-v1.md#predicate-s-the-only-future-authorization-for-signed). Bind every required party's verified identity, authority, fresh authentication, explicit consent/intent, signature proof and trusted time to the exact finalized package and ordered artifact chain. Missing, untrusted, stale, partial or unresolved evidence fails closed.

Keep evidence outside the immutable original content, version decisions append-only and distinguish technical acceptance from legal validity. Content/party changes create a replacement revision and fence prior pending intent; historical facts remain intact. Existing simulation code, Signed rejection and manual print behavior remain unchanged.

## Alternatives considered

| Alternative | Decision / reason |
| --- | --- |
| Mark Signed after button click, PDF download or signature-request creation | Reject: none establishes the person's verified signature/consent or exact captured artifact |
| Accept provider `completed` callbacks directly as Signed | Reject: delivery authenticity, identity, content, ordered parties, time and trust checks are different requirements |
| Treat a drawn/typed image or OTP alone as sufficient | Reject as an unreviewed assumption; any method requires an approved assurance/evidence profile and separate legal assessment |
| Re-render the document whenever evidence is inspected | Reject for binding: visually similar output can have different bytes/content; retain the exact approved artifacts |
| Build an independent signing/key-custody system now | Defer: substantially larger security/trust/legal scope; not authorized by offline acceptance |
| Pin a specific vendor before defining evidence/failure contracts | Defer: assess capabilities and proof/hosting/export terms against the boundary first; no vendor selected |

## Consequences

More explicit artifact, identity, audit and reconciliation work is required before external dispatch. A simple callback-driven integration is intentionally insufficient. Partial outages may leave a visible unresolved state rather than show optimistic success. A replacement revision requires fresh intent and consent; partial old proof is not silently recycled.

This decision enables bounded offline codecs/policy/fault-model milestones, not real signing. Approval requires the architecture's legal/privacy, identity, artifact, durability, provider/verifier and release gates. If a later method/profile changes these requirements, record a superseding decision rather than weakening this document silently.

## Related proposals

- [Architecture, matrix and roadmap](../rental-contracts-electronic-signature-architecture-v1.md).
- [Evidence schema](../rental-contracts-signing-evidence-schema-v1.md).
- [Provider boundary](../rental-contracts-signing-provider-boundary-v1.md).
- [Threat model](../rental-contracts-signing-threat-model-v1.md).
