import {
  LayoutDashboard,
  Receipt,
  ArrowLeftRight,
  PieChart,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Transactions", icon: Receipt },
  { href: "/cashflow", label: "Cash Flow", icon: ArrowLeftRight },
  { href: "/reports", label: "Reports", icon: PieChart },
  { href: "/settings", label: "Settings", icon: Settings },
];
