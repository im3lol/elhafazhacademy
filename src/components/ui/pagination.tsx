import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

/** ترقيم صفحات عبر ?page=N. يُخفى إن كانت صفحة واحدة. */
export function Pagination({
  basePath,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  page: number;
  pageSize: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  const link = (p: number) => `${basePath}?page=${p}`;
  const disabled = "pointer-events-none opacity-40";

  return (
    <div className="flex items-center justify-between gap-3 pt-2">
      <span className="text-sm text-muted">
        صفحة {page.toLocaleString("ar-EG")} من {pages.toLocaleString("ar-EG")}
      </span>
      <div className="flex gap-2">
        <Link
          href={link(page - 1)}
          aria-disabled={page <= 1}
          className={`${buttonClasses({ size: "sm", variant: "outline" })} ${page <= 1 ? disabled : ""}`}
        >
          السابق
        </Link>
        <Link
          href={link(page + 1)}
          aria-disabled={page >= pages}
          className={`${buttonClasses({ size: "sm", variant: "outline" })} ${page >= pages ? disabled : ""}`}
        >
          التالي
        </Link>
      </div>
    </div>
  );
}

/** يحوّل قيمة page من searchParams إلى رقم صفحة صالح (≥1). */
export function parsePage(raw: string | undefined): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}
