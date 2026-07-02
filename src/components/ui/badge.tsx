import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-brand-blue/10 text-brand-blue",
        paid: "bg-green-100 text-green-800",
        sent: "bg-blue-100 text-blue-800",
        draft: "bg-gray-100 text-gray-700",
        overdue: "bg-red-100 text-red-800",
        partiallyPaid: "bg-amber-100 text-amber-800",
        void: "bg-gray-200 text-gray-500 line-through",
        gold: "bg-brand-gold/10 text-brand-gold-dark",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
