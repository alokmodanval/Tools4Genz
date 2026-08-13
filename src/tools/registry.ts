import { lazy } from 'react';
import { ToolDefinition } from '@/types/tool';

// Lazy load tool implementation components for performance and code splitting
const WordCounter = lazy(() => import('./implementations/WordCounter'));
const CharacterCounter = lazy(() => import('./implementations/CharacterCounter'));
const JsonFormatter = lazy(() => import('./implementations/JsonFormatter'));
const JsonMinifier = lazy(() => import('./implementations/JsonMinifier'));
const CaseConverter = lazy(() => import('./implementations/CaseConverter'));
const PercentageCalculator = lazy(() => import('./implementations/PercentageCalculator'));
const RandomTextGenerator = lazy(() => import('./implementations/RandomTextGenerator'));
const UnitConverter = lazy(() => import('./implementations/UnitConverter'));

export const toolRegistry: ToolDefinition[] = [
  // 1. Word Counter (Working Demo Tool)
  {
    id: 'word-counter',
    slug: 'word-counter',
    name: 'Word Counter',
    description: 'Count words, characters, sentences, paragraphs, and reading time instantly.',
    longDescription: 'A comprehensive text analysis tool that counts total words, characters (with and without spaces), sentences, paragraphs, and estimates reading and speaking times.',
    category: 'writing-tools',
    icon: '📊',
    tags: ['Word Counter', 'Text', 'Writing', 'Reading Time', 'Stats'],
    featured: true,
    status: 'active',
    toolType: 'text',
    executionMode: 'client',
    capabilities: ['text-input', 'copy-output'],
    component: WordCounter,
    features: [
      'Word and character counting',
      'Sentence & paragraph analysis',
      'Estimated reading & speaking time',
      'Keyword frequency density',
    ],
    useCases: ['Essay writing & editing', 'Blog post character check', 'Speech timing estimation'],
    seo: {
      title: 'Free Online Word Counter - Tools4Genz',
      description: 'Count words, characters, sentences, paragraphs, and estimate reading time online for free.',
      keywords: ['word counter', 'character count', 'text stats', 'reading time calculator'],
    },
  },

  // 2. Character Counter (Working Demo Tool)
  {
    id: 'character-counter',
    slug: 'character-counter',
    name: 'Character Counter',
    description: 'Count characters, letters, digits, and check social media limits.',
    longDescription: 'Detailed character analysis tool with built-in limit indicators for X (Twitter), Instagram captions, and LinkedIn posts.',
    category: 'writing-tools',
    icon: '🔤',
    tags: ['Character Counter', 'Social Media', 'Twitter', 'Instagram'],
    featured: false,
    status: 'active',
    toolType: 'text',
    executionMode: 'client',
    capabilities: ['text-input', 'copy-output'],
    component: CharacterCounter,
    features: [
      'Total character breakdown',
      'Letter, digit, symbol, space separation',
      'Real-time X (Twitter) limit progress bar (280 chars)',
      'Instagram and LinkedIn character count indicators',
    ],
    useCases: ['Social media post preparation', 'Ad text limit validation', 'Bio character checks'],
    seo: {
      title: 'Character Counter & Social Media Limit Checker - Tools4Genz',
      description: 'Check character counts for tweets, captions, and posts instantly.',
      keywords: ['character counter', 'twitter limit checker', 'instagram caption length'],
    },
  },

  // 3. JSON Formatter (Working Demo Tool)
  {
    id: 'json-formatter',
    slug: 'json-formatter',
    name: 'JSON Formatter & Prettifier',
    description: 'Prettify and format unformatted JSON strings with customizable indentation.',
    longDescription: 'Format raw JSON data into clean, readable structures with 2-space or 4-space indent options and syntax error diagnostics.',
    category: 'developer-tools',
    icon: '{"}"',
    tags: ['JSON', 'Formatter', 'Prettify', 'Developer', 'Code'],
    featured: true,
    status: 'active',
    toolType: 'formatter',
    executionMode: 'client',
    capabilities: ['text-input', 'copy-output'],
    component: JsonFormatter,
    features: [
      'Indentation control (2 or 4 spaces)',
      'Instant syntax validation and error reporting',
      'One-click copy formatted JSON',
      'Client-side processing (100% private)',
    ],
    useCases: ['Debugging API responses', 'Formatting JSON configuration files', 'Inspecting data payloads'],
    seo: {
      title: 'JSON Formatter & Prettifier - Tools4Genz',
      description: 'Format, validate, and prettify JSON code online with instant error reporting.',
      keywords: ['json formatter', 'json prettifier', 'json validator', 'format json'],
    },
  },

  // 4. JSON Minifier (Working Demo Tool)
  {
    id: 'json-minifier',
    slug: 'json-minifier',
    name: 'JSON Minifier',
    description: 'Compress and minify JSON data to reduce payload size.',
    longDescription: 'Remove whitespace, newlines, and indentation from JSON documents to optimize network bandwidth and storage.',
    category: 'developer-tools',
    icon: '⚡',
    tags: ['JSON', 'Minify', 'Compress', 'Developer'],
    featured: false,
    status: 'active',
    toolType: 'formatter',
    executionMode: 'client',
    capabilities: ['text-input', 'copy-output'],
    component: JsonMinifier,
    features: [
      'Instant JSON minification',
      'Calculates exact bytes saved',
      'Validates syntax before compressing',
      'Fast client-side execution',
    ],
    useCases: ['Minifying API payload data', 'Reducing config file size', 'Bandwidth optimization'],
    seo: {
      title: 'Online JSON Minifier - Tools4Genz',
      description: 'Minify and compact JSON code online to save bandwidth and storage.',
      keywords: ['json minifier', 'compress json', 'compact json'],
    },
  },

  // 5. Case Converter (Working Demo Tool)
  {
    id: 'case-converter',
    slug: 'case-converter',
    name: 'Text Case Converter',
    description: 'Convert text between UPPERCASE, lowercase, Title Case, camelCase, snake_case, etc.',
    longDescription: 'Easily convert text or code variable names between standard casing conventions including Title Case, camelCase, PascalCase, snake_case, kebab-case, and CONSTANT_CASE.',
    category: 'writing-tools',
    icon: '🔠',
    tags: ['Case Converter', 'Text', 'Capitalize', 'camelCase', 'snake_case'],
    featured: true,
    status: 'active',
    toolType: 'converter',
    executionMode: 'client',
    capabilities: ['text-input', 'copy-output'],
    component: CaseConverter,
    features: [
      '8 popular casing modes',
      'Programming variable case conversion (camelCase, snake_case)',
      'Instant conversion and copy',
    ],
    useCases: ['Formatting headlines', 'Converting code variable naming conventions', 'Cleaning raw text'],
    seo: {
      title: 'Text Case Converter Online - Tools4Genz',
      description: 'Convert text to UPPERCASE, lowercase, Title Case, camelCase, snake_case, and kebab-case.',
      keywords: ['case converter', 'uppercase converter', 'camelcase converter', 'snakecase converter'],
    },
  },

  // 6. Percentage Calculator (Working Demo Tool)
  {
    id: 'percentage-calculator',
    slug: 'percentage-calculator',
    name: 'Percentage Calculator',
    description: 'Calculate percentage of numbers, percentage change, and ratios.',
    longDescription: 'Simple multi-mode percentage calculator to solve common percentage problems: What is X% of Y, X is what % of Y, and % increase or decrease from X to Y.',
    category: 'utility-tools',
    icon: '📊',
    tags: ['Percentage', 'Calculator', 'Math', 'Utility'],
    featured: false,
    status: 'active',
    toolType: 'calculator',
    executionMode: 'client',
    capabilities: ['text-input'],
    component: PercentageCalculator,
    features: [
      '3 distinct percentage calculation modes',
      'Real-time instant results',
      'Handles increase/decrease detection',
    ],
    useCases: ['Financial calculations', 'Discount calculation', 'Grade and score percentage calculation'],
    seo: {
      title: 'Percentage Calculator - Tools4Genz',
      description: 'Calculate percentages, percentage differences, and percentage increases online.',
      keywords: ['percentage calculator', 'calculate percentage', 'percent change calculator'],
    },
  },

  // 7. Random Text Generator (Working Demo Tool)
  {
    id: 'random-text-generator',
    slug: 'random-text-generator',
    name: 'Random Text / Lorem Ipsum Generator',
    description: 'Generate customizable Lorem Ipsum placeholder paragraphs, sentences, or words.',
    longDescription: 'Generate clean placeholder text for mockups, prototypes, UI designs, and layout testing with custom count controls.',
    category: 'utility-tools',
    icon: '🎲',
    tags: ['Lorem Ipsum', 'Text Generator', 'Placeholder', 'Design'],
    featured: false,
    status: 'active',
    toolType: 'generator',
    executionMode: 'client',
    capabilities: ['copy-output'],
    component: RandomTextGenerator,
    features: [
      'Generate by Paragraphs, Sentences, or Words',
      'Custom count control',
      'One-click copy to clipboard',
    ],
    useCases: ['UI mockup placeholder text', 'Website layout testing', 'Design wireframing'],
    seo: {
      title: 'Lorem Ipsum & Random Text Generator - Tools4Genz',
      description: 'Generate custom Lorem Ipsum text paragraphs and sentences for design mockups.',
      keywords: ['lorem ipsum generator', 'random text generator', 'dummy text generator'],
    },
  },

  // 8. Unit Converter (Working Demo Tool)
  {
    id: 'unit-converter',
    slug: 'unit-converter',
    name: 'Unit Converter',
    description: 'Convert units for Length, Weight, Temperature, and Digital Storage.',
    longDescription: 'Multi-category unit conversion tool supporting metric and imperial measurements for length, weight, temperature, and digital data sizes.',
    category: 'utility-tools',
    icon: '⚖️',
    tags: ['Unit', 'Convert', 'Length', 'Weight', 'Temperature', 'Storage'],
    featured: true,
    status: 'active',
    toolType: 'converter',
    executionMode: 'client',
    capabilities: ['text-input'],
    component: UnitConverter,
    features: [
      '4 measurement categories',
      'Metric & Imperial length and weight units',
      'Celsius, Fahrenheit, and Kelvin temperature conversions',
      'Bytes to Terabytes digital storage converter',
    ],
    useCases: ['Academic homework unit conversion', 'International size/weight conversion', 'Data size estimation'],
    seo: {
      title: 'Free Online Unit Converter - Tools4Genz',
      description: 'Convert units of length, weight, temperature, and digital storage online.',
      keywords: ['unit converter', 'length converter', 'temperature converter', 'weight converter'],
    },
  },

  // --- CATALOG / COMING-SOON / BETA TOOLS ---
  {
    id: 'ai-text-summarizer',
    slug: 'ai-text-summarizer',
    name: 'AI Text Summarizer',
    description: 'Summarize long articles and documents instantly using AI.',
    category: 'ai-tools',
    icon: '🤖',
    tags: ['AI', 'Text', 'Summary'],
    featured: true,
    status: 'beta',
    toolType: 'ai',
    executionMode: 'api',
  },
  {
    id: 'ai-image-generator',
    slug: 'ai-image-generator',
    name: 'AI Image Generator',
    description: 'Create beautiful images from text descriptions.',
    category: 'ai-tools',
    icon: '🖼️',
    tags: ['AI', 'Image', 'Generation'],
    featured: false,
    status: 'coming-soon',
    toolType: 'ai',
    executionMode: 'api',
  },
  {
    id: 'study-planner',
    slug: 'study-planner',
    name: 'Study Planner',
    description: 'Organize your study schedule efficiently.',
    category: 'productivity',
    icon: '📅',
    tags: ['Study', 'Plan', 'Time Management'],
    featured: true,
    status: 'active',
    toolType: 'utility',
    executionMode: 'client',
  },
  {
    id: 'task-manager',
    slug: 'task-manager',
    name: 'Task Manager',
    description: 'Simple and effective task management for daily use.',
    category: 'productivity',
    icon: '✅',
    tags: ['Task', 'Management'],
    featured: false,
    status: 'active',
    toolType: 'utility',
    executionMode: 'client',
  },
  {
    id: 'code-formatter',
    slug: 'code-formatter',
    name: 'Code Formatter',
    description: 'Format your code in various languages instantly.',
    category: 'developer-tools',
    icon: '👨‍💻',
    tags: ['Code', 'Format', 'Developer'],
    featured: true,
    status: 'active',
    toolType: 'formatter',
    executionMode: 'client',
  },
  {
    id: 'api-tester',
    slug: 'api-tester',
    name: 'API Tester',
    description: 'Test your REST APIs quickly in the browser.',
    category: 'developer-tools',
    icon: '🔌',
    tags: ['API', 'Test', 'Developer'],
    featured: false,
    status: 'beta',
    toolType: 'developer',
    executionMode: 'client',
  },
  {
    id: 'gpa-calculator',
    slug: 'gpa-calculator',
    name: 'GPA Calculator',
    description: 'Calculate your semester and cumulative GPA easily.',
    category: 'student-tools',
    icon: '🎓',
    tags: ['GPA', 'Student', 'Calculator'],
    featured: false,
    status: 'active',
    toolType: 'calculator',
    executionMode: 'client',
  },
  {
    id: 'resume-builder',
    slug: 'resume-builder',
    name: 'Resume Builder',
    description: 'Build professional resumes in minutes.',
    category: 'student-tools',
    icon: '📄',
    tags: ['Resume', 'Career', 'Student'],
    featured: true,
    status: 'active',
    toolType: 'generator',
    executionMode: 'client',
  },
  {
    id: 'invoice-generator',
    slug: 'invoice-generator',
    name: 'Invoice Generator',
    description: 'Generate professional invoices for your business.',
    category: 'business-tools',
    icon: '💰',
    tags: ['Invoice', 'Business', 'Finance'],
    featured: false,
    status: 'active',
    toolType: 'generator',
    executionMode: 'client',
  },
  {
    id: 'business-name-generator',
    slug: 'business-name-generator',
    name: 'Business Name Generator',
    description: 'Generate catchy names for your next startup.',
    category: 'business-tools',
    icon: '🏢',
    tags: ['Business', 'Name', 'Startup'],
    featured: false,
    status: 'active',
    toolType: 'generator',
    executionMode: 'client',
  },
  {
    id: 'image-compressor',
    slug: 'image-compressor',
    name: 'Image Compressor',
    description: 'Compress images without losing quality.',
    category: 'image-tools',
    icon: '🗜️',
    tags: ['Image', 'Compress', 'Optimize'],
    featured: false,
    status: 'active',
    toolType: 'image',
    executionMode: 'client',
  },
  {
    id: 'color-palette-generator',
    slug: 'color-palette-generator',
    name: 'Color Palette Generator',
    description: 'Generate beautiful color palettes for your designs.',
    category: 'image-tools',
    icon: '🎨',
    tags: ['Color', 'Design', 'Palette'],
    featured: false,
    status: 'active',
    toolType: 'generator',
    executionMode: 'client',
  },
  {
    id: 'markdown-editor',
    slug: 'markdown-editor',
    name: 'Markdown Editor',
    description: 'Write and preview Markdown in real-time.',
    category: 'writing-tools',
    icon: '📝',
    tags: ['Markdown', 'Editor', 'Writing'],
    featured: false,
    status: 'active',
    toolType: 'text',
    executionMode: 'client',
  },
  {
    id: 'grammar-checker',
    slug: 'grammar-checker',
    name: 'Grammar Checker',
    description: 'Check and fix grammar errors in your text.',
    category: 'writing-tools',
    icon: '✔️',
    tags: ['Grammar', 'Writing', 'Check'],
    featured: false,
    status: 'beta',
    toolType: 'text',
    executionMode: 'api',
  },

  // --- PHASE 6.5 — DEMO INTEGRATION TYPES ---
  // Safe, self-contained examples. No real third-party products are connected.
  // These demonstrate the universal integration system without external claims.

  // 1. External URL tool (safe demo — opens in a new tab, never iframed)
  {
    id: 'demo-external',
    slug: 'demo-external',
    name: 'Demo External Tool',
    description: 'A demo tool hosted at an external URL. Opens safely in a new tab.',
    longDescription: 'This demonstrates the external-url integration type. The tool page shows metadata and an "Open Tool" CTA that navigates to the external site in a new tab. External sites are never embedded in an iframe by default.',
    category: 'utility-tools',
    icon: '🔗',
    tags: ['Demo', 'External', 'Integration'],
    featured: false,
    status: 'active',
    toolType: 'utility',
    executionMode: 'external',
    integration: 'external-url',
    integrationConfig: {
      type: 'external-url',
      url: 'https://example.com',
      openMode: 'new-tab',
    },
    features: ['Safe new-tab navigation', 'Metadata + SEO page on Tools4Genz', 'No iframe by default'],
    useCases: ['Showcasing standalone deployed tools', 'Linking to existing projects'],
    seo: {
      title: 'Demo External Tool - Tools4Genz',
      description: 'A safe demo of the external URL tool integration type.',
      keywords: ['external tool', 'demo', 'integration'],
    },
  },

  // 2. Embedded tool (opt-in sandboxed iframe — allowEmbed required)
  {
    id: 'demo-embedded',
    slug: 'demo-embedded',
    name: 'Demo Embedded App',
    description: 'A demo embedded web app rendered in a sandboxed iframe.',
    longDescription: 'This demonstrates the embedded integration type. The app is rendered inside a sandboxed iframe with restrictive defaults. Embedding is opt-in via allowEmbed and falls back to an external-open CTA if the site blocks framing.',
    category: 'utility-tools',
    icon: '🖼️',
    tags: ['Demo', 'Embedded', 'Iframe'],
    featured: false,
    status: 'active',
    toolType: 'utility',
    executionMode: 'external',
    integration: 'embedded',
    allowEmbed: true,
    integrationConfig: {
      type: 'embedded',
      url: 'https://example.com',
      sandbox: 'allow-scripts allow-same-origin',
    },
    features: ['Sandboxed iframe (restrictive defaults)', 'Loading state', 'External-open fallback'],
    useCases: ['Embedding approved internal apps', 'Responsive embedded tools'],
    seo: {
      title: 'Demo Embedded App - Tools4Genz',
      description: 'A safe demo of the embedded tool integration type with sandboxed iframe.',
      keywords: ['embedded tool', 'iframe', 'demo'],
    },
  },

  // 3. Worker API tool (calls a Tools4Genz worker endpoint — mock/local)
  {
    id: 'demo-worker-api',
    slug: 'demo-worker-api',
    name: 'Demo Worker API Tool',
    description: 'A demo tool powered by a Cloudflare Worker API endpoint.',
    longDescription: 'This demonstrates the worker-api integration type. The tool UI sends a JSON request to a Tools4Genz worker endpoint and renders the JSON response. No secrets are stored in the frontend.',
    category: 'developer-tools',
    icon: '⚙️',
    tags: ['Demo', 'Worker', 'API'],
    featured: false,
    status: 'active',
    toolType: 'developer',
    executionMode: 'worker',
    integration: 'worker-api',
    integrationConfig: {
      type: 'worker-api',
      endpoint: '/api/demo-worker',
      method: 'POST',
      requestSchema: { input: 'string' },
      responseSchema: { result: 'string' },
    },
    features: ['JSON request/response', 'Loading & error states', 'Server-side logic (no secrets in browser)'],
    useCases: ['Tools whose logic runs on Cloudflare Workers', 'API-powered utilities'],
    seo: {
      title: 'Demo Worker API Tool - Tools4Genz',
      description: 'A safe demo of the worker API tool integration type.',
      keywords: ['worker api', 'cloudflare worker', 'demo'],
    },
  },

  // 4. External API tool (adapter architecture only — no secrets)
  {
    id: 'demo-external-api',
    slug: 'demo-external-api',
    name: 'Demo External API Tool',
    description: 'A demo tool backed by an external API (adapter architecture).',
    longDescription: 'This demonstrates the external-api integration type. The adapter architecture is configured with a stable endpoint identifier. Live execution requires a server-side adapter (planned for a later phase). No API keys or secrets are exposed in the browser.',
    category: 'developer-tools',
    icon: '🔌',
    tags: ['Demo', 'External API', 'Adapter'],
    featured: false,
    status: 'active',
    toolType: 'developer',
    executionMode: 'api',
    integration: 'external-api',
    integrationConfig: {
      type: 'external-api',
      endpointId: 'demo-external-api',
      method: 'POST',
      requestMapping: { input: 'query' },
      responseMapping: { result: 'data' },
    },
    features: ['Adapter architecture only', 'No secrets in frontend', 'Server-side adapter planned'],
    useCases: ['Preparing for future external API integrations', 'Architecture demonstration'],
    seo: {
      title: 'Demo External API Tool - Tools4Genz',
      description: 'A safe demo of the external API tool integration type (adapter architecture).',
      keywords: ['external api', 'adapter', 'demo'],
    },
  },
];

