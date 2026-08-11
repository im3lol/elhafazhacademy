"use server";

import { revalidatePath } from "next/cache";
import { setSetting } from "@/lib/settings";
import { requirePermission } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { sniffMime } from "@/lib/files/sniff";
import {
  BRANDING_KEY,
  LANDING_KEY,
  DEFAULT_BRANDING,
  DEFAULT_LANDING,
  getBranding,
  invalidateBrandingCache,
  type Branding,
  type LandingContent,
} from "@/lib/branding";

export type BrandingState = { error?: string; success?: string };

const MAX_LOGO = 300 * 1024; // الشعار يُخزَّن داخل الإعداد كـ data URI
const LOGO_MIME = ["image/png", "image/webp", "image/jpeg", "image/svg+xml"];

async function ensure() {
  return requirePermission("settings.manage");
}

/** كل صفحة تعرض الهوية — لا بد من تحديث الصفحات المخزَّنة بعد أي حفظ. */
function refreshAll() {
  invalidateBrandingCache();
  revalidatePath("/", "layout");
}

const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);

/** يقرأ قائمة حقول متكرّرة: name[0], name[1] … */
function list(fd: FormData, prefix: string, fields: string[], max = 12) {
  const out: Record<string, string>[] = [];
  for (let i = 0; i < max; i++) {
    const row: Record<string, string> = {};
    let any = false;
    for (const f of fields) {
      const v = String(fd.get(`${prefix}[${i}].${f}`) ?? "").trim();
      row[f] = v;
      if (v) any = true;
    }
    if (any) out.push(row);
  }
  return out;
}

/** قائمة نصوص بسيطة مفصولة بأسطر. */
const lines = (fd: FormData, k: string, max = 12) =>
  String(fd.get(k) ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, max);

// ---------- الهوية: الاسم والشعار والألوان ----------
export async function saveIdentity(_prev: BrandingState, formData: FormData): Promise<BrandingState> {
  const admin = await ensure();
  const { branding } = await getBranding();

  const name = str(formData, "name", 60);
  if (name.length < 2) return { error: "اسم المنصة مطلوب" };

  const hex = (k: string, fallback: string) => {
    const v = str(formData, k, 9);
    return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fallback;
  };

  let logo = branding.logo;
  if (str(formData, "remove_logo") === "1") logo = "";

  const file = formData.get("logo") as File | null;
  if (file && file.size > 0) {
    if (file.size > MAX_LOGO) return { error: "حجم الشعار أكبر من ٣٠٠ كيلوبايت" };
    const buffer = Buffer.from(await file.arrayBuffer());
    // SVG نصّي لا تكشفه بصمة البايتات، فيُقبل بامتداده المعلن؛ وغيره يُفحص فعلياً
    const isSvg = file.type === "image/svg+xml";
    const mime = isSvg ? "image/svg+xml" : sniffMime(buffer);
    if (!mime || !LOGO_MIME.includes(mime)) {
      return { error: "صيغة الشعار غير مدعومة (PNG أو WEBP أو JPG أو SVG)" };
    }
    logo = `data:${mime};base64,${buffer.toString("base64")}`;
  }

  const next: Branding = {
    name,
    tagline: str(formData, "tagline", 120),
    fullName: str(formData, "fullName", 120) || name,
    description: str(formData, "description", 300) || DEFAULT_BRANDING.description,
    logo,
    brand: hex("brand", DEFAULT_BRANDING.brand),
    gold: hex("gold", DEFAULT_BRANDING.gold),
  };

  await setSetting(BRANDING_KEY, next);
  await logAudit(admin.id, "branding.identity", "settings", null, { name: next.name });
  refreshAll();
  return { success: "تم حفظ الهوية. حدّث الصفحة لرؤية الألوان الجديدة." };
}

/** يعيد الهوية للافتراضي. */
export async function resetIdentity(): Promise<void> {
  const admin = await ensure();
  await setSetting(BRANDING_KEY, DEFAULT_BRANDING);
  await logAudit(admin.id, "branding.identity_reset", "settings", null);
  refreshAll();
}

// ---------- محتوى الصفحة الرئيسية ----------
async function saveLanding(patch: Partial<LandingContent>, action: string) {
  const admin = await ensure();
  const { landing } = await getBranding();
  await setSetting(LANDING_KEY, { ...landing, ...patch });
  await logAudit(admin.id, action, "settings", null);
  refreshAll();
}

