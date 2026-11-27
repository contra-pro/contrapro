import type { Locale } from "../i18n/locales";
import { AuthView } from "./auth-view";
export function SignInView(props: { locale: Locale; configured: boolean; status: string | undefined; googleEnabled?: boolean; magicEnabled?: boolean }) {
  return <AuthView {...props} mode="sign-in" />;
}
