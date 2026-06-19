import { sql } from "@/lib/db";

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

/** يفحص ما إذا كان البريد مقفولاً مؤقتاً. */
export async function checkThrottle(email: string): Promise<{ locked: boolean; minutes: number }> {
  const [row] = await sql<{ locked_until: string | null }[]>`
    select locked_until from login_throttle where email = ${email} limit 1`;
  if (row?.locked_until) {
    const ms = new Date(row.locked_until).getTime() - Date.now();
    if (ms > 0) return { locked: true, minutes: Math.ceil(ms / 60000) };
  }
  return { locked: false, minutes: 0 };
}

/** يسجّل محاولة فاشلة؛ يقفل البريد بعد تجاوز الحد. */
export async function recordFailure(email: string): Promise<void> {
  const [row] = await sql<{ fail_count: number }[]>`
    insert into login_throttle (email, fail_count, updated_at)
    values (${email}, 1, now())
    on conflict (email) do update set fail_count = login_throttle.fail_count + 1, updated_at = now()
    returning fail_count`;
  if (row && row.fail_count >= MAX_FAILS) {
    await sql`
      update login_throttle
      set locked_until = now() + ${`${LOCK_MINUTES} minutes`}::interval, fail_count = 0, updated_at = now()
      where email = ${email}`;
  }
}

/** يمسح سجل المحاولات عند نجاح الدخول. */
export async function clearThrottle(email: string): Promise<void> {
  await sql`delete from login_throttle where email = ${email}`;
}
