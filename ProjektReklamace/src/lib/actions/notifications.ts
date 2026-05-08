"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { runDeadlineCheck, type CronResult } from "@/lib/cron/check-deadlines";

export async function triggerDeadlineCheck(): Promise<
  | { ok: true; result: CronResult }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Nepřihlášený uživatel." };
  }
  if (session.user.role !== "ADMIN") {
    return { ok: false, error: "Pouze administrátor může spustit kontrolu lhůt." };
  }

  try {
    const result = await runDeadlineCheck();
    revalidatePath("/");
    return { ok: true, result };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Kontrola selhala.",
    };
  }
}
