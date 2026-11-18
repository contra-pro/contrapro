export default function Loading() {
  return <main id="main" tabIndex={-1} aria-busy="true">
    <div role="status" aria-live="polite">
      <p lang="fr">Vérification de votre accès…</p>
      <p lang="ar" dir="rtl">جارٍ التحقق من صلاحية دخولك…</p>
    </div>
  </main>;
}
