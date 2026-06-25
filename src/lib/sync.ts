import type {
  AccountBase,
  Transaction as PlaidTransaction,
  RemovedTransaction,
} from "plaid";
import { prisma } from "@/lib/db";
import { plaidClient, classifyAccountType } from "@/lib/plaid";
import { decrypt } from "@/lib/crypto";

type ItemForSync = {
  id: string;
  plaidItemId: string;
  plaidAccessToken: string;
};

function pickCategory(txn: PlaidTransaction): string | null {
  if (txn.personal_finance_category?.primary) {
    return formatCategory(txn.personal_finance_category.primary);
  }
  if (txn.category && txn.category.length > 0) {
    return txn.category[txn.category.length - 1];
  }
  return null;
}

function formatCategory(raw: string): string {
  return raw
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/**
 * Upsert all accounts for an item from Plaid's current balances, returning a
 * map of plaid_account_id -> our internal BankAccount id.
 */
async function upsertAccounts(
  itemId: string,
  accessToken: string,
): Promise<Map<string, string>> {
  const res = await plaidClient.accountsGet({ access_token: accessToken });
  const accounts: AccountBase[] = res.data.accounts;
  const map = new Map<string, string>();

  for (const acc of accounts) {
    const type = classifyAccountType(acc.type);
    const record = await prisma.bankAccount.upsert({
      where: { plaidAccountId: acc.account_id },
      create: {
        itemId,
        plaidAccountId: acc.account_id,
        name: acc.name,
        mask: acc.mask ?? null,
        type,
        currentBalance: acc.balances.current ?? 0,
        currency: acc.balances.iso_currency_code ?? "USD",
      },
      update: {
        name: acc.name,
        mask: acc.mask ?? null,
        type,
        currentBalance: acc.balances.current ?? 0,
        currency: acc.balances.iso_currency_code ?? "USD",
      },
    });
    map.set(acc.account_id, record.id);
  }

  return map;
}

async function writeTransactions(
  added: PlaidTransaction[],
  modified: PlaidTransaction[],
  removed: RemovedTransaction[],
  accountMap: Map<string, string>,
) {
  const upserts = [...added, ...modified];

  for (const txn of upserts) {
    const accountId = accountMap.get(txn.account_id);
    if (!accountId) continue; // account not tracked yet

    const data = {
      accountId,
      date: new Date(txn.date),
      name: txn.name,
      merchantName: txn.merchant_name ?? null,
      category: pickCategory(txn),
      amount: txn.amount,
      currency: txn.iso_currency_code ?? "USD",
      pending: txn.pending,
      logoUrl:
        txn.logo_url ??
        txn.personal_finance_category_icon_url ??
        null,
    };

    await prisma.transaction.upsert({
      where: { plaidTxnId: txn.transaction_id },
      create: { plaidTxnId: txn.transaction_id, ...data },
      update: data,
    });
  }

  const removedIds = removed
    .map((r) => r.transaction_id)
    .filter((id): id is string => Boolean(id));

  if (removedIds.length > 0) {
    await prisma.transaction.deleteMany({
      where: { plaidTxnId: { in: removedIds } },
    });
  }
}

/**
 * Write a daily balance snapshot per account for the net-worth chart.
 * Upserts on (accountId, date) so re-running the sync the same day is safe.
 */
async function snapshotBalances(accountMap: Map<string, string>) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const accountIds = [...accountMap.values()];
  const accounts = await prisma.bankAccount.findMany({
    where: { id: { in: accountIds } },
    select: { id: true, currentBalance: true, type: true },
  });

  for (const acc of accounts) {
    await prisma.historicalBalance.upsert({
      where: { accountId_date: { accountId: acc.id, date: today } },
      create: {
        accountId: acc.id,
        date: today,
        balance: acc.currentBalance,
        type: acc.type,
      },
      update: { balance: acc.currentBalance, type: acc.type },
    });
  }
}

/**
 * Sync a single item: refresh balances, pull transaction deltas via the
 * cursor, persist everything, and snapshot net worth.
 */
export async function syncItem(item: ItemForSync) {
  const accessToken = decrypt(item.plaidAccessToken);
  const accountMap = await upsertAccounts(item.id, accessToken);

  let cursor =
    (
      await prisma.item.findUnique({
        where: { id: item.id },
        select: { syncCursor: true },
      })
    )?.syncCursor ?? undefined;

  let added: PlaidTransaction[] = [];
  let modified: PlaidTransaction[] = [];
  let removed: RemovedTransaction[] = [];
  let hasMore = true;

  while (hasMore) {
    const res = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor,
      count: 500,
    });
    const data = res.data;
    added = added.concat(data.added);
    modified = modified.concat(data.modified);
    removed = removed.concat(data.removed);
    hasMore = data.has_more;
    cursor = data.next_cursor;
  }

  await writeTransactions(added, modified, removed, accountMap);
  await snapshotBalances(accountMap);

  await prisma.item.update({
    where: { id: item.id },
    data: { syncCursor: cursor, status: "active" },
  });

  return {
    added: added.length,
    modified: modified.length,
    removed: removed.length,
  };
}

/** Sync every active item across all users (used by the cron safety net). */
export async function syncAllItems() {
  const items = await prisma.item.findMany({
    where: { status: { not: "disconnected" } },
    select: { id: true, plaidItemId: true, plaidAccessToken: true },
  });

  const results: Record<string, unknown> = {};
  for (const item of items) {
    try {
      results[item.plaidItemId] = await syncItem(item);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results[item.plaidItemId] = { error: message };
      await prisma.item
        .update({ where: { id: item.id }, data: { status: "error" } })
        .catch(() => {});
    }
  }
  return results;
}
