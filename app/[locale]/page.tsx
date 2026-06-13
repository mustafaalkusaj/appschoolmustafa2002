"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);

  useEffect(() => {
    router.replace(localizeAppPath("/dashboard", locale));
  }, [router, locale]);

  return null;
}
