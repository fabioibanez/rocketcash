import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  plaidClient,
  PLAID_PRODUCTS,
  PLAID_COUNTRY_CODES,
} from "@/lib/plaid";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await plaidClient.linkTokenCreate({
      user: { client_user_id: session.user.id },
      client_name: "RocketCash",
      products: PLAID_PRODUCTS,
      country_codes: PLAID_COUNTRY_CODES,
      language: "en",
      ...(process.env.PLAID_WEBHOOK_URL
        ? { webhook: process.env.PLAID_WEBHOOK_URL }
        : {}),
    });

    return NextResponse.json({ link_token: res.data.link_token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create link token";
    console.error("create-link-token error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
