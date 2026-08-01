import { describe, it, expect } from "vitest";
import { activeSubscription } from "@/lib/finance/subscriptions";

/** منفّذ وهمي يعيد صفاً واحداً بأرقام الاشتراك (يحاكي postgres.js: الأعداد نصوص). */
const db = (row: Record<string, unknown> | null) => async () => (row ? [row] : []);

describe("activeSubscription", () => {
  it("يحسب المحجوز ضمن الرصيد لا المكتمل وحده", async () => {
    // باقة ٨ حصص: ٣ مكتملة + ٥ محجوزة = مستنفدة، رغم أن classes_used = ٣ فقط
    const sub = await activeSubscription(db({ id: "s1", classes_total: 8, classes_used: "3", pending: "5" }), "st1");
    expect(sub).toMatchObject({ total: 8, used: 3, pending: 5, exhausted: true });
  });

  it("يبقى الرصيد مفتوحاً ما دام المجموع دون السقف", async () => {
    const sub = await activeSubscription(db({ id: "s1", classes_total: 8, classes_used: "3", pending: "4" }), "st1");
    expect(sub?.exhausted).toBe(false);
  });

  it("classes_total = 0 يعني باقة بلا سقف حصص", async () => {
    const sub = await activeSubscription(db({ id: "s1", classes_total: 0, classes_used: "99", pending: "5" }), "st1");
    expect(sub?.exhausted).toBe(false);
  });

  it("لا اشتراك نشط → null (لا يمنع الحجز)", async () => {
    expect(await activeSubscription(db(null), "st1")).toBeNull();
  });
});
