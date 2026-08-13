import React, { useState } from 'react';
import ToolShell from '../components/ToolShell';
import ToolHeader from '../components/ToolHeader';
import ToolInput from '../components/ToolInput';
import ToolOutput from '../components/ToolOutput';
import ToolControls from '../components/ToolControls';
import Button from '@/components/ui/Button';
import { useToolState } from '../hooks/useToolState';
import { ToolComponentProps } from '@/types/tool';

const defaultJson = `{\n  "title": "Tools4Genz",\n  "category": "developer-tools",\n  "version": 2.0,\n  "features": [\n    "Fast",\n    "Reliable",\n    "Client-Side"\n  ]\n}`;

export const JsonMinifier: React.FC<ToolComponentProps> = ({ tool }) => {
  const [savings, setSavings] = useState<{ rawBytes: number; minBytes: number; percent: number } | null>(null);

  const {
    input,
    setInput,
    output,
    setOutput,
    error,
    setError,
    copied,
    copyToClipboard,
    reset,
    clearInput,
  } = useToolState({
    initialInput: defaultJson,
    initialOutput: JSON.stringify(JSON.parse(defaultJson)),
  });

  const minifyJson = () => {
    if (!input.trim()) {
      setError('Please enter JSON to minify.');
      setOutput('');
      setSavings(null);
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      const rawBytes = new Blob([input]).size;
      const minBytes = new Blob([minified]).size;
      const percent = rawBytes > 0 ? Math.round(((rawBytes - minBytes) / rawBytes) * 100) : 0;

      setOutput(minified);
      setSavings({ rawBytes, minBytes, percent: Math.max(0, percent) });
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON.';
      setError(`JSON Parse Error: ${msg}`);
      setOutput('');
      setSavings(null);
    }
  };

  return (
    <ToolShell>
      <ToolHeader tool={tool} />

      <ToolInput
        label="JSON to Minify"
        placeholder="Paste your formatted JSON here..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onClear={() => {
          clearInput();
          setOutput('');
          setSavings(null);
        }}
        rows={6}
      />

      <ToolControls>
        <Button variant="primary" onClick={minifyJson}>
          Minify JSON
        </Button>
      </ToolControls>

      {savings && !error && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex flex-wrap items-center justify-between text-xs sm:text-sm text-green-800 dark:text-green-300">
          <div>
            Original: <span className="font-bold">{savings.rawBytes} B</span> → Minified:{' '}
            <span className="font-bold">{savings.minBytes} B</span>
          </div>
          <div className="font-extrabold text-green-600 dark:text-green-400 text-base">
            Saved {savings.percent}% space
          </div>
        </div>
      )}

      <ToolOutput
        label="Minified JSON Output"
        output={output}
        error={error}
        copied={copied}
        onCopy={() => copyToClipboard()}
        onReset={() => {
          reset();
          setSavings(null);
        }}
        rows={5}
      />
    </ToolShell>
  );
};

export default JsonMinifier;
