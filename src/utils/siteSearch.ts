import { projects } from '@/data/projects';

export function getSiteSearchDestination(rawQuery: string): string | null {
  const query = rawQuery.trim();
  if (!query) return null;
  const normalized = query.toLowerCase();
  const matchesProject = projects.some((project) =>
    [project.title, project.description, project.category, ...(project.technologies || project.technology || [])]
      .some((value) => String(value).toLowerCase().includes(normalized))
  );
  const path = matchesProject ? '/projects' : '/tools';
  return `${path}?search=${encodeURIComponent(query)}`;
}
