import { RentalPage } from "../../../../rentals/page";
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  return <RentalPage locale={(await params).locale} mode="list" />;
}
