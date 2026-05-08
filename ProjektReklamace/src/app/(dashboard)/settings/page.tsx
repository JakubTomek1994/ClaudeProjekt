import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

import { auth } from "@/auth";
import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata = { title: "Nastavení – Reklamace" };

export default async function SettingsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <PlaceholderPage
      icon={Settings}
      title="Nastavení"
      description="Uživatelé, šablony emailů, číselník vad, Microsoft 365 connection, notifikace."
      step="Pozdější fáze – jednotlivé sekce postupně."
    />
  );
}
