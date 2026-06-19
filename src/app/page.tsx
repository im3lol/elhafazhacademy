import Link from "next/link";
import { sql } from "@/lib/db";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo, LogoMark } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import {
  IconUsers,
  IconChart,
  IconCalendar,
  IconVideo,
  IconClipboard,
  IconShield,
  IconBell,
  IconSliders,
  IconCap,
  IconStar,
  IconCheck,
  IconClock,
  IconHeart,
} from "@/components/icons";

const navLinks = [
  { href: "/", label: "الرئيسية" },
  { href: "#why", label: "عن الأكاديمية" },
  { href: "#features", label: "البرامج" },
  { href: "#teachers", label: "المعلمون" },
  { href: "#packages", label: "الأسعار" },
  { href: "#faq", label: "الأسئلة الشائعة" },
  { href: "#footer", label: "تواصل معنا" },
];

const stats = [
  { value: "+١٠٬٠٠٠", label: "طالب وطالبة", icon: IconUsers },
  { value: "+٥٠", label: "معلم متخصص", icon: IconCap },
  { value: "+١٠٠٬٠٠٠", label: "حصة تعليمية", icon: IconVideo },
  { value: "٩٥٪", label: "معدل رضا الطلاب", icon: IconStar },
];

const whyUs = [
  { icon: IconCap, title: "معلمون متخصصون", desc: "نخبة من المعلمين والمعلمات ذوي الخبرة في التحفيظ والتجويد." },
  { icon: IconChart, title: "متابعة مستمرة", desc: "تقارير دورية توضح مستوى الطالب وتقدمه." },
  { icon: IconCalendar, title: "جداول مرنة", desc: "اختر الأيام والأوقات التي تناسبك." },
  { icon: IconVideo, title: "تعليم عن بُعد", desc: "من أي مكان في العالم عبر جلسات مباشرة." },
  { icon: IconClipboard, title: "تقييمات دقيقة", desc: "متابعة للحفظ والتجويد والالتزام والحضور." },
  { icon: IconShield, title: "بيئة آمنة", desc: "منصة تعليمية منظمة وآمنة للطلاب والأهالي." },
];

const steps = [
  { n: "١", title: "التسجيل", desc: "أنشئ حسابك خلال دقائق." },
  { n: "٢", title: "تحديد المستوى", desc: "جلسة تقييم لتحديد مستواك الحالي." },
  { n: "٣", title: "اختيار الباقة", desc: "اختر عدد الحصص المناسب لك." },
  { n: "٤", title: "بدء الرحلة", desc: "ابدأ الحفظ والمتابعة مع معلمك مباشرة." },
];

const features = [
  { icon: IconChart, title: "تقارير الأداء", desc: "متابعة تفصيلية لمستوى الحفظ والتجويد." },
  { icon: IconClipboard, title: "متابعة الأخطاء", desc: "تسجيل الأخطاء المتكررة وخطة تحسينها." },
  { icon: IconCalendar, title: "إدارة الحصص", desc: "جدول منظم وتنبيهات تلقائية قبل كل حصة." },
  { icon: IconBell, title: "إشعارات فورية", desc: "تنبيهات عبر البريد الإلكتروني وواتساب." },
  { icon: IconClock, title: "تقييمات دورية", desc: "قياس مستمر لمستوى الطالب وتطوره." },
  { icon: IconSliders, title: "مرونة كاملة", desc: "إمكانية زيادة أو تقليل عدد الحصص بسهولة." },
];

const parentItems = ["مستوى التقدم", "الحضور والغياب", "تقييمات المعلم", "التقارير الشهرية", "ملاحظات التحسين"];
const teacherCriteria = ["الإتقان والتجويد", "الخبرة التعليمية", "مهارات التواصل", "الالتزام والمتابعة"];

const testimonials = [
  { quote: "منصة منظمة وسهلة، ساعدتني على الالتزام بالحفظ.", name: "طالب" },
  { quote: "التقارير والمتابعة كانت سبباً رئيسياً في تطوري.", name: "ولي أمر" },
  { quote: "أفضل تجربة تعليمية مررت بها في حفظ القرآن.", name: "طالبة" },
];

