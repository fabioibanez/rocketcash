import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { plaidClient } from "@/lib/plaid";
import { decrypt } from "@/lib/crypto";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let itemId: string | undefined;
  try {
    const body = await request.json();
    itemId = body.itemId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!itemId) {
    return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
  }

  const item = await prisma.item.findFirst({
    where: { id: itemId, userId: session.user.id },
  });
  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Best-effort: tell Plaid to stop billing for this Item.
  try {
    await plaidClient.itemRemove({
      access_token: decrypt(item.plaidAccessToken),
    });
  } catch (e) {
    console.warn("Plaid itemRemove failed (continuing with local delete)", e);
  }

  await prisma.item.delete({ where: { id: item.id } });

  return NextResponse.json({ ok: true });
}
