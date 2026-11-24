import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "pgsql-parser";
import { parsePlPgSQL } from "libpg-query";
import { nodes } from "./sql-helpers";

const path = new URL("../../../../supabase/migration-drafts/20261120001300_rental_contracts.sql", import.meta.url);
const source = () => readFileSync(path, "utf8");

describe("rental contracts LOCAL DRAFT — static checks, no SQL execution", () => {
  it("parses SQL and procedural bodies", async () => {
    const ast = await parse(source());
    expect(nodes(ast, "TransactionStmt").map(s => s.kind)).toEqual(["TRANS_STMT_BEGIN", "TRANS_STMT_ROLLBACK"]);
    // The offline parser has no catalog to resolve %ROWTYPE field assignments.
    // Parse procedural syntax with anonymous records; real type resolution is NOT tested.
    expect(await parsePlPgSQL(source().replace(/(?:app_private|tenancy)\.\w+%ROWTYPE/g, "record"))).toBeDefined();
  });
  it("is deliberately blocked from deployment and installs no extensions", () => {
    const sql = source();
    expect(sql).toContain("RAISE EXCEPTION 'LOCAL DESIGN ONLY");
    expect(sql).not.toMatch(/CREATE\s+EXTENSION/i);
    expect(sql).not.toContain("INSERT INTO supabase_migrations");
  });
  it("uses tenant-safe references and immutable receipts", () => {
    const sql = source();
    for (const table of ["clients", "vehicles", "memberships"]) {
      expect(sql).toContain(`REFERENCES tenancy.${table}(agency_id,id)`);
    }
    expect(sql).toContain("PRIMARY KEY(agency_id,creator_user_id,creation_key)");
    expect(sql).toContain("receipt.payload IS DISTINCT FROM normalized");
    expect(sql).toContain("RETURN receipt.result");
    expect(sql).toContain("BEFORE UPDATE OR DELETE ON app_private.rental_creation_receipts");
  });
  it("pins security settings and grants no direct authenticated writes", () => {
    const sql = source();
    const functions = [...sql.matchAll(/CREATE FUNCTION[\s\S]*?AS \$f\$/g)].map(m => m[0]);
    expect(functions.length).toBeGreaterThan(8);
    for (const fn of functions) {
      expect(fn).toContain("SET search_path=pg_catalog,pg_temp");
      expect(fn).toContain("SET row_security=on");
    }
    expect(sql).not.toMatch(/GRANT\s+(?:INSERT|UPDATE|DELETE|ALL)[^;]*TO authenticated/i);
    expect(sql).toContain("m.state='active' AND a.state='active'");
  });
  it("serializes reservation changes and prevents overdue handover", () => {
    const sql = source();
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("current_setting('transaction_isolation')<>'read committed'");
    expect(sql).toContain("tstzrange(c.starts_at,c.ends_at,'[)') && tstzrange(p_start,p_end,'[)')");
    expect(sql).toContain("c.state='en_cours'");
    expect(sql).toContain("IF r.version<>p_version THEN");
  });
  it("uses exact pricing and atomic audit", () => {
    const sql = source();
    expect(sql).toContain("ceil(extract(epoch FROM (p_end-p_start))/86400)");
    expect(sql).toContain("p_rate<>trunc(p_rate)");
    expect(sql).toContain("AT TIME ZONE 'Africa/Casablanca'");
    expect(sql).toContain("INSERT INTO tenancy.audit_events");
  });
  it("keeps drafts unnumbered and issues numbers at confirmation time only", () => {
    const sql = source();
    const create = sql.split("CREATE FUNCTION public.contratpro_rental_create")[1]!.split("END $f$;")[0]!;
    expect(create).not.toContain("rental_number(");
    expect(sql).toContain("confirmation_at:=clock_timestamp()");
    expect(sql).toContain("app_private.rental_number(p_agency,confirmation_at)");
    expect(sql).toContain("state<>'brouillon' OR number_serial IS NULL");
    const confirmation = sql.split("ELSIF p_operation='confirm' AND r.state='brouillon' THEN")[1]!.split("ELSIF p_operation='start'")[0]!;
    expect(confirmation.indexOf("rental_available(")).toBeLessThan(confirmation.indexOf("rental_number("));
    expect(sql.indexOf("INSERT INTO app_private.rental_confirmation_receipts VALUES")).toBeGreaterThan(sql.lastIndexOf("INSERT INTO tenancy.audit_events"));
  });
  it("does not truncate numbers after 9999 and guards the actual bigint limit", () => {
    const sql = source();
    expect(sql).toContain("number_serial bigint");
    expect(sql).toContain("greatest(4,length(number_serial::text))");
    expect(sql).toContain("last_value<9223372036854775807");
    expect(sql).not.toContain("last_value<9999");
    expect(sql).toContain("PRIMARY KEY(agency_id,year)");
  });
  it("replays confirmation before stale checks and preserves issued numbers", () => {
    const sql = source();
    expect(sql.indexOf("RETURN confirmed.result")).toBeLessThan(sql.indexOf("IF r.version<>p_version THEN"));
    expect(sql).toContain("confirmed.request_id=p_request AND confirmed.expected_version=p_version");
    expect(sql).toContain("INSERT INTO app_private.rental_confirmation_receipts");
    expect(sql).toContain("OLD.number_serial IS NOT NULL");
    expect(sql).toContain("BEFORE UPDATE OR DELETE ON tenancy.rental_contracts");
  });
  it("allows only confirmed and ongoing extensions without changing the rate", () => {
    const branch = source().split("ELSIF p_operation='extend' THEN")[1]!.split("ELSIF p_operation='confirm'")[0]!;
    expect(branch).toContain("r.state NOT IN('confirme','en_cours')");
    expect(branch).toContain("new_end<=r.ends_at");
    expect(branch).not.toContain("r.daily_rate_minor:=");
  });
  it("requires an explicit return and forbids cancellation after handover", () => {
    const sql = source();
    expect(sql).toContain("p_data IS DISTINCT FROM '{\"vehicleReturned\":true}'::jsonb");
    expect(sql).toContain("r.returned_at:=clock_timestamp()");
    expect(sql).toContain("r.return_membership_id:=member_id");
    expect(sql).toContain("p_return_confirmed boolean");
    expect(sql).toContain("p_operation='cancel' AND r.state IN('brouillon','confirme')");
    expect(sql).not.toContain("p_operation='cancel' AND r.state='en_cours'");
  });
  it("reports physical unavailability without changing future reservations", () => {
    const sql = source();
    expect(sql).toContain("'physicalUnavailable'");
    expect(sql).toContain("'overdueConflict'");
    expect(sql).toContain("WHERE agency_id=p_agency AND id=p_id RETURNING * INTO r");
    expect(sql).toContain("CREATE UNIQUE INDEX rental_one_handover");
    expect(sql).not.toContain("CREATE TABLE app_private.rental_policy");
  });
});
