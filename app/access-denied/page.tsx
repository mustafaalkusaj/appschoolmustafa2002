import { redirect } from "next/navigation";

export default function LegacyaccessdeniedRedirectPage() {
  redirect("/ar/access-denied");
}
