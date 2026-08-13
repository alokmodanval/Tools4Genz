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

/**
 * Integration type for a tool.
 * - native: tool implementation bundled inside Tools4Genz
 * - external-url: tool deployed at an external URL (opened in a new tab, never iframed)
 * - embedded: approved external app rendered inside a sandboxed iframe (opt-in, allowEmbed)
 * - worker-api: tool logic runs on a Tools4Genz Cloudflare Worker / API
 * - external-api: tool backed by an external API (adapter/architecture only; no secrets in frontend)
 */
export type ToolIntegrationType =
  | 'native'
  | 'external-url'
  | 'embedded'
  | 'worker-api'
  | 'external-api';

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
  /**
   * Integration strategy used to resolve/render this tool at runtime.
   * Defaults to 'native' when absent (preserves legacy registry behavior).
   */
  integration?: ToolIntegrationType;
  /**
   * Strongly-typed integration configuration, keyed by integration type.
   * Kept separate from metadata so the resolver can map cleanly.
   */
  integrationConfig?: ToolIntegrationConfig;
  /**
   * Explicit opt-in flag required before an embedded iframe is rendered.
   * Embedded tools are disabled by default and never framed without this.
   */
  allowEmbed?: boolean;
  component?: React.LazyExoticComponent<React.ComponentType<ToolComponentProps>>;
}

/**
 * Strongly-typed integration configuration model.
 * Only the configuration relevant to the tool's integration type should be used.
 * IMPORTANT: Never place secrets / API keys in these frontend definitions.
 */
export type ToolIntegrationConfig =
  | NativeIntegrationConfig
  | ExternalUrlIntegrationConfig
  | EmbeddedIntegrationConfig
  | WorkerApiIntegrationConfig
  | ExternalApiIntegrationConfig;

/** Native tool: implementation lives inside Tools4Genz. */
export interface NativeIntegrationConfig {
  type: 'native';
  /** Optional hint for the admin UI / resolver. */
  componentKey?: string;
}

/** External URL tool: opened in a new tab (safe default — no iframe). */
export interface ExternalUrlIntegrationConfig {
  type: 'external-url';
  url: string;
  /** 'new-tab' is the safe default; iframe is never used for external-url. */
  openMode?: 'new-tab';
  /** Optional preview/thumbnail image shown on the tool page. */
  thumbnail?: string;
}

/** Embedded tool: opt-in sandboxed iframe (requires allowEmbed). */
export interface EmbeddedIntegrationConfig {
  type: 'embedded';
  url: string;
  /** Safe sandbox defaults. See EmbeddedAdapter for rationale. */
  sandbox?: string;
  /** Extra (only safe) iframe permissions allowed on top of defaults. */
  permissions?: string;
}

/** Worker API tool: logic runs on a Tools4Genz Cloudflare Worker / API. */
export interface WorkerApiIntegrationConfig {
  type: 'worker-api';
  /** Relative endpoint path (resolved against the configured worker origin). */
  endpoint: string;
  method?: 'GET' | 'POST';
  requestSchema?: Record<string, unknown>;
  responseSchema?: Record<string, unknown>;
}

/** External API tool: adapter architecture only. Secrets stay server-side. */
export interface ExternalApiIntegrationConfig {
  type: 'external-api';
  /** Stable endpoint identifier (not a raw secret-bearing URL). */
  endpointId: string;
  method?: 'GET' | 'POST';
  requestMapping?: Record<string, unknown>;
  responseMapping?: Record<string, unknown>;
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
