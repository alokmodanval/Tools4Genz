/**
 * Authoritative Server-Side Project Catalog
 *
 * Source of truth for project metadata and non-tamperable pricing in the Cloudflare Worker.
 * Prices are in INR (Indian Rupees).
 */

export interface AuthoritativeProject {
  id: string;
  slug: string;
  title: string;
  price: number;
  currency: string;
  status: 'available' | 'coming-soon' | 'beta' | 'unavailable';
}

export const AUTHORITATIVE_PROJECTS: AuthoritativeProject[] = [
  {
    id: 'ecommerce-platform',
    slug: 'ecommerce-platform',
    title: 'Full-Stack E-Commerce Platform',
    price: 4999,
    currency: 'INR',
    status: 'available',
  },
  {
    id: 'ml-sentiment-analyzer',
    slug: 'ml-sentiment-analyzer',
    title: 'AI Text Sentiment Analyzer',
    price: 3999,
    currency: 'INR',
    status: 'available',
  },
  {
    id: 'hospital-management',
    slug: 'hospital-management',
    title: 'Hospital Management System',
    price: 4500,
    currency: 'INR',
    status: 'available',
  },
  {
    id: 'chat-application',
    slug: 'chat-application',
    title: 'Real-Time Chat Application',
    price: 2999,
    currency: 'INR',
    status: 'available',
  },
  {
    id: 'task-manager-react',
    slug: 'task-manager-react',
    title: 'Kanban Task Manager App',
    price: 1999,
    currency: 'INR',
    status: 'available',
  },
  {
    id: 'ai-chatbot',
    slug: 'ai-chatbot',
    title: 'AI Conversational Assistant',
    price: 3499,
    currency: 'INR',
    status: 'available',
  },
  {
    id: 'student-result-system',
    slug: 'student-result-system',
    title: 'Student Result Management System',
    price: 2500,
    currency: 'INR',
    status: 'available',
  },
  {
    id: 'inventory-system',
    slug: 'inventory-system',
    title: 'Warehouse Inventory Management',
    price: 3200,
    currency: 'INR',
    status: 'available',
  },
  {
    id: 'library-management',
    slug: 'library-management',
    title: 'Library Management Desktop App',
    price: 2000,
    currency: 'INR',
    status: 'available',
  },
  {
    id: 'portfolio-website',
    slug: 'portfolio-website',
    title: 'Developer Portfolio Template',
    price: 499,
    currency: 'INR',
    status: 'available',
  },
  {
    id: 'blog-cms',
    slug: 'blog-cms',
    title: 'Modern Blog CMS Platform',
    price: 4200,
    currency: 'INR',
    status: 'available',
  },
  {
    id: 'weather-app',
    slug: 'weather-app',
    title: 'Live Weather Forecast App',
    price: 999,
    currency: 'INR',
    status: 'available',
  },
];

export function findAuthoritativeProject(idOrSlug: string): AuthoritativeProject | undefined {
  const query = idOrSlug.trim().toLowerCase();
  return AUTHORITATIVE_PROJECTS.find(
    (p) => p.id.toLowerCase() === query || p.slug.toLowerCase() === query
  );
}
