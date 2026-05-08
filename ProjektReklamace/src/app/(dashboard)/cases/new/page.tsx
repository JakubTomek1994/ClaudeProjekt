import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { prisma } from "@/lib/prisma";
import { NewCaseForm } from "./new-case-form";

export const metadata = { title: "Nový případ – Reklamace" };

export default async function NewCasePage() {
  const defectTypes = await prisma.defectType.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
    select: { code: true, name: true, category: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Nový záznam"
        title="Nový případ"
        description="Manuálně založený případ. Lhůta se vypočte podle typu — 30 dní pro reklamaci, 14 pro odstoupení."
        back={
          <Button
            render={<Link href="/cases" aria-label="Zpět" />}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <NewCaseForm
        defectTypes={defectTypes}
        defaultDate={format(new Date(), "yyyy-MM-dd")}
      />
    </div>
  );
}
