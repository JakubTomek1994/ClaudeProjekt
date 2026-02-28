import { AuthForm } from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <AuthForm />
    </div>
  );
}
