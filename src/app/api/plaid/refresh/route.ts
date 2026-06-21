import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { syncItem } from "@/lib/sync";

export const maxDuration = 120;

// Authenticated, user-triggered sync of the current user's own items.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.item.findMany({
    where: { userId: session.user.id, status: { not: "disconnected" } },
    select: { id: true, plaidItemId: true, plaidAccessToken: true },
  });

  let synced = 0;
  for (const item of items) {
    try {
      await syncItem(item);
      synced++;
    } catch (err) {
      console.error("refresh sync failed:", err);
      await prisma.item
        .update({ where: { id: item.id }, data: { status: "error" } })
        .catch(() => {});
    }
  }

  return NextResponse.json({ ok: true, synced, total: items.length });
}
