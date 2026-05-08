import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ImportZone } from "@/components/import/import-zone";
import { PageHeader } from "@/components/page-header";
import { importCustomers, importOrders } from "@/lib/actions/imports";

export const metadata = { title: "Import CSV – Reklamace" };

const CUSTOMER_COLUMNS = [
  { code: "email", required: true, note: "primární klíč" },
  { code: "jmeno", note: "+ prijmeni se spojí" },
  { code: "prijmeni" },
  { code: "nazev_firmy", note: "alternativa k jmeno+prijmeni" },
  { code: "telefon" },
  { code: "ulice" },
  { code: "mesto" },
  { code: "psc" },
  { code: "ico" },
  { code: "dic" },
  { code: "zeme", note: "default CZ" },
  { code: "firma_je_plnce_dph", note: "ano/ne, true/false" },
];

const ORDER_COLUMNS = [
  { code: "cislo_objednavky", required: true, note: "primární klíč" },
  { code: "email_zakaznika", required: true, note: "spojí na zákazníka (vytvoří se pokud chybí)" },
  { code: "datum", required: true, note: "ISO nebo d.M.yyyy" },
  { code: "celkem", required: true, note: "číslo s desetinnou tečkou nebo čárkou" },
  { code: "mena", note: "default CZK" },
  { code: "zpusob_platby" },
  { code: "zpusob_dopravy" },
  { code: "status" },
  { code: "polozky_json", note: "JSON pole [{name, sku?, quantity, unitPrice}]" },
];

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Datový import"
        title="Import CSV"
        description="Nahrajte export ze Shoptetu. Existující záznamy se aktualizují (upsert podle klíče)."
        back={
          <Button render={<Link href="/customers" aria-label="Zpět" />} variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <ImportZone
          title="Zákazníci"
          description="Klíč: email. Existující zákazníci se aktualizují, ručně zadané poznámky a štítky se zachovávají."
          columns={CUSTOMER_COLUMNS}
          action={importCustomers}
        />

        <ImportZone
          title="Objednávky"
          description="Klíč: číslo objednávky. Položky se při re-importu přepíší."
          columns={ORDER_COLUMNS}
          action={importOrders}
        />
      </div>
    </div>
  );
}
