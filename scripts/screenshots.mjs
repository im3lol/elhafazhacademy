// لقطات شاشة للمنصة من حسابات العرض — للاستخدام في البوستات والعروض.
// يقود متصفح Edge/Chrome المثبّت على الجهاز (بلا تنزيل متصفح).
//
// التشغيل: node scripts/screenshots.mjs [https://your-domain]
// المخرجات: docs/marketing/screenshots/*.png
import { chromium } from "playwright-core";
import { mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const BASE = process.argv[2] ?? "https://elhafazah-academy.vercel.app";
// fileURLToPath لا غنى عنه: pathname يُبقي %20 مكان المسافة في مسار المشروع
const OUT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "docs",
  "marketing",
  "screenshots",
);
mkdirSync(OUT, { recursive: true });

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const executablePath = existsSync(CHROME) ? CHROME : EDGE;

const ACCOUNTS = {
  admin: { email: "admin@elhafazah.test", password: "admin1234" },
  teacher: { email: "m.abdulrahman@demo.elhafazah", password: "demo1234" },
  student: { email: "s.omar@demo.elhafazah", password: "demo1234" },
};

// اللقطات: [الحساب, المسار, اسم الملف, وصف, انتظار إضافي بالمللي ثانية]
const SHOTS = [
  ["none", "/", "01-landing", "الصفحة الرئيسية", 1500],
  ["teacher", "/teacher/dashboard", "02-teacher-dashboard", "لوحة المعلم + تنبيه الطلاب المتعثرين", 1200],
  ["teacher", "/teacher/students", "03-teacher-students", "قائمة طلاب المعلم", 800],
  ["teacher", "/teacher/availability", "04-teacher-availability", "أوقات التوفّر والقوالب الأسبوعية", 800],
  ["teacher", "/teacher/finance", "05-teacher-finance", "مستحقات المعلم", 800],
  ["student", "/student/mushaf", "06-student-mushaf", "المصحف التفاعلي بخط المصحف", 4000],
  ["student", "/student/progress", "07-student-progress", "خريطة الحفظ والأوسمة", 1200],
  ["student", "/student/lessons", "08-student-lessons", "تقارير الحصص والتقييمات", 1000],
  ["student", "/student/mistakes", "09-student-mistakes", "ملاحظات المعلم على الكلمات", 1200],
  ["student", "/student/booking", "10-student-booking", "الحجز الذاتي من أوقات المعلم", 800],
  ["admin", "/admin/dashboard", "11-admin-dashboard", "لوحة الإدارة والرسوم البيانية", 1200],
  ["admin", "/admin/students", "12-admin-students", "إدارة الطلاب + إضافة طالب", 800],
  ["admin", "/admin/teachers", "13-admin-teachers", "إدارة المعلمين واعتمادهم", 800],
  ["admin", "/admin/finance", "14-admin-finance", "المالية ومستحقات المعلمين", 1000],
  ["admin", "/admin/payments", "15-admin-payments", "مراجعة إثباتات الدفع", 800],
  ["admin", "/admin/roles", "16-admin-roles", "الأدوار ومصفوفة الصلاحيات", 1000],
];

const browser = await chromium.launch({ executablePath, headless: true });

async function contextFor(role) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // لقطات عالية الدقة تصلح للنشر
    locale: "ar-EG",
  });
  if (role === "none") return ctx;

  const { email, password } = ACCOUNTS[role];
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 60000 }),
    page.click('button[type="submit"]'),
  ]);
  await page.close();
  return ctx;
}

const contexts = {};
let ok = 0;
for (const [role, route, name, label, wait] of SHOTS) {
  try {
    if (!contexts[role]) contexts[role] = await contextFor(role);
    const page = await contexts[role].newPage();
    await page.goto(BASE + route, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(wait);
    const file = path.join(OUT, `${name}.png`);
    await page.screenshot({ path: file, fullPage: route === "/" });
    await page.close();
    ok++;
    console.log(`✔ ${name}.png — ${label}`);
  } catch (e) {
    console.log(`✘ ${name} — ${e.message.split("\n")[0]}`);
  }
}

for (const c of Object.values(contexts)) await c.close();
await browser.close();
console.log(`\nتمّ ${ok}/${SHOTS.length} لقطة في docs/marketing/screenshots/`);
