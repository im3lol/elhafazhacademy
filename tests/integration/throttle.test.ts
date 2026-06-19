import { describe, it, expect, afterAll } from "vitest";
import { sql } from "@/lib/db";
import { checkThrottle, recordFailure, clearThrottle } from "@/lib/auth/throttle";

const EMAIL = "vitest-throttle@test.local";

afterAll(async () => {
  await sql`delete from login_throttle where email = ${EMAIL}`;
  await sql.end({ timeout: 5 });
});

describe("login throttle", () => {
  it("لا يقفل قبل بلوغ الحد، ويقفل بعد ٥ محاولات", async () => {
    await clearThrottle(EMAIL);

    for (let i = 0; i < 4; i++) await recordFailure(EMAIL);
    expect((await checkThrottle(EMAIL)).locked).toBe(false);

    await recordFailure(EMAIL); // الخامسة → قفل
    const locked = await checkThrottle(EMAIL);
    expect(locked.locked).toBe(true);
    expect(locked.minutes).toBeGreaterThan(0);
  });

  it("clearThrottle يفكّ القفل", async () => {
    await clearThrottle(EMAIL);
    expect((await checkThrottle(EMAIL)).locked).toBe(false);
  });
});
