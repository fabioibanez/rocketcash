import { NextResponse } from "next/server";
import { syncAllItems } from "@/lib/sync";

// Sync can take a while across many items; allow up to 5 minutes on Vercel.
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`.
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${secret}`) return true;

  // Allow a custom header too, for manual triggering.
  if (request.headers.get("x-cron-secret") === secret) return true;

  return false;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await syncAllItems();
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed";
    console.error("sync error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Vercel Cron issues GET requests.
export const GET = handle;
export const POST = handle;
