import { sql } from "@/lib/db";

/**
 * هوية المنصة ومحتوى الصفحة الرئيسية — كلها من قاعدة البيانات.
 * الغرض: تسليم نسخة لكل جهة باسمها وشعارها وألوانها ومحتواها بلا لمس الكود.
 *
 * تُقرأ على كل صفحة (الاسم والألوان في التخطيط الجذري)، فتُخزَّن في ذاكرة
 * العملية وتُبطَل فور الحفظ من لوحة الأدمن.
 */

export const BRANDING_KEY = "branding";
export const LANDING_KEY = "landing_content";

export type Branding = {
  /** الاسم القصير بجوار الشعار */
  name: string;
  /** السطر الصغير تحت الاسم */
  tagline: string;
  /** الاسم الكامل (عنوان المتصفح والفوتر) */
  fullName: string;
  /** وصف الموقع لمحركات البحث */
  description: string;
  /** الشعار كـ data URI (فارغ = الشعار الافتراضي المرسوم) */
  logo: string;
  /** اللون الأساسي والمميز — البقية تُشتق منهما */
  brand: string;
  gold: string;
};

export type LandingContent = {
  nav: { label: string; href: string }[];
  hero: {
    badge: string;
    title: string;
    titleAccent: string;
    description: string;
    ctaPrimary: string;
    ctaSecondary: string;
    ratingValue: string;
    ratingLabel: string;
  };
  stats: { value: string; label: string }[];
  why: { title: string; subtitle: string; items: { title: string; desc: string }[] };
  steps: { title: string; subtitle: string; items: { title: string; desc: string }[] };
  features: { title: string; subtitle: string; items: { title: string; desc: string }[] };
  parents: { title: string; desc: string; items: string[] };
  teachers: { title: string; desc: string; items: string[] };
  packages: { title: string; subtitle: string };
  testimonials: { title: string; subtitle: string; items: { quote: string; name: string }[] };
  faq: { title: string; subtitle: string; items: { q: string; a: string }[] };
  finalCta: { title: string; desc: string; ctaPrimary: string; ctaSecondary: string };
  footer: {
    about: string;
    linksTitle: string;
    links: string[];
    programsTitle: string;
    programs: string[];
    contactTitle: string;
    phone: string;
    email: string;
    address: string;
    copyright: string;
  };
};

// افتراضيات محايدة عمداً: المنصّة تُوزَّع نسخاً لجهات مختلفة، فما لم تُغيّره الجهة
// يجب ألّا يحمل اسم أكاديمية أخرى. الاسم الظاهر يُضبط من /admin/branding.
export const DEFAULT_BRANDING: Branding = {
  name: "الحفظة",
  tagline: "لتحفيظ وتعليم القرآن الكريم",
  fullName: "أكاديمية الحفظة",
  description:
    "منصة لتحفيظ القرآن الكريم وتعليم التجويد: حصص مباشرة، متابعة الحفظ والمراجعة، وتقارير تقدّم.",
  logo: "",
  brand: "#0f6b52",
  gold: "#c9a227",
};

