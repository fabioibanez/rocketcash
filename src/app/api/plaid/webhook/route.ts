import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { syncItem } from "@/lib/sync";
import { verifyPlaidWebhook } from "@/lib/plaid-webhook";

// A full sync (especially HISTORICAL_UPDATE) runs in the background via
// `after()`, so give the invocation room to finish after the 200 is sent.
export const maxDuration = 300;

// Transaction-readiness pings that warrant pulling fresh deltas.
const TRANSACTION_CODES = [
  "SYNC_UPDATES_AVAILABLE",
  "INITIAL_UPDATE",
  "HISTORICAL_UPDATE",
  "DEFAULT_UPDATE",
];

// ITEM webhook codes that mean the connection needs the user to re-auth.
const ITEM_ERROR_CODES = [
  "ERROR",
  "PENDING_EXPIRATION",
  "USER_PERMISSION_REVOKED",
];

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verificationHeader = request.headers.get("plaid-verification");

  const isValid = await verifyPlaidWebhook(rawBody, verificationHeader);
  if (!isValid) {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 },
    );
  }

  let payload: {
    webhook_type?: string;
    webhook_code?: string;
    item_id?: string;
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { webhook_type, webhook_code, item_id } = payload;

  if (item_id) {
    const item = await prisma.item.findUnique({
      where: { plaidItemId: item_id },
      select: { id: true, plaidItemId: true, plaidAccessToken: true },
    });

    if (item) {
      if (
        webhook_type === "TRANSACTIONS" &&
        webhook_code &&
        TRANSACTION_CODES.includes(webhook_code)
      ) {
        // Acknowledge immediately; do the (potentially long) sync after the
        // response is sent so Plaid doesn't time out or retry.
        after(async () => {
          try {
            await syncItem(item);
          } catch (err) {
            console.error("Webhook sync failed:", err);
            await prisma.item
              .update({ where: { id: item.id }, data: { status: "error" } })
              .catch(() => {});
          }
        });
      } else if (webhook_type === "ITEM" && webhook_code) {
        // Surface re-auth / repair state so the UI can prompt the user.
        const status = ITEM_ERROR_CODES.includes(webhook_code)
          ? "error"
          : webhook_code === "LOGIN_REPAIRED"
            ? "active"
            : null;
        if (status) {
          await prisma.item
            .update({ where: { id: item.id }, data: { status } })
            .catch(() => {});
        }
      }
    }
  }

  // Always 200 quickly so Plaid doesn't retry unnecessarily.
  return NextResponse.json({ received: true });
}
