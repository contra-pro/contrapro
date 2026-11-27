import "../globals.css";
import "../production-design.css";

export default function EntryLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr" dir="ltr"><body>{children}</body></html>;
}
