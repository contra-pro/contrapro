import { RentalPage } from "../../../../../rentals/page";
export default async function Page({ params }: { params: Promise<{ locale: string; rentalId: string }> }) {
  const { locale, rentalId } = await params; return <RentalPage locale={locale} mode="detail" id={rentalId} />;
}
