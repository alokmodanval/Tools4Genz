import { ToolComponentProps } from '@/types/tool';

export type { ToolDefinition, ToolComponentProps, ToolCategory, ToolStatus, ToolType, ExecutionMode, ToolCapability } from '@/types/tool';

export interface ToolState<TInput = string, TOutput = string> {
  input: TInput;
  output: TOutput;
  loading: boolean;
  error: string | null;
  copied: boolean;
}

export interface ToolExecutor<TInput = string, TOutput = string> {
  execute: (input: TInput) => Promise<TOutput> | TOutput;
  validate?: (input: TInput) => string | null;
}

export interface StandardToolProps extends ToolComponentProps {
  initialInput?: string;
}
