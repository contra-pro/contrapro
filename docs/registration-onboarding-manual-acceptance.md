# Registration/onboarding manual acceptance

The implementation is local. No live provider, real credentials, migration, feature activation, commit, push or deployment was used. Browser/visual acceptance and authenticated dashboard acceptance remain pending.

## Restart isolated review

Run in PowerShell from `C:\Users\lenovo\contratpro`. Check status first. If a session is active, only the owner should stop it when ready; do not rebuild its artifacts while it is running.

```powershell
& 'C:/Users/lenovo/AppData/Roaming/npm/node_modules/lean-ctx-bin/bin/lean-ctx.exe' -c "node scripts/v41-integration/session.mjs status"
& 'C:/Users/lenovo/AppData/Roaming/npm/node_modules/lean-ctx-bin/bin/lean-ctx.exe' -c "node scripts/v41-integration/session.mjs stop"
& 'C:/Users/lenovo/AppData/Roaming/npm/node_modules/lean-ctx-bin/bin/lean-ctx.exe' -c "node scripts/v41-integration/start.mjs --build-only"
```

After the session is stopped and the build succeeds, the owner can execute the documented command-scoped manual launch, subject to local execution policy:

```powershell
Start-Process -FilePath 'C:/Program Files/nodejs/node.exe' -ArgumentList @('--require','C:/Users/lenovo/contratpro/scripts/ui-review/isolate.cjs','C:/Users/lenovo/contratpro/scripts/v41-integration/session.mjs','serve') -WorkingDirectory 'C:/Users/lenovo/contratpro' -WindowStyle Hidden -RedirectStandardOutput 'C:/Users/lenovo/contratpro/.verification/v41-session.stdout.log' -RedirectStandardError 'C:/Users/lenovo/contratpro/.verification/v41-session.stderr.log' -PassThru
```

Use the same `session.mjs status` and `session.mjs stop` commands above for PID-aware status and authenticated shutdown. The installed lean-ctx blocks Start-Process and provides no supported scoped approval mechanism; the agent does not bypass that restriction or change policy. See [session lifecycle](v4.1-session-lifecycle.md).

## Routes and acceptance

- `http://127.0.0.1:3330/fr/sign-up` and `/ar/sign-up`: names, phone/code, legal-unavailable state, password toggles, errors, focus and RTL/mobile layout.
- `/fr/sign-in` and `/ar/sign-in`: existing password flow and truthful environment-unavailable state.
- `/{locale}/auth/continue`, `/app/onboarding`, `/app/account`, `/app/team/accept`: public guards and continuation. Under network isolation, authenticated success is intentionally unavailable.
- In a separately authorized synthetic backend environment: confirm email, provision personal profile, save/resume wizard, validate conditional fields, explicit reuse, retry uncertain submission, finalize once, switch membership, create another agency, accept a pending invitation, update scoped personal/agency settings and generate a new contract snapshot.
- Verify historical document versions, invitations, existing users and memberships remain intact; verify self/foreign-tenant access and parallel requests on native PostgreSQL.
- Review FR/AR at desktop/mobile widths, keyboard/focus/error announcements, password controls, reduced motion, and branding. No current automated result substitutes for owner acceptance.

Launch blockers include approved legal documents/publication, review/application of draft 0027, native/managed backend and authenticated whole-journey verification, plus all existing provider, licensing/commercial, document/font, operational and infrastructure blockers. Do not enable a simulated signup to clear these blockers.
