import { redirect } from "next/navigation";

export default function LegacypaymentsRedirectPage() {
  redirect("/ar/payments");
}
