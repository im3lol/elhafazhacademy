/**
 * عناصر عرض للصفحات القانونية — مشتركة بين الخصوصية والشروط
 * كي يبقى الترقيم والتباعد واحداً بلا تكرار الأصناف في كل قسم.
 */

export function LegalHeader({
  title,
  academy,
  updated,
}: {
  title: string;
  academy: string;
  updated: string;
}) {
  return (
    <div className="border-b border-border pb-6">
      <h1 className="font-display text-3xl font-black sm:text-4xl">{title}</h1>
      <p className="mt-2 leading-relaxed text-muted">
        تسري هذه الوثيقة على منصة <span className="font-medium text-foreground">{academy}</span> وجميع
        خدماتها.
      </p>
      <p className="mt-1 text-sm text-muted">آخر تحديث: {updated}</p>
    </div>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl font-bold">
        <span className="text-brand">{n.toLocaleString("ar-EG")}.</span> {title}
      </h2>
      <div className="mt-3 space-y-3 leading-relaxed text-muted">{children}</div>
    </section>
  );
}

export function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-2 pr-5 marker:text-brand">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border-r-4 border-brand bg-surface p-4 text-sm leading-relaxed">
      {children}
    </div>
  );
}
