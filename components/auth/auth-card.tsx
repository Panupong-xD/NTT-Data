"use client";

import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function AuthCard({
  title,
  subtitle,
  children,
  footer
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-sky-600">Wellync</p>
            <h1 className="text-xl font-bold text-slate-950">True Health Connect</h1>
          </div>
        </div>
        <Card>
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
            </div>
            {children}
            {footer ? <div className="text-center text-sm text-slate-500">{footer}</div> : null}
          </CardContent>
        </Card>
        <div className="mt-4 rounded-2xl bg-white/70 p-4 text-xs leading-6 text-slate-500 shadow-card">
          <p className="font-semibold text-slate-700">บัญชีตัวอย่าง</p>
          <p>patient@gmail.com / caregiver@gmail.com / doctor@gmail.com</p>
        </div>
      </div>
    </main>
  );
}

export function AuthLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-sky-700 hover:text-sky-800">
      {children}
    </Link>
  );
}
