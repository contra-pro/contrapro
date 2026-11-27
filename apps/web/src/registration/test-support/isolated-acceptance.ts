import type {LegalRelease} from "../model";
/** Test dependency factory only. Never imported by an application route/runtime. */
export function isolatedLegalFixtures(environment:Readonly<Record<string,string|undefined>>=process.env){
  if(process.env.NODE_ENV!=="test"||environment.NODE_ENV!=="test"||environment.VITEST!=="true"||(globalThis as Record<symbol,unknown>)[Symbol.for("contratpro.isolated-verification")]!==true)throw Error("ISOLATED_ACCEPTANCE_REQUIRED");
  const release:LegalRelease={terms:{version:"SYNTHETIC-C1-TERMS-v1",path:"/__synthetic__/terms"},privacy:{version:"SYNTHETIC-C1-PRIVACY-v1",path:"/__synthetic__/privacy"}};
  return {release,documents:{fr:"FIXTURE SYNTHÉTIQUE UNIQUEMENT — aucun document ni accord juridique réel.",ar:"بيانات اختبار اصطناعية فقط — ليست وثائق أو موافقة قانونية فعلية."},origin:"https://acceptance.example.invalid" as const};
}
