import { useState, useCallback } from 'react';

export interface UseToolStateOptions<TInput = string, TOutput = string> {
  initialInput?: TInput;
  initialOutput?: TOutput;
  onExecute?: (input: TInput) => Promise<TOutput> | TOutput;
}

export function useToolState<TInput = string, TOutput = string>(options: UseToolStateOptions<TInput, TOutput> = {}) {
  const { initialInput = '' as unknown as TInput, initialOutput = '' as unknown as TOutput, onExecute } = options;

  const [input, setInput] = useState<TInput>(initialInput);
  const [output, setOutput] = useState<TOutput>(initialOutput);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const execute = useCallback(
    async (overrideInput?: TInput) => {
      const activeInput = overrideInput !== undefined ? overrideInput : input;
      if (!onExecute) return;
      
      setLoading(true);
      setError(null);

      try {
        const result = await onExecute(activeInput);
        setOutput(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [input, onExecute]
  );

  const copyToClipboard = useCallback(async (textToCopy?: string) => {
    const text = textToCopy !== undefined ? textToCopy : typeof output === 'string' ? output : JSON.stringify(output);
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard.');
    }
  }, [output]);

  const reset = useCallback(() => {
    setInput(initialInput);
    setOutput(initialOutput);
    setError(null);
    setLoading(false);
    setCopied(false);
  }, [initialInput, initialOutput]);

  const clearInput = useCallback(() => {
    setInput('' as unknown as TInput);
    setError(null);
  }, []);

  return {
    input,
    setInput,
    output,
    setOutput,
    loading,
    setLoading,
    error,
    setError,
    copied,
    execute,
    copyToClipboard,
    reset,
    clearInput,
  };
}
