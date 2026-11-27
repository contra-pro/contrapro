"use client"

// Halyard Copilot Landing — a complete landing page for an AI sales copilot,
// in one file. The page lives in a sky that deepens as you scroll: pale steel
// at the top, cobalt through the middle, night by the footer. Hairline rails
// and great orbit rings run behind everything, with small signals travelling
// along them — the buyer's data, in orbit.
//
// The hero holds a working copy of the product. It lies back on a slight tilt
// and straightens as you scroll to it. Inside, the inbox filters and searches,
// AI drafts stream in and can be edited, reformatted, rewritten in another
// tone, addressed and sent (with undo); the Customers tab charts every
// account's purchasing and drafts outreach for the ones slipping; Ask AI
// answers from the same data. Below: how it works (scroll-told), a quote
// builder you can price, stats, voices, a call to action, a book-a-demo
// dialog and a footer.
//
// Everything is drawn here — the orbits, the mark, the icons and the charts
// are SVG; the type is the system stack. Avatars are photos you can replace,
// and fall back to initials if they can't load.
import * as React from "react"
import {ContractWorkspace} from "./ContractWorkspace"
import {ProductDemonstration} from "./ProductDemonstration"
import {ProductFAQ} from "./landing-content"
const MarketingLanguage=React.createContext(false);

export type HclLink = { label: string; href?: string }

export type HclMenuItem = { label: string; description?: string; href?: string }

export type HclNavItem = { label: string; href?: string; items?: HclMenuItem[] }

export type HclStatus = "active" | "resolved" | "dismissed"

export type HclThread = {
  id: string
  /** The buyer the thread is about. */
  contact: string
  avatar?: string
  account: string
  title: string
  /** Groups the inbox, e.g. "Proactive Outreach". */
  category: string
  when: string
  status: HclStatus
  /** The insight Copilot drafted from, shown in the banner. */
  insight: string
  recipients: string[]
  /** Recipients beyond the chips, e.g. the rest of a segment. */
  more?: number
  cc?: string[]
  subject: string
  /** The AI draft. Blank lines split paragraphs. */
  draft: string
}

export type HclGroup = { category: string; total?: number }

export type HclCustomer = {
  account: string
  contact: string
  avatar?: string
  rep: string
  lastOrder: string
  /** Weekly purchasing, oldest first. 8–16 points read best. */
  weekly: number[]
}

export type HclStep = { kicker: string; title: string; text: string; points?: string[] }

export type HclQuoteItem = {
  sku: string
  name: string
  qty: number
  unit: string
  price: number
  /** Unit cost, for the margin meter. */
  cost: number
  stock: { site: string; qty: number }[]
}

export type HclIndustry = {
  id: string
  label: string
  buyer: { name: string; company: string; avatar?: string }
  request: string
  items: HclQuoteItem[]
}

export type HclStat = { value: number; prefix?: string; suffix?: string; decimals?: number; label: string }

export type HclTestimonial = { quote: string; name: string; role: string; company: string; avatar?: string }

export type HclPaletteName = "steel" | "dusk" | "sage"

export type HclPalette = {
  /** Sky stops, top of the page to the footer. */
  sky: [string, string, string, string]
  /** The saturated glow in the hero's lower left. */
  glow: string
  /** The pale haze in the hero's upper right. */
  haze: string
  /** The same four stops for dark mode. */
  night: [string, string, string, string]
  accent: string
}

export type HclDemoRequest = { name: string; email: string; company: string; team: string }

export type HclSendEvent = { thread: HclThread; subject: string; html: string; recipients: string[] }

export interface HalyardCopilotLandingProps {
  locale?: "fr"|"ar"
  brand?: string
  /** The small line under the brand in the nav and footer. */
  tagline?: string
  /** The product name under the brand inside the app. */
  product?: string
  logo?: React.ReactNode
  nav?: HclNavItem[]
  login?: HclLink | null
  /** The nav's pill button. Without an href it opens the book-a-demo dialog. */
  demoAction?: HclLink
  /** The pill above the headline. `→` is drawn as a hairline arrow. */
  badge?: string | null
  /** "\n" breaks the line. Pass it in braces so the newline is real. */
  title?: string
  subtitle?: string
  primaryAction?: HclLink
  secondaryAction?: HclLink
  /** The signed-in rep shown in the app. */
  user?: { name: string; avatar?: string }
  totalEmails?: number
  groups?: HclGroup[]
  threads?: HclThread[]
  customers?: HclCustomer[]
  /** Suggested questions in Ask AI. */
  questions?: string[]
  how?: { kicker?: string; title: string; steps: HclStep[] } | null
  quote?: { kicker?: string; title: string; subtitle?: string; industries: HclIndustry[]; marginFloor?: number } | null
  stats?: HclStat[] | null
  testimonials?: HclTestimonial[] | null
  cta?: { title: string; subtitle?: string; action?: HclLink } | null
  footer?: { columns?: { title: string; links: HclLink[] }[]; note?: string; newsletter?: boolean } | null
  palette?: HclPaletteName | HclPaletteInput
  /** "auto" follows a `.dark` class on any ancestor. */
  scheme?: "auto" | "light" | "dark"
  /** Called when a draft is sent. Return (or resolve to) `false`, or throw, to keep it unsent. */
  onSend?: (e: HclSendEvent) => unknown
  /** Called with the dialog's fields. Return (or resolve to) `false`, or throw, to show an error. */
  onBookDemo?: (data: HclDemoRequest) => unknown
  onSubscribe?: ((email: string) => unknown) | undefined
  /** Height of the hero above the app. A definite length, so it survives any host layout. */
  height?: string
  className?: string
}

export type HclPaletteInput = {
  sky?: [string, string, string, string]
  glow?: string
  haze?: string
  night?: [string, string, string, string]
  accent?: string
}

// #region content
const PALETTES = {
  steel: {
    sky: ["#a9b6cb", "#5f80b8", "#1f3f7c", "#0b1834"] as [string, string, string, string],
    glow: "#1d4fae",
    haze: "#c5ccd8",
    night: ["#2b3b5c", "#1b2f5c", "#102247", "#060d1f"] as [string, string, string, string],
    accent: "#9fc2ff",
  },
  dusk: {
    sky: ["#c4b4c6", "#8a77a8", "#3b2f6b", "#140f2b"] as [string, string, string, string],
    glow: "#5a3aa0",
    haze: "#e3cfcf",
    night: ["#3a2f4f", "#2a2150", "#1a1438", "#0a0718"] as [string, string, string, string],
    accent: "#ffc9a8",
  },
  sage: {
    sky: ["#b5c2b8", "#6f8f86", "#244a49", "#0b1d1d"] as [string, string, string, string],
    glow: "#1f6a5f",
    haze: "#d4d9cc",
    night: ["#2e3e3b", "#1f3634", "#132828", "#061111"] as [string, string, string, string],
    accent: "#bfe8c9",
  },
}

const PHOTO = (id: string) => "https://images.unsplash.com/photo-" + id + "?w=160&h=160&fit=crop&crop=faces&auto=format&q=70"

const DEFAULT_NAV: HclNavItem[] = [
  {
    label: "Products",
    items: [
      { label: "Copilot", description: "Drafts outreach from live order data", href: "#product" },
      { label: "Quotes", description: "Priced, stock-checked quotes in seconds", href: "#quotes" },
      { label: "Signals", description: "Spots buyers drifting before they churn", href: "#how" },
      { label: "Integrations", description: "ERP, CRM and inbox, two-way", href: "#how" },
    ],
  },
  {
    label: "Industries",
    items: [
      { label: "Flooring", description: "Rolls, cuts and dye lots", href: "#quotes" },
      { label: "Electrical", description: "Reels, conduit and job packs", href: "#quotes" },
      { label: "Food service", description: "Recurring orders and par levels", href: "#quotes" },
      { label: "Industrial supply", description: "MRO, contracts and catalogs", href: "#quotes" },
    ],
  },
  {
    label: "Company",
    items: [
      { label: "About", description: "Built by former distribution reps", href: "#voices" },
      { label: "Customers", description: "How 400+ distributors sell", href: "#voices" },
      { label: "Careers", description: "We're hiring in Austin and remote", href: "#contact" },
    ],
  },
  { label: "Pricing", href: "#contact" },
  {
    label: "Resources",
    items: [
      { label: "Playbooks", description: "Outreach that buyers answer", href: "#how" },
      { label: "ROI calculator", description: "Hours back, per rep, per week", href: "#numbers" },
      { label: "Help center", description: "Setup, data and security", href: "#contact" },
    ],
  },
]

const DEFAULT_HOW = {
  kicker: "How it works",
  title: "From live data to a sent email, without the copy-paste.",
  steps: [
    {
      kicker: "01 · Data",
      title: "It reads what your reps can't keep in their heads.",
      text: "Halyard connects to your ERP, price books and inbox, and watches every account's ordering rhythm in real time.",
      points: ["Inventory by warehouse, updated every 5 minutes", "Contract and tier pricing per customer", "Order history back to 2019"],
    },
    {
      kicker: "02 · Drafts",
      title: "Every signal becomes an email worth sending.",
      text: "A buyer slows down, a price changes, a part comes back in stock: Copilot drafts the note your best rep would write, with the numbers already checked.",
      points: ["Written in your voice, from your sent mail", "Stock and price verified before you see it", "Your margin floors never broken"],
    },
    {
      kicker: "03 · Follow-up",
      title: "Nothing slips between the reply and the order.",
      text: "Replies land back in the thread, follow-ups schedule themselves, and the quote turns into an order in one click.",
      points: ["Smart reminders when buyers go quiet", "Quotes convert to orders in your ERP", "Every touch logged to the account"],
    },
  ],
}

const DEFAULT_QUOTE = {
  kicker: "Quotes",
  title: "Quote in the time it takes to read the request.",
  subtitle: "Pick an industry, draft the quote, then price it. Copilot checks every warehouse and keeps your margin honest.",
  marginFloor: 18,
  industries: [
    {
      id: "flooring",
      label: "Flooring",
      buyer: { name: "Priya Raman", company: "Harbor Floor Supply", avatar: PHOTO("1438761681033-6461ffad8d80") },
      request: "Need 40 rolls of Basalt Drift in 12 ft plus pad for the Wexford job. Can it be on Friday's truck?",
      items: [
        { sku: "BD-12-GRP", name: "Basalt Drift carpet, 12 ft, Graphite", qty: 40, unit: "roll", price: 412, cost: 296, stock: [{ site: "Dayton", qty: 412 }, { site: "Reno", qty: 36 }] },
        { sku: "PD-716-8", name: "Rebond pad 7/16\", 8 lb", qty: 48, unit: "roll", price: 64, cost: 47, stock: [{ site: "Dayton", qty: 120 }, { site: "Columbus", qty: 210 }] },
        { sku: "TS-36-AL", name: "Aluminum transition strip, 36\"", qty: 24, unit: "ea", price: 9.5, cost: 5.1, stock: [{ site: "Dayton", qty: 18 }, { site: "Columbus", qty: 300 }] },
      ],
    },
    {
      id: "electrical",
      label: "Electrical",
      buyer: { name: "Diego Ferreira", company: "Ferreira Electric", avatar: PHOTO("1507003211169-0a1dd7228f2d") },
      request: "Pricing on 2,400 ft of 12 AWG THHN, 20 boxes of 4\" square and breakers for the Lakeside build.",
      items: [
        { sku: "THHN-12-BK", name: "THHN 12 AWG stranded, 500 ft reel", qty: 5, unit: "reel", price: 104, cost: 81, stock: [{ site: "Columbus", qty: 64 }, { site: "Dayton", qty: 12 }] },
        { sku: "BX-4SQ-D", name: "4\" square box, 2-1/8\" deep", qty: 20, unit: "ea", price: 3.85, cost: 2.4, stock: [{ site: "Columbus", qty: 940 }] },
        { sku: "BR-20A-1P", name: "20 A single-pole breaker", qty: 36, unit: "ea", price: 11.2, cost: 8.3, stock: [{ site: "Columbus", qty: 22 }, { site: "Reno", qty: 140 }] },
      ],
    },
    {
      id: "food",
      label: "Food service",
      buyer: { name: "Hannah Cho", company: "Cho Hospitality Group", avatar: PHOTO("1534528741775-53994a69daeb") },
      request: "Restocking the new location: sheet pans, cutlery and the cambro containers we got last time.",
      items: [
        { sku: "SP-18-AL", name: "Full sheet pan, 18 ga aluminum", qty: 48, unit: "ea", price: 14.6, cost: 9.9, stock: [{ site: "Reno", qty: 600 }] },
        { sku: "CT-FRK-DZ", name: "Dinner fork, 18/0, dozen", qty: 30, unit: "dz", price: 21, cost: 13.2, stock: [{ site: "Reno", qty: 84 }, { site: "Dayton", qty: 40 }] },
        { sku: "CB-8QT-CL", name: "8 qt square container, clear", qty: 24, unit: "ea", price: 12.4, cost: 8.6, stock: [{ site: "Reno", qty: 12 }, { site: "Columbus", qty: 75 }] },
      ],
    },
    {
      id: "industrial",
      label: "Industrial supply",
      buyer: { name: "Samuel Ortiz", company: "Ortiz Facility Services", avatar: PHOTO("1519085360753-af0119f7cbe7") },
      request: "PM kits for six air handlers: belts, MERV 13 filters and bearings. Contract pricing please.",
      items: [
        { sku: "BLT-A48", name: "V-belt A48, 4L500", qty: 12, unit: "ea", price: 16.8, cost: 11.1, stock: [{ site: "Columbus", qty: 58 }] },
        { sku: "FLT-M13-2024", name: "MERV 13 pleated filter, 20×24×2", qty: 72, unit: "ea", price: 9.7, cost: 6.2, stock: [{ site: "Columbus", qty: 300 }, { site: "Dayton", qty: 96 }] },
        { sku: "BRG-6205-2RS", name: "Ball bearing 6205-2RS", qty: 24, unit: "ea", price: 7.4, cost: 4.3, stock: [{ site: "Dayton", qty: 16 }, { site: "Reno", qty: 50 }] },
      ],
    },
  ],
}

