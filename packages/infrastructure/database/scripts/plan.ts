import { loadMigrations, planChecksum } from "../src/migrations/manifest.ts";

const plan = await loadMigrations();
console.log(JSON.stringify({ migrations: plan.map(({ id, checksum }) => ({ id, checksum })), planSha256: planChecksum(plan) }, null, 2));
