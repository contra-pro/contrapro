import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { expect, it } from "vitest";

it("vehicle module: real PostgreSQL RPCs, tenant RLS, capabilities, uniqueness and archive", async () => {
  // Embedded PostgreSQL only. Auth claims are simulated, not live gateway evidence.
  const db = new PGlite();
  const uuid = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const agency = uuid(1), other = uuid(2), subject = uuid(3), foreignSubject = uuid(4), staff = uuid(5);
  const input = { registration: "AB-123", make: "Dacia", model: "Duster", year: "2026", mileage: "100" };
  async function asUser(sql: string, params: unknown[] = [], sub = subject) {
    await db.exec("BEGIN; SET LOCAL ROLE authenticated;");
    try {
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [sub]);
      const result = await db.query<{ value: unknown }>(sql, params);
      await db.exec("COMMIT"); return result.rows[0]?.value;
    } catch (error) { await db.exec("ROLLBACK"); (error as Error).message += ` [statement: ${sql}]`; throw error; }
  }
  const create = (a: string, key: number, data = input, sub = subject) => asUser("SELECT public.contratpro_vehicle_create($1,$2,$3::jsonb) AS value", [a, uuid(key), JSON.stringify(data)], sub);
  const detail = (a: string, id: unknown, sub = subject) => asUser("SELECT public.contratpro_vehicle_detail($1,$2) AS value", [a, id], sub);
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE authenticator;
      CREATE ROLE contratpro_migration_owner NOINHERIT; CREATE ROLE contratpro_runtime NOINHERIT; CREATE ROLE contratpro_platform_runtime NOINHERIT;
      CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated'::text $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$ SELECT '{}'::jsonb $$; GRANT USAGE ON SCHEMA auth TO PUBLIC;`);
    const migrations = new URL("../../../../supabase/migrations/", import.meta.url);
    for (const file of readdirSync(migrations).sort()) await db.exec(`BEGIN; ${readFileSync(new URL(file, migrations), "utf8")} COMMIT;`);
    for (const file of ["20261118000800_vehicles.sql", "20261122001400_vehicle_module.sql"]) {
      await db.exec(`BEGIN; ${readFileSync(new URL(`../../../../supabase/migration-drafts/${file}`, import.meta.url), "utf8")} COMMIT;`);
    }
    for (const [index, sub, a, roleKey] of [[10, subject, agency, "owner"], [20, foreignSubject, other, "owner"], [30, staff, agency, "archiver"]] as const) {
      await db.query("INSERT INTO auth.users VALUES($1)", [sub]);
      await db.query("INSERT INTO identity.users(id,state) VALUES($1,'active')", [uuid(index)]);
      await db.query("INSERT INTO identity.supabase_users(supabase_user_id,user_id) VALUES($1,$2)", [sub, uuid(index)]);
      if (roleKey === "owner") await db.query("INSERT INTO tenancy.agencies(id,name,state) VALUES($1,'Test','active')", [a]);
      await db.query("INSERT INTO tenancy.memberships(id,agency_id,user_id) VALUES($1,$2,$3)", [uuid(index+1), a, uuid(index)]);
      await db.query("INSERT INTO tenancy.roles(id,agency_id,key,name) VALUES($1,$2,$3,'Test')", [uuid(index+2), a, roleKey]);
      await db.query("INSERT INTO tenancy.membership_roles VALUES($1,$2,$3)", [a, uuid(index+1), uuid(index+2)]);
      for (const permission of roleKey === "owner" ? ["agency.manage"] : ["vehicles.read", "vehicles.archive"]) {
        await db.query("INSERT INTO tenancy.role_permissions VALUES($1,$2,$3)", [a, uuid(index+2), permission]);
      }
    }
    const id = await create(agency, 100);
    expect(await create(agency, 100)).toBe(id);
    expect(await detail(agency, id)).toMatchObject({ ...input, category: "unspecified", rentalStatus: "unknown", state: "active", version: 1 });
    await expect(create(agency, 101, { ...input, registration: "ab-123" })).rejects.toMatchObject({ code: "40001" });
    const foreign = await create(other, 102, input, foreignSubject);
    expect(await detail(agency, foreign)).toBeNull();
    expect(await detail(other, foreign)).toBeNull();
    await expect(create(other, 103)).rejects.toMatchObject({ code: "42501" });
    await expect(asUser("SELECT public.contratpro_vehicle_update($1,$2,1,$3::jsonb) AS value", [agency, foreign, JSON.stringify(input)])).rejects.toMatchObject({ code: "P0002" });
    await expect(create(agency, 104, input, staff)).rejects.toMatchObject({ code: "42501" });
    await expect(asUser("SELECT public.contratpro_vehicle_update($1,$2,1,$3::jsonb) AS value", [agency, id, JSON.stringify(input)], staff)).rejects.toMatchObject({ code: "42501" });
    const updated = { ...input, mileage: "250", category: "suv", fuelType: "diesel", transmission: "manual", rentalStatus: "available" };
    expect(await asUser("SELECT public.contratpro_vehicle_update($1,$2,1,$3::jsonb) AS value", [agency, id, JSON.stringify(updated)])).toBe(true);
    expect(await detail(agency, id)).toMatchObject({ ...updated, version: 2 });
    await expect(asUser("SELECT public.contratpro_vehicle_update($1,$2,1,$3::jsonb) AS value", [agency, id, JSON.stringify(input)])).rejects.toMatchObject({ code: "40001" });
    expect(await asUser("SELECT public.contratpro_vehicles_search($1,'Duster',1) AS value", [agency])).toMatchObject({ total: 1 });
    expect(await asUser("SELECT public.contratpro_vehicles_search($1,'%',1) AS value", [agency])).toMatchObject({ total: 0 });
    await expect(asUser("UPDATE tenancy.vehicles SET state='archived',model='Changed' WHERE id=$1", [id], staff)).rejects.toMatchObject({ code: "40001" });
    await expect(asUser("UPDATE tenancy.vehicles SET agency_id=$1 WHERE id=$2", [other, id])).rejects.toMatchObject({ code: "42501" });
    await expect(asUser("DELETE FROM tenancy.vehicles WHERE id=$1", [id])).rejects.toMatchObject({ code: "42501" });
    expect(await asUser("SELECT public.contratpro_vehicle_archive($1,$2,2) AS value", [agency, id], staff)).toBe(true);
    expect(await detail(agency, id)).toBeNull();
    expect(await asUser("SELECT count(*)::integer AS value FROM tenancy.vehicles WHERE id=$1", [id])).toBe(1);
    expect(await asUser("SELECT count(*)::integer AS value FROM tenancy.vehicles WHERE id=$1", [id], foreignSubject)).toBe(0);
    await expect(asUser("UPDATE tenancy.vehicles SET state='active' WHERE id=$1", [id])).resolves.toBeUndefined();
    expect((await db.query("SELECT state FROM tenancy.vehicles WHERE id=$1", [id])).rows).toEqual([{ state: "archived" }]);
    expect(await asUser("SELECT public.contratpro_vehicles_list($1,1) AS value", [agency])).toMatchObject({ total: 0, items: [] });
    await expect(create(agency, 105)).rejects.toMatchObject({ code: "40001" });
    await expect(create(agency, 107, { ...input, ...{ fuelType: "invalid" } })).rejects.toMatchObject({ code: "22023" });
    await expect(create(agency, 108, { ...input, ...{ agencyId: other } })).rejects.toMatchObject({ code: "22023" });
    const rented = await create(agency, 106, { ...input, registration: "RENTED", ...{ rentalStatus: "rented" } });
    await expect(asUser("SELECT public.contratpro_vehicle_archive($1,$2,1) AS value", [agency, rented])).rejects.toMatchObject({ code: "40001" });
    await db.query("UPDATE tenancy.memberships SET state='revoked' WHERE user_id=$1", [uuid(30)]);
    expect(await detail(agency, rented, staff)).toBeNull();
    await expect(asUser("SELECT public.contratpro_vehicle_archive($1,$2,1) AS value", [agency, rented], staff)).rejects.toMatchObject({ code: "42501" });
    expect((await db.query("SELECT relrowsecurity,relforcerowsecurity FROM pg_class WHERE oid='tenancy.vehicles'::regclass")).rows).toEqual([{ relrowsecurity: true, relforcerowsecurity: true }]);
  } finally { await db.close(); }
}, 120_000);