const DEFAULT_FOOTER = {
  columns: [
    { title: "Product", links: [{ label: "Copilot", href: "#product" }, { label: "Quotes", href: "#quotes" }, { label: "How it works", href: "#how" }, { label: "Security" }] },
    { title: "Industries", links: [{ label: "Flooring" }, { label: "Electrical" }, { label: "Food service" }, { label: "Industrial supply" }] },
    { title: "Company", links: [{ label: "About" }, { label: "Customers", href: "#voices" }, { label: "Careers" }, { label: "Contact", href: "#contact" }] },
  ],
  note: "Halyard Commerce, Inc. · Austin, Texas",
  newsletter: true,
}
// #endregion content

// #region logic
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim())

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return "?"
  const first = parts[0]?.[0] || ""
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : ""
  return (first + last).toUpperCase()
}

/** The tilt of the app as it rises into view: 1 below the fold, 0 once its top is near the nav. */
function tiltFor(top: number, vh: number) {
  const start = vh * 0.92
  const end = vh * 0.18
  return clamp((top - end) / (start - end), 0, 1)
}

function resolvePalette(p: HclPaletteName | HclPaletteInput | undefined) {
  if (typeof p === "string") return PALETTES[p] || PALETTES.steel
  const base = PALETTES.steel
  if (!p) return base
  return {
    sky: p.sky || base.sky,
    glow: p.glow || base.glow,
    haze: p.haze || base.haze,
    night: p.night || base.night,
    accent: p.accent || base.accent,
  }
}

/** Splits "a → b → c" into its stops, for the hairline arrows. */
const badgeParts = (s: string) => s.split(/\s*(?:→|->)\s*/).filter(Boolean)
// #endregion logic

