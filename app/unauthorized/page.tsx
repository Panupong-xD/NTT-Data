"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/use-auth";

export default function UnauthorizedPage() {
  const { user, logout } = useAuth();
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md">
        <CardContent className="space-y-5 p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ไม่มีสิทธิ์เข้าหน้านี้</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              บัญชี {user?.email ?? "นี้"} อยู่คนละบทบาทกับระบบที่พยายามเปิด
            </p>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" asChild>
              <Link href={`/${user?.role ?? "login"}`}>กลับหน้าหลัก</Link>
            </Button>
            <Button className="flex-1" variant="outline" onClick={logout}>
              ออกจากระบบ
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
