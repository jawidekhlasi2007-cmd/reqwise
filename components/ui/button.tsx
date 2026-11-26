import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-[10px] font-medium transition-colors disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-white hover:bg-[#2b6fe0] shadow-[0_10px_30px_-14px_rgb(59_130_246/0.9)]",
  secondary: "border border-line-strong bg-white/[0.03] text-fg hover:bg-white/[0.08]",
  ghost: "text-fg-muted hover:bg-white/[0.06] hover:text-fg",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-[15px]",
};

export function buttonClasses(options: { variant?: Variant; size?: Size; className?: string } = {}): string {
  return cn(base, variants[options.variant ?? "primary"], sizes[options.size ?? "md"], options.className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
