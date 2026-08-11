"use client";

import { useActionState, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import {
  saveIdentity,
  saveHero,
  saveCards,
  savePanels,
  saveTestimonials,
  saveFaq,
  saveFooter,
  resetIdentity,
  resetLanding,
  type BrandingState,
} from "@/lib/admin/branding-actions";
import type { Branding, LandingContent } from "@/lib/branding";

/** بطاقة قابلة للطيّ حول نموذج — الصفحة فيها أقسام كثيرة. */
function SectionCard({
  title,
  hint,
  children,
  open: initialOpen = false,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <Card className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-right"
      >
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
        </div>
        <span className={`text-brand transition-transform ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open && <div className="border-t border-border pt-4">{children}</div>}
    </Card>
  );
}

function Msg({ state }: { state: BrandingState }) {
  if (state.error)
    return <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>;
  if (state.success)
    return <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">{state.success}</p>;
  return null;
}

function SaveBar({ pending, label = "حفظ" }: { pending: boolean; label?: string }) {
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "جارٍ الحفظ…" : label}
    </Button>
  );
}

/** محرّر قائمة عناصر متكرّرة (عنوان + وصف مثلاً). */
function ItemsEditor({
  prefix,
  fields,
  items,
  max,
  addLabel,
}: {
  prefix: string;
  fields: { key: string; label: string; long?: boolean }[];
  items: Record<string, string>[];
  max: number;
  addLabel: string;
}) {
  const [rows, setRows] = useState(items.length ? items : [Object.fromEntries(fields.map((f) => [f.key, ""]))]);

  return (
    <div className="space-y-3">
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-border p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted">عنصر {i + 1}</span>
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => setRows(rows.filter((_, j) => j !== i))}
                className="text-xs text-red-600 hover:underline dark:text-red-400"
              >
                حذف
              </button>
            )}
          </div>
          <div className="grid gap-2">
            {fields.map((f) =>
              f.long ? (
                <Textarea
                  key={f.key}
                  name={`${prefix}[${i}].${f.key}`}
                  defaultValue={row[f.key] ?? ""}
                  placeholder={f.label}
                  rows={2}
                />
              ) : (
                <Input
                  key={f.key}
                  name={`${prefix}[${i}].${f.key}`}
                  defaultValue={row[f.key] ?? ""}
                  placeholder={f.label}
                />
              ),
            )}
          </div>
        </div>
      ))}
      {rows.length < max && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setRows([...rows, Object.fromEntries(fields.map((f) => [f.key, ""]))])}
        >
          + {addLabel}
        </Button>
      )}
    </div>
  );
}

/* ============ ١) الهوية ============ */
export function IdentityForm({ branding }: { branding: Branding }) {
  const [state, action, pending] = useActionState<BrandingState, FormData>(saveIdentity, {});
  const [brand, setBrand] = useState(branding.brand);
  const [gold, setGold] = useState(branding.gold);

  return (
    <SectionCard
      title="هوية المنصة"
      hint="الاسم والشعار والألوان — تظهر في كل صفحة وفي عنوان المتصفح."
      open
    >
      <form action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اسم المنصة (بجوار الشعار)">
            <Input name="name" defaultValue={branding.name} required maxLength={60} />
          </Field>
          <Field label="الاسم الكامل (عنوان المتصفح)">
            <Input name="fullName" defaultValue={branding.fullName} maxLength={120} />
          </Field>
          <Field label="السطر التعريفي">
            <Input name="tagline" defaultValue={branding.tagline} maxLength={120} />
          </Field>
          <Field label="وصف الموقع (لمحركات البحث)">
            <Input name="description" defaultValue={branding.description} maxLength={300} />
          </Field>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 text-sm font-medium">الشعار</p>
          <div className="flex flex-wrap items-center gap-4">
            {branding.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logo} alt="الشعار الحالي" className="h-14 w-14 rounded-lg object-contain" />
            ) : (
              <span className="text-sm text-muted">لا يوجد شعار مرفوع — يُستخدم الشعار الافتراضي.</span>
            )}
            <input
              type="file"
              name="logo"
              accept="image/png,image/webp,image/jpeg,image/svg+xml"
              className="text-sm"
            />
          </div>
          <p className="mt-2 text-xs text-muted">PNG أو WEBP أو JPG أو SVG — بحد أقصى ٣٠٠ كيلوبايت.</p>
          {branding.logo && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input type="checkbox" name="remove_logo" value="1" />
              حذف الشعار الحالي والعودة للافتراضي
            </label>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="اللون الأساسي" hint="لون الأزرار والعناوين">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background"
                aria-label="اللون الأساسي"
              />
              <Input name="brand" value={brand} onChange={(e) => setBrand(e.target.value)} dir="ltr" />
            </div>
          </Field>
          <Field label="اللون المميّز" hint="لون التمييز والنجوم والإطارات">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={gold}
                onChange={(e) => setGold(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-input bg-background"
                aria-label="اللون المميّز"
              />
              <Input name="gold" value={gold} onChange={(e) => setGold(e.target.value)} dir="ltr" />
            </div>
          </Field>
        </div>
        <p className="text-xs text-muted">
          درجات التمرير والخلفيات الفاتحة ووضع الليل تُشتق تلقائياً من هذين اللونين.
        </p>

        <Msg state={state} />
        <div className="flex items-center gap-2">
          <SaveBar pending={pending} label="حفظ الهوية" />
          <Button type="submit" size="sm" variant="ghost" formAction={resetIdentity}>
            إعادة للافتراضي
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}

/* ============ ٢) القسم الرئيسي ============ */
export function HeroForm({ landing }: { landing: LandingContent }) {
  const [state, action, pending] = useActionState<BrandingState, FormData>(saveHero, {});
  return (
    <SectionCard title="القسم الرئيسي (أعلى الصفحة)" hint="العنوان الكبير والوصف والأزرار وشريط الأرقام.">
      <form action={action} className="space-y-4">
        <Field label="الشارة الصغيرة أعلى العنوان">
          <Input name="badge" defaultValue={landing.hero.badge} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="العنوان">
            <Input name="title" defaultValue={landing.hero.title} />
          </Field>
          <Field label="تتمّة العنوان (بلون الهوية)">
            <Input name="titleAccent" defaultValue={landing.hero.titleAccent} />
          </Field>
        </div>
        <Field label="الوصف">
          <Textarea name="description" defaultValue={landing.hero.description} rows={4} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="زر رئيسي">
            <Input name="ctaPrimary" defaultValue={landing.hero.ctaPrimary} />
          </Field>
          <Field label="زر ثانوي">
            <Input name="ctaSecondary" defaultValue={landing.hero.ctaSecondary} />
          </Field>
          <Field label="قيمة التقييم">
            <Input name="ratingValue" defaultValue={landing.hero.ratingValue} />
          </Field>
          <Field label="وصف التقييم">
            <Input name="ratingLabel" defaultValue={landing.hero.ratingLabel} />
          </Field>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">شريط الأرقام (٤ عناصر)</p>
          <ItemsEditor
            prefix="stats"
            fields={[
              { key: "value", label: "الرقم (مثل: +١٠٬٠٠٠)" },
              { key: "label", label: "الوصف (مثل: طالب وطالبة)" },
            ]}
            items={landing.stats}
            max={4}
            addLabel="إضافة رقم"
          />
        </div>

        <Msg state={state} />
        <SaveBar pending={pending} />
      </form>
    </SectionCard>
  );
}

/* ============ ٣) أقسام البطاقات ============ */
export function CardsForm({
  section,
  title,
  hint,
  data,
}: {
  section: "why" | "steps" | "features";
  title: string;
  hint: string;
  data: { title: string; subtitle: string; items: { title: string; desc: string }[] };
}) {
  const [state, action, pending] = useActionState<BrandingState, FormData>(saveCards, {});
  return (
    <SectionCard title={title} hint={hint}>
      <form action={action} className="space-y-4">
        <input type="hidden" name="section" value={section} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="عنوان القسم">
            <Input name="title" defaultValue={data.title} />
          </Field>
          <Field label="العنوان الفرعي">
            <Input name="subtitle" defaultValue={data.subtitle} />
          </Field>
        </div>
        <ItemsEditor
          prefix="items"
          fields={[
            { key: "title", label: "العنوان" },
            { key: "desc", label: "الوصف", long: true },
          ]}
          items={data.items}
          max={8}
          addLabel="إضافة عنصر"
        />
        <Msg state={state} />
        <SaveBar pending={pending} />
      </form>
    </SectionCard>
  );
}

/* ============ ٤) لوحتا الأهل والمعلمين + عنوان الباقات ============ */
export function PanelsForm({ landing }: { landing: LandingContent }) {
  const [state, action, pending] = useActionState<BrandingState, FormData>(savePanels, {});
  return (
    <SectionCard title="أولياء الأمور والمعلمون والباقات" hint="اللوحتان الجانبيتان وعنوان قسم الأسعار.">
      <form action={action} className="space-y-5">
        <div className="rounded-xl border border-border p-3">
          <p className="mb-2 text-sm font-medium">لوحة أولياء الأمور</p>
          <div className="grid gap-3">
            <Input name="parents_title" defaultValue={landing.parents.title} placeholder="العنوان" />
            <Textarea name="parents_desc" defaultValue={landing.parents.desc} rows={2} placeholder="الوصف" />
            <Textarea
              name="parents_items"
              defaultValue={landing.parents.items.join("\n")}
              rows={5}
              placeholder="عنصر في كل سطر"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border p-3">
          <p className="mb-2 text-sm font-medium">لوحة المعلمين</p>
          <div className="grid gap-3">
            <Input name="teachers_title" defaultValue={landing.teachers.title} placeholder="العنوان" />
            <Textarea name="teachers_desc" defaultValue={landing.teachers.desc} rows={2} placeholder="الوصف" />
            <Textarea
              name="teachers_items"
              defaultValue={landing.teachers.items.join("\n")}
              rows={5}
              placeholder="عنصر في كل سطر"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="عنوان قسم الباقات">
            <Input name="packages_title" defaultValue={landing.packages.title} />
          </Field>
          <Field label="العنوان الفرعي للباقات">
            <Input name="packages_subtitle" defaultValue={landing.packages.subtitle} />
          </Field>
        </div>

        <Msg state={state} />
        <SaveBar pending={pending} />
      </form>
    </SectionCard>
  );
}

/* ============ ٥) آراء الطلاب ============ */
export function TestimonialsForm({ landing }: { landing: LandingContent }) {
  const [state, action, pending] = useActionState<BrandingState, FormData>(saveTestimonials, {});
  return (
    <SectionCard title="آراء الطلاب" hint="ضع آراء حقيقية بعد التشغيل، أو احذف العناصر كلها لإخفاء القسم.">
      <form action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="عنوان القسم">
            <Input name="title" defaultValue={landing.testimonials.title} />
          </Field>
          <Field label="العنوان الفرعي">
            <Input name="subtitle" defaultValue={landing.testimonials.subtitle} />
          </Field>
        </div>
        <ItemsEditor
          prefix="items"
          fields={[
            { key: "quote", label: "الرأي", long: true },
            { key: "name", label: "الاسم / الصفة" },
          ]}
          items={landing.testimonials.items}
          max={6}
          addLabel="إضافة رأي"
        />
        <Msg state={state} />
        <SaveBar pending={pending} />
      </form>
    </SectionCard>
  );
}

/* ============ ٦) الأسئلة الشائعة ============ */
export function FaqForm({ landing }: { landing: LandingContent }) {
  const [state, action, pending] = useActionState<BrandingState, FormData>(saveFaq, {});
  return (
    <SectionCard title="الأسئلة الشائعة" hint="أسئلة وأجوبة تظهر أسفل الصفحة.">
      <form action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="عنوان القسم">
            <Input name="title" defaultValue={landing.faq.title} />
          </Field>
          <Field label="العنوان الفرعي">
            <Input name="subtitle" defaultValue={landing.faq.subtitle} />
          </Field>
        </div>
        <ItemsEditor
          prefix="items"
          fields={[
            { key: "q", label: "السؤال" },
            { key: "a", label: "الإجابة", long: true },
          ]}
          items={landing.faq.items}
          max={10}
          addLabel="إضافة سؤال"
        />
        <Msg state={state} />
        <SaveBar pending={pending} />
      </form>
    </SectionCard>
  );
}

/* ============ ٧) الخاتمة والفوتر ============ */
export function FooterForm({ landing }: { landing: LandingContent }) {
  const [state, action, pending] = useActionState<BrandingState, FormData>(saveFooter, {});
  return (
    <SectionCard title="الدعوة الختامية والفوتر" hint="آخر قسم في الصفحة وبيانات التواصل والحقوق.">
      <form action={action} className="space-y-5">
        <div className="rounded-xl border border-border p-3">
          <p className="mb-2 text-sm font-medium">الدعوة الختامية</p>
          <div className="grid gap-3">
            <Input name="cta_title" defaultValue={landing.finalCta.title} placeholder="العنوان" />
            <Textarea name="cta_desc" defaultValue={landing.finalCta.desc} rows={2} placeholder="الوصف" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input name="cta_primary" defaultValue={landing.finalCta.ctaPrimary} placeholder="زر رئيسي" />
              <Input name="cta_secondary" defaultValue={landing.finalCta.ctaSecondary} placeholder="زر ثانوي" />
            </div>
          </div>
        </div>

        <Field label="نبذة الفوتر">
          <Textarea name="about" defaultValue={landing.footer.about} rows={3} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border p-3">
            <Input name="linksTitle" defaultValue={landing.footer.linksTitle} placeholder="عنوان عمود الروابط" />
            <Textarea
              name="links"
              defaultValue={landing.footer.links.join("\n")}
              rows={5}
              className="mt-2"
              placeholder="رابط في كل سطر"
            />
          </div>
          <div className="rounded-xl border border-border p-3">
            <Input name="programsTitle" defaultValue={landing.footer.programsTitle} placeholder="عنوان عمود البرامج" />
            <Textarea
              name="programs"
              defaultValue={landing.footer.programs.join("\n")}
              rows={5}
              className="mt-2"
              placeholder="برنامج في كل سطر"
            />
          </div>
        </div>

        <div className="rounded-xl border border-border p-3">
          <Input name="contactTitle" defaultValue={landing.footer.contactTitle} placeholder="عنوان عمود التواصل" />
          <div className="mt-2 grid gap-3 sm:grid-cols-3">
            <Input name="phone" defaultValue={landing.footer.phone} dir="ltr" placeholder="الهاتف" />
            <Input name="email" defaultValue={landing.footer.email} dir="ltr" placeholder="البريد" />
            <Input name="address" defaultValue={landing.footer.address} placeholder="العنوان" />
          </div>
        </div>

        <Field label="سطر الحقوق">
          <Input name="copyright" defaultValue={landing.footer.copyright} />
        </Field>

        <Msg state={state} />
        <div className="flex items-center gap-2">
          <SaveBar pending={pending} />
          <Button type="submit" size="sm" variant="ghost" formAction={resetLanding}>
            إعادة كل المحتوى للافتراضي
          </Button>
        </div>
      </form>
    </SectionCard>
  );
}