export const DEFAULT_LANDING: LandingContent = {
  nav: [
    { label: "الرئيسية", href: "/" },
    { label: "عن الأكاديمية", href: "#why" },
    { label: "البرامج", href: "#features" },
    { label: "المعلمون", href: "#teachers" },
    { label: "الأسعار", href: "#packages" },
    { label: "الأسئلة الشائعة", href: "#faq" },
    { label: "تواصل معنا", href: "#footer" },
  ],
  hero: {
    badge: "منصة تعليمية متكاملة لحفظ القرآن",
    title: "رحلة منظمة لحفظ القرآن الكريم",
    titleAccent: "بإشراف معلمين متخصصين",
    description:
      "ابدأ رحلتك في حفظ القرآن الكريم من أي مكان في العالم مع متابعة مستمرة، تقارير أداء دقيقة، وجدول مرن يناسب وقتك. نوفّر بيئة تعليمية احترافية تجمع بين جودة التعليم وسهولة المتابعة لضمان تقدّم ثابت لكل طالب.",
    ctaPrimary: "ابدأ الآن",
    ctaSecondary: "احجز جلسة تقييم مجانية",
    ratingValue: "٤٫٩/٥",
    ratingLabel: "من آلاف الطلاب",
  },
  stats: [
    { value: "+١٠٬٠٠٠", label: "طالب وطالبة" },
    { value: "+٥٠", label: "معلم متخصص" },
    { value: "+١٠٠٬٠٠٠", label: "حصة تعليمية" },
    { value: "٩٥٪", label: "معدل رضا الطلاب" },
  ],
  why: {
    title: "لماذا تختارنا؟",
    subtitle: "كل ما تحتاجه لرحلة حفظ منظمة وموثوقة",
    items: [
      { title: "معلمون متخصصون", desc: "نخبة من المعلمين والمعلمات ذوي الخبرة في التحفيظ والتجويد." },
      { title: "متابعة مستمرة", desc: "تقارير دورية توضح مستوى الطالب وتقدمه." },
      { title: "جداول مرنة", desc: "اختر الأيام والأوقات التي تناسبك." },
      { title: "تعليم عن بُعد", desc: "من أي مكان في العالم عبر جلسات مباشرة." },
      { title: "تقييمات دقيقة", desc: "متابعة للحفظ والتجويد والالتزام والحضور." },
      { title: "بيئة آمنة", desc: "منصة تعليمية منظمة وآمنة للطلاب والأهالي." },
    ],
  },
  steps: {
    title: "كيف تبدأ؟",
    subtitle: "أربع خطوات بسيطة تفصلك عن رحلتك",
    items: [
      { title: "التسجيل", desc: "أنشئ حسابك خلال دقائق." },
      { title: "تحديد المستوى", desc: "جلسة تقييم لتحديد مستواك الحالي." },
      { title: "اختيار الباقة", desc: "اختر عدد الحصص المناسب لك." },
      { title: "بدء الرحلة", desc: "ابدأ الحفظ والمتابعة مع معلمك مباشرة." },
    ],
  },
  features: {
    title: "منصة تعليمية متكاملة",
    subtitle: "أدوات احترافية لإدارة رحلة الحفظ",
    items: [
      { title: "تقارير الأداء", desc: "متابعة تفصيلية لمستوى الحفظ والتجويد." },
      { title: "متابعة الأخطاء", desc: "تسجيل الأخطاء المتكررة وخطة تحسينها." },
      { title: "إدارة الحصص", desc: "جدول منظم وتنبيهات تلقائية قبل كل حصة." },
      { title: "إشعارات فورية", desc: "تنبيه قبل كل حصة وعند صدور كل تقرير." },
      { title: "تقييمات دورية", desc: "قياس مستمر لمستوى الطالب وتطوره." },
      { title: "مرونة كاملة", desc: "إمكانية زيادة أو تقليل عدد الحصص بسهولة." },
    ],
  },
  parents: {
    title: "راحة واطمئنان لأولياء الأمور",
    desc: "يمكن لولي الأمر متابعة كل ما يخص أبنائه من خلال تقارير واضحة ومنظمة:",
    items: ["مستوى التقدم", "الحضور والغياب", "تقييمات المعلم", "التقارير الشهرية", "ملاحظات التحسين"],
  },
  teachers: {
    title: "معلمون مؤهلون ومتابعة احترافية",
    desc: "يتم اختيار المعلمين وفق معايير دقيقة لضمان أفضل تجربة تعليمية:",
    items: ["الإتقان والتجويد", "الخبرة التعليمية", "مهارات التواصل", "الالتزام والمتابعة"],
  },
  packages: { title: "اختر الباقة المناسبة لك", subtitle: "باقات مرنة تناسب كل مستوى وهدف" },
  testimonials: {
    title: "ماذا يقول طلابنا؟",
    subtitle: "تجارب من مجتمع الحفظة",
    items: [
      { quote: "منصة منظمة وسهلة، ساعدتني على الالتزام بالحفظ.", name: "طالب" },
      { quote: "التقارير والمتابعة كانت سبباً رئيسياً في تطوري.", name: "ولي أمر" },
      { quote: "أفضل تجربة تعليمية مررت بها في حفظ القرآن.", name: "طالبة" },
    ],
  },
  faq: {
    title: "الأسئلة الشائعة",
    subtitle: "إجابات لأكثر ما يهمّك",
    items: [
      { q: "هل يمكن الدراسة من خارج مصر؟", a: "نعم، المنصة متاحة للطلاب من جميع الدول." },
      { q: "هل يمكن تغيير مواعيد الحصص؟", a: "نعم، وفقاً للسياسات المتاحة." },
      { q: "هل أستطيع تغيير الباقة؟", a: "نعم، يمكن تقديم طلب تعديل من خلال المنصة." },
      { q: "هل يتم توفير تقارير دورية؟", a: "نعم، يتم إصدار تقارير متابعة بشكل مستمر." },
    ],
  },
  finalCta: {
    title: "ابدأ رحلتك مع القرآن اليوم",
    desc: "انضم إلى آلاف الطلاب الذين بدؤوا رحلتهم في حفظ القرآن الكريم ضمن بيئة تعليمية منظمة واحترافية.",
    ctaPrimary: "ابدأ الآن",
    ctaSecondary: "احجز جلسة تقييم مجانية",
  },
  footer: {
    about:
      "منصة تعليمية متكاملة تهدف إلى تيسير تجربة حفظ القرآن الكريم بإشراف معلمين متخصصين ومتابعة دقيقة.",
    linksTitle: "روابط سريعة",
    links: ["عن الأكاديمية", "البرامج", "المعلمون", "الأسعار"],
    programsTitle: "البرامج",
    programs: ["مراجعة وحفظ", "تجويد وأحكام", "تصحيح تلاوة", "إعداد محفّظين"],
    contactTitle: "تواصل معنا",
    phone: "+20 101 234 5678",
    email: "info@huffazacademy.com",
    address: "القاهرة — مصر",
    copyright: "جميع الحقوق محفوظة © ٢٠٢٦",
  },
};

