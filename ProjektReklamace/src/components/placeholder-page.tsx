import type { LucideIcon } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export function PlaceholderPage({
  icon: Icon,
  title,
  description,
  step,
  eyebrow = "V přípravě",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  step: string;
  eyebrow?: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Icon className="h-6 w-6 text-muted-foreground" />
            <div>
              <CardTitle className="font-display text-xl tracking-tight">
                Bude doplněno
              </CardTitle>
              <CardDescription>{step}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Tato sekce zatím není implementovaná. Bude zprovozněna v další fázi vývoje.
        </CardContent>
      </Card>
    </div>
  );
}