const faqs = [
  { q: "هل يمكن الدراسة من خارج مصر؟", a: "نعم، المنصة متاحة للطلاب من جميع الدول." },
  { q: "هل يمكن تغيير مواعيد الحصص؟", a: "نعم، وفقاً للسياسات المتاحة." },
  { q: "هل أستطيع تغيير الباقة؟", a: "نعم، يمكن تقديم طلب تعديل من خلال المنصة." },
  { q: "هل يتم توفير تقارير دورية؟", a: "نعم، يتم إصدار تقارير متابعة بشكل مستمر." },
];

const packageBlurb: Record<string, string> = {
  "الباقة الأساسية": "عدد مناسب من الحصص الأسبوعية لبناء أساس قوي.",
  "الباقة المتوسطة": "لمن يرغب في تسريع الحفظ والمراجعة.",
  "الباقة المكثفة": "خطة متقدمة لتحقيق أكبر قدر من الإنجاز.",
};

type PkgRow = {
  id: string;
  name: string;
  classes_per_month: number | null;
  price: number;
  currency: string;
};

// تُولَّد عند الطلب (لا وقت البناء) — لتفادي محاولة الاتصال بالقاعدة أثناء build على بيئات بلا DB.
export const dynamic = "force-dynamic";

export default async function Home() {
  // الصفحة العامة لا يجب أن تنهار لو تعذّرت القاعدة لحظياً — تظهر بلا باقات بدلاً من خطأ ٥٠٠.
  let pkgs: PkgRow[] = [];
  try {
    pkgs = await sql<PkgRow[]>`
      select id, name, classes_per_month, price, currency
      from packages where is_active = true order by price`;
  } catch {
    pkgs = [];
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Logo size="sm" />
          <nav className="hidden items-center gap-6 lg:flex">
            {navLinks.map((l) => (
              <a key={l.label} href={l.href} className="text-sm font-medium text-muted transition-colors hover:text-brand">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className={buttonClasses({ variant: "outline", size: "sm" })}>
              تسجيل الدخول
            </Link>
            <Link href="/register/student" className={buttonClasses({ size: "sm" })}>
              ابدأ الآن
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ===== Hero ===== */}
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-subtle px-4 py-1.5 text-sm font-medium text-brand">
              <IconStar className="h-4 w-4 text-gold" /> منصة تعليمية متكاملة لحفظ القرآن
            </span>
            <h1 className="mt-6 font-display text-4xl font-black leading-[1.2] sm:text-5xl">
              رحلة منظمة لحفظ القرآن الكريم
              <span className="text-brand"> بإشراف معلمين متخصصين</span>
            </h1>
            <p className="mt-6 max-w-xl leading-relaxed text-muted">
              ابدأ رحلتك في حفظ القرآن الكريم من أي مكان في العالم مع متابعة مستمرة،
              تقارير أداء دقيقة، وجدول مرن يناسب وقتك. نوفّر بيئة تعليمية احترافية تجمع
              بين جودة التعليم وسهولة المتابعة لضمان تقدّم ثابت لكل طالب.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register/student" className={buttonClasses({ size: "lg" })}>
                ابدأ الآن
              </Link>
              <Link
                href="/register/student"
                className={buttonClasses({ variant: "outline", size: "lg", className: "border-gold text-gold hover:bg-gold-subtle" })}
              >
                احجز جلسة تقييم مجانية
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-3 text-sm">
              <div className="flex text-gold">
                {Array.from({ length: 5 }).map((_, i) => (
                  <IconStar key={i} className="h-4 w-4" />
                ))}
              </div>
              <span className="font-bold">٤٫٩/٥</span>
              <span className="text-muted">من آلاف الطلاب</span>
            </div>
          </div>

          {/* بطاقة معاينة لوحة التحكم */}
          <HeroPreview />
        </section>

        {/* ===== Stats band ===== */}
        <section className="bg-brand text-brand-foreground">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-8 px-6 py-12 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-4">
                <s.icon className="h-9 w-9 shrink-0 text-gold" />
                <div>
                  <div className="font-display text-2xl font-black sm:text-3xl">{s.value}</div>
                  <div className="text-sm opacity-90">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== Why Us ===== */}
        <Section id="why" title="لماذا أكاديمية الحفظة؟" subtitle="كل ما تحتاجه لرحلة حفظ منظمة وموثوقة">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {whyUs.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </Section>

        {/* ===== How It Works ===== */}
        <section className="bg-surface/60">
          <Section title="كيف تبدأ؟" subtitle="أربع خطوات بسيطة تفصلك عن رحلتك">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s) => (
                <div key={s.n} className="rounded-2xl border border-border bg-surface p-6 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand font-display text-lg font-black text-brand-foreground">
                    {s.n}
                  </div>
                  <h3 className="mt-4 font-display text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{s.desc}</p>
                </div>
              ))}
            </div>
          </Section>
        </section>

        {/* ===== Features ===== */}
        <Section id="features" title="منصة تعليمية متكاملة" subtitle="أدوات احترافية لإدارة رحلة الحفظ">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </Section>

        {/* ===== Parent + Teachers ===== */}
        <section className="mx-auto grid w-full max-w-6xl gap-6 px-6 py-16 lg:grid-cols-2">
          <InfoPanel
            icon={IconHeart}
            title="راحة واطمئنان لأولياء الأمور"
            desc="يمكن لولي الأمر متابعة كل ما يخص أبنائه من خلال تقارير واضحة ومنظمة:"
            items={parentItems}
          />
          <InfoPanel
            icon={IconCap}
            title="معلمون مؤهلون ومتابعة احترافية"
            desc="يتم اختيار المعلمين وفق معايير دقيقة لضمان أفضل تجربة تعليمية:"
            items={teacherCriteria}
            id="teachers"
          />
        </section>

        {/* ===== Packages ===== */}
        <section className="bg-surface/60" id="packages">
          <Section title="اختر الباقة المناسبة لك" subtitle="باقات مرنة تناسب كل مستوى وهدف">
            <div className="grid gap-5 sm:grid-cols-3">
              {pkgs.map((p, i) => {
                const featured = i === 1;
                return (
                  <div
                    key={p.id}
                    className={
                      "relative rounded-2xl border bg-surface p-7 text-center " +
                      (featured ? "border-gold shadow-lg" : "border-border")
                    }
                  >
                    {featured && (
                      <span className="absolute -top-3 right-1/2 translate-x-1/2 rounded-full bg-gold px-3 py-1 text-xs font-bold text-gold-foreground">
                        الأكثر اختياراً
                      </span>
                    )}
                    <h3 className="font-display text-lg font-bold">{p.name}</h3>
                    <div className="mt-4 font-display text-4xl font-black text-brand">
                      {toAr(p.classes_per_month ?? 0)}
                    </div>
                    <p className="text-sm text-muted">حصة شهرياً</p>
                    <p className="mt-3 text-sm leading-relaxed text-muted">
                      {packageBlurb[p.name] ?? ""}
                    </p>
                    <div className="mt-5 border-t border-border pt-4">
                      <span className="font-display text-2xl font-black">{toAr(p.price)}</span>{" "}
                      <span className="text-sm text-muted">{p.currency} / شهرياً</span>
                    </div>
                    <Link
                      href="/register/student"
                      className={buttonClasses({
                        size: "md",
                        variant: featured ? "primary" : "outline",
                        className: "mt-5 w-full",
                      })}
                    >
                      اختر الباقة
                    </Link>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 text-center">
              <Link href="/register/student" className="text-sm font-medium text-brand hover:underline">
                عرض جميع الباقات والمميزات ←
              </Link>
            </div>
          </Section>
        </section>

        {/* ===== Testimonials ===== */}
        <Section title="ماذا يقول طلابنا؟" subtitle="تجارب حقيقية من مجتمع الحفظة">
          <div className="grid gap-5 sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-2xl border border-border bg-surface p-7">
                <div className="font-display text-4xl leading-none text-gold">”</div>
                <p className="mt-2 leading-relaxed">{t.quote}</p>
                <p className="mt-4 text-sm font-medium text-muted">— {t.name}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ===== FAQ ===== */}
        <section className="bg-surface/60" id="faq">
          <Section title="الأسئلة الشائعة" subtitle="إجابات لأكثر ما يهمّك">
            <div className="mx-auto max-w-2xl space-y-3">
              {faqs.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-border bg-surface p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                    {f.q}
                    <span className="text-brand transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
            </div>
          </Section>
        </section>

        {/* ===== Final CTA ===== */}
        <section className="bg-brand text-brand-foreground">
          <div className="mx-auto w-full max-w-4xl px-6 py-16 text-center">
            <h2 className="font-display text-3xl font-black sm:text-4xl">ابدأ رحلتك مع القرآن اليوم</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-relaxed opacity-90">
              انضم إلى آلاف الطلاب الذين بدؤوا رحلتهم في حفظ القرآن الكريم ضمن بيئة
              تعليمية منظمة واحترافية.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/register/student"
                className={buttonClasses({ size: "lg", className: "bg-gold text-gold-foreground hover:bg-gold-hover" })}
              >
                ابدأ الآن
              </Link>
              <Link
                href="/register/student"
                className={buttonClasses({ variant: "outline", size: "lg", className: "border-white/40 bg-transparent text-brand-foreground hover:bg-white/10" })}
              >
                احجز جلسة تقييم مجانية
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ===== Footer ===== */}
      <footer id="footer" className="bg-foreground text-background">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="flex items-center gap-2">
              <LogoMark className="h-9 w-9" />
              <span className="font-display text-lg font-bold">الحفظة</span>
            </span>
            <p className="mt-3 text-sm leading-relaxed opacity-70">
              منصة تعليمية متكاملة تهدف إلى تيسير تجربة حفظ القرآن الكريم بإشراف
              معلمين متخصصين ومتابعة دقيقة.
            </p>
          </div>
          <FooterCol title="روابط سريعة" links={["عن الأكاديمية", "البرامج", "المعلمون", "الأسعار"]} />
          <FooterCol title="البرامج" links={["مراجعة وحفظ", "تجويد وأحكام", "تصحيح تلاوة", "إعداد محفّظين"]} />
          <div>
            <h4 className="font-display text-base font-bold">تواصل معنا</h4>
            <ul className="mt-4 space-y-2 text-sm opacity-80">
              <li dir="ltr" className="text-right">+20 101 234 5678</li>
              <li dir="ltr" className="text-right">info@huffazacademy.com</li>
              <li>القاهرة — مصر</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto w-full max-w-6xl px-6 py-5 text-center text-sm opacity-60">
            جميع الحقوق محفوظة © ٢٠٢٦ أكاديمية الحفظة — صُمّم بخط ثمانية
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ===== مكوّنات مساعدة ===== */

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-6xl px-6 py-16">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="font-display text-3xl font-black sm:text-4xl">{title}</h2>
        {subtitle && <p className="mt-3 text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-7 transition-all hover:border-brand hover:shadow-sm">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-subtle text-brand">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
      <p className="mt-2 leading-relaxed text-muted">{desc}</p>
    </div>
  );
}

function InfoPanel({
  id,
  icon: Icon,
  title,
  desc,
  items,
}: {
  id?: string;
  icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactNode;
  title: string;
  desc: string;
  items: string[];
}) {
  return (
    <div id={id} className="rounded-2xl border border-border bg-surface p-8">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-subtle text-brand">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 font-display text-2xl font-bold">{title}</h3>
      <p className="mt-2 leading-relaxed text-muted">{desc}</p>
      <ul className="mt-5 space-y-3">
        {items.map((it) => (
          <li key={it} className="flex items-center gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-subtle text-brand">
              <IconCheck className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm">{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h4 className="font-display text-base font-bold">{title}</h4>
      <ul className="mt-4 space-y-2 text-sm opacity-80">
        {links.map((l) => (
          <li key={l}>
            <a href="#" className="transition-opacity hover:opacity-100">
              {l}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HeroPreview() {
  return (
    <div className="rounded-3xl border border-border bg-surface p-6 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-bold">مرحباً، محمد</p>
          <p className="text-sm text-muted">استمر في التقدّم 👋</p>
        </div>
        <LogoMark className="h-10 w-10" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <MiniStat label="نسبة الحفظ" value="٧٥٪" accent />
        <MiniStat label="الحضور" value="٩٦٪" />
        <MiniStat label="الحصص المكتملة" value="٤٨" />
        <MiniStat label="المستوى" value="متوسط" gold />
      </div>
      <div className="mt-4 rounded-xl bg-brand-subtle p-4">
        <p className="text-xs text-muted">الحصة القادمة</p>
        <p className="mt-1 font-medium">سورة يوسف (١–٢٠)</p>
        <p className="mt-1 text-xs text-muted">٠٧:٠٠ م · مع المعلم أحمد محمد</p>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  accent,
  gold,
}: {
  label: string;
  value: string;
  accent?: boolean;
  gold?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs text-muted">{label}</p>
      <p
        className={
          "mt-1 font-display text-xl font-black " +
          (accent ? "text-brand" : gold ? "text-gold" : "text-foreground")
        }
      >
        {value}
      </p>
    </div>
  );
}

/* أرقام عربية */
function toAr(n: number) {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
}
