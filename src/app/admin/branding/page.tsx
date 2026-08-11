import Link from "next/link";
import { requirePermissionPage } from "@/lib/auth/guards";
import { getBranding } from "@/lib/branding";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import {
  IdentityForm,
  HeroForm,
  CardsForm,
  PanelsForm,
  TestimonialsForm,
  FaqForm,
  FooterForm,
} from "@/components/admin/branding-forms";

export default async function AdminBrandingPage() {
  await requirePermissionPage("settings.manage");
  const { branding, landing } = await getBranding();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black">الهوية والمحتوى</h1>
          <p className="mt-1 text-muted">
            اسم المنصة وشعارها وألوانها، وكل نصوص الصفحة الرئيسية — بلا لمس الكود.
          </p>
        </div>
        <Link href="/" target="_blank" className={buttonClasses({ variant: "outline", size: "sm" })}>
          معاينة الصفحة الرئيسية ↗
        </Link>
      </div>

      <Card className="border-brand/20 bg-brand-subtle/40 text-sm">
        بعد الحفظ، حدّث الصفحة (F5) لترى الألوان والاسم الجديدين في كل الصفحات.
      </Card>

      <IdentityForm branding={branding} />
      <HeroForm landing={landing} />
      <CardsForm
        section="why"
        title="قسم «لماذا نحن؟»"
        hint="بطاقات المزايا العامة."
        data={landing.why}
      />
      <CardsForm
        section="steps"
        title="قسم «كيف تبدأ؟»"
        hint="خطوات الانضمام المرقّمة."
        data={landing.steps}
      />
      <CardsForm
        section="features"
        title="قسم المميزات"
        hint="بطاقات أدوات المنصة."
        data={landing.features}
      />
      <PanelsForm landing={landing} />
      <TestimonialsForm landing={landing} />
      <FaqForm landing={landing} />
      <FooterForm landing={landing} />
    </div>
  );
}
