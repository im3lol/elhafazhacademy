import { redirect } from "next/navigation";
import { setupState } from "@/lib/setup/actions";
import { Card } from "@/components/ui/card";
import { SetupForm } from "./setup-form";

// حالة القاعدة تتغيّر بمجرد إنشاء الأدمن — لا تُخزَّن الصفحة مؤقتاً
export const dynamic = "force-dynamic";

export const metadata = { title: "تهيئة المنصة" };

export default async function SetupPage() {
  const state = await setupState();

  // بوابة الاستخدام مرة واحدة: بعد وجود أدمن لا مكان لهذه الصفحة
  if (state === "done") redirect("/login");

  if (state === "no-schema") {
    return (
      <Card>
        <h1 className="font-display text-2xl font-bold">قاعدة البيانات غير مهيّأة</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          لم تُنشأ جداول المنصة بعد. تُطبَّق تلقائياً أثناء البناء، فإن وصلتَ إلى هنا
          فالأرجح أن سلسلة الاتصال غير مضبوطة أو أن البناء فشل.
        </p>
        <div className="mt-4 rounded-xl bg-background p-4 text-sm">
          <p className="font-medium">للتشغيل يدوياً:</p>
          <p dir="ltr" className="mt-2 font-mono text-xs">npm run setup</p>
        </div>
        <p className="mt-4 text-xs text-muted">
          تأكد من ضبط <span dir="ltr" className="font-mono">DATABASE_URL</span> (أو{" "}
          <span dir="ltr" className="font-mono">POSTGRES_URL</span> إن كنت تستخدم تكامل Supabase على Vercel).
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold">تهيئة المنصة</h1>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        القاعدة جاهزة. أنشئ حساب الإدارة الأول لتبدأ — تظهر هذه الصفحة مرة واحدة فقط،
        وتُغلق تلقائياً بعد الإنشاء.
      </p>

      <SetupForm />

      <p className="mt-6 rounded-xl bg-background p-3 text-xs leading-relaxed text-muted">
        بعد الدخول: اضبط اسم أكاديميتك وشعارها وألوانها ومحتوى الصفحة الرئيسية من{" "}
        <span className="font-medium text-foreground">الهوية والمحتوى</span> في لوحة الإدارة.
      </p>
    </Card>
  );
}
