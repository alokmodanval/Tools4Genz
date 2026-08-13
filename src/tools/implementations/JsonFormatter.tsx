import React, { useState } from 'react';
import ToolShell from '../components/ToolShell';
import ToolHeader from '../components/ToolHeader';
import ToolInput from '../components/ToolInput';
import ToolOutput from '../components/ToolOutput';
import ToolControls from '../components/ToolControls';
import Button from '@/components/ui/Button';
import { useToolState } from '../hooks/useToolState';
import { ToolComponentProps } from '@/types/tool';

const defaultJson = '{"name":"Tools4Genz","type":"Platform","tools":["JSON Formatter","Word Counter","Unit Converter"],"status":"active","metrics":{"activeUsers":5000,"rating":4.9}}';

export const JsonFormatter: React.FC<ToolComponentProps> = ({ tool }) => {
  const [indentSpace, setIndentSpace] = useState<number>(2);

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
    initialOutput: JSON.stringify(JSON.parse(defaultJson), null, 2),
  });

  const formatJson = (spaces = indentSpace) => {
    if (!input.trim()) {
      setError('Please enter JSON text to format.');
      setOutput('');
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, spaces);
      setOutput(formatted);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid JSON format.';
      setError(`JSON Parse Error: ${msg}`);
      setOutput('');
    }
  };

  return (
    <ToolShell>
      <ToolHeader tool={tool} />

      <ToolInput
        label="Raw JSON Input"
        placeholder="Paste your JSON here..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onClear={() => {
          clearInput();
          setOutput('');
        }}
        rows={6}
      />

      <ToolControls>
        <Button variant="primary" onClick={() => formatJson(indentSpace)}>
          Format JSON
        </Button>
        <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
          <span>Indent:</span>
          <button
            type="button"
            onClick={() => {
              setIndentSpace(2);
              if (input) formatJson(2);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              indentSpace === 2
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            }`}
          >
            2 Spaces
          </button>
          <button
            type="button"
            onClick={() => {
              setIndentSpace(4);
              if (input) formatJson(4);
            }}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
              indentSpace === 4
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            }`}
          >
            4 Spaces
          </button>
        </div>
      </ToolControls>

      <ToolOutput
        label="Formatted JSON Result"
        output={output}
        error={error}
        copied={copied}
        onCopy={() => copyToClipboard()}
        onReset={reset}
        rows={8}
      />
    </ToolShell>
  );
};

export default JsonFormatter;
