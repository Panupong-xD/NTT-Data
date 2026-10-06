import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      data-ui="card"
      ref={ref}
      className={cn("rounded-2xl border border-sky-100 bg-white/92 shadow-card backdrop-blur-sm", className)}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4 pt-1.5", className)} {...props} />
);
CardContent.displayName = "CardContent";

export { Card, CardContent };
