import { LoginForm } from "./login-form";

export const metadata = {
  title: "Přihlášení – Reklamace",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[oklch(0.245_0_0)] p-12 text-white lg:flex">
        {/* Diagonal red accent stripe */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-20 h-[60rem] w-[28rem] rotate-[18deg]"
          style={{
            background:
              "linear-gradient(180deg, oklch(0.55 0.225 22) 0%, oklch(0.55 0.225 22 / 0) 70%)",
          }}
        />
        {/* Technical grid overlay */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand font-display text-xl font-bold text-white shadow-[0_4px_16px_oklch(0.55_0.225_22/0.4)]">
            R
          </div>
          <div className="font-display text-xl font-semibold tracking-tight">
            Reklamace
          </div>
        </div>

        <div className="relative space-y-6">
          <p className="small-caps text-white/55">
            Vnitřní systém · Fáze MVP
          </p>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Žádný případ
            <br />
            <span className="text-brand">se neztratí.</span>
          </h1>
          <p className="max-w-sm text-base leading-relaxed text-white/75">
            Evidence reklamací a odstoupení od smlouvy s automatickým hlídáním lhůt,
            audit trailem a integrací s Microsoft 365.
          </p>
        </div>

        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-white/55">
          <span>30 / 14 dní</span>
          <span aria-hidden className="text-brand">●</span>
          <span>Audit trail</span>
          <span aria-hidden className="text-brand">●</span>
          <span>GDPR</span>
        </div>
      </aside>

      {/* Form panel */}
      <section className="flex items-center justify-center px-6 py-12 lg:px-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-brand font-display text-lg font-bold text-brand-foreground">
              R
            </div>
            <span className="font-display text-lg font-semibold tracking-tight">
              Reklamace
            </span>
          </div>

          <div className="space-y-1.5">
            <p className="small-caps text-muted-foreground">
              Přihlášení
            </p>
            <h2 className="font-display text-3xl font-semibold tracking-tight">
              Vítejte zpět.
            </h2>
            <p className="text-sm text-muted-foreground">
              Zadejte své firemní přihlašovací údaje.
            </p>
          </div>

          <LoginForm />

          <p className="text-xs text-muted-foreground">
            Problém s přihlášením? Kontaktujte správce systému.
          </p>
        </div>
      </section>
    </main>
  );
}
