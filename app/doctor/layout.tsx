import { DoctorAppLayout } from "@/components/layouts/doctor-shell";
import "./doctor.css";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return <DoctorAppLayout>{children}</DoctorAppLayout>;
}
