
export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  if (!items.length) return null;
  return (
    <nav className="bc-nav" aria-label="breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="bc-item">
          {i > 0 && <span className="bc-sep" aria-hidden="true">›</span>}
          {item.href ? (
            <a href={item.href} className="bc-link">{item.label}</a>
          ) : (
            <span className="bc-current" aria-current="page">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
