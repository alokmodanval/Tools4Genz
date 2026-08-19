import { ToolDefinition } from '@/types/tool';

export type ToolAccessDecision = { allowed: boolean; reason: 'free' | 'premium-unavailable' | 'coming-soon' };

export function canAccessTool(tool: ToolDefinition): ToolAccessDecision {
  const tier = tool.accessTier || 'free';
  if (tier === 'free') return { allowed: true, reason: 'free' };
  if (tier === 'coming-soon') return { allowed: false, reason: 'coming-soon' };
  // No subscription or entitlement system is active in Phase 15.
  return { allowed: false, reason: 'premium-unavailable' };
}
