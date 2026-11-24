// Offline source inventory only. Never executes SQL or resolves live catalog objects.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { isDeepStrictEqual } from 'node:util';
import { readFileSync } from 'node:fs';

const { parse } = createRequire(import.meta.url)('pgsql-parser');
export const sourcePath = 'supabase/migration-drafts/20261120001300_rental_contracts.sql';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
const strings = value => value.map(item => item.String.sval);
const relation = value => {
  if (!value.schemaname || !value.relname) throw new Error('Unqualified relation');
  return `${value.schemaname}.${value.relname}`;
};
const qualified = value => {
  const names = strings(value);
  if (names.length !== 2) throw new Error('Unqualified function');
  return names.join('.');
};
const coreTypes = new Set(['uuid', 'jsonb', 'text', 'int4', 'int8', 'numeric', 'timestamptz', 'bool', 'void', 'trigger']);
const typeName = value => {
  const names = strings(value.names);
  if (names.length === 1 && coreTypes.has(names[0])) return `pg_catalog.${names[0]}`;
  if (names.length === 2 && names[0] === 'pg_catalog' && coreTypes.has(names[1])) return names.join('.');
  throw new Error(`Unreviewed type: ${names.join('.')}`);
};
// Raw-parser positions are not semantics; preserve every other field and body string.
const positionKeys = new Set(['location', 'stmt_location', 'stmt_len', 'rexpr_list_start', 'rexpr_list_end']);
export function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !positionKeys.has(key)).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, child]) => [key, canonical(child)]));
  return value;
}
const fingerprint = value => sha256(JSON.stringify(canonical(value)));
function nodes(value, tag) {
  if (!value || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(item => nodes(item, tag));
  return Object.entries(value).flatMap(([key, child]) => key === tag ? [child] : nodes(child, tag));
}
const ref = (sql, statement) => {
  // Raw parser locations are UTF-8 byte offsets, not JavaScript string offsets.
  const bytes = Buffer.from(sql);
  const start = statement.stmt_location ?? 0;
  const end = statement.stmt_len ? start + statement.stmt_len : bytes.length;
  const prefix = bytes.subarray(0, start).toString('utf8');
  return { path: sourcePath, startLine: prefix.split('\n').length,
    endLine: bytes.subarray(0, end).toString('utf8').split('\n').length };
};

export async function inventory(sql) {
  const ast = await parse(sql);
  const result = { parserVersion: ast.version, tables: [], functions: [], policies: [], triggers: [],
    indexes: [], constraints: [], columnClauses: [], roles: [], privileges: [], rls: [],
    control: [], statementFingerprints: [] };
  for (const statement of ast.stmts) {
    const [tag, item] = Object.entries(statement.stmt)[0];
    const source = ref(sql, statement);
    result.statementFingerprints.push({ tag, sha256: fingerprint(statement.stmt) });
    switch (tag) {
      case 'CreateStmt': {
        const table = relation(item.relation);
        const columns = (item.tableElts ?? []).filter(e => e.ColumnDef).map(e => ({
          name: e.ColumnDef.colname, type: typeName(e.ColumnDef.typeName) }));
        result.tables.push({ name: table, initialOwner: 'migration_executor_UNVERIFIED', columns, source });
        for (const element of item.tableElts ?? []) {
          const column = element.ColumnDef?.colname ?? null;
          const clauses = element.ColumnDef ? (element.ColumnDef.constraints ?? []).map(c => c.Constraint) : [element.Constraint];
          for (const clause of clauses) {
            if (!clause) throw new Error('Unsupported table element');
            const entry = { table, column, kind: clause.contype, name: clause.conname ?? null,
              catalogName: clause.conname ? 'explicit' : 'not_assumed_generated',
              definition: canonical(clause), source };
            if (['CONSTR_PRIMARY', 'CONSTR_UNIQUE', 'CONSTR_FOREIGN', 'CONSTR_CHECK'].includes(clause.contype)) result.constraints.push(entry);
            else result.columnClauses.push(entry); // NOT NULL/default/generated: not invented named catalog constraints.
          }
        }
        break;
      }
      case 'CreateFunctionStmt': {
        const name = qualified(item.funcname);
        const parameters = (item.parameters ?? []).map(p => ({ name: p.FunctionParameter.name,
          type: typeName(p.FunctionParameter.argType), mode: p.FunctionParameter.mode,
          default: canonical(p.FunctionParameter.defexpr ?? null) }));
        if (parameters.some(p => p.mode !== 'FUNC_PARAM_DEFAULT')) throw new Error('Unreviewed argument mode');
        const options = item.options.map(e => e.DefElem);
        const security = options.filter(o => o.defname === 'security');
        const language = options.filter(o => o.defname === 'language');
        if (security.length !== 1 || language.length !== 1) throw new Error('Ambiguous function security/language');
        result.functions.push({ name, signature: `${name}(${parameters.map(p => p.type).join(',')})`,
          parameters, returns: typeName(item.returnType), security: security[0].arg.Boolean.boolval ? 'DEFINER' : 'INVOKER',
          language: language[0].arg.String.sval,
          settings: options.filter(o => o.defname === 'set').map(o => canonical(o.arg.VariableSetStmt)),
          definitionSha256: fingerprint(item),
          securityProvenance: 'CREATE_FUNCTION_STATIC_ONLY', source });
        break;
      }
      case 'CreatePolicyStmt':
        result.policies.push({ table: relation(item.table), name: item.policy_name,
          definition: canonical(item), source });
        break;
      case 'CreateTrigStmt':
        result.triggers.push({ table: relation(item.relation), name: item.trigname,
          functionSignature: `${qualified(item.funcname)}()`, definition: canonical(item), source });
        break;
      case 'IndexStmt':
        result.indexes.push({ name: `${item.relation.schemaname}.${item.idxname}`,
          table: relation(item.relation), definition: canonical(item), source });
        break;
      case 'CreateRoleStmt': result.roles.push({ name: item.role, definition: canonical(item), source }); break;
      case 'GrantStmt': result.privileges.push({ definition: canonical(item), source }); break;
      case 'AlterTableStmt': result.rls.push({ table: relation(item.relation), definition: canonical(item), source }); break;
      case 'TransactionStmt':
      case 'VariableSetStmt':
      case 'DoStmt':
        result.control.push({ tag, definition: canonical(item), source });
        break;
      default: throw new Error(`Unreviewed statement: ${tag}`);
    }
  }
  const proposed = new Set(result.tables.map(t => t.name));
  // Collect structured references plus explicit qualified identifiers in stored bodies.
  // This is lexical evidence, not inferred SQL overloads or dynamic dependency closure.
  const references = new Set(nodes(ast, 'RangeVar').filter(r => r.schemaname).map(relation));
  for (const match of sql.matchAll(/\b(identity|tenancy|app_private|public)\.([a-z_][a-z_0-9]*)/g)) references.add(`${match[1]}.${match[2]}`);
  const createdFunctions = new Set(result.functions.map(f => f.name));
  result.existingReferences = [...references].filter(r => !proposed.has(r) && !createdFunctions.has(r)).sort();
  result.callSites = [...new Map(nodes(ast, 'FuncCall').map(c => {
    const entry = { name: strings(c.funcname).join('.'), arity: c.args?.length ?? 0 };
    return [JSON.stringify(entry), entry];
  })).values()];
  return result;
}

const evidencePath = 'docs/evidence/q16-production-catalog-export.json';
const sortedUnique = values => [...new Set(values)].sort();
const roleName = r => {
  if (r.roletype === 'ROLESPEC_PUBLIC') return 'PUBLIC';
  if (r.roletype === 'ROLESPEC_CSTRING' && r.rolename) return r.rolename;
  throw new Error('Unsupported role reference');
};
const productionUnknowns = () => ({
  migrationExecutorAuthority: 'UNVERIFIED', actualFinalOwners: 'UNVERIFIED',
  effectivePrivilegesAndDefaults: 'UNVERIFIED', helperReturnTypesAndBodies: 'UNVERIFIED',
  runtimeRlsAndTenantIsolation: 'UNVERIFIED', exactOwnershipTargetSet: 'UNVERIFIED_AT_RUNTIME',
});
export const boundaryClaims = () => ({
  migrationExecutor: 'UNKNOWN_NOT_ASSUMED_POSTGRES_SUPERUSER',
  productionPermissions: 'UNVERIFIED',
  ownershipBlock: 'EXPLICIT_SIGNATURE_ALLOWLIST: declarations checked offline; runtime effects and authority UNVERIFIED.',
  effectiveAcl: 'UNVERIFIED: explicit ACL intent is not effective Production privileges.',
  generatedObjects: 'Generated constraint/index/trigger/type names are not allocated or observed by this manifest.',
  references: 'Procedural bodies and dynamic SQL are not complete dependency closure; unqualified overloads are not resolved.',
});

// Derive requirements from structured SQL, not from the manifest's own declarations.
// Q16 supplies observed endpoint identities only; it cannot verify these requirements.
export async function deriveContract(sql, evidenceText = readFileSync(new URL('../../../../docs/evidence/q16-production-catalog-export.json', import.meta.url), 'utf8')) {
  const ast = await parse(sql);
  const statements = ast.stmts;
  const createdTables = new Set(statements.filter(s => s.stmt.CreateStmt).map(s => relation(s.stmt.CreateStmt.relation)));
  const createdRoles = new Set(statements.filter(s => s.stmt.CreateRoleStmt).map(s => s.stmt.CreateRoleStmt.role));
  const createdFunctions = statements.filter(s => s.stmt.CreateFunctionStmt).map(s => s.stmt.CreateFunctionStmt);
  const grants = statements.filter(s => s.stmt.GrantStmt).map(s => ({ item: s.stmt.GrantStmt, source: ref(sql, s) }));
  const tables = sortedUnique(nodes(ast, 'RangeVar').filter(r => r.schemaname).map(relation)).filter(t => !createdTables.has(t));
  const functions = [];
  for (const { item, source } of grants.filter(g => g.item.objtype === 'OBJECT_FUNCTION' && g.item.is_grant)) {
    for (const object of item.objects) {
      const fn = object.ObjectWithArgs;
      const signature = `${qualified(fn.objname)}(${(fn.objargs ?? []).map(typeName).join(',')})`;
      functions.push({ signature, requirement: 'EXECUTE', returnType: 'UNVERIFIED', source });
    }
  }
  functions.sort((a, b) => a.signature.localeCompare(b.signature));
  const schemas = sortedUnique(grants.filter(g => g.item.objtype === 'OBJECT_SCHEMA')
    .flatMap(g => strings(g.item.objects)));
  const aclSubjects = sortedUnique(grants.flatMap(g => g.item.grantees.map(r => roleName(r.RoleSpec))))
    .filter(r => !createdRoles.has(r));
  const keyMap = new Map();
  for (const statement of statements.filter(s => s.stmt.CreateStmt)) {
    for (const fk of nodes(statement.stmt.CreateStmt, 'Constraint').filter(c => c.contype === 'CONSTR_FOREIGN')) {
      const table = relation(fk.pktable);
      if (!createdTables.has(table)) {
        const columns = strings(fk.pk_attrs ?? []);
        if (!columns.length) throw new Error('Unsupported implicit referenced key');
        keyMap.set(JSON.stringify([table, columns]), { table, columns, source: ref(sql, statement) });
      }
    }
  }
  const requiredExistingKeys = [...keyMap.values()].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));

  const bodies = statements.filter(s => s.stmt.DoStmt).map(s => ({ statement: s,
    body: s.stmt.DoStmt.args.find(a => a.DefElem.defname === 'as')?.DefElem.arg.String.sval }));
  const ownership = bodies.filter(b => /\bALTER FUNCTION\b/.test(b.body));
  if (ownership.length !== 1) throw new Error('Unsupported ownership block');
  const { body, statement } = ownership[0];
  const select = body.match(/FOR f IN (SELECT[\s\S]*?)\n LOOP/);
  if (!select) throw new Error('Unsupported ownership selection');
  const selectionAst = await parse(select[1]);
  const selection = selectionAst.stmts[0]?.stmt.SelectStmt;
  const sub = selection?.fromClause?.[0]?.RangeSubselect;
  const values = sub?.subquery?.SelectStmt;
  const columns = ['signature', 'return_type', 'security_definer', 'language_name', 'argument_names', 'source_sha256'];
  if (selectionAst.stmts.length !== 1 || !selection || selection.fromClause.length !== 1 ||
      selection.targetList.length !== 1 || !selection.targetList[0].ResTarget.val.ColumnRef?.fields[0]?.A_Star ||
      !isDeepStrictEqual(Object.keys(selection).sort(), ['targetList', 'fromClause', 'limitOption', 'op'].sort()) ||
      !sub || sub.lateral || sub.alias?.aliasname !== 'allowlist' || strings(sub.alias.colnames).join(',') !== columns.join(',') ||
      !values?.valuesLists || !isDeepStrictEqual(Object.keys(values).sort(), ['valuesLists', 'limitOption', 'op'].sort())) throw new Error('Unsupported exact ownership allowlist');
  const literal = node => {
    if (node.TypeCast) {
      const cast = node.TypeCast;
      if (strings(cast.typeName.names).join('.') !== 'pg_catalog.text' || cast.typeName.arrayBounds?.length !== 1) throw new Error('Unsupported allowlist cast');
      return literal(cast.arg);
    }
    if (node.A_ArrayExpr) return node.A_ArrayExpr.elements.map(literal);
    const value = node.A_Const;
    if (value?.isnull) return null;
    if (value?.sval) return value.sval.sval;
    if (value && Object.hasOwn(value, 'boolval')) return value.boolval.boolval ?? false;
    throw new Error('Nonliteral ownership target');
  };
  const selectedTargets = values.valuesLists.map(row => {
    if (row.List.items.length !== 6) throw new Error('Malformed ownership allowlist row');
    return Object.fromEntries(columns.map((column, i) => [column, literal(row.List.items[i])]));
  });
  const expectedTargets = createdFunctions.map(fn => {
    const options = fn.options.map(o => o.DefElem);
    const names = (fn.parameters ?? []).map(p => p.FunctionParameter.name);
    return { signature: `${qualified(fn.funcname)}(${(fn.parameters ?? []).map(p => typeName(p.FunctionParameter.argType)).join(',')})`,
      return_type: typeName(fn.returnType), security_definer: options.find(o => o.defname === 'security').arg.Boolean.boolval,
      language_name: options.find(o => o.defname === 'language').arg.String.sval,
      argument_names: names.length ? names : null,
      source_sha256: sha256(options.find(o => o.defname === 'as').arg.List.items[0].String.sval.replaceAll('\r\n', '\n')) };
  });
  if (selectedTargets.length !== 18 || new Set(selectedTargets.map(t => t.signature)).size !== 18 ||
      !isDeepStrictEqual(selectedTargets, expectedTargets)) throw new Error('Exact ownership target set disagreement');
  const loops = [...body.matchAll(/FOR f IN (SELECT[\s\S]*?)\n LOOP/g)];
  const expectedAction = await parse("SELECT s.signature,s.ordinality::pg_catalog.int4 AS position, pg_catalog.split_part(s.signature,'.',1) AS nspname FROM pg_catalog.unnest(target_signatures) WITH ORDINALITY AS s(signature,ordinality)");
  if (loops.length !== 2 || JSON.stringify(canonical(await parse(loops[1][1]))) !== JSON.stringify(canonical(expectedAction))) throw new Error('Unsupported exact ownership action source');
  const catalogsInDynamicOwnershipBlock = sortedUnique([...body.matchAll(/\bpg_catalog\.(pg_proc|pg_namespace|pg_language|pg_roles)\b/g)]
    .map(m => `pg_catalog.${m[1]}`));
  const pattern = /EXECUTE format\('((?:[^']|'')*)',f\.signature\);/g;
  const templates = [...body.matchAll(pattern)].map(m => m[1].replaceAll("''", "'"));
  if (templates.length !== 3 || /\bEXECUTE\s/.test(body.replace(pattern, ''))) throw new Error('Unsupported dynamic ownership command');
  const commands = [];
  for (const template of templates) {
    if ((template.match(/%s/g) ?? []).length !== 1) throw new Error('Unsupported ownership placeholder');
    const parsed = await parse(template.replace('%s', 'public.__manifest_target__()'));
    if (parsed.stmts.length !== 1) throw new Error('Unsupported ownership template');
    commands.push(parsed.stmts[0].stmt);
  }
  const owners = commands.filter(c => c.AlterOwnerStmt).map(c => c.AlterOwnerStmt);
  const execute = commands.filter(c => c.GrantStmt?.is_grant).map(c => c.GrantStmt);
  const namespace = body.match(/IF f\.nspname='([a-z_]+)' THEN EXECUTE/);
  if (owners.length !== 1 || execute.length !== 1 || !namespace ||
      execute[0].objtype !== 'OBJECT_FUNCTION' || execute[0].privileges?.length !== 1 ||
      execute[0].privileges[0].AccessPriv.priv_name !== 'execute') throw new Error('Unsupported owner/EXECUTE declaration');
  const declaredOwner = roleName(owners[0].newowner);
  const grantees = sortedUnique(execute[0].grantees.map(r => roleName(r.RoleSpec)));
  const declaredExpectations = createdFunctions.map(fn => {
    const name = qualified(fn.funcname);
    return { signature: `${name}(${(fn.parameters ?? []).map(p => typeName(p.FunctionParameter.argType)).join(',')})`,
      finalOwner: declaredOwner, explicitExecuteGrantees: strings(fn.funcname)[0] === namespace[1] ? grantees : [],
      status: 'DECLARED_DYNAMIC_TEMPLATE_ONLY_NOT_VERIFIED_EFFECT', source: ref(sql, statement) };
  });
  const staticallyVerified = {
    functions: createdFunctions.map(fn => ({ name: qualified(fn.funcname),
      security: fn.options.find(o => o.DefElem.defname === 'security').DefElem.arg.Boolean.boolval ? 'DEFINER' : 'INVOKER',
      settings: canonical(fn.options.filter(o => o.DefElem.defname === 'set').map(o => o.DefElem.arg.VariableSetStmt)) })),
    ownershipSelection: { kind: 'EXPLICIT_SIGNATURE_ALLOWLIST', exactDeclaredTargetSet: true,
      status: 'EXPLICIT_TARGETS_RUNTIME_UNVERIFIED', targets: selectedTargets, templates, source: ref(sql, statement) },
  };

  const rows = JSON.parse(evidenceText);
  if (!Array.isArray(rows) || !rows.length || rows.some(r => !r.addresses || typeof r.object_identity !== 'string' ||
      typeof r.referenced_identity !== 'string' || !Number.isInteger(r.rows_total))) throw new Error('Malformed catalog evidence');
  const tableIdentities = new Set();
  const functionIdentities = new Set();
  for (const r of rows) {
    for (const [classid, subid, identity] of [[r.addresses.classid, r.addresses.subid, r.object_identity],
      [r.addresses.refclassid, r.addresses.refsubid, r.referenced_identity]]) {
      if (String(classid) === '1259' && subid === 0) tableIdentities.add(identity);
      if (String(classid) === '1255' && subid === 0) functionIdentities.add(identity);
    }
  }
  const totals = sortedUnique(rows.map(r => r.rows_total));
  if (totals.length !== 1 || totals[0] < rows.length) throw new Error('Inconsistent catalog evidence');
  return {
    existingDependencies: { schemas, tables, functions, aclSubjects, catalogsInDynamicOwnershipBlock, requiredExistingKeys },
    security: { declaredExpectations, staticallyVerified, productionOnly: productionUnknowns() },
    catalogEvidence: { path: evidencePath, sha256: sha256(evidenceText), exportedRows: rows.length,
      rowsTotal: totals[0], complete: false, provenance: 'SUPPLIED_EXPORT_SERVER_IDENTITY_NOT_VERIFIED',
      observedDependencyTables: tables.filter(t => tableIdentities.has(t)),
      observedHelperSignatures: functions.map(f => f.signature).filter(s => functionIdentities.has(s)),
      missingIsNotAbsence: true, keyEligibilityOwnershipAndPrivileges: 'UNVERIFIED' },
  };
}

