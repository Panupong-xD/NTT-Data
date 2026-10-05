import { MobileAppLayout } from "@/components/layouts/mobile-shell";

export default function CaregiverLayout({ children }: { children: React.ReactNode }) {
  return <MobileAppLayout role="caregiver">{children}</MobileAppLayout>;
}
