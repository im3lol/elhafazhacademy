import Link from "next/link";
import { GOOGLE_CREDS_KEY, GOOGLE_SETTING_KEY } from "@/lib/google/client";
import { TELEGRAM_SETTING_KEY } from "@/lib/telegram/client";
import { EMAIL_SETTING_KEY } from "@/lib/email/client";
import { disconnectGoogle, saveGoogleCreds, clearGoogleCreds, saveAcademyPayment, saveTelegramConfig, disconnectTelegram, saveEmailConfig } from "@/lib/admin/settings-actions";
import { getSettings, ACADEMY_PAYMENT_KEY, type AcademyPayment } from "@/lib/settings";
import { sql, dbInfo } from "@/lib/db";
import { appUrl } from "@/lib/app-url";
import { Card } from "@/components/ui/card";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage, Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { requirePermissionPage } from "@/lib/auth/guards";

type DbStats = {
  tables: number;
  words: number;
  ayahs: number;
  users: number;
  students: number;
  teachers: number;
  classes: number;
};

/** عدّادات القاعدة في رحلة واحدة — للعرض فقط، لا تكشف أي سرّ. */
async function dbStats(): Promise<DbStats | null> {
  try {
    const [row] = await sql<DbStats[]>`
      select
        (select count(*)::int from information_schema.tables
          where table_schema = 'public' and table_type = 'BASE TABLE') as tables,
        (select count(*)::int from quran_words)  as words,
        (select count(*)::int from quran_ayahs)  as ayahs,
        (select count(*)::int from users)        as users,
        (select count(*)::int from students)     as students,
        (select count(*)::int from teachers)     as teachers,
        (select count(*)::int from classes)      as classes`;
    return row;
  } catch {
    return null; // قاعدة غير مهيّأة — البطاقة تعرض تحذيراً بدل أن تُسقط الصفحة
  }
}

const num = (n: number) => n.toLocaleString("ar-EG");

