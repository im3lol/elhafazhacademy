import { cn } from "@/lib/utils";

/**
 * علامة الحفظة — محراب هندسي + مصحف مفتوح + هلال.
 * minimal، يتكيّف مع الحجم. الأخضر من الهوية والذهبي للهلال.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* خلفية المحراب */}
      <path
        d="M24 2c-9.4 0-15 6.8-15 16v26h30V18c0-9.2-5.6-16-15-16Z"
        className="fill-brand"
      />
      {/* قوس داخلي */}
      <path
        d="M24 9c-6 0-9.5 4.4-9.5 10.5V37h19V19.5C33.5 13.4 30 9 24 9Z"
        className="fill-brand-foreground"
        opacity="0.12"
      />
      {/* هلال ذهبي */}
      <path
        d="M24 4.2c-1.7 0-3.2.5-4.4 1.4a4.6 4.6 0 1 1 0 7.2A7.4 7.4 0 1 0 24 4.2Z"
        className="fill-gold"
      />
      {/* مصحف مفتوح */}
      <path
        d="M14 26.5c3-1.4 6.3-1.4 9.3 0l.7.4.7-.4c3-1.4 6.3-1.4 9.3 0v9.6c-3-1.4-6.3-1.4-9.3 0l-.7.4-.7-.4c-3-1.4-6.3-1.4-9.3 0v-9.6Z"
        className="fill-brand-foreground"
      />
      <path
        d="M24 27.3v9.4"
        className="stroke-brand"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** اللوجو الكامل: علامة + اسم + شعار نصي. */
export function Logo({
  className,
  withText = true,
  size = "md",
}: {
  className?: string;
  withText?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const mark = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
  }[size];
  const name = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  }[size];

  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={mark} />
      {withText && (
        <span className="flex flex-col leading-none">
          <span className={cn("font-display font-bold", name)}>الحفظة</span>
          {size !== "sm" && (
            <span className="mt-1 text-[10px] font-medium text-muted">
              لتحفيظ وتعليم القرآن الكريم
            </span>
          )}
        </span>
      )}
    </span>
  );
}
