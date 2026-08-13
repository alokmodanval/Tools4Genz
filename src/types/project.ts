export type ProjectCategory =
  | 'final-year'
  | 'mini-projects'
  | 'web-projects'
  | 'ai-projects'
  | 'python-projects'
  | 'java-projects'
  | 'react-projects'
  | 'software-projects'
  | 'mobile-projects'
  | 'business-projects';

export type ProjectStatus = 'available' | 'coming-soon' | 'beta' | 'unavailable';
export type ProjectLevel = 'beginner' | 'intermediate' | 'advanced';

export interface ProjectSEO {
  title?: string;
  description?: string;
  keywords?: string[];
}

export interface ProjectDefinition {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription?: string;
  longDescription?: string;
  category: ProjectCategory;
  subcategory?: string;
  technology?: string[];
  technologies?: string[];
  programmingLanguages?: string[];
  framework?: string;
  database?: string;
  level: ProjectLevel;
  projectType?: string;
  price: number;
  currency: string;
  thumbnail: string;
  imageUrl?: string;
  images?: string[];
  icon?: string;
  screenshots?: string[];
  demoUrl?: string;
  githubUrl?: string;
  documentationUrl?: string;
  documentation?: string;
  features?: string[];
  requirements?: string[];
  includedItems?: string[];
  tags: string[];
  featured: boolean;
  status: ProjectStatus;
  createdAt?: string;
  updatedAt?: string;
  seo?: ProjectSEO;
}

export type Project = ProjectDefinition;

export interface ProjectCategoryInfo {
  id: ProjectCategory;
  name: string;
  icon: string;
  count: number;
}
