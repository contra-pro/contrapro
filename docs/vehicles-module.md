# Vehicles module

The existing authenticated agency workspace, vehicle routes, handler, Supabase SSR client and invoker RPC architecture are extended in place. No Auth, Clients, agency membership or signing changes are required.

## Database prerequisite and activation

`supabase/migration-drafts/20261122001400_vehicle_module.sql` is a prepared forward migration, not a deployed migration. It requires the canonical 0000–0007 schema plus the exact existing `20261118000800_vehicles.sql` vehicle schema. Historical 0008 bytes and migration manifests are unchanged. The new draft is intentionally outside automatic migration discovery; it needs a reviewed runner inventory entry and explicit target approval before remote execution. Do not blindly replay 0008 on an existing database or assume deployed variants match local files. Rental draft 0013 and Offline Digest are independent prerequisites of neither vehicle migration.

Before any authorized execution: identify the development project and current deployed history/schema, verify the expected existing RPC signatures, grants, policies and trigger, take a recoverable backup, and apply the approved forward migration and history record atomically as the established migration executor. Unexpected ACLs fail the transaction. Never apply this draft to production as part of local testing.

`CONTRATPRO_VEHICLES_VERIFIED` remains unchanged. Keep it disabled until the actual target passes contract and authorization acceptance. The application now requires numeric `contractVersion: 2` plus all four permissions from the permissions RPC, so an old database fails closed even if a flag is accidentally enabled. Changing a flag cannot replace database compatibility verification.

## Behavior

Persisted fields are registration, make/brand, model, year and mileage plus category, fuel type, transmission and rental status. The new categorical values are defined in `packages/application/src/vehicles.ts` and constrained again in SQL. Existing rows receive unspecified/unknown defaults, never invented fleet facts. Rental status is a manually maintained fleet label, not booking availability or a rental conflict check. Future rental integration must respect active vehicle state and introduce authoritative reservation rules separately.

Registration keeps the existing rule: trim surrounding whitespace, permit letters/numbers/spaces/slashes/hyphens with an initial letter/number, maximum 24 characters, and enforce unique `upper(registration)` within an agency. Spaces and punctuation are not otherwise rewritten. Archived registrations remain reserved. There is no hard-delete or restore flow.

Create uses a stable UUID request key and the existing advisory transaction lock/current-payload retry semantics. Update and archive require a matching version. Confirmation reads precede application success. Unknown save results require a reload; no automatic mutation retries occur. Archive requires its own capability and explicit UI confirmation, rejects a currently rented label, and cannot also change vehicle fields. Archived rows cannot be edited or restored.

FORCE RLS and the existing agency read policy remain enabled. Active-only list/search/detail RPCs remove archived records from application views. Authorized readers may still read their own agency's archived records through direct SQL; the original tenant SELECT boundary is preserved so PostgreSQL can validate the archive UPDATE's resulting row. Cross-agency access remains denied. No SECURITY DEFINER vehicle function or service-role application path is introduced.

Search is literal, bounded to 100 characters and sent through the same-origin POST handler; `%` and `_` are not wildcards. Pagination is bounded to 20 rows. FR/AR labels reuse the locale layout's RTL and existing responsive form styles. Busy states, labels, validation descriptions, confirmation and sanitized failure messages are included.

## Verification and live acceptance

`packages/infrastructure/database/tests/vehicle-module.test.ts` applies baseline, 0008 and the forward migration only to embedded in-memory PostgreSQL. It exercises real SQL, RLS and invoker functions using restricted authenticated roles with simulated Auth claims. It is not evidence about deployed Supabase, JWT verification, concurrent sessions or remote migration history.

After separately authorized development migration and compatibility verification:

1. Sign in normally, select agency A, and open `/fr/app/vehicles` and `/ar/app/vehicles`. Check RTL, keyboard access, empty/loading/error states and mobile layout.
2. Create a vehicle with all nine attributes. Reload its detail, update mileage/status, reload again, and search by registration or brand. Confirm values persisted.
3. Submit a case-insensitive duplicate registration in A: expect a safe conflict. The same registration in agency B is allowed.
4. As an account with membership only in B, open A's detail URL and attempt create/update/archive targeting A: no read or write must succeed. Also check an agency member lacking create/update/archive capabilities.
5. Archive a non-rented vehicle after confirmation; reload list/detail and verify it is absent. A rented label must block archive. Two tabs editing one version must produce a conflict for the stale tab.
6. Recheck existing sign-in, agency selection and client create/reload journeys. Do not activate electronic signing.

## Rollback

Any migration/preflight/test failure before commit must roll back the whole transaction and history write. Keep the vehicle gate disabled on incompatibility. After committed writes, disable the gate and investigate; use a reviewed forward correction or restore plan rather than dropping columns, deleting vehicles, rewriting 0008 or resetting shared data. Old application code is incompatible with the version-2 permissions payload; gate it off before any application rollback. Preserve archived state, registration uniqueness and request keys.
