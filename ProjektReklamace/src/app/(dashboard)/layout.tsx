import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }

  const { name, email, role } = session.user;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar isAdmin={role === "ADMIN"} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar name={name} email={email ?? ""} role={role} />
        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10">{children}</main>
      </div>
    </div>
  );
}
