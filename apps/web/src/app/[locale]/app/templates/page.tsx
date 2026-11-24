import { TemplatePage } from "../../../../documents/page";
export default async function Page({ params }: { params: Promise<{ locale: string }> }) { return <TemplatePage locale={(await params).locale} />; }
