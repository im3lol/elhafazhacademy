"use client";

import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LogoMark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  IconHome,
  IconCalendar,
  IconBookOpen,
  IconChart,
  IconClipboard,
  IconLayers,
  IconWallet,
  IconChat,
  IconSettings,
  IconUsers,
  IconUserPlus,
  IconVideo,
  IconClock,
  IconShield,
  IconBell,
  IconLogout,
  IconMenu,
  IconX,
} from "@/components/icons";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;
type NavItem = { href: string; label: string; icon: Icon; disabled?: boolean };
type NavGroup = { label?: string; items: NavItem[] };

const navByRole: Record<string, { title: string; groups: NavGroup[] }> = {
  student: {
    title: "لوحة الطالب",
    groups: [
      { items: [{ href: "/student/dashboard", label: "لوحة التحكم", icon: IconHome }] },
      {
        label: "التعلّم",
        items: [
          { href: "/student/mushaf", label: "المصحف الشخصي", icon: IconBookOpen },
          { href: "/student/progress", label: "تقدّمي", icon: IconChart },
          { href: "/student/lessons", label: "الدروس", icon: IconClipboard },
          { href: "/student/mistakes", label: "الأخطاء", icon: IconClipboard },
        ],
      },
      {
        label: "الحصص",
        items: [
          { href: "/student/booking", label: "حجز حصة", icon: IconCalendar },
          { href: "/student/schedule", label: "جدول الحصص", icon: IconCalendar },
        ],
      },
      {
        label: "حسابي",
        items: [
          { href: "/student/package", label: "الباقة", icon: IconLayers },
          { href: "/student/payment", label: "الدفع والتفعيل", icon: IconWallet },
          { href: "/student/complaints", label: "الشكاوى", icon: IconChat },
          { href: "/student/notifications", label: "الإشعارات", icon: IconBell },
          { href: "/student/settings", label: "الإعدادات", icon: IconSettings },
        ],
      },
    ],
  },
  teacher: {
    title: "لوحة المعلم",
    groups: [
      { items: [{ href: "/teacher/dashboard", label: "لوحة التحكم", icon: IconHome }] },
      {
        label: "الطلاب والحصص",
        items: [
          { href: "/teacher/students", label: "طلابي", icon: IconUsers },
          { href: "/teacher/availability", label: "أوقات التوفّر", icon: IconClock },
          { href: "/teacher/schedule", label: "جدول الحصص", icon: IconCalendar },
        ],
      },
      {
        label: "الطلبات",
        items: [
          { href: "/teacher/new-students", label: "طلاب جدد", icon: IconUserPlus },
          { href: "/teacher/package-requests", label: "طلبات الباقات", icon: IconLayers },
          { href: "/teacher/complaints", label: "الشكاوى", icon: IconChat },
        ],
      },
      {
        label: "حسابي",
        items: [
          { href: "/teacher/finance", label: "الرصيد والمستحقات", icon: IconWallet },
          { href: "/teacher/notifications", label: "الإشعارات", icon: IconBell },
          { href: "/teacher/settings", label: "الإعدادات", icon: IconSettings },
        ],
      },
    ],
  },
  admin: {
    title: "لوحة الإدارة",
    groups: [
      { items: [{ href: "/admin/dashboard", label: "اللوحة", icon: IconHome }] },
      {
        label: "المستخدمون",
        items: [
          { href: "/admin/students", label: "الطلاب", icon: IconUsers },
          { href: "/admin/teachers", label: "المعلمون", icon: IconUserPlus },
          { href: "/admin/student-requests", label: "طلبات الطلاب", icon: IconUsers },
          { href: "/admin/roles", label: "الأدوار", icon: IconShield },
        ],
      },
      {
        label: "التعليم والمصحف",
        items: [
          { href: "/admin/classes", label: "الحصص", icon: IconVideo },
          { href: "/admin/packages", label: "الباقات", icon: IconLayers },
          { href: "/admin/mushaf", label: "متابعة المصحف", icon: IconBookOpen },
          { href: "/admin/reciters", label: "القرّاء", icon: IconBookOpen },
        ],
      },
      {
        label: "المالية والطلبات",
        items: [
          { href: "/admin/payments", label: "المدفوعات", icon: IconWallet },
          { href: "/admin/package-requests", label: "طلبات الباقات", icon: IconLayers },
          { href: "/admin/finance", label: "المالية", icon: IconChart },
          { href: "/admin/complaints", label: "الشكاوى", icon: IconChat },
        ],
      },
      {
        label: "النظام",
        items: [
          { href: "/admin/notifications", label: "الإشعارات", icon: IconBell },
          { href: "/admin/settings", label: "الإعدادات", icon: IconSettings },
        ],
      },
    ],
  },
};

