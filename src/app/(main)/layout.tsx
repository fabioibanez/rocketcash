import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import { getSession } from "@/auth";
import { Sidebar } from "@/components/layout/Sidebar";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) {
    redirect("/login");
  }

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar user={session.user} signOutAction={handleSignOut} />

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-20 md:px-8 md:pb-10 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}
