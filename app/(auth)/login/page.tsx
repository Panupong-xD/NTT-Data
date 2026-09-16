"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthCard, AuthLink } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/use-auth";

const schema = z.object({
  email: z.string().email("กรุณาใส่อีเมลให้ถูกต้อง"),
  password: z.string().min(4, "รหัสผ่านอย่างน้อย 4 ตัวอักษร")
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "patient@gmail.com", password: "demo1234" }
  });

  return (
    <AuthCard
      title="เข้าสู่ระบบ"
      subtitle="เลือกบทบาทจากอีเมลเพื่อทดลอง workflow ผู้ป่วย ผู้ดูแล หรือแพทย์"
      footer={
        <>
          ยังไม่มีบัญชี? <AuthLink href="/register">สมัครสมาชิก</AuthLink> ·{" "}
          <AuthLink href="/forgot-password">ลืมรหัสผ่าน</AuthLink>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2.5">
        {[
          ["ผู้ป่วย", "patient@gmail.com"],
          ["ผู้ดูแล", "caregiver@gmail.com"],
          ["แพทย์", "doctor@gmail.com"]
        ].map(([label, email]) => (
          <button
            key={email}
            type="button"
            onClick={() => setValue("email", email)}
            className="rounded-2xl border border-sky-100 bg-white py-2 px-3 text-xs font-bold text-slate-700 shadow-sm transition-all duration-300 hover:border-sky-300 hover:bg-sky-50/50 hover:shadow active:scale-[0.96] flex items-center justify-center min-h-10"
          >
            {label}
          </button>
        ))}
      </div>
      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          await login(values.email, values.password);
        })}
      >
        <div>
          <Input {...register("email")} placeholder="อีเมล" autoComplete="email" className="rounded-2xl border-sky-100/70" />
          {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
        </div>
        <div>
          <Input {...register("password")} type="password" placeholder="รหัสผ่าน" autoComplete="current-password" className="rounded-2xl border-sky-100/70" />
          {errors.password ? <p className="mt-1 text-sm text-red-600">{errors.password.message}</p> : null}
        </div>
        <Button 
          className="w-full rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] transition-all duration-300 font-bold border-none py-3 h-12 flex items-center justify-center gap-2" 
          disabled={isSubmitting}
        >
          <LogIn className="h-5 w-5" />
          เข้าสู่ระบบ
        </Button>
      </form>
    </AuthCard>
  );
}
