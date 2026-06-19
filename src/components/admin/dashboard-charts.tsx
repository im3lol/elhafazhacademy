// رسوم بيانية خفيفة بالكامل (HTML/CSS) — بلا مكتبات، تدعم الوضع الداكن وRTL.

type Bar = { label: string; value: number };

/** مخطط أعمدة رأسي (إيرادات / حصص). */
export function BarChart({
  data,
  format,
  barClassName = "bg-brand",
}: {
  data: Bar[];
  format?: (n: number) => string;
  barClassName?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const fmt = format ?? ((n: number) => n.toLocaleString("ar-EG"));
  return (
    <div className="flex h-44 items-end gap-2">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={`${d.label}-${i}`} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] font-medium tabular-nums text-muted">
              {d.value > 0 ? fmt(d.value) : ""}
            </span>
            <div className="flex h-full w-full items-end" title={fmt(d.value)}>
              <div
                className={`w-full rounded-t-md transition-all ${barClassName}`}
                style={{ height: `${Math.max(pct, d.value > 0 ? 4 : 0)}%` }}
              />
            </div>
            <span className="text-[11px] text-muted">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** مخطط خطّي (اتجاه الدرجات عبر الزمن) — قيم 0..max. */
export function LineChart({ data, max = 100 }: { data: { value: number }[]; max?: number }) {
  if (data.length < 2) return null;
  const W = 100;
  const H = 100;
  const n = data.length;
  const x = (i: number) => (i / (n - 1)) * W;
  const y = (v: number) => H - (Math.min(Math.max(v, 0), max) / max) * H;
  const line = data.map((d, i) => `${x(i).toFixed(2)},${y(d.value).toFixed(2)}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-40 w-full" role="img">
      <polygon points={area} className="fill-brand/10" />
      <polyline
        points={line}
        fill="none"
        className="stroke-brand"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

type StatusRow = { label: string; value: number; barClassName: string };

/** أشرطة أفقية لتوزيع نِسَب (حالات الطلاب). */
export function StatusBars({ data }: { data: StatusRow[] }) {
  const total = Math.max(1, data.reduce((s, d) => s + d.value, 0));
  return (
    <div className="space-y-3">
      {data.map((d) => {
        const pct = Math.round((d.value / total) * 100);
        return (
          <div key={d.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-foreground">{d.label}</span>
              <span className="tabular-nums text-muted">
                {d.value.toLocaleString("ar-EG")} ({pct.toLocaleString("ar-EG")}٪)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
              <div className={`h-full rounded-full ${d.barClassName}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
