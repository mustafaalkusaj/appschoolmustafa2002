"use client";

import { useEffect } from "react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerAndSubscribe() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  if (!VAPID_PUBLIC_KEY) return;

  try {
    const registration = await navigator.serviceWorker.register("/sw.js?v=2");
    await navigator.serviceWorker.ready;

    const existing = await registration.pushManager.getSubscription();
    if (existing) {
      await saveSubscription(existing);
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });

    await saveSubscription(subscription);
  } catch {
    // best-effort
  }
}

async function saveSubscription(subscription: PushSubscription) {
  const key = subscription.toJSON();
  try {
    await fetch("/api/web/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: {
          endpoint: key.endpoint,
          keys: key.keys,
        },
      }),
    });
  } catch {
    // silent
  }
}

export function WebPushRegistration() {
  useEffect(() => {
    const timer = setTimeout(() => {
      registerAndSubscribe();
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
