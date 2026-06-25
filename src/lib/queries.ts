import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function toNum(d: Prisma.Decimal | number | null | undefined): number {
  if (d === null || d === undefined) return 0;
  return typeof d === "number" ? d : d.toNumber();
}

export type AccountSummary = {
  id: string;
  name: string;
  mask: string | null;
  type: "asset" | "liability";
  currentBalance: number;
  currency: string;
  institutionName: string | null;
};

export type TransactionRow = {
  id: string;
  date: string;
  name: string;
  merchantName: string | null;
  category: string | null;
  amount: number;
  currency: string;
  pending: boolean;
  logoUrl: string | null;
  accountName: string;
};

export type NetWorthPoint = { date: string; netWorth: number };

function historySince(days: number) {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  if (Number.isFinite(days)) {
    since.setUTCDate(since.getUTCDate() - days);
  } else {
    since.setUTCFullYear(since.getUTCFullYear() - 5);
  }
  return since;
}

function buildNetWorthSeries(
  rows: {
    accountId: string;
    date: Date;
    balance: Prisma.Decimal;
    type: string;
  }[],
): NetWorthPoint[] {
  if (rows.length === 0) return [];

  const perAccount = new Map<string, Map<string, number>>();
  const allDates = new Set<string>();
  for (const r of rows) {
    const key = r.date.toISOString().slice(0, 10);
    allDates.add(key);
    const signed = r.type === "liability" ? -toNum(r.balance) : toNum(r.balance);
    let m = perAccount.get(r.accountId);
    if (!m) {
      m = new Map();
      perAccount.set(r.accountId, m);
    }
    m.set(key, signed);
  }

  const sortedDates = [...allDates].sort((a, b) => a.localeCompare(b));
  const lastKnown = new Map<string, number>();
  const series: NetWorthPoint[] = [];
  for (const date of sortedDates) {
    for (const [accountId, m] of perAccount) {
      const v = m.get(date);
      if (v !== undefined) lastKnown.set(accountId, v);
    }
    let netWorth = 0;
    for (const v of lastKnown.values()) netWorth += v;
    series.push({ date, netWorth });
  }
  return series;
}

/** Single DB round-trip for the dashboard (one connection, sequential queries). */
export async function getDashboardData(userId: string, historyDays = 365) {
  const since = historySince(historyDays);

  const [rawAccounts, historyRows, rawTxns] = await prisma.$transaction([
    prisma.bankAccount.findMany({
      where: { item: { userId } },
      include: { item: { select: { institutionName: true } } },
      orderBy: [{ type: "asc" }, { currentBalance: "desc" }],
    }),
    prisma.historicalBalance.findMany({
      where: { account: { item: { userId } }, date: { gte: since } },
      select: { accountId: true, date: true, balance: true, type: true },
      orderBy: { date: "asc" },
    }),
    prisma.transaction.findMany({
      where: { account: { item: { userId } } },
      include: { account: { select: { name: true } } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 8,
    }),
  ]);

  const accounts: AccountSummary[] = rawAccounts.map((a) => ({
    id: a.id,
    name: a.name,
    mask: a.mask,
    type: a.type as "asset" | "liability",
    currentBalance: toNum(a.currentBalance),
    currency: a.currency,
    institutionName: a.item.institutionName,
  }));

  return {
    accounts,
    history: buildNetWorthSeries(historyRows),
    recent: rawTxns.map(serializeTxn),
  };
}

export async function getAccounts(userId: string): Promise<AccountSummary[]> {
  const accounts = await prisma.bankAccount.findMany({
    where: { item: { userId } },
    include: { item: { select: { institutionName: true } } },
    orderBy: [{ type: "asc" }, { currentBalance: "desc" }],
  });

  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    officialName: a.officialName,
    mask: a.mask,
    type: a.type as "asset" | "liability",
    subtype: a.subtype,
    currentBalance: toNum(a.currentBalance),
    currency: a.currency,
    institutionName: a.item.institutionName,
  }));
}

export function computeNetWorth(accounts: AccountSummary[]) {
  let assets = 0;
  let liabilities = 0;
  for (const a of accounts) {
    if (a.type === "liability") liabilities += a.currentBalance;
    else assets += a.currentBalance;
  }
  return { assets, liabilities, netWorth: assets - liabilities };
}

export async function getNetWorthHistory(
  userId: string,
  days = 365,
): Promise<NetWorthPoint[]> {
  const rows = await prisma.historicalBalance.findMany({
    where: {
      account: { item: { userId } },
      date: { gte: historySince(days) },
    },
    select: { accountId: true, date: true, balance: true, type: true },
    orderBy: { date: "asc" },
  });

  return buildNetWorthSeries(rows);
}

export async function getRecentTransactions(
  userId: string,
  limit = 8,
): Promise<TransactionRow[]> {
  const txns = await prisma.transaction.findMany({
    where: { account: { item: { userId } } },
    include: { account: { select: { name: true } } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
  return txns.map(serializeTxn);
}

export type TransactionQuery = {
  query?: string;
  page?: number;
  pageSize?: number;
};

export async function getTransactionsPage(
  userId: string,
  { query, page = 1, pageSize = 25 }: TransactionQuery,
) {
  const where: Prisma.TransactionWhereInput = {
    account: { item: { userId } },
  };

  if (query && query.trim()) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { merchantName: { contains: query, mode: "insensitive" } },
      { category: { contains: query, mode: "insensitive" } },
    ];
  }

  const total = await prisma.transaction.count({ where });
  const txns = await prisma.transaction.findMany({
    where,
    select: {
        id: true,
        date: true,
        name: true,
        merchantName: true,
        category: true,
        amount: true,
        currency: true,
        pending: true,
        logoUrl: true,
        account: { select: { name: true } },
      },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return {
    transactions: txns.map(serializeTxn),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function serializeTxn(t: {
  id: string;
  date: Date;
  name: string;
  merchantName: string | null;
  category: string | null;
  amount: Prisma.Decimal;
  currency: string;
  pending: boolean;
  logoUrl: string | null;
  account: { name: string };
}): TransactionRow {
  return {
    id: t.id,
    date: t.date.toISOString().slice(0, 10),
    name: t.name,
    merchantName: t.merchantName,
    category: t.category,
    amount: toNum(t.amount),
    currency: t.currency,
    pending: t.pending,
    logoUrl: t.logoUrl,
    accountName: t.account.name,
  };
}

export async function getItemsWithAccounts(userId: string) {
  const items = await prisma.item.findMany({
    where: { userId },
    include: {
      accounts: {
        orderBy: { currentBalance: "desc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return items.map((item) => ({
    id: item.id,
    institutionName: item.institutionName,
    status: item.status,
    createdAt: item.createdAt.toISOString(),
    accounts: item.accounts.map((a) => ({
      id: a.id,
      name: a.name,
      mask: a.mask,
      type: a.type as "asset" | "liability",
      currentBalance: toNum(a.currentBalance),
      currency: a.currency,
    })),
  }));
}
