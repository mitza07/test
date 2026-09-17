import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse" | "inverse-ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-white hover:brightness-110 shadow-[0_1px_0_rgba(255,255,255,0.15)_inset]",
  secondary: "bg-surface text-ink hairline hover:bg-surface-2",
  ghost: "text-ink-2 hover:text-ink hover:bg-surface-2",
  danger: "bg-bad text-white hover:brightness-110",
  /* Pe fundal de cerneală (secțiuni întunecate): buton deschis, respectiv fantomă deschisă. */
  inverse: "bg-bg text-ink hover:bg-bg/90",
  "inverse-ghost": "text-bg/90 hover:bg-bg/10 hover:text-bg",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
};

type ButtonAsLink = CommonProps & { href: string; onClick?: never; type?: never; disabled?: never };
type ButtonAsButton = CommonProps &
  React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

export function Button(props: ButtonAsLink | ButtonAsButton) {
  const { variant = "primary", size = "md", className, children } = props;
  const cls = cn(base, variants[variant], sizes[size], className);
  if ("href" in props && typeof props.href === "string") {
    const external = props.href.startsWith("http") || props.href.startsWith("mailto:");
    if (external) {
      return (
        <a href={props.href} className={cls} target={props.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
          {children}
        </a>
      );
    }
    return (
      <Link href={props.href} className={cls}>
        {children}
      </Link>
    );
  }
  const { variant: _v, size: _s, className: _c, children: _ch, ...rest } = props as ButtonAsButton;
  void _v; void _s; void _c; void _ch;
  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  );
}
