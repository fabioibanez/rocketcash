import { Building2, CircleAlert } from "lucide-react";
import { getSession } from "@/lib/session";
import { getItemsWithAccounts } from "@/lib/queries";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlaidLinkButton } from "@/components/plaid/PlaidLinkButton";
import {
  SyncNowButton,
  UnlinkButton,
} from "@/components/plaid/AccountActions";

export default async function SettingsPage() {
  const session = await getSession();
  const userId = session!.user.id;
  const items = await getItemsWithAccounts(userId);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your linked bank connections.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Linked institutions</CardTitle>
            <CardDescription>
              Connect banks securely through Plaid.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {items.length > 0 && <SyncNowButton />}
            <PlaidLinkButton
              variant={items.length > 0 ? "outline" : "default"}
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
              No institutions linked yet.
            </p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {item.institutionName ?? "Bank"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Linked {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.status === "error" ? (
                      <Badge variant="destructive">
                        <CircleAlert className="mr-1 h-3 w-3" />
                        Needs attention
                      </Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                    <UnlinkButton itemId={item.id} />
                  </div>
                </div>

                {item.accounts.length > 0 && (
                  <div className="mt-3 divide-y divide-border border-t border-border pt-1">
                    {item.accounts.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              a.type === "liability"
                                ? "bg-destructive"
                                : "bg-success",
                            )}
                          />
                          <span className="text-sm">
                            {a.name}
                            {a.mask ? (
                              <span className="text-muted-foreground">
                                {" "}
                                ····{a.mask}
                              </span>
                            ) : null}
                          </span>
                        </div>
                        <span className="text-sm font-medium tabular-nums">
                          {formatCurrency(a.currentBalance, a.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