const HCL_CSS = `
.hcl-root{--hcl-font:"Inter Tight","Inter","Geist",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;--hcl-s1:var(--hcl-d1);--hcl-s2:var(--hcl-d2);--hcl-s3:var(--hcl-d3);--hcl-s4:var(--hcl-d4);--hcl-line:rgba(255,255,255,.2);--hcl-line-soft:rgba(255,255,255,.11);--hcl-text:#fff;--hcl-dim:rgba(255,255,255,.76);--hcl-faint:rgba(255,255,255,.56);--hcl-ease:cubic-bezier(.22,1,.36,1);position:relative;isolation:isolate;overflow-x:clip;color:var(--hcl-text);font-family:var(--hcl-font);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;background:linear-gradient(180deg,var(--hcl-s1) 0px,var(--hcl-s2) 900px,var(--hcl-s3) 2200px,var(--hcl-s4) 100%);font-feature-settings:"ss01","cv11"}
.hcl-root[data-scheme=dark],:where(.dark) .hcl-root[data-scheme=auto]{--hcl-s1:var(--hcl-n1);--hcl-s2:var(--hcl-n2);--hcl-s3:var(--hcl-n3);--hcl-s4:var(--hcl-n4);--hcl-haze-k:.16;--hcl-dim:rgba(255,255,255,.74)}
.hcl-root *,.hcl-root *::before,.hcl-root *::after{box-sizing:border-box}
.hcl-root :where(button){font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer;-webkit-tap-highlight-color:transparent}
.hcl-root :where(input,textarea){font:inherit;color:inherit}
.hcl-root :where(a){color:inherit;text-decoration:none}
.hcl-root :where(h1,h2,h3,h4,p,ul,ol,figure,blockquote){margin:0;padding:0}
.hcl-root :where(ul,ol){list-style:none}
.hcl-root :where(button,a,input,[tabindex],[contenteditable]):focus-visible{outline:2px solid var(--hcl-accent);outline-offset:2px;border-radius:8px}
.hcl-svg{display:block;max-width:none;flex:none}
.hcl-img{display:block;max-width:none;width:100%;height:100%;object-fit:cover}
.hcl-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.hcl-wrap{position:relative;width:min(1200px,100% - 32px);margin-inline:auto}

/* ---------- the sky: haze, glow, grain, rails and orbits ---------- */
.hcl-sky{position:absolute;inset:0 0 auto 0;height:1700px;z-index:-1;pointer-events:none;overflow:hidden;-webkit-mask-image:linear-gradient(180deg,#000 62%,transparent);mask-image:linear-gradient(180deg,#000 62%,transparent);background:radial-gradient(70% 60% at 0% 92%,var(--hcl-glow) 0%,transparent 70%),radial-gradient(60% 50% at 88% 6%,color-mix(in oklab,var(--hcl-haze) calc(var(--hcl-haze-k,.85)*100%),transparent) 0%,transparent 72%)}
.hcl-grain{position:absolute;inset:0;width:100%;height:100%;opacity:.16;mix-blend-mode:overlay}
.hcl-orbits{position:absolute;left:50%;top:0;width:1800px;height:1800px;margin-left:-900px;transform:translateY(calc(var(--hcl-sy,0)*-0.12px)) rotate(calc(var(--hcl-sy,0)*.006deg))}
.hcl-orbits circle.hcl-ring{fill:none;stroke:rgba(255,255,255,.34);stroke-width:1.1;vector-effect:non-scaling-stroke}
.hcl-orbits circle.hcl-ring2{fill:none;stroke:rgba(255,255,255,.14);stroke-width:1;vector-effect:non-scaling-stroke}
.hcl-sat{fill:#fff;filter:drop-shadow(0 0 6px rgba(255,255,255,.9))}
.hcl-rails{position:absolute;inset:0;pointer-events:none;z-index:0}
.hcl-rails i{position:absolute;top:0;bottom:0;width:1px;background:linear-gradient(180deg,transparent,var(--hcl-line) 8%,var(--hcl-line) 92%,transparent)}
.hcl-rails i:nth-child(1){left:calc(50% - 316px)}
.hcl-rails i:nth-child(2){left:calc(50% + 316px)}
.hcl-hline{height:1px;background:linear-gradient(90deg,transparent,var(--hcl-line) 12%,var(--hcl-line) 88%,transparent);width:100%}

/* ---------- nav ---------- */
.hcl-nav{position:sticky;top:0;z-index:40;transition:background-color .35s var(--hcl-ease),backdrop-filter .35s,box-shadow .35s}
.hcl-nav[data-scrolled=true]{background:color-mix(in oklab,var(--hcl-s3) 38%,transparent);-webkit-backdrop-filter:blur(16px) saturate(1.3);backdrop-filter:blur(16px) saturate(1.3);box-shadow:0 1px 0 var(--hcl-line-soft)}
.hcl-nav-in{display:flex;align-items:center;gap:24px;height:76px}
.hcl-brand{display:inline-flex;align-items:center;gap:10px;flex:none}
.hcl-brand-words{display:flex;flex-direction:column;line-height:1}
.hcl-brand-name{font-size:15px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.hcl-brand-sub{font-size:8.5px;letter-spacing:.42em;text-transform:uppercase;color:var(--hcl-dim);margin-top:4px}
.hcl-links{display:flex;align-items:center;gap:6px;margin-inline:auto}
.hcl-link{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 12px;border-radius:999px;font-size:14.5px;color:rgba(255,255,255,.92);transition:background-color .2s}
.hcl-link:hover,.hcl-link[aria-expanded=true]{background:rgba(255,255,255,.12)}
.hcl-link .hcl-chev{transition:transform .25s var(--hcl-ease)}
.hcl-link[aria-expanded=true] .hcl-chev{transform:rotate(180deg)}
.hcl-dd{position:relative}
.hcl-menu{position:absolute;top:calc(100% + 10px);left:50%;width:340px;padding:8px;border-radius:18px;background:color-mix(in oklab,var(--hcl-s3) 78%,transparent);-webkit-backdrop-filter:blur(22px) saturate(1.4);backdrop-filter:blur(22px) saturate(1.4);border:1px solid var(--hcl-line);box-shadow:0 30px 60px -20px rgba(4,12,32,.55);transform:translate(-50%,-6px) scale(.98);transform-origin:50% 0;opacity:0;visibility:hidden;transition:opacity .18s,transform .22s var(--hcl-ease),visibility 0s .22s}
.hcl-menu[data-open=true]{opacity:1;visibility:visible;transform:translate(-50%,0) scale(1);transition:opacity .2s,transform .28s var(--hcl-ease)}
.hcl-menu a{display:grid;grid-template-columns:34px 1fr;gap:2px 12px;align-items:center;padding:10px;border-radius:12px;transition:background-color .15s}
.hcl-menu a:hover,.hcl-menu a:focus-visible{background:rgba(255,255,255,.1)}
.hcl-menu-ico{grid-row:span 2;width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.1);border:1px solid var(--hcl-line-soft)}
.hcl-menu b{font-weight:500;font-size:14px}
.hcl-menu small{font-size:12.5px;color:var(--hcl-dim)}
.hcl-actions{display:flex;align-items:center;gap:10px;flex:none}
.hcl-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:44px;padding:0 22px;border-radius:999px;font-size:15px;font-weight:500;white-space:nowrap;transition:transform .2s var(--hcl-ease),background-color .2s,box-shadow .25s,color .2s}
.hcl-btn:active{transform:scale(.97)}
.hcl-btn-white{background:#fff;color:#0d1d3d;box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 10px 30px -12px rgba(8,22,60,.45)}
.hcl-btn-white:hover{box-shadow:0 1px 0 rgba(255,255,255,.6) inset,0 16px 34px -12px rgba(8,22,60,.6);transform:translateY(-1px)}
.hcl-btn-ghost{background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.2);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
.hcl-btn-ghost:hover{background:rgba(255,255,255,.24)}
.hcl-btn-lg{height:56px;padding:0 34px;font-size:16px}
.hcl-btn-sm{height:36px;padding:0 16px;font-size:13.5px}
.hcl-btn[disabled]{opacity:.55;cursor:not-allowed;transform:none}
.hcl-login{font-size:15px;padding:8px 12px;border-radius:999px;transition:background-color .2s}
.hcl-login:hover{background:rgba(255,255,255,.12)}
.hcl-burger{display:none;width:44px;height:44px;border-radius:999px;place-items:center;background:rgba(255,255,255,.14);border:1px solid var(--hcl-line)}
.hcl-sheet{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;padding:16px 16px 24px;background:linear-gradient(180deg,var(--hcl-s2),var(--hcl-s3));overflow-y:auto;opacity:0;visibility:hidden;transform:translateY(-8px);transition:opacity .2s,transform .3s var(--hcl-ease),visibility 0s .3s}
.hcl-sheet[data-open=true]{opacity:1;visibility:visible;transform:none;transition:opacity .2s,transform .3s var(--hcl-ease)}
.hcl-sheet-top{display:flex;align-items:center;justify-content:space-between;height:52px;margin-bottom:12px}
.hcl-sheet details{border-bottom:1px solid var(--hcl-line-soft)}
.hcl-sheet summary,.hcl-sheet-link{display:flex;align-items:center;justify-content:space-between;padding:18px 4px;font-size:22px;letter-spacing:-.01em;list-style:none;cursor:pointer}
.hcl-sheet summary::-webkit-details-marker{display:none}
.hcl-sheet details[open] summary .hcl-chev{transform:rotate(180deg)}
.hcl-sheet details a{display:block;padding:10px 4px 10px 14px;color:var(--hcl-dim);font-size:16px}
.hcl-sheet-link{border-bottom:1px solid var(--hcl-line-soft)}
.hcl-sheet-cta{display:grid;gap:10px;margin-top:auto;padding-top:24px}

/* ---------- hero ---------- */
.hcl-hero{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:56px 0 64px}
.hcl-badge{display:inline-flex;align-items:center;gap:10px;height:34px;padding:0 16px;border-radius:999px;font-size:14px;color:#fff;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.16);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}
.hcl-badge-arrow{opacity:.75}
.hcl-h1{margin-top:24px;font-size:clamp(36px,4vw,58px);line-height:1.06;font-weight:500;letter-spacing:-.035em;text-wrap:balance;max-width:24ch;text-shadow:0 2px 24px rgba(8,20,52,.14)}
.hcl-h1 .hcl-line{display:block}
.hcl-word{display:inline-block;animation:hcl-word .9s var(--hcl-ease) both;animation-delay:calc(var(--i)*55ms + 120ms)}
@keyframes hcl-word{from{opacity:0;transform:translateY(.35em);filter:blur(8px)}to{opacity:1;transform:none;filter:blur(0)}}
.hcl-sub{margin-top:20px;max-width:440px;font-size:16.5px;line-height:1.55;color:rgba(255,255,255,.94);text-shadow:0 1px 14px rgba(8,20,52,.22);text-wrap:pretty;animation:hcl-fade .9s var(--hcl-ease) .45s both}
.hcl-cta-row{display:flex;gap:12px;margin-top:34px;flex-wrap:wrap;justify-content:center;animation:hcl-fade .9s var(--hcl-ease) .6s both}
@keyframes hcl-fade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}

/* ---------- the app ---------- */
.hcl-stage{position:relative;z-index:2;perspective:1800px;perspective-origin:50% 0}
.hcl-stage-line{position:absolute;left:0;right:0;top:0}
.hcl-app{--t:0;position:relative;width:min(1000px,100% - 32px);height:640px;margin-inline:auto;display:flex;flex-direction:column;border-radius:20px 20px 16px 16px;background:linear-gradient(180deg,color-mix(in oklab,var(--hcl-s2) 58%,transparent),color-mix(in oklab,var(--hcl-s3) 72%,transparent));border:1px solid rgba(255,255,255,.24);box-shadow:0 1px 0 rgba(255,255,255,.3) inset,0 60px 120px -40px rgba(3,10,30,.6),0 20px 40px -20px rgba(3,10,30,.35);-webkit-backdrop-filter:blur(24px) saturate(1.25);backdrop-filter:blur(24px) saturate(1.25);transform-origin:50% 0;transform:translateY(calc(var(--t)*28px)) rotateX(calc(var(--t)*16deg)) scale(calc(1 - var(--t)*.05));will-change:transform;overflow:hidden;text-align:left;font-size:14px}
.hcl-app-bar{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;height:60px;padding:0 18px;border-bottom:1px solid var(--hcl-line-soft);flex:none}
.hcl-tabs{display:flex;gap:4px;padding:4px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid var(--hcl-line-soft);position:relative}
.hcl-tab{position:relative;z-index:1;display:inline-flex;align-items:center;gap:7px;height:32px;padding:0 14px;border-radius:999px;font-size:13.5px;color:var(--hcl-dim);transition:color .2s}
.hcl-tab[aria-selected=true]{color:#fff}
.hcl-tab-pill{position:absolute;z-index:0;top:4px;height:32px;border-radius:999px;background:rgba(255,255,255,.17);box-shadow:0 1px 0 rgba(255,255,255,.2) inset;transition:left .35s var(--hcl-ease),width .35s var(--hcl-ease)}
.hcl-user{justify-self:end;position:relative}
.hcl-user-btn{display:inline-flex;align-items:center;gap:10px;padding:4px 8px 4px 4px;border-radius:999px;font-size:13.5px;transition:background-color .2s}
.hcl-user-btn:hover{background:rgba(255,255,255,.1)}
.hcl-pop{position:absolute;right:0;top:calc(100% + 8px);min-width:200px;padding:6px;border-radius:14px;background:color-mix(in oklab,var(--hcl-s3) 88%,#000 6%);border:1px solid var(--hcl-line);box-shadow:0 24px 50px -16px rgba(0,0,0,.5);z-index:20;animation:hcl-pop .18s var(--hcl-ease)}
@keyframes hcl-pop{from{opacity:0;transform:translateY(-4px) scale(.98)}to{opacity:1;transform:none}}
.hcl-pop button,.hcl-pop [role=option]{display:flex;width:100%;align-items:center;gap:10px;padding:8px 10px;border-radius:9px;font-size:13px;text-align:left;cursor:pointer}
.hcl-pop button:hover,.hcl-pop [role=option]:hover,.hcl-pop [data-active=true]{background:rgba(255,255,255,.1)}
.hcl-pop hr{border:0;border-top:1px solid var(--hcl-line-soft);margin:6px 4px}
.hcl-pop-head{padding:8px 10px 6px;font-size:11.5px;color:var(--hcl-faint);letter-spacing:.04em}
.hcl-avatar{position:relative;flex:none;border-radius:999px;overflow:hidden;display:grid;place-items:center;font-weight:600;letter-spacing:.02em;color:#fff;background:linear-gradient(135deg,rgba(255,255,255,.34),rgba(255,255,255,.12));box-shadow:0 0 0 1.5px rgba(255,255,255,.55)}
.hcl-avatar img{filter:grayscale(1) contrast(1.12) brightness(1.04)}
.hcl-app-body{display:grid;grid-template-columns:290px 1fr;min-height:0;flex:1;animation:hcl-fade .35s var(--hcl-ease)}
.hcl-side{display:flex;flex-direction:column;min-height:0;padding:16px 0 0 14px;border-right:1px solid transparent}
.hcl-side-head{display:flex;align-items:baseline;justify-content:space-between;padding:0 4px 12px 0}
.hcl-side-head b{font-weight:500;font-size:14.5px}
.hcl-side-head span{font-size:13px;color:var(--hcl-dim)}
.hcl-search{display:flex;align-items:center;gap:8px;height:40px;padding:0 14px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid var(--hcl-line-soft);margin-right:4px;transition:background-color .2s,border-color .2s}
.hcl-search:focus-within{background:rgba(255,255,255,.15);border-color:rgba(255,255,255,.34)}
.hcl-search input{flex:1;min-width:0;background:none;border:0;outline:0;font-size:13.5px}
.hcl-search input::placeholder{color:var(--hcl-dim)}
.hcl-search kbd{font:inherit;font-size:11px;color:var(--hcl-faint);border:1px solid var(--hcl-line-soft);border-radius:6px;padding:1px 6px}
.hcl-status{position:relative;display:grid;grid-template-columns:repeat(3,1fr);margin:14px 4px 0 0;border-bottom:1px solid var(--hcl-line-soft)}
.hcl-status button{height:38px;font-size:13px;color:var(--hcl-dim);transition:color .2s}
.hcl-status button[aria-selected=true]{color:#fff}
.hcl-status sup{font-size:10px;margin-left:3px;color:var(--hcl-faint);top:-.4em}
.hcl-status-bar{position:absolute;bottom:-1px;height:2px;width:33.333%;background:#fff;border-radius:2px;transition:transform .35s var(--hcl-ease)}
.hcl-list{flex:1;min-height:0;overflow-y:auto;padding:10px 4px 16px 0;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.25) transparent;overscroll-behavior:contain}
.hcl-group-h{display:flex;align-items:center;gap:10px;width:100%;padding:12px 8px 8px 6px;font-size:14px;border-radius:10px}
.hcl-group-h:hover{background:rgba(255,255,255,.05)}
.hcl-group-h .hcl-chev{margin-left:auto;transition:transform .25s var(--hcl-ease)}
.hcl-group-h[aria-expanded=false] .hcl-chev{transform:rotate(-90deg)}
.hcl-recent{padding:6px 8px 4px 8px;font-size:12px;color:var(--hcl-dim)}
.hcl-thread{display:grid;grid-template-columns:40px 1fr auto;gap:2px 12px;width:100%;padding:12px 10px;border-radius:14px;text-align:left;transition:background-color .2s;position:relative}
.hcl-thread:hover{background:rgba(255,255,255,.06)}
.hcl-thread[aria-current=true]{background:rgba(255,255,255,.12);box-shadow:0 1px 0 rgba(255,255,255,.12) inset}
.hcl-thread-av{grid-row:span 3;align-self:start}
.hcl-thread small{font-size:12px;color:var(--hcl-dim)}
.hcl-thread time{font-size:11.5px;color:var(--hcl-dim);justify-self:end}
.hcl-thread b{grid-column:2 / 4;font-weight:500;font-size:14px;line-height:1.35}
.hcl-chip{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 9px;border-radius:7px;font-size:11.5px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.1);white-space:nowrap;max-width:100%}
.hcl-thread .hcl-chip{grid-column:2 / 4;justify-self:start;margin-top:6px}
.hcl-dot-new{position:absolute;left:4px;top:28px;width:5px;height:5px;border-radius:9px;background:var(--hcl-accent);box-shadow:0 0 8px var(--hcl-accent)}
.hcl-empty{padding:40px 16px;text-align:center;color:var(--hcl-dim);font-size:13px}
.hcl-main{min-width:0;min-height:0;padding:12px 14px 14px 6px;display:flex}
.hcl-card{flex:1;min-width:0;display:flex;flex-direction:column;border-radius:16px;background:rgba(255,255,255,.075);border:1px solid var(--hcl-line-soft);box-shadow:0 1px 0 rgba(255,255,255,.08) inset;overflow:hidden;position:relative}
.hcl-card-head{display:flex;align-items:center;gap:10px;padding:12px 14px 0 14px;flex-wrap:wrap}
.hcl-card-head .hcl-title{color:var(--hcl-dim);font-size:13.5px;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hcl-card-acct{padding:6px 14px 10px;font-size:12px;color:var(--hcl-dim);border-bottom:1px solid var(--hcl-line-soft);margin:0 0 0 0}
.hcl-ongoing{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;font-size:11.5px;background:rgba(255,255,255,.2)}
.hcl-ongoing[data-s=resolved]{background:rgba(140,230,180,.22)}
.hcl-ongoing[data-s=dismissed]{background:rgba(255,255,255,.08);color:var(--hcl-dim)}
.hcl-icon-btn{display:inline-grid;place-items:center;width:30px;height:30px;border-radius:9px;color:var(--hcl-dim);transition:background-color .15s,color .15s}
.hcl-icon-btn:hover,.hcl-icon-btn[aria-expanded=true],.hcl-icon-btn[aria-pressed=true]{background:rgba(255,255,255,.13);color:#fff}
.hcl-back{display:none}
.hcl-scroll{flex:1;min-height:0;overflow-y:auto;padding:12px 14px 0;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.25) transparent;overscroll-behavior:contain}
.hcl-insight{display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:linear-gradient(90deg,rgba(255,255,255,.16),rgba(255,255,255,.08));font-size:12.5px;line-height:1.4}
.hcl-insight svg{color:#fff}
.hcl-field{display:grid;grid-template-columns:48px 1fr;align-items:start;gap:10px;padding:14px 0 12px 12px;border-bottom:1px solid var(--hcl-line-soft)}
.hcl-field>label,.hcl-field>span:first-child{padding-top:5px;font-size:13px;color:var(--hcl-dim)}
.hcl-chips{display:flex;flex-wrap:wrap;gap:6px;align-items:center;min-width:0}
.hcl-chip button{display:grid;place-items:center;width:15px;height:15px;border-radius:9px;background:rgba(255,255,255,.3);color:#0d1d3d;margin-right:-3px}
.hcl-chip button:hover{background:#fff}
.hcl-chip-in{min-width:120px;flex:1;height:24px;background:none;border:0;outline:0;font-size:12px}
.hcl-chip-in::placeholder{color:var(--hcl-faint)}
.hcl-chip-in[aria-invalid=true]{color:#ffc0b8}
.hcl-more{height:24px;padding:0 9px;border-radius:7px;font-size:11.5px;background:rgba(255,255,255,.07);border:1px dashed rgba(255,255,255,.25)}
.hcl-subject{width:100%;height:46px;padding:0 12px;background:none;border:0;border-bottom:1px solid var(--hcl-line-soft);outline:0;font-size:14px}
.hcl-toolbar{display:flex;align-items:center;gap:2px;flex-wrap:wrap;padding:10px 0 8px;position:sticky;top:-12px;z-index:3}
.hcl-tb{display:inline-grid;place-items:center;min-width:30px;height:30px;padding:0 6px;border-radius:8px;font-size:13.5px;color:rgba(255,255,255,.85);transition:background-color .15s}
.hcl-tb:hover,.hcl-tb[aria-pressed=true],.hcl-tb[aria-expanded=true]{background:rgba(255,255,255,.14)}
.hcl-tb-sep{width:1px;height:18px;background:var(--hcl-line-soft);margin:0 6px}
.hcl-para{display:inline-flex;align-items:center;justify-content:space-between;gap:16px;height:32px;padding:0 10px 0 12px;border-radius:8px;border:1px solid rgba(255,255,255,.3);font-size:13px;min-width:116px;margin-right:6px}
.hcl-tb-wrap{position:relative}
.hcl-tb-wrap .hcl-pop{left:0;right:auto;min-width:170px}
.hcl-swatch{width:14px;height:14px;border-radius:5px;box-shadow:0 0 0 1px rgba(255,255,255,.4)}
.hcl-editor{min-height:200px;padding:4px 12px 20px;font-size:14px;line-height:1.65;outline:0;color:rgba(255,255,255,.95);border-radius:8px}
.hcl-editor p{margin:0 0 .85em}
.hcl-editor h3{font-size:17px;font-weight:600;margin:0 0 .6em}
.hcl-editor blockquote{border-left:2px solid rgba(255,255,255,.4);padding-left:12px;color:var(--hcl-dim);margin:0 0 .85em}
.hcl-editor ul,.hcl-editor ol{padding-left:22px;margin:0 0 .85em}
.hcl-editor ul{list-style:disc}
.hcl-editor ol{list-style:decimal}
.hcl-editor[data-streaming=true]::after{content:"";display:inline-block;width:7px;height:16px;margin-left:2px;vertical-align:-3px;border-radius:2px;background:#fff;animation:hcl-blink 1s steps(2) infinite}
@keyframes hcl-blink{50%{opacity:0}}
.hcl-composer-foot{display:flex;align-items:center;gap:8px;padding:10px 14px;border-top:1px solid var(--hcl-line-soft);background:rgba(255,255,255,.04);flex:none;position:relative}
.hcl-foot-meta{font-size:12px;color:var(--hcl-dim);margin-right:auto;display:flex;align-items:center;gap:8px;min-width:0}
.hcl-send{background:#fff;color:#0d1d3d;position:relative;overflow:hidden}
.hcl-send-bar{position:absolute;left:0;bottom:0;height:3px;background:var(--hcl-s2);transition:width .1s linear}
.hcl-progress{position:absolute;left:0;top:-1px;height:2px;background:linear-gradient(90deg,transparent,#fff);transition:width .12s linear}
.hcl-shimmer{background:linear-gradient(90deg,rgba(255,255,255,.55),#fff,rgba(255,255,255,.55));background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:hcl-shim 1.6s linear infinite}
@keyframes hcl-shim{to{background-position:-200% 0}}
.hcl-sent{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:24px;background:color-mix(in oklab,var(--hcl-s3) 40%,transparent);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:hcl-fade .35s var(--hcl-ease);z-index:5}
.hcl-sent-ring{width:64px;height:64px;margin:0 auto 14px;border-radius:999px;display:grid;place-items:center;background:rgba(255,255,255,.16);box-shadow:0 0 0 10px rgba(255,255,255,.06)}

/* customers */
.hcl-view{flex:1;min-height:0;display:flex;flex-direction:column;animation:hcl-fade .35s var(--hcl-ease)}
.hcl-cust{flex:1;min-height:0;overflow:auto;padding:4px 18px 18px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.25) transparent}
.hcl-cust-top{display:flex;align-items:end;justify-content:space-between;gap:16px;padding:18px 18px 10px;flex-wrap:wrap}
.hcl-cust-top h3{font-size:18px;font-weight:500;letter-spacing:-.01em}
.hcl-cust-top p{font-size:12.5px;color:var(--hcl-dim)}
.hcl-seg{display:inline-flex;padding:3px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid var(--hcl-line-soft)}
.hcl-seg button{height:28px;padding:0 12px;border-radius:999px;font-size:12.5px;color:var(--hcl-dim)}
.hcl-seg button[aria-pressed=true]{background:rgba(255,255,255,.17);color:#fff}
.hcl-table{width:100%;border-collapse:collapse;font-size:13px;min-width:640px}
.hcl-table th{font-weight:400;font-size:11.5px;color:var(--hcl-faint);text-align:left;padding:10px 10px;border-bottom:1px solid var(--hcl-line-soft);letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}
.hcl-table td{padding:10px;border-bottom:1px solid var(--hcl-line-soft);vertical-align:middle;white-space:nowrap}
.hcl-table tr{transition:background-color .15s}
.hcl-table tbody tr:hover{background:rgba(255,255,255,.05)}
.hcl-acct{display:flex;align-items:center;gap:10px}
.hcl-acct small{display:block;font-size:11.5px;color:var(--hcl-dim)}
.hcl-trend{display:inline-flex;align-items:center;gap:4px;font-variant-numeric:tabular-nums;font-size:12.5px;padding:2px 8px;border-radius:999px}
.hcl-trend[data-tone=down]{background:rgba(255,140,120,.18);color:#ffd2c8}
.hcl-trend[data-tone=up]{background:rgba(140,230,180,.16);color:#d0f7de}
.hcl-trend[data-tone=flat]{background:rgba(255,255,255,.1);color:var(--hcl-dim)}
.hcl-spark path.hcl-spark-line{fill:none;stroke:#fff;stroke-width:1.5;stroke-linejoin:round;stroke-linecap:round}
.hcl-spark[data-tone=down] path.hcl-spark-line{stroke:#ffc4b6}
.hcl-th-btn{display:inline-flex;align-items:center;gap:4px;text-transform:uppercase;letter-spacing:.04em;font-size:11.5px;color:var(--hcl-faint)}
.hcl-th-btn:hover{color:#fff}

/* ask ai */
.hcl-chat{flex:1;min-height:0;overflow-y:auto;padding:22px 22px 8px;display:flex;flex-direction:column;gap:14px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.25) transparent}
.hcl-chat-hello{margin:auto 0 0;text-align:center;padding:10px 0 6px}
.hcl-chat-hello h3{font-size:22px;font-weight:500;letter-spacing:-.02em;margin-top:12px}
.hcl-chat-hello p{color:var(--hcl-dim);font-size:13px;margin-top:4px}
.hcl-msg{max-width:min(560px,88%);font-size:13.5px;line-height:1.55;animation:hcl-fade .3s var(--hcl-ease)}
.hcl-msg[data-who=me]{align-self:flex-end;padding:10px 14px;border-radius:16px 16px 4px 16px;background:#fff;color:#0d1d3d}
.hcl-msg[data-who=ai]{align-self:flex-start;display:grid;grid-template-columns:28px 1fr;gap:10px}
.hcl-ai-dot{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:rgba(255,255,255,.14);border:1px solid var(--hcl-line-soft)}
.hcl-rows{margin-top:10px;border-radius:12px;border:1px solid var(--hcl-line-soft);overflow:hidden}
.hcl-rows div{display:flex;justify-content:space-between;gap:16px;padding:8px 12px;font-size:12.5px;animation:hcl-fade .3s var(--hcl-ease) both}
.hcl-rows div+div{border-top:1px solid var(--hcl-line-soft)}
.hcl-suggest{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;padding:0 22px 12px}
.hcl-suggest button{height:32px;padding:0 14px;border-radius:999px;font-size:12.5px;background:rgba(255,255,255,.1);border:1px solid var(--hcl-line-soft);transition:background-color .2s}
.hcl-suggest button:hover{background:rgba(255,255,255,.18)}
.hcl-ask{display:flex;align-items:center;gap:8px;margin:0 18px 18px;padding:6px 6px 6px 16px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid var(--hcl-line)}
.hcl-ask input{flex:1;min-width:0;background:none;border:0;outline:0;font-size:14px}
.hcl-ask input::placeholder{color:var(--hcl-dim)}
.hcl-ask button{width:36px;height:36px;border-radius:999px;display:grid;place-items:center;background:#fff;color:#0d1d3d;transition:transform .2s var(--hcl-ease),opacity .2s}
.hcl-ask button:disabled{opacity:.4;cursor:default}

/* ---------- sections ---------- */
.hcl-sec{position:relative;z-index:1;padding:140px 0}
.hcl-kicker{display:inline-flex;align-items:center;gap:10px;font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:var(--hcl-dim)}
.hcl-kicker::before{content:"";width:22px;height:1px;background:currentColor}
.hcl-h2{margin-top:18px;font-size:clamp(32px,4.2vw,52px);line-height:1.06;font-weight:500;letter-spacing:-.03em;text-wrap:balance;max-width:18ch}
.hcl-lead{margin-top:18px;font-size:17px;line-height:1.6;color:var(--hcl-dim);max-width:520px;text-wrap:pretty}
.hcl-rise{transition:opacity .9s var(--hcl-ease),transform .9s var(--hcl-ease)}
.hcl-pre{opacity:0;transform:translateY(28px)}

/* how */
.hcl-how{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.08fr);gap:72px;margin-top:64px;align-items:start}
.hcl-step{min-height:72svh;display:flex;flex-direction:column;justify-content:center;padding:24px 0;opacity:.38;transition:opacity .5s var(--hcl-ease)}
.hcl-step[data-active=true]{opacity:1}
.hcl-step:first-child{min-height:56svh;justify-content:flex-start;padding-top:40px}
.hcl-step-k{font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--hcl-accent);font-variant-numeric:tabular-nums}
.hcl-step h3{margin-top:14px;font-size:clamp(24px,2.6vw,32px);line-height:1.15;font-weight:500;letter-spacing:-.02em;max-width:20ch}
.hcl-step p{margin-top:14px;color:var(--hcl-dim);font-size:16px;line-height:1.6;max-width:44ch}
.hcl-step ul{margin-top:22px;display:grid;gap:10px}
.hcl-step li{display:flex;gap:12px;align-items:center;font-size:14.5px}
.hcl-step li::before{content:"";width:6px;height:6px;border-radius:9px;border:1px solid #fff;flex:none}
.hcl-how-sticky{position:sticky;top:110px}
.hcl-how-inline{display:none}
.hcl-vis{position:relative;height:520px;border-radius:24px;border:1px solid var(--hcl-line);background:radial-gradient(80% 70% at 50% 50%,rgba(255,255,255,.12),rgba(255,255,255,.03) 70%);overflow:hidden;box-shadow:0 1px 0 rgba(255,255,255,.18) inset}
.hcl-vis-layer{position:absolute;inset:0;display:grid;place-items:center;opacity:0;transform:scale(.97);transition:opacity .6s var(--hcl-ease),transform .8s var(--hcl-ease);pointer-events:none}
.hcl-vis-layer[data-on=true]{opacity:1;transform:none;pointer-events:auto}
.hcl-vis-steps{position:absolute;left:20px;bottom:18px;display:flex;gap:6px;z-index:2}
.hcl-vis-steps button{width:28px;height:4px;border-radius:9px;background:rgba(255,255,255,.25);transition:background-color .3s,width .3s var(--hcl-ease)}
.hcl-vis-steps button[aria-current=true]{background:#fff;width:44px}
.hcl-node text{font-size:12px;fill:#fff;font-family:var(--hcl-font)}
.hcl-node rect{fill:rgba(255,255,255,.12);stroke:rgba(255,255,255,.35)}
.hcl-spoke{stroke:rgba(255,255,255,.3);stroke-dasharray:3 5;fill:none}
.hcl-core-pulse{transform-origin:center;transform-box:fill-box;animation:hcl-pulse 2.6s var(--hcl-ease) infinite}
@keyframes hcl-pulse{0%{opacity:.55;transform:scale(1)}100%{opacity:0;transform:scale(1.9)}}
.hcl-drafts{position:relative;width:min(340px,86%);height:228px}
.hcl-dcard{position:absolute;left:0;right:0;padding:16px;border-radius:16px;background:rgba(255,255,255,.12);border:1px solid var(--hcl-line);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 20px 40px -20px rgba(0,0,0,.4);transition:transform .8s var(--hcl-ease)}
.hcl-dcard header{display:flex;align-items:center;gap:10px;font-size:12.5px}
.hcl-dcard header span{margin-left:auto;font-size:11px;color:var(--hcl-dim)}
.hcl-dline{height:7px;border-radius:9px;background:rgba(255,255,255,.22);margin-top:10px}
.hcl-conf{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:11px;color:var(--hcl-dim)}
.hcl-conf i{flex:1;height:4px;border-radius:9px;background:rgba(255,255,255,.15);overflow:hidden}
.hcl-conf i::after{content:"";display:block;height:100%;width:var(--w);background:#fff;border-radius:9px}
.hcl-timeline{width:min(360px,86%);display:grid;gap:0;position:relative}
.hcl-tl{display:grid;grid-template-columns:28px 1fr auto;gap:14px;align-items:center;padding:14px 0;position:relative}
.hcl-tl::before{content:"";position:absolute;left:13.5px;top:0;bottom:0;width:1px;background:rgba(255,255,255,.2)}
.hcl-tl:first-child::before{top:50%}
.hcl-tl:last-child::before{bottom:50%}
.hcl-tl-dot{position:relative;z-index:1;width:28px;height:28px;border-radius:999px;display:grid;place-items:center;background:var(--hcl-s3);border:1px solid rgba(255,255,255,.4);transition:background-color .4s,border-color .4s}
.hcl-tl[data-done=true] .hcl-tl-dot{background:#fff;color:#0d1d3d;border-color:#fff}
.hcl-tl b{font-weight:500;font-size:14px;display:block}
.hcl-tl small{font-size:12px;color:var(--hcl-dim)}
.hcl-tl time{font-size:12px;color:var(--hcl-dim);font-variant-numeric:tabular-nums}
.hcl-order{margin-top:8px;padding:14px 16px;border-radius:14px;background:#fff;color:#0d1d3d;display:flex;justify-content:space-between;align-items:center;font-size:13px;box-shadow:0 20px 40px -18px rgba(0,0,0,.45)}
.hcl-order b{font-size:20px;letter-spacing:-.02em;font-variant-numeric:tabular-nums}

/* quote */
.hcl-quote{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.3fr);gap:28px;margin-top:56px;align-items:start}
.hcl-ind{display:flex;flex-wrap:wrap;gap:6px}
.hcl-ind button{height:38px;padding:0 16px;border-radius:999px;font-size:14px;color:var(--hcl-dim);border:1px solid var(--hcl-line);transition:background-color .2s,color .2s,border-color .2s}
.hcl-ind button:hover{color:#fff;border-color:rgba(255,255,255,.4)}
.hcl-ind button[aria-pressed=true]{background:#fff;color:#0d1d3d;border-color:#fff}
.hcl-req{margin-top:22px;padding:18px;border-radius:18px;background:rgba(255,255,255,.08);border:1px solid var(--hcl-line-soft)}
.hcl-req header{display:flex;align-items:center;gap:12px;font-size:13px}
.hcl-req header small{display:block;color:var(--hcl-dim);font-size:12px}
.hcl-req header time{margin-left:auto;font-size:12px;color:var(--hcl-dim)}
.hcl-req p{margin-top:14px;font-size:16px;line-height:1.55}
.hcl-req .hcl-btn{margin-top:18px}
.hcl-docket{border-radius:20px;background:linear-gradient(180deg,rgba(255,255,255,.12),rgba(255,255,255,.06));border:1px solid var(--hcl-line);overflow:hidden;position:relative;box-shadow:0 1px 0 rgba(255,255,255,.18) inset,0 40px 80px -40px rgba(0,0,0,.45)}
.hcl-docket-h{display:flex;align-items:center;gap:12px;padding:16px 20px;border-bottom:1px solid var(--hcl-line-soft);font-size:13px;flex-wrap:wrap}
.hcl-docket-h b{font-weight:500;font-size:15px}
.hcl-docket-h span{color:var(--hcl-dim)}
.hcl-docket-h .hcl-chip{margin-left:auto}
.hcl-lines{min-height:228px}
.hcl-ln{display:grid;grid-template-columns:minmax(0,1fr) 104px 92px;gap:12px;align-items:center;padding:14px 20px;border-bottom:1px solid var(--hcl-line-soft);animation:hcl-fade .45s var(--hcl-ease) both;animation-delay:calc(var(--i)*140ms)}
.hcl-ln b{font-weight:500;font-size:14px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hcl-ln small{font-size:11.5px;color:var(--hcl-dim);font-variant-numeric:tabular-nums}
.hcl-ln-stock{display:flex;flex-wrap:wrap;gap:4px 10px;margin-top:6px}
.hcl-ln-stock span{display:inline-flex;align-items:center;gap:5px;font-size:11.5px;color:var(--hcl-dim)}
.hcl-ln-stock i{width:6px;height:6px;border-radius:9px;background:#9ef0bf}
.hcl-ln-stock span[data-short=true] i{background:#ffb4a3}
.hcl-ln-stock span[data-short=true]{color:#ffd2c8}
.hcl-qty{display:inline-flex;align-items:center;border-radius:999px;border:1px solid var(--hcl-line);height:32px}
.hcl-qty button{width:30px;height:30px;display:grid;place-items:center;border-radius:999px;color:var(--hcl-dim)}
.hcl-qty button:hover{color:#fff;background:rgba(255,255,255,.1)}
.hcl-qty output{min-width:34px;text-align:center;font-size:13px;font-variant-numeric:tabular-nums}
.hcl-ln-total{text-align:right;font-variant-numeric:tabular-nums;font-size:14px}
.hcl-ln-total small{display:block}
.hcl-ghost-lines{padding:6px 20px}
.hcl-ghost-lines div{height:52px;border-bottom:1px dashed var(--hcl-line-soft);display:flex;align-items:center;gap:12px}
.hcl-ghost-lines i{height:8px;border-radius:9px;background:rgba(255,255,255,.1)}
.hcl-docket-f{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;padding:18px 20px 20px;align-items:end}
.hcl-range{display:grid;gap:8px;font-size:13px}
.hcl-range-top{display:flex;justify-content:space-between;color:var(--hcl-dim)}
.hcl-range-top output{color:#fff;font-variant-numeric:tabular-nums}
.hcl-range input{-webkit-appearance:none;appearance:none;width:100%;height:20px;background:transparent;margin:0}
.hcl-range input::-webkit-slider-runnable-track{height:4px;border-radius:9px;background:linear-gradient(90deg,#fff var(--v),rgba(255,255,255,.2) var(--v))}
.hcl-range input::-moz-range-track{height:4px;border-radius:9px;background:linear-gradient(90deg,#fff var(--v),rgba(255,255,255,.2) var(--v))}
.hcl-range input::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;margin-top:-7px;border-radius:999px;background:#fff;box-shadow:0 0 0 5px rgba(255,255,255,.18),0 4px 10px rgba(0,0,0,.3)}
.hcl-range input::-moz-range-thumb{width:18px;height:18px;border:0;border-radius:999px;background:#fff;box-shadow:0 0 0 5px rgba(255,255,255,.18)}
.hcl-margin{margin-top:14px}
.hcl-margin-bar{position:relative;height:6px;border-radius:9px;background:rgba(255,255,255,.14);margin-top:8px}
.hcl-margin-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:9px;background:#9ef0bf;transition:width .3s var(--hcl-ease),background-color .3s}
.hcl-margin-bar i[data-low=true]{background:#ffb4a3}
.hcl-margin-bar em{position:absolute;top:-4px;bottom:-4px;width:1.5px;background:#fff;font-style:normal}
.hcl-margin-bar em::after{content:attr(data-label);position:absolute;top:14px;left:-14px;font-size:10px;color:var(--hcl-faint);white-space:nowrap}
.hcl-totals{display:grid;gap:6px;font-size:13px;color:var(--hcl-dim);font-variant-numeric:tabular-nums}
.hcl-totals div{display:flex;justify-content:space-between}
.hcl-totals .hcl-grand{color:#fff;font-size:15px;padding-top:8px;border-top:1px solid var(--hcl-line-soft);margin-top:4px}
.hcl-grand b{font-size:26px;font-weight:500;letter-spacing:-.02em}
.hcl-docket-act{display:flex;gap:10px;align-items:center;justify-content:flex-end;padding:0 20px 20px;flex-wrap:wrap}
.hcl-warn{margin-right:auto;font-size:12.5px;color:#ffd2c8;display:inline-flex;align-items:center;gap:6px}
.hcl-ok{margin-right:auto;font-size:12.5px;color:var(--hcl-dim);display:inline-flex;align-items:center;gap:6px}
.hcl-stamp{position:absolute;left:24px;bottom:14px;padding:10px 16px;border:2px solid #9ef0bf;color:#9ef0bf;border-radius:10px;font-size:13px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;transform:rotate(-8deg);animation:hcl-stamp .45s var(--hcl-ease) both;background:color-mix(in oklab,var(--hcl-s3) 60%,transparent);pointer-events:none}
.hcl-stamp small{display:block;font-size:10px;letter-spacing:.06em;font-weight:500;text-transform:none;opacity:.85}
@keyframes hcl-stamp{from{opacity:0;transform:rotate(-8deg) scale(1.6)}to{opacity:1;transform:rotate(-8deg) scale(1)}}

/* numbers */
.hcl-stats{display:grid;grid-template-columns:repeat(4,1fr);margin-top:56px;border-top:1px solid var(--hcl-line);border-bottom:1px solid var(--hcl-line)}
.hcl-stat{padding:36px 28px 32px;position:relative}
.hcl-stat+.hcl-stat{border-left:1px solid var(--hcl-line)}
.hcl-stat b{display:block;font-size:clamp(44px,5vw,68px);font-weight:400;letter-spacing:-.045em;line-height:1;font-variant-numeric:tabular-nums}
.hcl-stat span{display:block;margin-top:14px;color:var(--hcl-dim);font-size:15px;max-width:18ch}
.hcl-stat::before{content:"";position:absolute;left:-3.5px;top:-3.5px;width:6px;height:6px;border-radius:9px;background:#fff}
.hcl-stat:first-child::before{display:none}

/* voices */
.hcl-voices{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:64px;margin-top:56px;align-items:end}
.hcl-q{font-size:clamp(26px,3.2vw,42px);line-height:1.2;letter-spacing:-.025em;font-weight:400;text-wrap:pretty;min-height:4.8em}
.hcl-q-mark{display:block;font-size:72px;line-height:.6;height:30px;color:var(--hcl-accent);font-family:Georgia,"Times New Roman",serif}
.hcl-q-in{animation:hcl-q .7s var(--hcl-ease) both}
@keyframes hcl-q{from{opacity:0;transform:translateY(14px);filter:blur(6px)}to{opacity:1;transform:none;filter:blur(0)}}
.hcl-who{display:grid;gap:8px}
.hcl-who button{display:flex;align-items:center;gap:14px;padding:12px;border-radius:16px;text-align:left;border:1px solid transparent;transition:background-color .25s,border-color .25s,opacity .25s;opacity:.6;position:relative;overflow:hidden}
.hcl-who button:hover{opacity:.9}
.hcl-who button[aria-pressed=true]{opacity:1;background:rgba(255,255,255,.09);border-color:var(--hcl-line-soft)}
.hcl-who b{display:block;font-weight:500;font-size:14.5px}
.hcl-who small{font-size:12.5px;color:var(--hcl-dim)}
.hcl-who-bar{position:absolute;left:12px;right:12px;bottom:0;height:2px;background:rgba(255,255,255,.1);border-radius:9px;overflow:hidden}
.hcl-who-bar i{display:block;height:100%;width:100%;background:#fff;transform-origin:0 50%;animation:hcl-bar var(--d) linear both}
.hcl-who:hover .hcl-who-bar i,.hcl-who:focus-within .hcl-who-bar i{animation-play-state:paused}
@keyframes hcl-bar{from{transform:scaleX(0)}to{transform:scaleX(1)}}

/* cta + footer */
.hcl-cta{position:relative;text-align:center;padding:170px 0 150px}
.hcl-cta-orbit{position:absolute;left:50%;top:50%;width:900px;height:900px;margin:-450px 0 0 -450px;pointer-events:none;-webkit-mask-image:radial-gradient(closest-side,#000 70%,transparent);mask-image:radial-gradient(closest-side,#000 70%,transparent)}
.hcl-cta .hcl-h2{margin-inline:auto;max-width:15ch;font-size:clamp(36px,5vw,64px)}
.hcl-cta .hcl-lead{margin-inline:auto}
.hcl-foot{position:relative;z-index:1;padding:72px 0 0;border-top:1px solid var(--hcl-line-soft)}
.hcl-foot-grid{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:40px}
.hcl-foot h4{font-size:12px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:var(--hcl-faint)}
.hcl-foot ul{margin-top:16px;display:grid;gap:10px}
.hcl-foot li a,.hcl-foot li span{font-size:14.5px;color:var(--hcl-dim);transition:color .2s}
.hcl-foot li a:hover{color:#fff}
.hcl-news{display:flex;align-items:center;gap:6px;margin-top:22px;padding:5px 5px 5px 16px;border-radius:999px;border:1px solid var(--hcl-line);background:rgba(255,255,255,.06);max-width:360px;transition:border-color .2s}
.hcl-news:focus-within{border-color:rgba(255,255,255,.5)}
.hcl-news input{flex:1;min-width:0;background:none;border:0;outline:0;font-size:14px}
.hcl-news input::placeholder{color:var(--hcl-faint)}
.hcl-news-msg{margin-top:10px;font-size:12.5px;color:var(--hcl-dim);min-height:18px}
.hcl-news-msg[data-err=true]{color:#ffd2c8}
.hcl-wordmark{position:relative;margin-top:80px;height:clamp(110px,19vw,250px);overflow:hidden;-webkit-mask-image:linear-gradient(180deg,#000 40%,transparent);mask-image:linear-gradient(180deg,#000 40%,transparent)}
.hcl-wordmark svg{width:100%;height:auto}
.hcl-wordmark text{font-family:var(--hcl-font);font-weight:600;letter-spacing:-.04em;fill:none;stroke:rgba(255,255,255,.35);stroke-width:1}
.hcl-foot-bottom{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:22px 0 28px;font-size:12.5px;color:var(--hcl-faint);border-top:1px solid var(--hcl-line-soft)}

/* dialog + toast */
.hcl-dialog-bg{position:fixed;inset:0;z-index:80;display:grid;place-items:center;padding:16px;background:rgba(4,10,26,.5);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:hcl-fade-o .25s ease both}
@keyframes hcl-fade-o{from{opacity:0}to{opacity:1}}
.hcl-dialog{position:relative;width:min(480px,100%);max-height:calc(100svh - 32px);overflow-y:auto;padding:28px;border-radius:24px;background:linear-gradient(180deg,var(--hcl-s2),var(--hcl-s3));border:1px solid var(--hcl-line);box-shadow:0 40px 100px -30px rgba(0,0,0,.6);animation:hcl-dlg .4s var(--hcl-ease) both}
@keyframes hcl-dlg{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
.hcl-dialog h2{font-size:26px;font-weight:500;letter-spacing:-.02em}
.hcl-dialog>p{margin-top:6px;color:var(--hcl-dim);font-size:14px}
.hcl-dialog form{display:grid;gap:14px;margin-top:22px}
.hcl-in{display:grid;gap:6px;font-size:13px;color:var(--hcl-dim)}
.hcl-in input{height:46px;padding:0 14px;border-radius:12px;background:rgba(255,255,255,.1);border:1px solid var(--hcl-line);outline:0;color:#fff;font-size:15px;transition:border-color .2s,background-color .2s}
.hcl-in input:focus{border-color:rgba(255,255,255,.6);background:rgba(255,255,255,.14)}
.hcl-in input[aria-invalid=true]{border-color:#ffb4a3}
.hcl-in em{font-style:normal;font-size:12px;color:#ffd2c8}
.hcl-team{display:flex;gap:6px;flex-wrap:wrap}
.hcl-team button{height:36px;padding:0 14px;border-radius:999px;border:1px solid var(--hcl-line);font-size:13px;color:var(--hcl-dim)}
.hcl-team button[aria-checked=true]{background:#fff;color:#0d1d3d;border-color:#fff}
.hcl-x{position:absolute;right:16px;top:16px}
.hcl-done{text-align:center;padding:20px 0 6px}
.hcl-toast{position:fixed;left:50%;bottom:24px;z-index:90;display:flex;align-items:center;gap:14px;padding:10px 10px 10px 16px;border-radius:14px;background:#fff;color:#0d1d3d;font-size:14px;box-shadow:0 20px 50px -14px rgba(0,0,0,.45);transform:translateX(-50%);animation:hcl-toast .35s var(--hcl-ease) both;max-width:calc(100vw - 32px)}
.hcl-toast button{height:30px;padding:0 12px;border-radius:9px;background:#0d1d3d;color:#fff;font-size:13px}
@keyframes hcl-toast{from{opacity:0;transform:translate(-50%,14px)}to{opacity:1;transform:translateX(-50%)}}
.hcl-spin{animation:hcl-spin .8s linear infinite}
@keyframes hcl-spin{to{transform:rotate(360deg)}}

/* ---------- responsive ---------- */
@media (max-width:1080px){
.hcl-links{display:none}
.hcl-actions .hcl-login{display:none}
.hcl-burger{display:grid}
.hcl-actions{margin-left:auto}
}
@media (max-width:900px){
.hcl-how{grid-template-columns:1fr;gap:0;margin-top:40px}
.hcl-how-sticky{display:none}
.hcl-how-inline{display:block;margin-top:28px}
.hcl-step,.hcl-step:first-child{min-height:0;opacity:1;padding:36px 0;border-top:1px solid var(--hcl-line-soft)}
.hcl-vis{height:400px}
.hcl-quote{grid-template-columns:1fr}
.hcl-stats{grid-template-columns:1fr 1fr}
.hcl-stat:nth-child(3){border-left:0}
.hcl-stat:nth-child(n+3){border-top:1px solid var(--hcl-line)}
.hcl-stat:nth-child(3)::before{display:none}
.hcl-voices{grid-template-columns:1fr;gap:32px}
.hcl-who{grid-template-columns:repeat(3,1fr)}
.hcl-who button{flex-direction:column;text-align:center;gap:8px}
.hcl-foot-grid{grid-template-columns:1fr 1fr}
.hcl-foot-grid>div:first-child{grid-column:1 / -1}
.hcl-rails i:nth-child(1){left:16px}
.hcl-rails i:nth-child(2){left:calc(100% - 17px)}
}
@media (max-width:760px){
.hcl-app{height:600px;border-radius:18px}
.hcl-app-bar{grid-template-columns:auto 1fr auto;gap:10px;padding:0 12px}
.hcl-app-bar .hcl-brand-words{display:none}
.hcl-tabs{justify-self:center}
.hcl-tab{padding:0 11px}
.hcl-tab span{display:none}
.hcl-user-name{display:none}
.hcl-app-body{grid-template-columns:1fr}
.hcl-side{padding:14px 12px 0}
.hcl-app-body[data-detail=true] .hcl-side{display:none}
.hcl-app-body[data-detail=false] .hcl-main{display:none}
.hcl-main{padding:8px}
.hcl-back{display:inline-grid}
.hcl-field{grid-template-columns:34px 1fr;padding-left:4px}
.hcl-para{min-width:0}
.hcl-ln{grid-template-columns:minmax(0,1fr) auto;row-gap:10px}
.hcl-ln-total{grid-column:2;grid-row:1}
.hcl-ln .hcl-qty{grid-column:1;grid-row:2;justify-self:start}
.hcl-docket-f{grid-template-columns:1fr}
.hcl-sec{padding:96px 0}
.hcl-h1 .hcl-line{display:inline}
.hcl-hero{padding:40px 0 48px}
.hcl-who{grid-template-columns:1fr}
.hcl-who button{flex-direction:row;text-align:left}
.hcl-q{min-height:0}
}
@media (max-width:520px){
.hcl-stats{grid-template-columns:1fr}
.hcl-stat+.hcl-stat{border-left:0;border-top:1px solid var(--hcl-line)}
.hcl-stat::before{display:none}
.hcl-actions .hcl-btn-white{display:none}
.hcl-foot-grid{grid-template-columns:1fr 1fr;gap:28px}
.hcl-cta-row .hcl-btn{flex:1}
}
@media (prefers-reduced-motion:reduce){
.hcl-root *,.hcl-root *::before,.hcl-root *::after{animation-duration:.001ms !important;animation-iteration-count:1 !important;animation-delay:0s !important;transition-duration:.001ms !important}
.hcl-app{transform:none !important}
.hcl-orbits{transform:none !important}
.hcl-pre{opacity:1;transform:none}
}
`

