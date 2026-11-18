import "../globals.css";

export default function EntryLayout({ children }: { children: React.ReactNode }) {
  return <html lang="fr" dir="ltr"><body>{children}</body></html>;
}