// ---------- اشتقاق درجات اللون ----------
// الأدمن يختار لونين فقط؛ الدرجات (hover/subtle/dark) تُشتق حسابياً
// بدل أن نطلب منه ضبط ١٢ لوناً يدوياً.

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
const rgbToHex = ([r, g, b]: [number, number, number]) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;

/** يمزج لونين بنسبة t (0 = الأول، 1 = الثاني). */
function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex([r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t]);
}

/** هل اللون فاتح؟ (لاختيار لون النص فوقه) */
function isLight(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

const isHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v.trim());

/** متغيّرات CSS المشتقّة من لونَي الهوية — تُحقن في التخطيط الجذري. */
export function brandCssVars(b: Branding): string {
  const brand = isHex(b.brand) ? b.brand : DEFAULT_BRANDING.brand;
  const gold = isHex(b.gold) ? b.gold : DEFAULT_BRANDING.gold;

  const light = {
    brand,
    "brand-hover": mix(brand, "#000000", 0.18),
    "brand-subtle": mix(brand, "#ffffff", 0.9),
    "brand-foreground": isLight(brand) ? "#1b1b1b" : "#ffffff",
    gold,
    "gold-hover": mix(gold, "#000000", 0.14),
    "gold-subtle": mix(gold, "#ffffff", 0.88),
    "gold-foreground": isLight(gold) ? "#1b1b1b" : "#ffffff",
    ring: brand,
  };
  const dark = {
    brand: mix(brand, "#ffffff", 0.32),
    "brand-hover": mix(brand, "#ffffff", 0.45),
    "brand-subtle": mix(brand, "#000000", 0.78),
    "brand-foreground": "#06160f",
    gold: mix(gold, "#ffffff", 0.2),
    "gold-hover": mix(gold, "#ffffff", 0.34),
    "gold-subtle": mix(gold, "#000000", 0.76),
    "gold-foreground": "#1b1b1b",
    ring: mix(brand, "#ffffff", 0.32),
  };

  const vars = (o: Record<string, string>) =>
    Object.entries(o).map(([k, v]) => `--${k}:${v}`).join(";");

  return `:root{${vars(light)}}\n.dark{${vars(dark)}}`;
}

// ---------- القراءة مع ذاكرة ----------
let cache: { at: number; branding: Branding; landing: LandingContent } | null = null;
const TTL_MS = 60_000;

/** دمج سطحي مع الافتراضي كي لا تنكسر الصفحة لو نقص حقل. */
function merge<T>(base: T, override: unknown): T {
  if (!override || typeof override !== "object") return base;
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(override as Record<string, unknown>)) {
    if (v === undefined || v === null) continue;
    const b = (base as Record<string, unknown>)[k];
    out[k] = b && typeof b === "object" && !Array.isArray(b) ? merge(b, v) : v;
  }
  return out as T;
}

export async function getBranding(): Promise<{ branding: Branding; landing: LandingContent }> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  try {
    const rows = await sql<{ key: string; value: unknown }[]>`
      select key, value from app_settings where key = any(${[BRANDING_KEY, LANDING_KEY]})`;
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const result = {
      at: Date.now(),
      branding: merge(DEFAULT_BRANDING, byKey[BRANDING_KEY]),
      landing: merge(DEFAULT_LANDING, byKey[LANDING_KEY]),
    };
    cache = result;
    return result;
  } catch {
    // القاعدة متعذّرة لحظياً — الصفحة العامة تظهر بالافتراضي بدل أن تنهار
    return { branding: DEFAULT_BRANDING, landing: DEFAULT_LANDING };
  }
}

/** يُستدعى من إجراءات الحفظ كي يظهر التغيير فوراً. */
export function invalidateBrandingCache(): void {
  cache = null;
}