// ---------------------------------------------------------------------------
// primitives

const ICONS: { [k: string]: string } = {
  chev: "M6 9l6 6 6-6",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-3.5-3.5",
  inbox: "M4 13l2.2-7.2A1.5 1.5 0 0 1 7.6 4.8h8.8a1.5 1.5 0 0 1 1.4 1L20 13M4 13v5a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18v-5M4 13h4.5l1.2 2.2h4.6l1.2-2.2H20",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c.6-3.4 3-5.5 6-5.5s5.4 2.1 6 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14.8c1.6.7 2.7 2.4 3 4.7",
  spark: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2z",
  ask: "M20 12a8 8 0 1 1-3-6.2M20 4v4h-4M9.5 10h.01M14.5 10h.01M9 14.5c1.5 1.3 4.5 1.3 6 0",
  tag: "M3.5 6.5v5.2l8.3 8.3 7.2-7.2-8.3-8.3H5.5a2 2 0 0 0-2 2zM8 9h.01",
  x: "M7 7l10 10M17 7L7 17",
  more: "M12 6h.01M12 12h.01M12 18h.01",
  arrow: "M5 12h14M13 6l6 6-6 6",
  back: "M19 12H5M11 6l-6 6 6 6",
  check: "M5 12.5l4.5 4.5L19 7.5",
  menu: "M4 8h16M4 16h16",
  send: "M4 12l16-8-6 16-2.5-6.5L4 12z",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  ol: "M10 6h10M10 12h10M10 18h10M4 5h1.5v4M4 9h3M4 15.5a1.5 1.5 0 0 1 3 0c0 1.2-3 1.7-3 3h3",
  ul: "M10 6h10M10 12h10M10 18h10M5 6h.01M5 12h.01M5 18h.01",
  align: "M4 6h16M4 10h10M4 14h16M4 18h10",
  alignC: "M4 6h16M7 10h10M4 14h16M7 18h10",
  alignR: "M4 6h16M10 10h10M4 14h16M10 18h10",
  undo: "M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2",
  archive: "M4 7h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7zM3 4h18v3H3zM10 11h4",
  box: "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  bolt: "M13 3L5 14h6l-1 7 8-11h-6l1-7z",
  mail: "M4 6h16v12H4zM4 7l8 6 8-6",
  sort: "M8 5v14M4 9l4-4 4 4M16 19V5M12 15l4 4 4-4",
  warn: "M12 4l9 16H3L12 4zM12 10v4M12 17h.01",
}

