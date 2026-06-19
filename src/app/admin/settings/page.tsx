import Link from "next/link";
import { isGoogleConnected, googleCredsConfigured, GOOGLE_CREDS_KEY } from "@/lib/google/client";
import { getTelegramConfig } from "@/lib/telegram/client";
import { disconnectGoogle, saveGoogleCreds, clearGoogleCreds, saveAcademyPayment, saveTelegramConfig, disconnectTelegram } from "@/lib/admin/settings-actions";
import { getSetting, ACADEMY_PAYMENT_KEY, type AcademyPayment } from "@/lib/settings";
import { Card } from "@/components/ui/card";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage, Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";

const messages: Record<string, { type: "error" | "success"; text: string }> = {
  connected: { type: "success", text: "تم ربط حساب Google بنجاح." },
  error: { type: "error", text: "تعذّر الربط. حاول مرة أخرى." },
  no_refresh: { type: "error", text: "لم نستلم صلاحية دائمة. افصل الربط من حساب Google ثم أعد المحاولة." },
  misconfigured: { type: "error", text: "بيانات Google (Client ID/Secret) غير مضبوطة في الخادم." },
};

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string; saved?: string }>;
}) {
  const { google, saved } = await searchParams;
  const { connected, email } = await isGoogleConnected();
  const msg = google ? messages[google] : null;
  const hasCreds = await googleCredsConfigured();
  const gc = await getSetting<{ client_id?: string; client_secret?: string; redirect_uri?: string }>(GOOGLE_CREDS_KEY);
  const pay = await getSetting<AcademyPayment>(ACADEMY_PAYMENT_KEY);
  const tg = await getTelegramConfig();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const defaultRedirect = `${appUrl}/api/google/callback`;

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
              GET https://api.telegram.org/bot&lt;TOKEN&gt;/setWebhook?url={appUrl}/api/telegram/webhook&amp;secret_token=&lt;SECRET&gt;
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
    </div>
  );
}