function Stat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl bg-background p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 font-display text-lg font-bold ${warn ? "text-danger" : ""}`} dir="auto">
        {value}
      </p>
    </div>
  );
}

const messages: Record<string, { type: "error" | "success"; text: string }> = {
  connected: { type: "success", text: "تم ربط حساب Google بنجاح." },
  error: { type: "error", text: "تعذّر الربط. حاول مرة أخرى." },
  no_refresh: { type: "error", text: "لم نستلم صلاحية دائمة. افصل الربط من حساب Google ثم أعد المحاولة." },
  misconfigured: { type: "error", text: "بيانات Google (Client ID/Secret) غير مضبوطة في الخادم." },
  state_mismatch: { type: "error", text: "طلب ربط غير مطابق أو منتهي. ابدأ الربط من هذه الصفحة مجدداً." },
};

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; saved?: string }>;
}) {
  // الصفحة تعرض client_secret وbot_token — لا تُفتح لأي أدمن، بل لمن يملك إدارة الإعدادات
  await requirePermissionPage("settings.manage");

  const { google, saved } = await searchParams;
  const msg = google ? messages[google] : null;

  // كل الإعدادات من نفس الجدول: رحلة واحدة بدل ست
  const [s, db] = await Promise.all([
    getSettings([
      GOOGLE_SETTING_KEY,
      GOOGLE_CREDS_KEY,
      ACADEMY_PAYMENT_KEY,
      TELEGRAM_SETTING_KEY,
      EMAIL_SETTING_KEY,
    ]),
    dbStats(),
  ]);
  const conn = dbInfo();
  const tokens = s[GOOGLE_SETTING_KEY] as { refresh_token?: string; email?: string } | undefined;
  const gc = s[GOOGLE_CREDS_KEY] as { client_id?: string; client_secret?: string; redirect_uri?: string } | undefined;
  const pay = s[ACADEMY_PAYMENT_KEY] as AcademyPayment | undefined;
  const tg = s[TELEGRAM_SETTING_KEY] as { bot_token?: string; bot_username?: string; webhook_secret?: string } | undefined;
  const em = s[EMAIL_SETTING_KEY] as { api_key?: string; from?: string } | undefined;

  const connected = !!tokens?.refresh_token;
  const email = tokens?.email ?? null;
  const hasCreds = !!(gc?.client_id || process.env.GOOGLE_CLIENT_ID) && !!(gc?.client_secret || process.env.GOOGLE_CLIENT_SECRET);
  const base = appUrl();
  const defaultRedirect = `${base}/api/google/callback`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">الإعدادات</h1>
        <p className="mt-1 text-muted">إعدادات التكاملات والأكاديمية.</p>
      </div>

      {msg && <FormMessage type={msg.type}>{msg.text}</FormMessage>}
      {saved === "payment" && <FormMessage type="success">تم حفظ بيانات التحويل.</FormMessage>}
      {saved === "telegram" && <FormMessage type="success">تم حفظ إعداد تيليجرام.</FormMessage>}
      {saved === "google" && <FormMessage type="success">تم حفظ بيانات Google.</FormMessage>}
      {saved === "email" && <FormMessage type="success">تم حفظ إعداد البريد.</FormMessage>}

      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Google Meet</h2>
            <p className="mt-1 text-sm text-muted">
              ربط حساب Google لإنشاء روابط Meet تلقائياً عند جدولة الحصص.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              connected ? "bg-success/15 text-success" : "bg-muted/15 text-muted"
            }`}
          >
            {connected ? "مربوط" : "غير مربوط"}
          </span>
        </div>

        {/* بيانات الاعتماد — تُدار من هنا وتُحفظ في القاعدة */}
        <form action={saveGoogleCreds} className="space-y-4 border-t border-border pt-4">
          <p className="text-sm text-muted">
            أنشئ بيانات OAuth من{" "}
            <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
              Google Cloud Console
            </a>{" "}
            (نوع: تطبيق ويب)، وأضِف رابط إعادة التوجيه أدناه في «Authorized redirect URIs».
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client ID">
              <Input name="client_id" defaultValue={gc?.client_id ?? ""} dir="ltr" placeholder="xxxx.apps.googleusercontent.com" />
            </Field>
            <Field label="Client Secret">
              <Input name="client_secret" type="password" defaultValue={gc?.client_secret ?? ""} dir="ltr" placeholder="GOCSPX-..." />
            </Field>
          </div>
          <Field label="رابط إعادة التوجيه (Redirect URI)" hint="اتركه فارغاً لاستخدام الافتراضي">
            <Input name="redirect_uri" defaultValue={gc?.redirect_uri ?? ""} dir="ltr" placeholder={defaultRedirect} />
          </Field>
          <div className="rounded-xl bg-background p-3 text-xs text-muted">
            <span className="font-medium text-foreground">رابط إعادة التوجيه المطلوب إضافته في Google: </span>
            <span dir="ltr" className="break-all">{gc?.redirect_uri || defaultRedirect}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm">حفظ بيانات Google</Button>
            {gc?.client_id && (
              <Button type="submit" size="sm" variant="danger" formAction={clearGoogleCreds}>
                حذف البيانات
              </Button>
            )}
          </div>
        </form>

        {/* الربط بعد ضبط البيانات */}
        {connected ? (
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <span className="rounded-full bg-success/15 px-3 py-1 text-xs font-medium text-success">الحساب مربوط</span>
            {email && (
              <span className="text-sm text-muted">
                الحساب: <span className="font-medium text-foreground" dir="ltr">{email}</span>
              </span>
            )}
            <form action={disconnectGoogle} className="ms-auto">
              <Button type="submit" size="sm" variant="danger">فصل الربط</Button>
            </form>
          </div>
        ) : (
          hasCreds && (
            <div className="border-t border-border pt-4">
              <Link href="/api/google/connect" className={buttonClasses({ size: "sm" })}>
                ربط حساب Google
              </Link>
            </div>
          )
        )}
      </Card>

      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">إشعارات تيليجرام</h2>
            <p className="mt-1 text-sm text-muted">
              أضف توكن البوت (من <span dir="ltr">@BotFather</span>) لإرسال التنبيهات عبر تيليجرام.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              tg?.bot_token ? "bg-success/15 text-success" : "bg-muted/15 text-muted"
            }`}
          >
            {tg?.bot_token ? "مفعّل" : "غير مفعّل"}
          </span>
        </div>
        <form action={saveTelegramConfig} className="space-y-4 border-t border-border pt-4">
          <Field label="توكن البوت (Bot Token)">
            <Input name="bot_token" defaultValue={tg?.bot_token ?? ""} dir="ltr" placeholder="123456:ABC-DEF..." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسم مستخدم البوت" hint="بدون @">
              <Input name="bot_username" defaultValue={tg?.bot_username ?? ""} dir="ltr" placeholder="ElhafazahBot" />
            </Field>
            <Field label="سر الـ Webhook" hint="يُرسل في setWebhook كـ secret_token">
              <Input name="webhook_secret" defaultValue={tg?.webhook_secret ?? ""} dir="ltr" placeholder="random-secret" />
            </Field>
          </div>
          <div className="rounded-xl bg-background p-3 text-xs text-muted">
            <p className="mb-1 font-medium text-foreground">خطوة الربط (مرة واحدة):</p>
            <p dir="ltr" className="break-all">
              GET https://api.telegram.org/bot&lt;TOKEN&gt;/setWebhook?url={base}/api/telegram/webhook&amp;secret_token=&lt;SECRET&gt;
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm">حفظ الإعداد</Button>
            {tg?.bot_token && (
              <Button type="submit" size="sm" variant="danger" formAction={disconnectTelegram}>
                إلغاء التفعيل
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold">بيانات التحويل (تظهر للطالب)</h2>
          <p className="mt-1 text-sm text-muted">
            تُعرض هذه البيانات في صفحة الدفع لتوجيه الطالب لتحويل قيمة الباقة.
          </p>
        </div>
        <form action={saveAcademyPayment} className="space-y-4 border-t border-border pt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="اسم المحفظة / البنك">
              <Input name="method_label" defaultValue={pay?.method_label ?? ""} placeholder="فودافون كاش / بنك مصر" />
            </Field>
            <Field label="رقم المحفظة / الحساب / IBAN">
              <Input name="account_number" defaultValue={pay?.account_number ?? ""} dir="ltr" placeholder="01000000000" />
            </Field>
          </div>
          <Field label="اسم صاحب الحساب">
            <Input name="account_holder" defaultValue={pay?.account_holder ?? ""} placeholder="أكاديمية الحفظة" />
          </Field>
          <Field label="تعليمات إضافية" hint="اختياري — تظهر أسفل البيانات للطالب.">
            <Textarea name="instructions" defaultValue={pay?.instructions ?? ""} placeholder="أرسل صورة إيصال التحويل بعد الدفع." />
          </Field>
          <Button type="submit" size="sm">حفظ البيانات</Button>
        </form>
      </Card>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-bold">البريد الإلكتروني (Resend)</h2>
            <p className="mt-1 text-sm text-muted">
              بدونه لا يصل رابط إعادة تعيين كلمة المرور للمستخدمين.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              em?.api_key ? "bg-success/15 text-success" : "bg-muted/15 text-muted"
            }`}
          >
            {em?.api_key ? "مفعّل" : "غير مفعّل"}
          </span>
        </div>
        <form action={saveEmailConfig} className="space-y-4 border-t border-border pt-4">
          <Field label="مفتاح Resend (API Key)">
            <Input name="api_key" defaultValue={em?.api_key ?? ""} dir="ltr" placeholder="re_..." />
          </Field>
          <Field label="عنوان المُرسِل" hint="لا بد أن يكون نطاقاً موثّقاً في Resend.">
            <Input
              name="from"
              defaultValue={em?.from ?? ""}
              dir="ltr"
              placeholder="أكاديمية الحفظة <noreply@yourdomain.com>"
            />
          </Field>
          <Button type="submit" size="sm">حفظ إعداد البريد</Button>
        </form>
      </Card>

      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">قاعدة البيانات</h2>
            <p className="mt-1 text-sm text-muted">
              حالة الاتصال والمحتوى — للاطلاع فقط. تُهيَّأ القاعدة تلقائياً عند النشر.
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              db ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
            }`}
          >
            {db ? "متصلة" : "غير مهيّأة"}
          </span>
        </div>

        <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 lg:grid-cols-3">
          <Stat label="الخادم" value={conn.host} />
          <Stat label="القاعدة" value={`${conn.database} · ${conn.port}`} />
          <Stat label="نوع الاتصال" value={conn.pooled ? "مُجمَّع (transaction)" : "مباشر"} />
          {db && (
            <>
              <Stat label="عدد الجداول" value={num(db.tables)} warn={db.tables < 34} />
              <Stat
                label="كلمات المصحف"
                value={num(db.words)}
                warn={db.words < 83665}
              />
              <Stat label="الآيات" value={num(db.ayahs)} warn={db.ayahs < 6236} />
              <Stat label="المستخدمون" value={num(db.users)} />
              <Stat label="الطلاب / المعلمون" value={`${num(db.students)} / ${num(db.teachers)}`} />
              <Stat label="الحصص" value={num(db.classes)} />
            </>
          )}
        </div>

        {db && db.words < 83665 && (
          <p className="rounded-xl bg-danger/10 p-3 text-xs leading-relaxed text-danger">
            بذرة المصحف ناقصة — صفحات المصحف قد تظهر فارغة. شغّل{" "}
            <span dir="ltr" className="font-mono">npm run setup</span> لإكمالها.
          </p>
        )}
      </Card>
    </div>
  );
}
