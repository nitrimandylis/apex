// Browser side of push alerts: permission, subscription, and keeping the
// server's copy of the favorite driver in step. Only called from client
// components.

export type AlertsState = "on" | "off" | "install" | "unsupported";

const FLAG = "apex-alerts";

// iOS only allows web push once the site is on the Home Screen; until then
// PushManager simply does not exist in Safari.
export function initialAlertsState(): AlertsState {
  const canPush = "serviceWorker" in navigator && "PushManager" in window;
  if (!canPush) {
    const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
    return isIos ? "install" : "unsupported";
  }
  return localStorage.getItem(FLAG) === "on" ? "on" : "off";
}

// The VAPID public key is base64url text; the browser wants raw bytes.
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

async function postSubscription(sub: PushSubscription, favorite: string) {
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), favorite }),
  });
  if (!res.ok) {
    throw new Error(`subscribe failed: ${res.status}`);
  }
}

// Must run straight from the tap: iOS only shows the permission prompt
// in direct response to a user gesture, so it is the first await.
export async function enableAlerts(favorite: string): Promise<boolean> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return false;
  }
  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: keyBytes(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string),
  });
  await postSubscription(sub, favorite);
  localStorage.setItem(FLAG, "on");
  return true;
}

export async function disableAlerts(): Promise<void> {
  const registration = await navigator.serviceWorker.getRegistration();
  const sub = await registration?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push/subscribe", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    });
    await sub.unsubscribe();
  }
  localStorage.removeItem(FLAG);
}

// Called when the favorite changes, so result alerts name the new driver.
export async function syncFavorite(favorite: string): Promise<void> {
  if (localStorage.getItem(FLAG) !== "on") {
    return;
  }
  const registration = await navigator.serviceWorker.getRegistration();
  const sub = await registration?.pushManager.getSubscription();
  if (sub) {
    await postSubscription(sub, favorite);
  }
}
