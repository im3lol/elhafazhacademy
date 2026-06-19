import { describe, it, expect } from "vitest";
import { splitSchedule, type ScheduleRow } from "@/components/dashboard/class-schedule";

function row(p: Partial<ScheduleRow> & { id: string }): ScheduleRow {
  return {
    start_time: new Date().toISOString(),
    status: "scheduled",
    meet_link: null,
    other_name: "x",
    overall_score: null,
    ...p,
  };
}

const HOUR = 3600_000;

describe("splitSchedule", () => {
  it("يضع الحصص النشطة المستقبلية في القادمة والباقي في السابقة", () => {
    const now = Date.now();
    const rows = [
      row({ id: "future-active", status: "meet_created", start_time: new Date(now + 24 * HOUR).toISOString() }),
      row({ id: "past-completed", status: "completed", start_time: new Date(now - 24 * HOUR).toISOString() }),
      row({ id: "future-cancelled", status: "cancelled", start_time: new Date(now + 24 * HOUR).toISOString() }),
    ];
    const { upcoming, past } = splitSchedule(rows);
    expect(upcoming.map((r) => r.id)).toEqual(["future-active"]);
    expect(past.map((r) => r.id).sort()).toEqual(["future-cancelled", "past-completed"]);
  });

  it("يرتّب القادمة تصاعدياً والسابقة تنازلياً", () => {
    const now = Date.now();
    const rows = [
      row({ id: "soon", status: "scheduled", start_time: new Date(now + 2 * HOUR).toISOString() }),
      row({ id: "later", status: "scheduled", start_time: new Date(now + 10 * HOUR).toISOString() }),
      row({ id: "old", status: "completed", start_time: new Date(now - 10 * HOUR).toISOString() }),
      row({ id: "recent", status: "completed", start_time: new Date(now - 2 * HOUR).toISOString() }),
    ];
    const { upcoming, past } = splitSchedule(rows);
    expect(upcoming.map((r) => r.id)).toEqual(["soon", "later"]);
    expect(past.map((r) => r.id)).toEqual(["recent", "old"]);
  });

  it("يبقي الحصة ضمن القادمة خلال مهلة الساعة بعد بدئها", () => {
    const rows = [row({ id: "just-started", status: "live", start_time: new Date(Date.now() - 30 * 60_000).toISOString() })];
    expect(splitSchedule(rows).upcoming.map((r) => r.id)).toEqual(["just-started"]);
  });
});
