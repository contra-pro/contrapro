"use client";

export default function AgencyError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main" tabIndex={-1}>
    <div role="alert">
      <h1 lang="fr">Votre espace est temporairement indisponible</h1>
      <p lang="ar" dir="rtl">مساحتك غير متاحة مؤقتاً</p>
      <p lang="fr">Aucun accès n’a pu être confirmé.</p>
      <button type="button" onClick={reset}>Réessayer / إعادة المحاولة</button>
    </div>
  </main>;
}
