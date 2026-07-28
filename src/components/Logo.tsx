import { Link } from "@tanstack/react-router";
import logoMark from "@/assets/logo-mark.png";

type Size = "xs" | "sm" | "md" | "lg";

const dims: Record<Size, string> = {
  xs: "h-12 w-12",
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
};

const text: Record<Size, string> = {
  xs: "text-[10px]",
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg",
};

export function Logo({
  size = "sm",
  withText = false,
  to = "/",
  className = "",
}: {
  size?: Size;
  withText?: boolean;
  to?: string;
  className?: string;
}) {
  return (
    <Link
      to={to}
      className={`flex flex-col items-center leading-none ${className}`}
      aria-label="شعار منصة المستر"
    >
      <img
        src={logoMark}
        alt="شعار منصة المستر"
        width={1024}
        height={1024}
        className={`${dims[size]} object-contain drop-shadow-md`}
      />
      {withText && (
        <span
          className={`mt-1 font-display font-black tracking-tight text-primary ${text[size]}`}
        >
          المستر
        </span>
      )}
    </Link>
  );
}

export default Logo;