export async function saveHero(_prev: BrandingState, formData: FormData): Promise<BrandingState> {
  await saveLanding(
    {
      hero: {
        badge: str(formData, "badge", 120),
        title: str(formData, "title", 160),
        titleAccent: str(formData, "titleAccent", 160),
        description: str(formData, "description", 700),
        ctaPrimary: str(formData, "ctaPrimary", 40),
        ctaSecondary: str(formData, "ctaSecondary", 40),
        ratingValue: str(formData, "ratingValue", 20),
        ratingLabel: str(formData, "ratingLabel", 60),
      },
      stats: list(formData, "stats", ["value", "label"], 4).map((r) => ({
        value: r.value,
        label: r.label,
      })),
    },
    "branding.hero",
  );
  return { success: "تم حفظ القسم الرئيسي." };
}

export async function saveCards(_prev: BrandingState, formData: FormData): Promise<BrandingState> {
  const section = str(formData, "section", 20) as "why" | "steps" | "features";
  if (!["why", "steps", "features"].includes(section)) return { error: "قسم غير معروف" };
  const items = list(formData, "items", ["title", "desc"], 8).map((r) => ({
    title: r.title,
    desc: r.desc,
  }));
  await saveLanding(
    {
      [section]: {
        title: str(formData, "title", 120),
        subtitle: str(formData, "subtitle", 200),
        items,
      },
    } as Partial<LandingContent>,
    `branding.${section}`,
  );
  return { success: "تم حفظ القسم." };
}

export async function savePanels(_prev: BrandingState, formData: FormData): Promise<BrandingState> {
  await saveLanding(
    {
      parents: {
        title: str(formData, "parents_title", 120),
        desc: str(formData, "parents_desc", 400),
        items: lines(formData, "parents_items", 8),
      },
      teachers: {
        title: str(formData, "teachers_title", 120),
        desc: str(formData, "teachers_desc", 400),
        items: lines(formData, "teachers_items", 8),
      },
      packages: {
        title: str(formData, "packages_title", 120),
        subtitle: str(formData, "packages_subtitle", 200),
      },
    },
    "branding.panels",
  );
  return { success: "تم حفظ الأقسام." };
}

export async function saveTestimonials(_prev: BrandingState, formData: FormData): Promise<BrandingState> {
  await saveLanding(
    {
      testimonials: {
        title: str(formData, "title", 120),
        subtitle: str(formData, "subtitle", 200),
        items: list(formData, "items", ["quote", "name"], 6).map((r) => ({
          quote: r.quote,
          name: r.name,
        })),
      },
    },
    "branding.testimonials",
  );
  return { success: "تم حفظ آراء الطلاب." };
}

export async function saveFaq(_prev: BrandingState, formData: FormData): Promise<BrandingState> {
  await saveLanding(
    {
      faq: {
        title: str(formData, "title", 120),
        subtitle: str(formData, "subtitle", 200),
        items: list(formData, "items", ["q", "a"], 10).map((r) => ({ q: r.q, a: r.a })),
      },
    },
    "branding.faq",
  );
  return { success: "تم حفظ الأسئلة الشائعة." };
}

export async function saveFooter(_prev: BrandingState, formData: FormData): Promise<BrandingState> {
  await saveLanding(
    {
      finalCta: {
        title: str(formData, "cta_title", 160),
        desc: str(formData, "cta_desc", 400),
        ctaPrimary: str(formData, "cta_primary", 40),
        ctaSecondary: str(formData, "cta_secondary", 40),
      },
      footer: {
        about: str(formData, "about", 500),
        linksTitle: str(formData, "linksTitle", 60),
        links: lines(formData, "links", 8),
        programsTitle: str(formData, "programsTitle", 60),
        programs: lines(formData, "programs", 8),
        contactTitle: str(formData, "contactTitle", 60),
        phone: str(formData, "phone", 40),
        email: str(formData, "email", 80),
        address: str(formData, "address", 120),
        copyright: str(formData, "copyright", 200),
      },
    },
    "branding.footer",
  );
  return { success: "تم حفظ الخاتمة والفوتر." };
}

/** يعيد محتوى الصفحة الرئيسية للافتراضي. */
export async function resetLanding(): Promise<void> {
  const admin = await ensure();
  await setSetting(LANDING_KEY, DEFAULT_LANDING);
  await logAudit(admin.id, "branding.landing_reset", "settings", null);
  refreshAll();
}
