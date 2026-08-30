import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/cn";
import { motion } from "../../lib/motion";

const badgeVariants = cva(
  cn("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors", motion.surface),
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground shadow",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground border-border"
      }
    },
    defaultVariants: { variant: "outline" }
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>): JSX.Element {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
