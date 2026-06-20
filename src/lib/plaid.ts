import {
  Configuration,
  PlaidApi,
  PlaidEnvironments,
  Products,
  CountryCode,
} from "plaid";

const env = (process.env.PLAID_ENV ?? "sandbox") as keyof typeof PlaidEnvironments;

const configuration = new Configuration({
  basePath: PlaidEnvironments[env] ?? PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
      "Plaid-Version": "2020-09-14",
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// Products & country codes used when creating a Link token.
export const PLAID_PRODUCTS: Products[] = [Products.Transactions];
export const PLAID_COUNTRY_CODES: CountryCode[] = [CountryCode.Us];

/**
 * Map a Plaid account `type` to our asset/liability classification used for
 * net-worth math. Credit & loan accounts are liabilities; everything else is
 * treated as an asset.
 */
export function classifyAccountType(plaidType?: string | null): "asset" | "liability" {
  if (plaidType === "credit" || plaidType === "loan") return "liability";
  return "asset";
}
