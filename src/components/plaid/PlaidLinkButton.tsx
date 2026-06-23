"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  usePlaidLink,
  type PlaidLinkOnSuccess,
} from "react-plaid-link";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PlaidLinkButton({
  variant = "default",
  label = "Link a bank account",
}: {
  variant?: "default" | "outline";
  label?: string;
}) {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinkToken = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/plaid/create-link-token", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start Plaid Link");
      setLinkToken(data.link_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }, []);

  useEffect(() => {
    // Fetch a fresh Link token on mount (subscribing to an external system).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLinkToken();
  }, [fetchLinkToken]);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/plaid/exchange-public-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_token: publicToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not link account");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not link account");
      } finally {
        setLoading(false);
      }
    },
    [router],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  });

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant={variant}
        onClick={() => open()}
        disabled={!ready || !linkToken || loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
