import { deleteSub, saveSub, sendTo, type StoredSub } from "@/lib/push";

// The phone's "Enable alerts" tap lands here with its subscription.
// POST saves it (or updates the favorite), DELETE forgets it.

// Only real browser push services. Anything else would let a stranger make
// this server POST to any URL they like.
const PUSH_HOST_ENDINGS = [
  ".push.apple.com", // Safari: web.push.apple.com
  ".googleapis.com", // Chrome: fcm.googleapis.com
  ".push.services.mozilla.com", // Firefox
  ".notify.windows.com", // Edge
];

function isPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 1000) {
    return false;
  }
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") {
      return false;
    }
    for (const ending of PUSH_HOST_ENDINGS) {
      if (url.hostname.endsWith(ending)) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

function isShortString(v: unknown, max: number): v is string {
  return typeof v === "string" && v.length <= max;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const sub = body?.subscription;
  if (
    !isPushEndpoint(sub?.endpoint) ||
    !isShortString(sub?.keys?.p256dh, 200) ||
    !isShortString(sub?.keys?.auth, 100) ||
    !isShortString(body?.favorite ?? "", 40)
  ) {
    return Response.json({ error: "bad subscription" }, { status: 400 });
  }

  const stored: StoredSub = {
    subscription: {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    },
    favorite: body.favorite ?? "",
  };
  const isNew = await saveSub(stored);
  if (isNew) {
    // Proves the whole chain on the phone without waiting for a session.
    await sendTo(stored, { type: "hello" });
  }
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isPushEndpoint(body?.endpoint)) {
    return Response.json({ error: "bad endpoint" }, { status: 400 });
  }
  await deleteSub(body.endpoint);
  return Response.json({ ok: true });
}