export function DashboardShell({
  role,
  email,
  unreadCount = 0,
  children,
}: {
  role: "student" | "teacher" | "admin";
  email: string;
  unreadCount?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(unreadCount);
  const pathname = usePathname();
  const { title, groups } = navByRole[role];
  const initial = email?.[0]?.toUpperCase() ?? "؟";

  // تحديث شارة الإشعارات دورياً (polling خفيف) وعند العودة للتبويب
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/notifications/unread", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { unread?: number };
        if (active && typeof data.unread === "number") setUnread(data.unread);
      } catch {
        // تجاهل أخطاء الشبكة العابرة
      }
    };
    refresh();
    const id = setInterval(refresh, 30000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
    // يُعاد التحديث أيضاً عند تغيّر المسار (مثلاً بعد قراءة الإشعارات)
  }, [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col bg-brand text-brand-foreground">
      {/* الشعار */}
      <div className="flex items-center justify-between gap-2 px-5 py-5">
        <Link href={`/${role}/dashboard`} className="flex items-center gap-2.5" onClick={() => setOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white">
            <LogoMark className="h-7 w-7" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold">الحفظة</span>
            <span className="mt-1 text-[10px] opacity-70">{title}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-brand-foreground/80 hover:bg-white/10 lg:hidden"
          aria-label="إغلاق"
        >
          <IconX className="h-5 w-5" />
        </button>
      </div>

      {/* القائمة */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {groups.map((group, gi) => (
          <div key={gi} className="space-y-1 pb-1">
            {group.label && (
              <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-brand-foreground/45">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          if (item.disabled) {
            return (
              <span
                key={item.href}
                className="flex cursor-not-allowed items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-brand-foreground/45"
                title="قريباً"
              >
                <span className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  {item.label}
                </span>
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px]">قريباً</span>
              </span>
            );
          }
          const badge = item.href.endsWith("/notifications") && unread > 0 ? unread : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-white/15 font-semibold text-brand-foreground"
                  : "text-brand-foreground/80 hover:bg-white/10 hover:text-brand-foreground",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-5 w-5" />
                {item.label}
              </span>
              {badge > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-gold px-1.5 text-[10px] font-bold text-gold-foreground">
                  {badge > 9 ? "٩+" : badge.toLocaleString("ar-EG")}
                </span>
              )}
            </Link>
          );
            })}
          </div>
        ))}
      </nav>

      {/* المستخدم + خروج */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/15 font-bold">
            {initial}
          </span>
          <span className="min-w-0 flex-1 truncate text-xs opacity-80" dir="ltr">
            {email}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <form action="/auth/signout" method="post" className="flex-1">
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium transition-colors hover:bg-white/20"
            >
              <IconLogout className="h-4 w-4" />
              تسجيل الخروج
            </button>
          </form>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* sidebar ثابت — سطح المكتب */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block print:!hidden">{sidebar}</aside>

      {/* drawer — الجوال */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 right-0 w-64 shadow-xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* شريط علوي — الجوال فقط */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden print:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-border p-2 text-foreground"
            aria-label="القائمة"
          >
            <IconMenu className="h-5 w-5" />
          </button>
          <span className="flex items-center gap-2">
            <LogoMark className="h-7 w-7" />
            <span className="font-display text-base font-bold">{title}</span>
          </span>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
