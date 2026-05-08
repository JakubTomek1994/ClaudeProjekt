import { Inbox } from "lucide-react";

import { PlaceholderPage } from "@/components/placeholder-page";

export const metadata = { title: "Drafty – Reklamace" };

export default function DraftsPage() {
  return (
    <PlaceholderPage
      icon={Inbox}
      title="Drafty"
      description="Nepárované emaily a rozpracované případy ke zpracování."
      step="Krok 2.4 – Auto-zakládání draftů z příchozích emailů."
    />
  );
}