function Icon({ name, size = 16, stroke = 1.6, className }: { name: string; size?: number; stroke?: number; className?: string }) {
  return (
    <svg className={"hcl-svg " + (className || "")} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name] || ""} />
    </svg>
  )
}

/** The Halyard mark: six beads on a ring around a pulled knot. */
function Mark({ size = 30 }: { size?: number }) {
  const beads = [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 2 + 0.35
    return { x: 16 + Math.cos(a) * 11, y: 16 + Math.sin(a) * 11, r: i === 0 ? 3.2 : i % 2 ? 2.2 : 2.7 }
  })
  return (
    <svg className="hcl-svg" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      {beads.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r={b.r} fill="#fff" opacity={i === 0 ? 1 : 0.88} />
      ))}
      <path d="M11 16a5 5 0 0 1 10 0M21 16a5 5 0 0 1-10 0" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="12 3.6" />
    </svg>
  )
}

function Avatar({name,size=36}:{name:string;size?:number}){return <span className="hcl-avatar" style={{width:size,height:size,fontSize:Math.round(size*.34)}} aria-hidden="true">{initials(name)}</span>;}

function useReducedMotion() {
  const [reduced, setReduced] = React.useState(false)
  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const on = () => setReduced(mq.matches)
    on()
    mq.addEventListener?.("change", on)
    return () => mq.removeEventListener?.("change", on)
  }, [])
  return reduced
}

