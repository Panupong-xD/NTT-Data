export function RouteLoading() {
  return <div role="status" aria-label="กำลังเปิดหน้า" className="motion-safe:animate-pulse space-y-5 py-4">
    <span className="sr-only">กำลังเปิดหน้า…</span>
    <div aria-hidden="true" className="h-7 w-40 rounded-full bg-sky-100/70" />
    <div aria-hidden="true" className="h-40 rounded-[28px] bg-sky-100/50" />
    <div aria-hidden="true" className="h-24 rounded-[24px] bg-sky-100/30" />
  </div>;
}
