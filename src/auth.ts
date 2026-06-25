import { cache } from "react";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";

// ALLOWED_EMAILS: comma-separated Google emails for this instance. Unset = open.
function isEmailAllowed(email: string | null | undefined): boolean {
  const raw = process.env.ALLOWED_EMAILS?.trim();
  if (!raw) return true;
  if (!email) return false;
  const allowed = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // JWT avoids a Postgres round-trip on every navigation; the adapter still
  // persists users/accounts at sign-in time.
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    signIn({ user }) {
      return isEmailAllowed(user.email);
    },
    jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        if (user.email) token.email = user.email;
      }
      if (!isEmailAllowed(token.email as string | undefined)) {
        return null;
      }
      return token;
    },
    session({ session, token }) {
      if (!token || !isEmailAllowed(session.user?.email)) {
        return { expires: session.expires };
      }
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});

/** Deduplicate session lookups within a single request (layout + page). */
export const getSession = cache(() => auth());
