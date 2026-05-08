import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomerForm } from "@/components/customers/customer-form";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Nový zákazník – Reklamace" };

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Nový záznam"
        title="Nový zákazník"
        description="Email je primární klíč — musí být unikátní v rámci databáze."
        back={
          <Button
            render={<Link href="/customers" aria-label="Zpět" />}
            variant="ghost"
            size="icon"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <CustomerForm mode="create" />
    </div>
  );
}
