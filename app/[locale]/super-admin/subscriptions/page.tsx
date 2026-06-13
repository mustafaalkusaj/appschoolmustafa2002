"use client";

import { useCallback, useMemo } from "react";
import {
  fetchJsonWithAuthorizedSession,
  withJsonHeaders,
} from "@/lib/authorized-api";
import { useToast } from "@/components/toast";
import { useSuperAdminData } from "../_hooks/useSuperAdminData";
import { SubscriptionsTab, getErrorMessage } from "../_components";

export default function SubscriptionsPage() {
  const { subscriptions, refresh } = useSuperAdminData();
  const toast = useToast();

  const filteredSubscriptions = useMemo(() => subscriptions, [subscriptions]);

  const handleExtendSubscription = useCallback(
    async (schoolId: string) => {
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          created?: boolean;
          error?: { message?: string };
        }>(`/api/web/super-admin/subscriptions/${schoolId}`, {
          method: "POST",
          headers: withJsonHeaders(),
        });
        if (!response.ok)
          throw new Error(
            payload?.error?.message || "تعذر تجديد الاشتراك.",
          );
        toast.success(
          payload?.created
            ? "تم إنشاء الاشتراك وتفعيله ✓"
            : "تم تجديد الاشتراك بنجاح ✓",
        );
        await refresh();
      } catch (e) {
        toast.error(getErrorMessage(e, "تعذر تجديد الاشتراك."));
      }
    },
    [refresh, toast],
  );

  const handleEditPlan = useCallback(
    async (schoolId: string, plan: string, endDate: string, status: string) => {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        ok: boolean;
        error?: { message?: string };
      }>(`/api/web/super-admin/subscriptions/${schoolId}`, {
        method: "PATCH",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          plan,
          end_date: endDate || null,
          status,
        }),
      });
      if (!response.ok)
        throw new Error(payload?.error?.message || "تعذر تحديث الاشتراك.");
      toast.success("تم تحديث الاشتراك بنجاح ✓");
      await refresh();
    },
    [refresh, toast],
  );

  const handleBulkRenew = useCallback(
    async (schoolIds: string[]) => {
      const results = await Promise.allSettled(
        schoolIds.map((id) =>
          fetchJsonWithAuthorizedSession<{
            ok: boolean;
            error?: { message?: string };
          }>(`/api/web/super-admin/subscriptions/${id}`, {
            method: "POST",
            headers: withJsonHeaders(),
          }),
        ),
      );
      const succeeded = results.filter(
        (r) => r.status === "fulfilled" && r.value.response.ok,
      ).length;
      const failed = results.length - succeeded;
      if (failed > 0) {
        toast.error(`تم تجديد ${succeeded} اشتراك. فشل ${failed}.`);
      } else {
        toast.success(`تم تجديد ${succeeded} اشتراك بنجاح ✓`);
      }
      await refresh();
    },
    [refresh, toast],
  );

  return (
    <SubscriptionsTab
      subscriptions={subscriptions}
      filteredSubscriptions={filteredSubscriptions}
      onExtendSubscription={handleExtendSubscription}
      onEditPlan={handleEditPlan}
      onBulkRenew={handleBulkRenew}
    />
  );
}
