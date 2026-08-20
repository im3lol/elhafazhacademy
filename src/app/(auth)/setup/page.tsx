import { redirect } from "next/navigation";
import { setupState } from "@/lib/setup/actions";
import { Card } from "@/components/ui/card";
import { SetupForm } from "./setup-form";

// حالة القاعدة تتغيّر بمجرد إنشاء الأدمن — لا تُخزَّن الصفحة مؤقتاً
export const dynamic = "force-dynamic";

export const metadata = { title: "تهيئة المنصة" };

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-brand-foreground">
        {n.toLocaleString("ar-EG")}
      </span>
      <span className="leading-relaxed">{children}</span>
    </li>
  );
}

const Kbd = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-md bg-brand-subtle px-1.5 py-0.5 text-xs font-medium text-brand">{children}</span>
);

export default async function SetupPage() {
  const state = await setupState();

  // بوابة الاستخدام مرة واحدة: بعد وجود أدمن لا مكان لهذه الصفحة
  if (state === "done") redirect("/login");

  // لا سلسلة اتصال (أو قاعدة لا تستجيب) — الخطوة الناقصة هي ربط القاعدة نفسها.
  if (state === "no-db") {
    return (
      <Card>
        <h1 className="font-display text-2xl font-bold">لم تُربط قاعدة بيانات بعد</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          نسختك منشورة وتعمل، لكنها بلا قاعدة بيانات. اربطها من لوحة Vercel — التكامل
          يضبط سلسلة الاتصال ويعيد النشر تلقائياً، والبناء ينشئ الجداول ويبذر القرآن.
        </p>

        <ol className="mt-5 space-y-3 text-sm">
          <Step n={1}>
            افتح مشروعك على <span dir="ltr">Vercel</span> ← تبويب <Kbd>Storage</Kbd>
          </Step>
          <Step n={2}>
            <Kbd>Create Database</Kbd> ← اختر <span dir="ltr">Supabase</span> ← أنشئ قاعدة جديدة
          </Step>
          <Step n={3}>
            التكامل يحقن <span dir="ltr" className="font-mono text-xs">POSTGRES_URL</span> ويطلق نشرة
            جديدة. انتظر اكتمالها (~دقيقة — بذر ٨٣٬٦٦٥ كلمة من المصحف).
          </Step>
          <Step n={4}>عُد إلى هذه الصفحة وحدّثها.</Step>
        </ol>

        <p className="mt-5 rounded-xl bg-background p-3 text-xs leading-relaxed text-muted">
          <span className="font-medium text-foreground">تنشر على خادم خاص؟</span> اضبط{" "}
          <span dir="ltr" className="font-mono">DATABASE_URL</span> ثم شغّل{" "}
          <span dir="ltr" className="font-mono">npm run setup</span>. التفاصيل في{" "}
          <span dir="ltr" className="font-mono">docs/HANDOVER.md</span>.
        </p>
      </Card>
    );
  }

  // سلسلة الاتصال تعمل لكن الجداول غائبة — البناء لم يشغّل التهيئة.
  if (state === "no-schema") {
    return (
      <Card>
        <h1 className="font-display text-2xl font-bold">القاعدة مربوطة، والجداول غير منشأة</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          الاتصال بالقاعدة سليم لكنها فارغة. الجداول تُنشأ أثناء <span className="font-medium text-foreground">البناء</span>{" "}
          لا وقت التشغيل (بذر المصحف أطول من مهلة أي دالة)، فالحل إعادة نشر.
        </p>

        <ol className="mt-5 space-y-3 text-sm">
          <Step n={1}>
            مشروعك على <span dir="ltr">Vercel</span> ← تبويب <Kbd>Deployments</Kbd>
          </Step>
          <Step n={2}>
            من قائمة (⋯) لآخر نشرة ← <Kbd>Redeploy</Kbd>
          </Step>
          <Step n={3}>
            راقب السجلّ: يجب أن تظهر أسطر <span dir="ltr" className="font-mono text-xs">✅ 01_schema.sql</span>{" "}
            حتى <span dir="ltr" className="font-mono text-xs">✅ بُذر 83665 كلمة</span>.
          </Step>
          <Step n={4}>عُد إلى هذه الصفحة وحدّثها.</Step>
        </ol>

        <p className="mt-5 rounded-xl bg-background p-3 text-xs leading-relaxed text-muted">
          إن فشل البناء، فالسبب الغالب أن <span dir="ltr" className="font-mono">AUTH_SECRET</span>{" "}
          غير مضبوط في متغيّرات البيئة. وعلى خادم خاص:{" "}
          <span dir="ltr" className="font-mono">npm run setup</span>.
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
        <span className="font-medium text-foreground">الهوية والمحتوى</span>، ويمكنك تغيير
        بريد الدخول وكلمة المرور لاحقاً من <span className="font-medium text-foreground">حسابي</span>.
      </p>
    </Card>
  );
}
