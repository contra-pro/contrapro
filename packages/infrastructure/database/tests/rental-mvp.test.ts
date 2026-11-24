import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("rental MVP: restricted RPC workflows, archives, immutable parties, drivers, isolation and rollback", async () => {
  const db = new PGlite(); const root = new URL("../../../../", import.meta.url);
  const read = (file: string) => readFileSync(new URL(file, root), "utf8");
  const uuid = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const subject = uuid(1), user = uuid(2), agency = uuid(3), otherSubject = uuid(4), otherUser = uuid(5), otherAgency = uuid(6);
  let sequence = 100;
  async function asUser(sql: string, params: unknown[] = [], sub = subject) {
    await db.exec("BEGIN; SET LOCAL ROLE authenticated;");
    try { await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [sub]);
      const result = await db.query<{ value: unknown }>(sql, params); await db.exec("COMMIT"); return result.rows[0]?.value;
    } catch (error) { await db.exec("ROLLBACK"); throw error; }
  }
  async function rpc(name: string, args: unknown[], sub = subject) {
    return asUser(`SELECT public.contratpro_rental_${name}(${args.map((_, index) => `$${index + 1}`).join(",")}) AS value`, args, sub);
  }
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE authenticator;
      CREATE ROLE contratpro_migration_owner NOINHERIT; CREATE ROLE contratpro_runtime NOINHERIT; CREATE ROLE contratpro_platform_runtime NOINHERIT;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated'::text $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$; GRANT USAGE ON SCHEMA auth TO PUBLIC;`);
    for (const file of readdirSync(new URL("supabase/migrations/", root)).sort()) await db.exec(`BEGIN; ${read(`supabase/migrations/${file}`)} COMMIT;`);
    await db.exec(`BEGIN; ${read("supabase/migration-drafts/20261118000800_vehicles.sql")} COMMIT;`);
    const receipt = read("supabase/migration-drafts/contratpro_0009_production_candidate_v3.sql");
    await db.exec(receipt.slice(receipt.indexOf("CREATE FUNCTION app_private.receipt_auth_uid()"), receipt.indexOf("-- Dedicated least-privilege owner:")));
    // Explicit embedded-only projections of guarded drafts. Never modify source,
    // run a migration CLI or use the remote executor to remove their barriers.
    for (const file of ["20261120001300_rental_contracts.sql", "20261122001500_rental_mvp.sql"]) {
      if (file.includes("0015")) await db.exec(`BEGIN; ${read("supabase/migration-drafts/20261122001400_vehicle_module.sql")} COMMIT;`);
      const source = read(`supabase/migration-drafts/${file}`);
      expect(source).toContain("RAISE EXCEPTION 'LOCAL DESIGN ONLY:"); expect(source.trim()).toMatch(/ROLLBACK;$/);
      const projection = source.replace(/DO \$guard\$[\s\S]*?END \$guard\$;/, "").replace(/ROLLBACK;\s*$/, "COMMIT;");
      await db.exec(projection);
    }
    for (const [sub, uid, aid] of [[subject, user, agency], [otherSubject, otherUser, otherAgency]]) {
      await db.query("INSERT INTO auth.users VALUES($1)", [sub]);
      await db.query("INSERT INTO identity.users(id,state) VALUES($1,'active')", [uid]);
      await db.query("INSERT INTO identity.supabase_users(supabase_user_id,user_id) VALUES($1,$2)", [sub, uid]);
      await db.query("INSERT INTO tenancy.agencies(id,name,state) VALUES($1,'Synthetic agency','active')", [aid]);
      await db.query("INSERT INTO tenancy.memberships(id,agency_id,user_id) VALUES($1,$2,$3)", [uuid(sequence++), aid, uid]);
      const role = uuid(sequence++);
      await db.query("INSERT INTO tenancy.roles(id,agency_id,key,name) VALUES($1,$2,'owner','Owner')", [role, aid]);
      await db.query("INSERT INTO tenancy.membership_roles SELECT agency_id,id,$1 FROM tenancy.memberships WHERE user_id=$2", [role, uid]);
      await db.query("INSERT INTO tenancy.role_permissions VALUES($1,$2,'agency.manage')", [aid, role]);
    }
    const makeClient = (aid = agency, sub = subject) => asUser("SELECT public.contratpro_client_create($1,$2,$3::jsonb) AS value", [aid, uuid(sequence++), JSON.stringify({ firstName: "Synthetic", lastName: "Driver", phone: "+212600000000", email: "", nationality: "", identityType: "none", identityNumber: "", licenceNumber: "", licenceIssueDate: "", licenceExpiryDate: "", address: "", city: "", notes: "" })], sub);
    const makeVehicle = () => asUser("SELECT public.contratpro_vehicle_create($1,$2,$3::jsonb) AS value", [agency, uuid(sequence++), JSON.stringify({ registration: `TEST-${sequence}`, make: "Fixture", model: "Test", year: "2026", mileage: "0" })]);
    const client = await makeClient(), driver = await makeClient(), foreignClient = await makeClient(otherAgency, otherSubject), vehicle = await makeVehicle();
    const input = { clientId: client, vehicleId: vehicle, start: "2026-12-01T09:00:00Z", end: "2026-12-02T09:00:00Z", dailyRateMinor: 10000 };
    const key = uuid(sequence++); const created = await rpc("create", [agency, key, JSON.stringify(input)]) as { id: string; version: number };
    expect(await rpc("create", [agency, key, JSON.stringify(input)])).toEqual(created);
    await expect(rpc("create", [agency, key, JSON.stringify({ ...input, dailyRateMinor: 20000 })])).rejects.toMatchObject({ code: "40001" });
    await expect(rpc("create", [agency, uuid(sequence++), JSON.stringify({ ...input, clientId: foreignClient })])).rejects.toMatchObject({ code: "22023" });
    await expect(rpc("detail_v2", [agency, created.id], otherSubject)).rejects.toMatchObject({ code: "42501" });
    await expect(rpc("set_driver", [agency, created.id, 1, uuid(sequence++), foreignClient])).rejects.toMatchObject({ code: "22023" });
    expect(await rpc("set_driver", [agency, created.id, 1, uuid(sequence++), driver])).toMatchObject({ version: 2 });
    await expect(rpc("cancel", [agency, created.id, 1, uuid(sequence++)])).rejects.toMatchObject({ code: "40001" });
    const confirmationKey = uuid(sequence++);
    const confirmed = await rpc("confirm", [agency, created.id, 2, confirmationKey]);
    expect(confirmed).toMatchObject({ state: "confirme", version: 3 });
    expect(await rpc("confirm", [agency, created.id, 2, confirmationKey])).toEqual(confirmed);
    const issued = await rpc("document", [agency, created.id]) as { parties: unknown };
    expect(issued).toMatchObject({ schemaVersion: 1, version: 3, signatures: { order: ["agency", "client"], agency: null, client: null }, evidence: null });
    await asUser("UPDATE tenancy.clients SET first_name='Changed source' WHERE id=$1", [client]);
    expect((await rpc("document", [agency, created.id]) as { parties: unknown }).parties).toEqual(issued.parties);
    await expect(rpc("set_driver", [agency, created.id, 3, uuid(sequence++), null])).rejects.toMatchObject({ code: "22023" });
    expect(await rpc("extend", [agency, created.id, 3, uuid(sequence++), JSON.stringify({ end: "2026-12-03T09:00:00Z" })])).toMatchObject({ version: 4 });
    expect((await rpc("document", [agency, created.id]) as { parties: unknown }).parties).toEqual(issued.parties);
    const detail = await rpc("detail_v2", [agency, created.id]); expect(detail).toMatchObject({ total_minor: "20000", daily_rate_minor: "10000", version: 4 });
    await asUser("SELECT public.contratpro_vehicle_archive($1,$2,1) AS value", [agency, vehicle]);
    expect(await rpc("detail_v2", [agency, created.id])).toMatchObject({ vehicle_id: vehicle });
    expect(await rpc("create", [agency, key, JSON.stringify(input)])).toEqual(created);
    await expect(rpc("create", [agency, uuid(sequence++), JSON.stringify(input)])).rejects.toMatchObject({ code: "22023" });
    expect(await rpc("choices", [agency, "vehicle", "", 1])).toMatchObject({ items: [], total: 0 });
    expect(await rpc("cancel", [agency, created.id, 4, uuid(sequence++)])).toMatchObject({ version: 5, state: "annule" });
    await expect(rpc("extend", [agency, created.id, 5, uuid(sequence++), JSON.stringify({ end: "2026-12-04T09:00:00Z" })])).rejects.toMatchObject({ code: "22023" });
    expect(await rpc("list", [agency, 1])).toMatchObject({ total: 1 });
    const secondVehicle = await makeVehicle();
    const ongoingInput = { ...input, vehicleId: secondVehicle, start: new Date(Date.now() - 3600000).toISOString(), end: new Date(Date.now() + 3600000).toISOString() };
    const ongoing = await rpc("create", [agency, uuid(sequence++), JSON.stringify(ongoingInput)]) as { id: string };
    expect(await rpc("update_draft", [agency, ongoing.id, 1, uuid(sequence++), JSON.stringify({ ...ongoingInput, dailyRateMinor: 20000 })])).toMatchObject({ version: 2 });
    await rpc("confirm", [agency, ongoing.id, 2, uuid(sequence++)]);
    const overlap = await rpc("create", [agency, uuid(sequence++), JSON.stringify(ongoingInput)]) as { id: string };
    await expect(rpc("confirm", [agency, overlap.id, 1, uuid(sequence++)])).rejects.toMatchObject({ code: "23P01" });
    expect(await rpc("start", [agency, ongoing.id, 3, uuid(sequence++)])).toMatchObject({ state: "en_cours", version: 4 });
    await expect(rpc("cancel", [agency, ongoing.id, 4, uuid(sequence++)])).rejects.toMatchObject({ code: "22023" });
    await expect(rpc("complete", [agency, ongoing.id, 4, uuid(sequence++), false])).rejects.toMatchObject({ code: "22023" });
    expect(await rpc("complete", [agency, ongoing.id, 4, uuid(sequence++), true])).toMatchObject({ state: "termine", version: 5 });
    await expect(rpc("update_draft", [agency, ongoing.id, 5, uuid(sequence++), JSON.stringify(ongoingInput)])).rejects.toMatchObject({ code: "22023" });
    const archivedBeforeConfirmation = await rpc("create", [agency, uuid(sequence++), JSON.stringify({ ...input, vehicleId: secondVehicle })]) as { id: string };
    await asUser("SELECT public.contratpro_vehicle_archive($1,$2,1) AS value", [agency, secondVehicle]);
    await expect(rpc("confirm", [agency, archivedBeforeConfirmation.id, 1, uuid(sequence++)])).rejects.toMatchObject({ code: "22023" });
    expect(await rpc("detail_v2", [agency, archivedBeforeConfirmation.id])).toMatchObject({ state: "brouillon", version: 1, contract_number: null });
    // A downstream audit failure rolls the new contract/receipt/document back too.
    const rollbackVehicle = await makeVehicle();
    const counts = async () => (await db.query("SELECT (SELECT count(*)::int FROM tenancy.rental_contracts) AS contracts,(SELECT count(*)::int FROM app_private.rental_creation_receipts) AS receipts")).rows;
    const before = await counts();
    await db.exec(`CREATE FUNCTION public.synthetic_audit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic failure'; END $$;
      CREATE TRIGGER synthetic_audit_failure BEFORE INSERT ON tenancy.audit_events FOR EACH ROW EXECUTE FUNCTION public.synthetic_audit_failure();`);
    await expect(rpc("create", [agency, uuid(sequence++), JSON.stringify({ ...input, vehicleId: rollbackVehicle })])).rejects.toMatchObject({ code: "P0001" });
    expect(await counts()).toEqual(before);
    await db.exec("DROP TRIGGER synthetic_audit_failure ON tenancy.audit_events; DROP FUNCTION public.synthetic_audit_failure();");
    await expect(asUser("SELECT * FROM app_private.rental_document_versions")).rejects.toMatchObject({ code: "42501" });
    await expect(asUser("DELETE FROM tenancy.rental_contracts WHERE id=$1", [created.id])).rejects.toMatchObject({ code: "42501" });
    await db.query("UPDATE tenancy.memberships SET state='revoked' WHERE user_id=$1", [user]);
    await expect(rpc("list", [agency, 1])).rejects.toMatchObject({ code: "42501" });
    const protectedTables = await db.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid IN ('tenancy.rental_contracts'::regclass,'app_private.rental_drivers'::regclass,'app_private.rental_document_versions'::regclass)");
    expect(protectedTables.rows).toEqual(Array.from({ length: 3 }, () => ({ relrowsecurity: true, relforcerowsecurity: true })));
  } finally { await db.close(); }
}, 120_000);
