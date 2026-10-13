import type { ReactNode } from "react";
import { Brand } from "@/components/brand";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-ink-100">
      <header className="mx-auto w-full max-w-6xl px-6 py-5">
        <Brand className="h-10" priority />
      </header>
      <main className="flex flex-1 items-start justify-center px-6 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
