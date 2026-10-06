"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { MouseEvent } from "react";

export function useAppNavigation(destinations: readonly { href: string }[]) {
  const pathname = usePathname().replace(/\/$/, "");
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const warmed = useRef(new Set<string>());
  const prefetch = useCallback((href: string) => {
    if (warmed.current.has(href)) return;
    warmed.current.add(href);
    router.prefetch(href);
  }, [router]);
  useEffect(() => { setTarget(null); }, [pathname]);
  useEffect(() => {
    // Prepare one destination per idle turn to keep the first paint responsive.
    const queue = destinations.filter(item => item.href !== pathname);
    let cancelled = false;
    let timer: number;
    let idle: number | undefined;
    const next = () => {
      const item = queue.shift();
      if (cancelled || !item) return;
      prefetch(item.href);
      timer = window.setTimeout(schedule, 150);
    };
    const schedule = () => {
      if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(next, { timeout: 1500 });
      else timer = window.setTimeout(next, 150);
    };
    schedule();
    return () => { cancelled = true; window.clearTimeout(timer); if (idle !== undefined) window.cancelIdleCallback(idle); };
  }, [destinations, pathname, prefetch]);
  const onClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setTarget(href === pathname ? null : href);
  };
  return { pathname, activePath: target || pathname, pending: !!target && target !== pathname, onClick, prefetch };
}