// Registry Lookup Helpers
export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return toolRegistry.find(tool => tool.slug === slug);
}

export function getAllTools(): ToolDefinition[] {
  return toolRegistry;
}

export function getRelatedTools(tool: ToolDefinition, limit = 4): ToolDefinition[] {
  return toolRegistry
    .filter(t => t.id !== tool.id)
    .map(t => {
      let score = 0;
      if (t.category === tool.category) score += 5;
      if (t.toolType && tool.toolType && t.toolType === tool.toolType) score += 3;
      const commonTags = t.tags.filter(tag => tool.tags.includes(tag));
      score += commonTags.length * 2;
      return { tool: t, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.tool);
}

export function searchTools(
  toolsList: ToolDefinition[],
  query: string,
  category: string,
  sort: string = 'featured'
): ToolDefinition[] {
  let results = toolsList.filter(tool => {
    const matchesCategory = category === 'all' || tool.category === category;
    const q = query.trim().toLowerCase();
    const matchesSearch =
      !q ||
      tool.name.toLowerCase().includes(q) ||
      tool.description.toLowerCase().includes(q) ||
      (tool.longDescription && tool.longDescription.toLowerCase().includes(q)) ||
      tool.tags.some(tag => tag.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  switch (sort) {
    case 'name-asc':
      results = results.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      results = results.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'newest':
      results = results.sort((a, b) => (b.status === 'active' ? 1 : -1));
      break;
    case 'featured':
    default:
      results = results.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      break;
  }

  return results;
}
