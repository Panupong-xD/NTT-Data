import { MobileAppLayout } from "@/components/layouts/mobile-shell";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  return <MobileAppLayout role="patient">{children}</MobileAppLayout>;
}
