import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-7 text-sm text-surface-500 dark:text-surface-400">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.href ? (
              <Link className="font-medium hover:text-primary-600 hover:underline dark:hover:text-primary-400" to={item.href}>
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-surface-700 dark:text-surface-200">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

