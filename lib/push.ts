import webpush from "web-push";
import type { Job } from "./push-plan";

// Server side of push alerts: the subscription list in Upstash Redis,
// sending through web-push, and queueing jobs on QStash. Redis and QStash
// are both plain REST calls, so no SDK beyond web-push.

export type StoredSub = {
  subscription: webpush.PushSubscription;
  favorite: string;
};

const SUBS_KEY = "apex:subs"; // hash: endpoint -> StoredSub JSON
const SITE = "https://apex-formula1.vercel.app";

// ---- Redis (Upstash REST: POST the command as a JSON array) ----

async function redis(command: (string | number)[]): Promise<unknown> {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  const res = await fetch(url as string, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(`redis: ${data.error}`);
  }
  return data.result;
}

// Returns true when this endpoint was not stored before.
export async function saveSub(sub: StoredSub): Promise<boolean> {
  const added = await redis([
    "HSET",
    SUBS_KEY,
    sub.subscription.endpoint,
    JSON.stringify(sub),
  ]);
  return added === 1;
}

export async function deleteSub(endpoint: string): Promise<void> {
  await redis(["HDEL", SUBS_KEY, endpoint]);
}

async function allSubs(): Promise<StoredSub[]> {
  // HGETALL comes back flat: [field, value, field, value, ...]
  const flat = (await redis(["HGETALL", SUBS_KEY])) as string[];
  const subs: StoredSub[] = [];
  for (let i = 1; i < flat.length; i += 2) {
    subs.push(JSON.parse(flat[i]));
  }
  return subs;
}

// First caller wins: SET NX. Used so a job is queued once and sent once,
// even when the cron overlaps itself or QStash retries a delivery.
export async function claimOnce(key: string): Promise<boolean> {
  const result = await redis(["SET", key, "1", "NX", "EX", 14 * 86400]);
  return result === "OK";
}

export async function releaseClaim(key: string): Promise<void> {
  await redis(["DEL", key]);
}

// ---- Sending ----

function setupWebPush() {
  webpush.setVapidDetails(
    SITE,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
}

async function sendOne(sub: StoredSub, payload: object): Promise<void> {
  try {
    await webpush.sendNotification(sub.subscription, JSON.stringify(payload), {
      TTL: 3600, // an alert over an hour late is noise, let it expire
    });
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      // The app was deleted or permission revoked: forget this phone.
      await deleteSub(sub.subscription.endpoint);
    } else {
      console.error("push failed", status, sub.subscription.endpoint);
    }
  }
}

export async function sendTo(sub: StoredSub, payload: object): Promise<void> {
  setupWebPush();
  await sendOne(sub, payload);
}

// build() gets each subscriber's favorite, so results can add their driver.
// ponytail: sequential loop inside one function call, fine for hundreds of
// subscribers; fan out through QStash batches if it ever nears the timeout.
export async function sendToAll(
  build: (favorite: string) => object,
): Promise<number> {
  setupWebPush();
  const subs = await allSubs();
  for (const sub of subs) {
    await sendOne(sub, build(sub.favorite));
  }
  return subs.length;
}

// ---- QStash ----

export type JobMessage = Job & { attempt: number };

// Ask QStash to POST the job back to /api/push/send, either at job.at or
// after delaySeconds (used by the result poll to try again later).
export async function queueJob(
  job: JobMessage,
  delaySeconds?: number,
): Promise<void> {
  const base = process.env.QSTASH_URL ?? "https://qstash.upstash.io";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${process.env.QSTASH_TOKEN}`,
    "Content-Type": "application/json",
  };
  if (delaySeconds !== undefined) {
    headers["Upstash-Delay"] = `${delaySeconds}s`;
  } else {
    const at = Math.floor(new Date(job.at).getTime() / 1000);
    headers["Upstash-Not-Before"] = String(at);
  }
  const res = await fetch(`${base}/v2/publish/${SITE}/api/push/send`, {
    method: "POST",
    headers,
    body: JSON.stringify(job),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`qstash ${res.status}: ${await res.text()}`);
  }
}