export async function validate(sql, manifest) {
  if (manifest.formatVersion !== 2 || manifest.source?.path !== sourcePath) throw new Error('Unsupported manifest/source');
  const actual = await inventory(sql);
  for (const key of Object.keys(actual)) {
    if (!isDeepStrictEqual(actual[key], manifest.inventory[key])) throw new Error(`Manifest disagreement: ${key}`);
  }
  if (!isDeepStrictEqual(Object.keys(actual).sort(), Object.keys(manifest.inventory).sort())) throw new Error('Unexpected inventory fields');
  const derived = await deriveContract(sql);
  // Field-by-field comparison rejects extra/missing keys, duplicates and unsupported claims.
  // This precedes the source hash check: a digest is not dependency correctness proof.
  if (!isDeepStrictEqual(derived.existingDependencies, manifest.existingDependencies)) throw new Error('Dependency disagreement');
  if (!isDeepStrictEqual(derived.security, manifest.security)) throw new Error('Security claim disagreement');
  if (!isDeepStrictEqual(derived.catalogEvidence, manifest.catalogEvidence)) throw new Error('Catalog evidence disagreement');
  if (manifest.status !== 'OFFLINE_DESIGN_ONLY_PRODUCTION_NO_GO' || !isDeepStrictEqual(boundaryClaims(), manifest.boundaries)) throw new Error('Unsupported Production claim');
  if (!isDeepStrictEqual(Object.keys(manifest).sort(), ['formatVersion', 'status', 'source', 'verification', 'boundaries', 'existingDependencies', 'security', 'catalogEvidence', 'inventory'].sort())) throw new Error('Unsupported manifest field');
  if (!isDeepStrictEqual(Object.keys(manifest.source).sort(), ['path', 'sha256', 'references'].sort()) ||
      manifest.source.references !== 'Parser statement spans may include preceding whitespace/comments; no generated catalog names are guessed.' ||
      !isDeepStrictEqual(manifest.verification, {
        command: 'node --test packages/infrastructure/database/tests/rental-contracts-manifest.test.mjs',
        parser: 'installed pgsql-parser PostgreSQL 18 AST; no PostgreSQL 17 runtime proof',
      })) throw new Error('Unsupported manifest metadata');
  if (sha256(sql) !== manifest.source.sha256) throw new Error('Source hash disagreement');
  for (const fn of actual.functions) {
    if (fn.security !== (fn.name.startsWith('public.') ? 'DEFINER' : 'INVOKER')) throw new Error('Unexpected function security');
  }
  return actual;
}
