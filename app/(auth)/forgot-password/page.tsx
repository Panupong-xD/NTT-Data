"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AuthCard, AuthLink } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/hooks/use-auth";

const schema = z.object({
  email: z.string().email("กรุณาใส่อีเมลให้ถูกต้อง")
});

export default function ForgotPasswordPage() {
  const { forgotPassword } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: "patient@gmail.com" }
  });

  return (
    <AuthCard
      title="ลืมรหัสผ่าน"
      subtitle="ส่งคำแนะนำการรีเซ็ตรหัสผ่านหรือจำลองสำหรับเดโม"
      footer={<AuthLink href="/login">กลับไปเข้าสู่ระบบ</AuthLink>}
    >
      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          await forgotPassword(values.email);
        })}
      >
        <div>
          <Input {...register("email")} placeholder="อีเมล" autoComplete="email" className="rounded-2xl border-sky-100/70" />
          {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
        </div>
        <Button 
          className="w-full rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] transition-all duration-300 font-bold border-none py-3 h-12 flex items-center justify-center gap-2" 
          disabled={isSubmitting}
        >
          <Mail className="h-5 w-5" />
          ส่งคำแนะนำ
        </Button>
      </form>
    </AuthCard>
  );
}
