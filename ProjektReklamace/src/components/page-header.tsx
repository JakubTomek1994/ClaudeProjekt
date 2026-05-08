import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  back,
  actions,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  back?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="space-y-4">
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-3">
          {back && <div className="pt-1">{back}</div>}
          <div className="min-w-0 space-y-1.5">
            {eyebrow && (
              <p className="small-caps text-[10px] text-muted-foreground/85">
                {eyebrow}
              </p>
            )}
            <h1 className="font-display text-3xl font-medium tracking-tight md:text-4xl">
              {title}
            </h1>
            {description && (
              <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
      <div
        aria-hidden
        className="h-px w-full bg-gradient-to-r from-border via-border to-transparent"
      />
    </header>
  );
}
