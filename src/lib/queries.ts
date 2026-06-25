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

export function computeNetWorth(accounts: AccountSummary[]) {
  let assets = 0;
  let liabilities = 0;
  for (const a of accounts) {
    if (a.type === "liability") liabilities += a.currentBalance;
    else assets += a.currentBalance;
  }
  return { assets, liabilities, netWorth: assets - liabilities };
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

export async function countLinkedAccounts(userId: string): Promise<number> {
  return prisma.bankAccount.count({ where: { item: { userId } } });
}

// Plaid amount convention: positive = money out (expense), negative = money in (income).
// Internal transfers shouldn't count as real income/spending, so we drop them.
function isTransfer(category: string | null): boolean {
  if (!category) return false;
  return /^transfer/i.test(category);
}

export type CashFlowMonth = {
  month: string; // YYYY-MM
  label: string; // e.g. "Jan"
  income: number;
  expenses: number;
  net: number;
};

export async function getCashFlow(userId: string, months = 6) {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCMonth(start.getUTCMonth() - (months - 1));

  const txns = await prisma.transaction.findMany({
    where: { account: { item: { userId } }, date: { gte: start } },
    select: { date: true, amount: true, category: true, currency: true },
  });

  const buckets = new Map<string, { income: number; expenses: number }>();
  for (let i = 0; i < months; i++) {
    const d = new Date(start);
    d.setUTCMonth(start.getUTCMonth() + i);
    buckets.set(d.toISOString().slice(0, 7), { income: 0, expenses: 0 });
  }

  let currency = "USD";
  for (const t of txns) {
    if (isTransfer(t.category)) continue;
    const key = t.date.toISOString().slice(0, 7);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    currency = t.currency;
    const amt = toNum(t.amount);
    if (amt < 0) bucket.income += -amt;
    else bucket.expenses += amt;
  }

  const data: CashFlowMonth[] = [...buckets.entries()].map(([month, v]) => ({
    month,
    label: new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    }),
    income: v.income,
    expenses: v.expenses,
    net: v.income - v.expenses,
  }));

  const totals = data.reduce(
    (acc, m) => ({
      income: acc.income + m.income,
      expenses: acc.expenses + m.expenses,
      net: acc.net + m.net,
    }),
    { income: 0, expenses: 0, net: 0 },
  );

  return { data, totals, currency };
}

export type ReportRange = "mtd" | "30d" | "3m";
export type CategorySpend = { category: string; amount: number; share: number };

function rangeBounds(range: ReportRange): { start: Date; label: string } {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  if (range === "mtd") {
    start.setUTCDate(1);
    return { start, label: "This month" };
  }
  if (range === "3m") {
    start.setUTCMonth(start.getUTCMonth() - 3);
    return { start, label: "Last 3 months" };
  }
  start.setUTCDate(start.getUTCDate() - 30);
  return { start, label: "Last 30 days" };
}

export async function getCategoryBreakdown(userId: string, range: ReportRange) {
  const { start, label } = rangeBounds(range);

  const txns = await prisma.transaction.findMany({
    where: { account: { item: { userId } }, date: { gte: start } },
    select: { amount: true, category: true, currency: true },
  });

  const spend = new Map<string, number>();
  const earn = new Map<string, number>();
  let currency = "USD";

  for (const t of txns) {
    if (isTransfer(t.category)) continue;
    currency = t.currency;
    const cat = t.category ?? "Uncategorized";
    const amt = toNum(t.amount);
    if (amt > 0) spend.set(cat, (spend.get(cat) ?? 0) + amt);
    else if (amt < 0) earn.set(cat, (earn.get(cat) ?? 0) + -amt);
  }

  const build = (m: Map<string, number>): { rows: CategorySpend[]; total: number } => {
    const total = [...m.values()].reduce((s, v) => s + v, 0);
    const rows = [...m.entries()]
      .map(([category, amount]) => ({
        category,
        amount,
        share: total > 0 ? amount / total : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
    return { rows, total };
  };

  const spending = build(spend);
  const income = build(earn);

  return {
    rangeLabel: label,
    currency,
    spending: spending.rows,
    totalSpending: spending.total,
    income: income.rows,
    totalIncome: income.total,
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
