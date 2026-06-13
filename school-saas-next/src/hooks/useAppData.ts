"use client";

import { useAppDataContext } from "@/providers/app-data-provider";

export function useAppData() {
  return useAppDataContext();
}