/** Closes a popover on outside pointer-down or Escape. */
function useDismiss(open: boolean, close: () => void, ref: { current: HTMLElement | null }) {
  React.useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("pointerdown", down)
    document.addEventListener("keydown", key)
    return () => {
      document.removeEventListener("pointerdown", down)
      document.removeEventListener("keydown", key)
    }
  }, [open, close, ref])
}

/** The great rings behind the hero, with signals riding them. */
function Orbits({ uid, reduced }: { uid: string; reduced: boolean }) {
  const rings = [
    { r: 780, cls: "hcl-ring", dur: 90, sats: [0.08, 0.61] },
    { r: 610, cls: "hcl-ring2", dur: 70, sats: [0.33] },
    { r: 930, cls: "hcl-ring2", dur: 120, sats: [0.8] },
  ]
  return (
    <svg className="hcl-svg hcl-orbits" viewBox="0 0 1800 1800" aria-hidden="true">
      <defs>
        {rings.map((g, i) => (
          <path key={i} id={uid + "-o" + i} d={"M900 " + (1040 - g.r) + "a" + g.r + " " + g.r + " 0 1 1 0 " + 2 * g.r + "a" + g.r + " " + g.r + " 0 1 1 0 " + -2 * g.r} />
        ))}
      </defs>
      {rings.map((g, i) => (
        <circle key={i} className={g.cls} cx="900" cy="1040" r={g.r} />
      ))}
      {!reduced &&
        rings.map((g, i) =>
          g.sats.map((s, j) => (
            <circle key={i + "-" + j} className="hcl-sat" r={i === 0 ? 2.6 : 2}>
              <animateMotion dur={g.dur + "s"} repeatCount="indefinite" begin={-s * g.dur + "s"} rotate="auto">
                <mpath href={"#" + uid + "-o" + i} />
              </animateMotion>
            </circle>
          )),
        )}
    </svg>
  )
}

function Grain({ uid }: { uid: string }) {
  return (
    <svg className="hcl-svg hcl-grain" aria-hidden="true" preserveAspectRatio="none">
      <filter id={uid + "-n"}>
        <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch" />
        <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 0" />
      </filter>
      <rect width="100%" height="100%" filter={"url(#" + uid + "-n)"} />
    </svg>
  )
}

const scrollToHash = (href: string | undefined, reduced: boolean, root: HTMLElement | null) => {
  if (!href || href[0] !== "#" || href.length < 2) return false
  const el = root?.querySelector('[data-sec="' + href.slice(1) + '"]')
  if (!el) return false
  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
  return true
}

