export type ToolCategory =
  | 'ai-tools'
  | 'productivity'
  | 'developer-tools'
  | 'student-tools'
  | 'business-tools'
  | 'image-tools'
  | 'writing-tools'
  | 'utility-tools';

export type ToolStatus = 'active' | 'coming-soon' | 'beta' | 'disabled';

export type ToolType =
  | 'calculator'
  | 'generator'
  | 'converter'
  | 'formatter'
  | 'text'
  | 'image'
  | 'developer'
  | 'ai'
  | 'utility';

export type ExecutionMode = 'client' | 'api' | 'worker' | 'external';

export type ToolCapability =
  | 'text-input'
  | 'image-upload'
  | 'file-upload'
  | 'api-required'
  | 'ai-required'
  | 'download-output'
  | 'copy-output'
  | 'streaming'
  | 'batch-processing';

export interface ToolSEO {
  title?: string;
  description?: string;
  keywords?: string[];
}

export interface ToolDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription?: string;
  category: ToolCategory;
  subcategory?: string;
  icon: string;
  tags: string[];
  featured: boolean;
  status: ToolStatus;
  toolType?: ToolType;
  executionMode?: ExecutionMode;
  capabilities?: ToolCapability[];
  features?: string[];
  useCases?: string[];
  seo?: ToolSEO;
  version?: string;
  url?: string;
  component?: React.LazyExoticComponent<React.ComponentType<ToolComponentProps>>;
}

export type Tool = ToolDefinition;

export interface ToolCategoryInfo {
  id: ToolCategory;
  name: string;
  icon: string;
  count: number;
}

export interface ToolComponentProps {
  tool: ToolDefinition;
}
