import { NextResponse } from "next/server";
import { CountryCode } from "plaid";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { plaidClient } from "@/lib/plaid";
import { encrypt } from "@/lib/crypto";
import { syncItem } from "@/lib/sync";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let publicToken: string | undefined;
  try {
    const body = await request.json();
    publicToken = body.public_token;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!publicToken) {
    return NextResponse.json({ error: "Missing public_token" }, { status: 400 });
  }

  try {
    const exchange = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const accessToken = exchange.data.access_token;
    const plaidItemId = exchange.data.item_id;

    // Resolve the institution name for nicer UI.
    let institutionName: string | null = null;
    let institutionId: string | null = null;
    try {
      const itemRes = await plaidClient.itemGet({ access_token: accessToken });
      institutionId = itemRes.data.item.institution_id ?? null;
      if (institutionId) {
        const inst = await plaidClient.institutionsGetById({
          institution_id: institutionId,
          country_codes: [CountryCode.Us],
        });
        institutionName = inst.data.institution.name;
      }
    } catch (e) {
      console.warn("Could not resolve institution name", e);
    }

    const item = await prisma.item.upsert({
      where: { plaidItemId },
      create: {
        userId: session.user.id,
        plaidItemId,
        plaidAccessToken: encrypt(accessToken),
        institutionName,
        institutionId,
        status: "active",
      },
      update: {
        plaidAccessToken: encrypt(accessToken),
        institutionName,
        institutionId,
        status: "active",
      },
    });

    // Initial pull so the dashboard has data immediately.
    try {
      await syncItem({
        id: item.id,
        plaidItemId: item.plaidItemId,
        plaidAccessToken: item.plaidAccessToken,
      });
    } catch (e) {
      console.warn("Initial sync failed (will retry on cron/webhook)", e);
    }

    return NextResponse.json({ ok: true, institutionName });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to exchange public token";
    console.error("exchange-public-token error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
