import { Card } from "@/components/ui/card";
import { getBranding } from "@/lib/branding";

export default async function TeacherPendingPage() {
  const { branding } = await getBranding();
  return (
    <div className="mx-auto max-w-xl">
      <Card className="space-y-3 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-subtle text-2xl">
          ⏳
        </div>
        <h1 className="font-display text-2xl font-bold">طلبك قيد المراجعة</h1>
        <p className="text-muted">
          شكراً لتسجيلك كمعلم في {branding.fullName}. يقوم فريق الإدارة بمراجعة بياناتك،
          وسنخطرك فور اعتماد حسابك.
        </p>
      </Card>
    </div>
  );
}