const MENU_ICONS = ["spark", "box", "chart", "link"];
function HclNav({
  brand,
  tagline,
  logo,
  nav,
  login,
  demoAction,
  scrolled,
  onLink,
  onDemo,
}: {
  brand: string
  tagline: string
  logo?: React.ReactNode
  nav: HclNavItem[]
  login: HclLink | null
  demoAction: HclLink
  scrolled: boolean
  onLink: (e: React.MouseEvent, href?: string) => void
  onDemo: (e: React.MouseEvent) => void
}) {
  const arabic=React.useContext(MarketingLanguage);
  const tr=(fr:string,ar:string)=>arabic?ar:fr;
  const [open, setOpen] = React.useState(-1)
  const [sheet, setSheet] = React.useState(false)
  const ref = React.useRef(null as HTMLDivElement | null)
  const hover = React.useRef(0)
  const close = React.useCallback(() => setOpen(-1), [])
  useDismiss(open >= 0, close, ref)

  React.useEffect(() => {
    if (!sheet) return
    const key = (e: KeyboardEvent) => e.key === "Escape" && setSheet(false)
    document.addEventListener("keydown", key)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", key)
      document.body.style.overflow = prev
    }
  }, [sheet])

  const enter = (i: number) => {
    window.clearTimeout(hover.current)
    hover.current = window.setTimeout(() => setOpen(i), 60)
  }
  const leave = () => {
    window.clearTimeout(hover.current)
    hover.current = window.setTimeout(() => setOpen(-1), 160)
  }
  const go = (e: React.MouseEvent, href?: string) => {
    setOpen(-1)
    setSheet(false)
    onLink(e, href)
  }

  return (
    <nav className="hcl-nav" data-scrolled={scrolled} aria-label={tr("Navigation principale","القائمة الرئيسية")}>
      <div className="hcl-wrap hcl-nav-in" ref={ref}>
        <a href="#top" className="hcl-brand" onClick={(e) => go(e, "#top")} aria-label={brand + tr(" accueil"," الرئيسية")}>
          {logo || <Mark size={32} />}
          <span className="hcl-brand-words">
            <span className="hcl-brand-name">{brand}</span>
            <span className="hcl-brand-sub">{tagline}</span>
          </span>
        </a>
        <ul className="hcl-links">
          {nav.map((item, i) =>
            item.items && item.items.length ? (
              <li key={item.label} className="hcl-dd" onPointerEnter={(e) => e.pointerType === "mouse" && enter(i)} onPointerLeave={(e) => e.pointerType === "mouse" && leave()}>
                <button
                  type="button"
                  className="hcl-link"
                  aria-expanded={open === i}
                  aria-controls={"hcl-menu-" + i}
                  onClick={() => setOpen(open === i ? -1 : i)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault()
                      setOpen(i)
                      requestAnimationFrame(() => (ref.current?.querySelector("#hcl-menu-" + i + " a") as HTMLElement | null)?.focus())
                    }
                  }}
                >
                  {item.label}
                  <Icon name="chev" size={14} className="hcl-chev" />
                </button>
                <div className="hcl-menu" id={"hcl-menu-" + i} data-open={open === i}>
                  {item.items.map((sub, j) => (
                    <a key={sub.label} href={sub.href || "#"} tabIndex={open === i ? 0 : -1} onClick={(e) => go(e, sub.href)}>
                      <span className="hcl-menu-ico">
                        <Icon name={MENU_ICONS[j % MENU_ICONS.length] ?? "spark"} size={16} />
                      </span>
                      <b>{sub.label}</b>
                      {sub.description && <small>{sub.description}</small>}
                    </a>
                  ))}
                </div>
              </li>
            ) : (
              <li key={item.label}>
                <a className="hcl-link" href={item.href || "#"} onClick={(e) => go(e, item.href)}>
                  {item.label}
                </a>
              </li>
            ),
          )}
        </ul>
        <div className="hcl-actions">
          {login && (
            <a className="hcl-login" href={login.href || "#"} onClick={(e) => !login.href && e.preventDefault()}>
              {login.label}
            </a>
          )}
          <a className="hcl-btn hcl-btn-white" href={demoAction.href || "#contact"} onClick={onDemo}>
            {demoAction.label}
          </a>
          <button type="button" className="hcl-burger" aria-label={tr("Ouvrir le menu","فتح القائمة")} aria-expanded={sheet} onClick={() => setSheet(true)}>
            <Icon name="menu" size={18} />
          </button>
        </div>
      </div>

      <div className="hcl-sheet" data-open={sheet} role="dialog" aria-modal="true" aria-label="Menu" aria-hidden={!sheet}>
        <div className="hcl-sheet-top">
          <span className="hcl-brand">
            {logo || <Mark size={30} />}
            <span className="hcl-brand-words">
              <span className="hcl-brand-name">{brand}</span>
              <span className="hcl-brand-sub">{tagline}</span>
            </span>
          </span>
          <button type="button" className="hcl-burger" style={{ display: "grid" }} aria-label={tr("Fermer le menu","إغلاق القائمة")} tabIndex={sheet ? 0 : -1} onClick={() => setSheet(false)}>
            <Icon name="x" size={18} />
          </button>
        </div>
        {nav.map((item) =>
          item.items && item.items.length ? (
            <details key={item.label}>
              <summary tabIndex={sheet ? 0 : -1}>
                {item.label}
                <Icon name="chev" size={18} className="hcl-chev" />
              </summary>
              {item.items.map((sub) => (
                <a key={sub.label} href={sub.href || "#"} tabIndex={sheet ? 0 : -1} onClick={(e) => go(e, sub.href)}>
                  {sub.label}
                </a>
              ))}
            </details>
          ) : (
            <a key={item.label} className="hcl-sheet-link" href={item.href || "#"} tabIndex={sheet ? 0 : -1} onClick={(e) => go(e, item.href)}>
              {item.label}
              <Icon name="arrow" size={18} />
            </a>
          ),
        )}
        <div className="hcl-sheet-cta">
          {login && (
            <a className="hcl-btn hcl-btn-ghost hcl-btn-lg" href={login.href || "#"} tabIndex={sheet ? 0 : -1}>
              {login.label}
            </a>
          )}
          <a
            className="hcl-btn hcl-btn-white hcl-btn-lg"
            href={demoAction.href || "#contact"}
            tabIndex={sheet ? 0 : -1}
            onClick={(e) => {
              setSheet(false)
              onDemo(e)
            }}
          >
            {demoAction.label}
          </a>
        </div>
      </div>
    </nav>
  )
}

// ---------------------------------------------------------------------------
// how it works

