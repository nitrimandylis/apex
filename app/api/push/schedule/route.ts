import { getCalendar } from "@/lib/jolpica";
import { planJobs } from "@/lib/push-plan";
import { claimOnce, queueJob, releaseClaim } from "@/lib/push";

// Daily Vercel cron (vercel.json). Queues every alert due in the next 30h
// on QStash, which calls /api/push/send at the exact minute. 30h, not 24h,
// because Hobby crons fire anywhere inside their hour; claimOnce stops the
// overlap from queueing a job twice.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const races = await getCalendar();
  const jobs = planJobs(races, new Date(), 30);
  const queued: string[] = [];
  for (const job of jobs) {
    const key = `apex:queued:${job.id}`;
    if (await claimOnce(key)) {
      try {
        await queueJob({ ...job, attempt: 0 });
        queued.push(job.id);
      } catch (err) {
        // Let tomorrow's run try again instead of losing the alert.
        await releaseClaim(key);
        throw err;
      }
    }
  }
  return Response.json({ queued });
}
