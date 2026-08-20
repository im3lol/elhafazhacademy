import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * اختيار الدور فوق نموذج التسجيل.
 *
 * كل روابط الصفحة الرئيسية كانت تصبّ في تسجيل الطالب، فمسار المعلم لم يكن
 * يُوصَل إليه إلا من سطر صغير أسفل الصفحة. الصفحتان تبقيان منفصلتين (لكلٍّ
 * حقولها) وهذا الشريط ينقل بينهما.
 */
export function RoleTabs({ active }: { active: "student" | "teacher" }) {
  const tabs = [
    { key: "student", label: "طالب", href: "/register/student" },
    { key: "teacher", label: "معلّم", href: "/register/teacher" },
  ] as const;

  return (
    <div className="mb-6 grid grid-cols-2 gap-1 rounded-2xl bg-background p-1" role="tablist">
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            role="tab"
            aria-selected={isActive}
            className={cn(
              "rounded-xl px-4 py-2.5 text-center text-sm font-medium transition-colors",
              isActive
                ? "bg-brand text-brand-foreground shadow-sm"
                : "text-muted hover:bg-surface hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