function HowVisual({ step, reduced, uid, onStep }: { step: number; reduced: boolean; uid: string; onStep?: (i: number) => void }) {
  const arabic=React.useContext(MarketingLanguage);
  const tr=(fr:string,ar:string)=>arabic?ar:fr;
  const nodes = [tr("Client","العميل"),tr("Conducteur","السائق"),tr("Véhicule","المركبة"),tr("Dates","التواريخ"),tr("Agence","الوكالة")].map((label, i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2
    return { label, x: 230 + Math.cos(a) * 168, y: 230 + Math.sin(a) * 168 }
  })
  return (
    <div className="hcl-vis">
      <div className="hcl-vis-layer" data-on={step === 0}>
        <svg className="hcl-svg" width="460" height="460" viewBox="0 0 460 460" style={{ maxWidth: "100%", height: "auto" }} aria-hidden="true">
          <circle cx="230" cy="230" r="168" fill="none" stroke="rgba(255,255,255,.22)" />
          <circle cx="230" cy="230" r="100" fill="none" stroke="rgba(255,255,255,.12)" />
          {nodes.map((n, i) => (
            <path key={i} id={uid + "-sp" + i} className="hcl-spoke" d={"M" + n.x.toFixed(1) + " " + n.y.toFixed(1) + "L230 230"} />
          ))}
          {!reduced &&
            step === 0 &&
            nodes.map((n, i) => (
              <circle key={"d" + i} r="3" fill="#fff" className="hcl-sat">
                <animateMotion dur={1.8 + i * 0.25 + "s"} repeatCount="indefinite" begin={i * 0.35 + "s"}>
                  <mpath href={"#" + uid + "-sp" + i} />
                </animateMotion>
              </circle>
            ))}
          {!reduced && <circle cx="230" cy="230" r="44" fill="none" stroke="#fff" className="hcl-core-pulse" />}
          <circle cx="230" cy="230" r="44" fill="rgba(255,255,255,.95)" />
          <g transform="translate(212 212) scale(1.125)">
            <circle cx="16" cy="16" r="16" fill="none" />
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const a = (i / 6) * Math.PI * 2 - Math.PI / 2 + 0.35
              return <circle key={i} cx={16 + Math.cos(a) * 11} cy={16 + Math.sin(a) * 11} r={i === 0 ? 3.2 : 2.4} fill="#13306a" />
            })}
            <path d="M11 16a5 5 0 0 1 10 0M21 16a5 5 0 0 1-10 0" fill="none" stroke="#13306a" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="12 3.6" />
          </g>
          {nodes.map((n) => (
            <g key={n.label} className="hcl-node" transform={"translate(" + n.x.toFixed(1) + " " + n.y.toFixed(1) + ")"}>
              <rect x="-42" y="-16" width="84" height="32" rx="16" />
              <text textAnchor="middle" dy="4">
                {n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="hcl-vis-layer" data-on={step === 1}>
        <div className="hcl-drafts">
          {[
            { name: "Nora Exemple", t: tr("Client et conducteur","العميل والسائق"), c: 50, y: 0, s: 0.86, o: 0.5 },
            { name: "Nora Exemple", t: tr("Véhicule et dates","المركبة والتواريخ"), c: 75, y: 34, s: 0.93, o: 0.75 },
            { name: "Nora Exemple", t: tr("Modèle rempli","نموذج معبأ"), c: 100, y: 72, s: 1, o: 1 },
          ].map((d, i) => (
            <div key={d.t} className="hcl-dcard" style={{ top: d.y, opacity: d.o, transform: step === 1 ? "scale(" + d.s + ")" : "scale(" + d.s + ") translateY(" + (2 - i) * 16 + "px)", zIndex: i }}>
              <header>
                <Avatar name={d.name} size={26} />
                <b style={{ fontWeight: 500 }}>{d.t}</b>
                <span>{tr("Champ relié","حقل مرتبط")}</span>
              </header>
              {i === 2 && (
                <>
                  <div className="hcl-dline" style={{ width: "92%" }} />
                  <div className="hcl-dline" style={{ width: "84%" }} />
                  <div className="hcl-dline" style={{ width: "70%" }} />
                  <div className="hcl-dline" style={{ width: "46%" }} />
                </>
              )}
              <div className="hcl-conf" style={{ ["--w" as string]: d.c + "%" } as React.CSSProperties}>
                {tr("Champs du scénario","حقول السيناريو")}
                <i />
                {d.c/25}/4
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hcl-vis-layer" data-on={step === 2}>
        <div className="hcl-timeline">
          {[
            [tr("Agence illustrée","الوكالة موضحة"),"Amine Exemple", "09:02"],
            [tr("Client illustré","العميل موضح"),"Nora Exemple", "09:04"],
            [tr("Dossier organisé","ملف منظم"),tr("Archive illustrée","أرشيف توضيحي"),"09:05"],
          ].map(([b, s, t], i) => (
            <div key={b} className="hcl-tl" data-done={step === 2} style={{ transitionDelay: i * 0.25 + "s" }}>
              <span className="hcl-tl-dot" style={{ transitionDelay: i * 0.25 + "s" }}>
                <Icon name="check" size={14} stroke={2.2} />
              </span>
              <span>
                <b>{b}</b>
                <small>{s}</small>
              </span>
              <time>{t}</time>
            </div>
          ))}
          <div className="hcl-order">
            <span>
              {tr("Contrat CTR-2026-0042","عقد CTR-2026-0042")}
              <br />
              <small style={{ opacity: 0.7 }}>{tr("Livraison non envoyée · Sheets déconnecté","تسليم غير مرسل · Sheets غير متصل")}</small>
            </span>
            <b>PDF · v3</b>
          </div>
        </div>
      </div>
      {onStep && (
        <div className="hcl-vis-steps">
          {[0, 1, 2].map((i) => (
            <button key={i} type="button" aria-label={tr("Voir l’étape ","عرض المرحلة ") + (i + 1)} aria-current={step === i} onClick={() => onStep(i)} />
          ))}
        </div>
      )}
    </div>
  )
}

function HclHow({ how, reduced, uid }: { how: { kicker?: string; title: string; steps: HclStep[] }; reduced: boolean; uid: string }) {
  const [active, setActive] = React.useState(0)
  const refs = React.useRef([] as (HTMLDivElement | null)[])
  React.useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i))
        }),
      { rootMargin: "-45% 0px -45% 0px" },
    )
    refs.current.forEach((n) => n && io.observe(n))
    return () => io.disconnect()
  }, [how.steps.length])
  const jump = (i: number) => refs.current[i]?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" })
  return (
    <section className="hcl-sec" data-sec="how" aria-labelledby={uid + "-how"}>
      <div className="hcl-wrap">
        <div className="hcl-rise">
          {how.kicker && <span className="hcl-kicker">{how.kicker}</span>}
          <h2 className="hcl-h2" id={uid + "-how"}>
            {how.title}
          </h2>
        </div>
        <div className="hcl-how">
          <div>
            {how.steps.map((s, i) => (
              <div key={s.title} className="hcl-step" data-i={i} data-active={active === i} ref={(n) => {refs.current[i] = n;}}>
                <span className="hcl-step-k">{s.kicker}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
                {s.points && (
                  <ul>
                    {s.points.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                )}
                <div className="hcl-how-inline">
                  <HowVisual step={i % 3} reduced={reduced} uid={uid + "m" + i} />
                </div>
              </div>
            ))}
          </div>
          <div className="hcl-how-sticky">
            <HowVisual step={active % 3} reduced={reduced} uid={uid + "d"} onStep={jump} />
          </div>
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// quotes

function HclCta({ cta, onDemo, uid }: { cta: { title: string; subtitle?: string; action?: HclLink }; onDemo: (e: React.MouseEvent) => void; uid: string }) {
  return (
    <section className="hcl-cta" data-sec="contact" aria-labelledby={uid + "-c"}>
      <svg className="hcl-svg hcl-cta-orbit" viewBox="0 0 900 900" aria-hidden="true">
        <circle cx="450" cy="450" r="420" fill="none" stroke="rgba(255,255,255,.16)" />
        <circle cx="450" cy="450" r="300" fill="none" stroke="rgba(255,255,255,.24)" />
        <circle cx="450" cy="450" r="190" fill="none" stroke="rgba(255,255,255,.1)" />
        <circle cx="750" cy="450" r="4" className="hcl-sat" />
        <circle cx="153" cy="372" r="3" className="hcl-sat" />
        <circle cx="450" cy="30" r="2.5" className="hcl-sat" />
      </svg>
      <div className="hcl-wrap hcl-rise" style={{ position: "relative" }}>
        <h2 className="hcl-h2" id={uid + "-c"}>
          {cta.title}
        </h2>
        {cta.subtitle && <p className="hcl-lead">{cta.subtitle}</p>}
        <div className="hcl-cta-row" style={{ animation: "none" }}>
          <a className="hcl-btn hcl-btn-white hcl-btn-lg" href={cta.action?.href || "#contact"} onClick={onDemo}>
            {cta.action?.label || "Book a demo"}
            <Icon name="arrow" size={16} />
          </a>
        </div>
      </div>
    </section>
  )
}

function HclFooter({
  brand,
  tagline,
  logo,
  footer,
  onLink,
  onSubscribe,
}: {
  brand: string
  tagline: string
  logo?: React.ReactNode
  footer: { columns?: { title: string; links: HclLink[] }[]; note?: string; newsletter?: boolean }
  onLink: (e: React.MouseEvent, href?: string) => void
  onSubscribe?: ((email: string) => unknown) | undefined
}) {
  const arabic=React.useContext(MarketingLanguage);
  const tr=(fr:string,ar:string)=>arabic?ar:fr;
  const [email, setEmail] = React.useState("")
  const [msg, setMsg] = React.useState({ text: "", err: false })
  const [busy, setBusy] = React.useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isEmail(email)) {
      setMsg({ text: "That email doesn't look right.", err: true })
      return
    }
    setBusy(true)
    let ok = true
    try {
      const r = onSubscribe ? await onSubscribe(email.trim()) : await new Promise((res) => setTimeout(() => res(true), 600))
      if (r === false) ok = false
    } catch {
      ok = false
    }
    setBusy(false)
    setMsg(ok ? { text: "You're in. One playbook a month, no fluff.", err: false } : { text: "Couldn't subscribe. Try again?", err: true })
    if (ok) setEmail("")
  }
  return (
    <footer className="hcl-foot">
      <div className="hcl-wrap">
        <div className="hcl-foot-grid">
          <div>
            <span className="hcl-brand">
              {logo || <Mark size={32} />}
              <span className="hcl-brand-words">
                <span className="hcl-brand-name">{brand}</span>
                <span className="hcl-brand-sub">{tagline}</span>
              </span>
            </span>
            {footer.newsletter !== false && (
              <form onSubmit={submit} noValidate>
                <div className="hcl-news">
                  <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setMsg({ text: "", err: false }) }} placeholder="Work email" aria-label="Email for the monthly playbook" aria-invalid={msg.err} />
                  <button type="submit" className="hcl-btn hcl-btn-white hcl-btn-sm" disabled={busy}>
                    {busy ? "…" : "Subscribe"}
                  </button>
                </div>
                <p className="hcl-news-msg" data-err={msg.err} role="status">
                  {msg.text || "The monthly sales playbook for distributors."}
                </p>
              </form>
            )}
          </div>
          {(footer.columns || []).map((c) => (
            <div key={c.title}>
              <h4>{c.title}</h4>
              <ul>
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.href ? (
                      <a href={l.href} onClick={(e) => onLink(e, l.href)}>
                        {l.label}
                      </a>
                    ) : (
                      <span>{l.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="hcl-wordmark" aria-hidden="true">
          <svg className="hcl-svg" viewBox="0 0 1200 260" preserveAspectRatio="xMidYMin meet">
            <text x="600" y="232" textAnchor="middle" fontSize="300" textLength="1180" lengthAdjust="spacingAndGlyphs">
              {brand.toLowerCase()}
            </text>
            <path d="M-20 250 Q600 40 1220 250" fill="none" stroke="rgba(255,255,255,.4)" />
            <circle cx="900" cy="160" r="3.5" className="hcl-sat" />
          </svg>
        </div>
        <div className="hcl-foot-bottom">
          <span>
            © {new Date().getFullYear()} {footer.note || brand}
          </span>
          <span>{tr("Aperçu isolé · aucun service connecté","معاينة منفصلة · لا خدمة متصلة")}</span>
        </div>
      </div>
    </footer>
  )
}

export default function HalyardCopilotLanding({
  locale = "fr",
  brand = "Halyard",
  tagline = "Commerce",

  logo,
  nav = DEFAULT_NAV,
  login = { label: "Login" },
  demoAction = { label: "Book a Demo" },
  badge = "One place for data → drafts → follow-up",
  title = "What if every buyer thought they\nwere your only customer?",
  subtitle = "Copilot turns live inventory, pricing, and order data into instant quotes, so reps focus on selling.",
  primaryAction = { label: "Get a demo" },
  secondaryAction = { label: "See how it works", href: "#how" },

  how = DEFAULT_HOW,
  quote = DEFAULT_QUOTE,


  cta = { title: "Make every buyer feel like the only one.", subtitle: "Connect your ERP on Monday. Send your first Copilot drafts by Wednesday.", action: { label: "Book a demo" } },
  footer = DEFAULT_FOOTER,
  palette = "steel",
  scheme = "auto",


  onSubscribe,
  height = "100svh",
  className,
}: HalyardCopilotLandingProps) {
  const tr=(fr:string,ar:string)=>locale==="ar"?ar:fr;
  const uid = "hcl" + React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const reduced = useReducedMotion()
  const rootRef = React.useRef(null as HTMLDivElement | null)
  const appRef = React.useRef(null as HTMLDivElement | null)
  const [scrolled, setScrolled] = React.useState(false)



  const pal = resolvePalette(palette)

  // ---- scroll: nav state, orbit drift, the app straightening -------------
  React.useEffect(() => {
    let raf = 0
    const run = () => {
      raf = 0
      const y = window.scrollY || 0
      const root = rootRef.current
      setScrolled(root ? root.getBoundingClientRect().top < -8 : y > 8)
      if (root && !reduced) root.style.setProperty("--hcl-sy", String(Math.max(0, -root.getBoundingClientRect().top)))
      const app = appRef.current
      if (app) app.style.setProperty("--t", reduced ? "0" : tiltFor(app.getBoundingClientRect().top, window.innerHeight || 800).toFixed(4))
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(run)
    }
    run()
    window.addEventListener("scroll", on, { passive: true })
    window.addEventListener("resize", on)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("scroll", on)
      window.removeEventListener("resize", on)
    }
  }, [reduced])

  // ---- reveal on scroll: only what starts below the fold is hidden --------
  React.useEffect(() => {
    const root = rootRef.current
    if (!root || reduced || typeof IntersectionObserver === "undefined") return
    const vh = window.innerHeight || 800
    const below = Array.from(root.querySelectorAll(".hcl-rise")).filter((n) => n.getBoundingClientRect().top > vh)
    below.forEach((n) => n.classList.add("hcl-pre"))
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((x) => {
          if (x.isIntersecting) {
            x.target.classList.remove("hcl-pre")
            io.unobserve(x.target)
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    )
    below.forEach((n) => io.observe(n))
    return () => {
      io.disconnect()
      below.forEach((n) => n.classList.remove("hcl-pre"))
    }
  }, [reduced])

  const onLink = (e: React.MouseEvent, href?: string) => {
    if (href === "#top") {
      e.preventDefault()
      rootRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" })
      return
    }
    if (scrollToHash(href, reduced, rootRef.current)) e.preventDefault()
    else if (!href || href === "#") e.preventDefault()
  }


  const lines = title.split("\n")
  let w = 0


  const style = {
    "--hcl-d1": pal.sky[0],
    "--hcl-d2": pal.sky[1],
    "--hcl-d3": pal.sky[2],
    "--hcl-d4": pal.sky[3],
    "--hcl-n1": pal.night[0],
    "--hcl-n2": pal.night[1],
    "--hcl-n3": pal.night[2],
    "--hcl-n4": pal.night[3],
    "--hcl-glow": pal.glow,
    "--hcl-haze": pal.haze,
    "--hcl-accent": pal.accent,
  } as React.CSSProperties

  return (
    <MarketingLanguage.Provider value={locale==="ar"}><div ref={rootRef} className={"hcl-root" + (className ? " " + className : "")} data-scheme={scheme} style={style}>
      <style>{HCL_CSS}</style>
      <div className="hcl-sky" aria-hidden="true">
        <Grain uid={uid} />
        <Orbits uid={uid} reduced={reduced} />
      </div>

      <HclNav brand={brand} tagline={tagline} logo={logo} nav={nav} login={login} demoAction={demoAction} scrolled={scrolled} onLink={onLink} onDemo={(e)=>onLink(e,demoAction.href)} />

      <header data-sec="top" style={{ position: "relative" }}>
        <div className="hcl-rails" aria-hidden="true">
          <i />
          <i />
        </div>
        <div className="hcl-wrap hcl-hero" style={{ minHeight: "max(420px, calc(" + height + " * 0.53 - 76px))" }}>
          {badge && (
            <span className="hcl-badge" style={{ animation: "hcl-fade .8s var(--hcl-ease) both" }}>
              {badgeParts(badge).map((part, i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <svg className="hcl-svg hcl-badge-arrow" width="16" height="10" viewBox="0 0 16 10" aria-label={tr("puis","ثم")}>
                      <path d="M0 5h14M10.5 1.5 14 5l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  )}
                  {part}
                </React.Fragment>
              ))}
            </span>
          )}
          <h1 className="hcl-h1">
            {lines.map((line, li) => (
              <span key={li} className="hcl-line">
                {line.split(" ").map((word, wi) => (
                  <React.Fragment key={wi}>
                    <span className="hcl-word" style={{ ["--i" as string]: w++ } as React.CSSProperties}>
                      {word}
                    </span>{" "}
                  </React.Fragment>
                ))}
              </span>
            ))}
          </h1>
          {subtitle && <p className="hcl-sub">{subtitle}</p>}
          <div className="hcl-cta-row">
            <a className="hcl-btn hcl-btn-white hcl-btn-lg" href={primaryAction.href || "#contact"} onClick={(e)=>onLink(e,primaryAction.href)}>
              {primaryAction.label}
            </a>
            {secondaryAction && (
              <a className="hcl-btn hcl-btn-ghost hcl-btn-lg" href={secondaryAction.href || "#how"} onClick={(e) => onLink(e, secondaryAction.href || "#how")}>
                {secondaryAction.label}
              </a>
            )}
          </div>
        </div>
        <div className="hcl-stage" data-sec="product">
          <div className="hcl-hline hcl-stage-line" aria-hidden="true" />
          <ContractWorkspace ar={locale==="ar"} brand={brand} appRef={appRef} reduced={reduced}/>
        </div>
      </header>

      <main>
        {how && <HclHow how={how} reduced={reduced} uid={uid} />}
        {quote && <ProductDemonstration ar={locale==="ar"} reduced={reduced}/>}
        <ProductFAQ ar={locale==="ar"}/>


        {cta && <HclCta cta={cta} onDemo={(e)=>onLink(e,cta.action?.href)} uid={uid} />}
      </main>
      {footer && <HclFooter brand={brand} tagline={tagline} logo={logo} footer={footer} onLink={onLink} onSubscribe={onSubscribe} />}

    </div></MarketingLanguage.Provider>
  )
}
