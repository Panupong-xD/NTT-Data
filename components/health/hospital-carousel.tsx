"use client";

import { useRef, useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface CampaignItem {
  id: string;
  image: string;
  alt: string;
}

const CAMPAIGNS: CampaignItem[] = [
  {
    id: "camp-1",
    image: "/banner-checkup.jpg",
    alt: "Health Checkup Program Promotion"
  },
  {
    id: "camp-2",
    image: "/banner-vaccine.jpg",
    alt: "Flu Vaccine Campaign Promotion"
  },
  {
    id: "camp-3",
    image: "/banner-telehealth.jpg",
    alt: "Telemedicine Consultation Service Promotion"
  }
];

export function HospitalCampaignCarousel() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (containerRef.current) {
      const scrollLeft = containerRef.current.scrollLeft;
      const width = containerRef.current.clientWidth;
      if (width > 0) {
        const index = Math.round(scrollLeft / width);
        setActiveIndex(Math.min(index, CAMPAIGNS.length - 1));
      }
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (el) {
      el.addEventListener("scroll", handleScroll);
    }
    return () => {
      if (el) el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-sky-600" />
          ข่าวจากโรงพยาบาล
        </h3>
      </div>

      {/* Swipeable news row */}
      <div
        ref={containerRef}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none rounded-3xl"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {CAMPAIGNS.map((item) => (
          <div
            key={item.id}
            className="w-full shrink-0 snap-start snap-always"
          >
            <div className="relative aspect-[3/1] w-full overflow-hidden rounded-3xl border border-slate-100/80 shadow-sm bg-slate-50">
              <img
                src={item.image}
                alt={item.alt}
                className="h-full w-full object-cover select-none pointer-events-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Progress Dots */}
      <div className="flex justify-center items-center gap-1.5 pt-0.5">
        {CAMPAIGNS.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              if (containerRef.current) {
                const width = containerRef.current.clientWidth;
                containerRef.current.scrollTo({
                  left: i * width,
                  behavior: "smooth"
                });
                setActiveIndex(i);
              }
            }}
            className={cn(
              "relative h-11 w-8 rounded-full transition-all duration-300 after:absolute after:inset-x-2 after:top-5 after:h-1.5 after:rounded-full",
              activeIndex === i ? "after:bg-sky-600" : "after:bg-slate-200"
            )}
            aria-label={`ดูข่าวที่ ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
