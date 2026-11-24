import type { ContractSettings } from "../../../../packages/application/src/rentals/contract-settings";
import styles from "./contract-legal.module.css";

function Label({ fr, ar, bilingual }: { fr: string; ar: string; bilingual: boolean }) {
  return <><span lang="fr">{fr}</span>{bilingual && <> / <bdi lang="ar" dir="rtl">{ar}</bdi></>}</>;
}
/** Read-only placeholders. The model supports neither signing events nor consent evidence. */
export function ContractSignaturePlaceholders({ signatures, bilingual = false }: { signatures: unknown; bilingual?: boolean }) {
  const keys = ["customer", "agency"];
  if (!signatures || typeof signatures !== "object" || Object.getPrototypeOf(signatures) !== Object.prototype ||
    Reflect.ownKeys(signatures).length !== 2 || keys.some(key => {
      const d = Object.getOwnPropertyDescriptor(signatures, key); return !d?.enumerable || !("value" in d) || d.value !== "not-signed";
    })) return <p role="alert"><Label fr="État des signatures non disponible — aucune donnée de signature déduite" ar="حالة التوقيعات غير متوفرة — لم يتم استنتاج أي بيانات توقيع" bilingual={bilingual} /></p>;
  const label = (fr: string, ar: string) => <Label fr={fr} ar={ar} bilingual={bilingual} />;
  return <section className={styles.signatureSection} aria-label="Signatures">
    <h2>{label("Signatures — aperçu non signé", "التوقيعات — معاينة غير موقعة")}</h2>
    <div className={styles.signatures}>{(["customer", "agency"] as const).map(party => <section key={party} data-signature-party={party}>
      <h3>{party === "customer" ? label("Signature client", "توقيع الزبون") : label("Signature agence", "توقيع الوكالة")}</h3>
      <p>{party === "customer" ? label("Signataire client : identité non renseignée", "الموقع الزبون: الهوية غير متوفرة") : label("Représentant de l’agence : identité non renseignée", "ممثل الوكالة: الهوية غير متوفرة")}</p>
      <p><strong>{label("Non signé — en attente (aperçu uniquement)", "غير موقع — قيد الانتظار (معاينة فقط)")}</strong></p>
      <div className={styles.blank}>{label("Emplacement réservé — aucune signature", "مكان مخصص — لا يوجد توقيع")}</div>
      <p>{label("Date et heure de signature : non renseignées", "تاريخ ووقت التوقيع: غير متوفرين")}</p>
      <p>{label("Acceptation des conditions : non renseignée", "قبول الشروط: غير متوفر")}</p>
    </section>)}</div>
    <p>{label("Aucun consentement ni contrôle d’identité attesté. Aucun acte de signature déclenché par cet aperçu.", "لا يوجد إثبات للموافقة أو التحقق من الهوية. هذه المعاينة لا تبدأ أي إجراء توقيع.")}</p>
  </section>;
}

/** Uses the supplied snapshot settings only, never a live repository or another agency. */
export function ContractLegalFooter({ settings, agencyId }: { settings: ContractSettings; agencyId: string }) {
  if (settings.agencyId !== agencyId) return <p role="alert">Configuration d’agence incompatible.</p>;
  const bilingual = settings.template === "bilingual";
  const fields = [
    ["Raison sociale", "الاسم القانوني", settings.company.name], ["Adresse", "العنوان", settings.company.address],
    ["Ville", "المدينة", settings.company.city], ["Téléphone", "الهاتف", settings.company.phone], ["E-mail", "البريد الإلكتروني", settings.company.email],
    ["ICE", "التعريف الموحد للمقاولة", settings.company.ice], ["RC", "السجل التجاري", settings.company.rc], ["IF", "التعريف الضريبي", settings.company.ifNumber],
  ] as const;
  return <footer className={styles.footer} data-legal-footer="true">
    <dl>{fields.map(([fr,ar,value]) => <div key={fr}><dt><Label fr={fr} ar={ar} bilingual={bilingual} /></dt><dd>{value?.trim() ? value : <Label fr="Non renseigné" ar="غير متوفر" bilingual={bilingual} />}</dd></div>)}</dl>
    {settings.footer && <p className={styles.configuredText} data-configured-footer="true">{settings.footer}</p>}
    <p><Label fr="Démonstration documentaire — non signé. Aucune validité juridique attestée par cet aperçu." ar="معاينة وثيقة — غير موقعة. هذه المعاينة لا تثبت أي صلاحية قانونية." bilingual={bilingual} /></p>
  </footer>;
}
