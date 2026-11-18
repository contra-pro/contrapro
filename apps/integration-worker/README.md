# Integration worker — future slice

Reserved for durable Sheets export, notification delivery and reconciliation.
Not executable in P1.1 and not an npm workspace yet. Export jobs must remain
transactional and retries must preserve contract-to-row identity.
