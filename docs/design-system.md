# ContratPro interface system

A6 working direction: a light, precise workspace for Moroccan rental agencies.
Preserve the existing ContratPro name, C mark and navy/blue brand. This is an
implementation direction, not approval of a replacement identity.

The existing stack is Next.js / React with CSS modules. Frontend-design guidance
informs hierarchy and restraint; the existing product palette is preserved.
21st tools were inspected but no third-party component was retrieved or installed.
No component or animation library is required. See the A6 report for actual
verification results; this document specifies intent, not visual acceptance.

## Tokens and hierarchy

| Token | Value / purpose |
| --- | --- |
| Canvas | `#f5f7fa`, quiet workspace |
| Surface | `#ffffff`, editable content and tables |
| Ink | `#17324d`, headings and body |
| Muted | `#516477`, secondary readable copy |
| Primary | `#174f8c`, actions and current navigation |
| Line | `#d5dfe9`, structural separation |
| Type | Segoe UI / Tahoma / Arial system families; no remote font request |
| Body | 16px minimum; 1.6 line height; Arabic headings have normal tracking |
| Spacing | 4/8px rhythm, 16–24px panel gutters, compact task lists |
| Shape | 6px controls, 10px panels, pill status only; no uniform card grid |
| Focus | 3px primary outline with 3px offset; never removed |
| Motion | 120ms control feedback, reduced-motion override; no choreographed entry |

Desktop uses a narrow persistent task sidebar and a fluid work surface. Mobile
uses an explicit navigation disclosure, one-column forms and locally scrollable
tables. Keep page width contained; do not hide essential cells to prevent overflow.
Group content by the rental lifecycle: draft, review, confirmation, issuance,
agency signature, client signature, final document. Numbers are used only for
actual workflow steps. No fabricated revenue, availability or delivery success.

Use semantic headings, visible labels and inline help; give status text as well as
color. Consequential operations use a named confirmation dialog with cancel as
the safe initial focus. Error summaries link to the field. Preserve entered data
and server authority. Skeletons and retryable errors have distinct announcements.

Language switches retain the current route and safe query context. Tokens,
identities, references, emails and phone numbers remain isolated with bdi/LTR.
Localize presentation only; never translate saved legal wording or mutate amounts.
Unavailable features explain their setup/acceptance dependency and never claim
success. A privileged platform link is not an ordinary agency navigation item.
