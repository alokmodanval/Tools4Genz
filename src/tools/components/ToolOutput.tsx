import React from 'react';
import Button from '@/components/ui/Button';

export interface ToolOutputProps {
  output: string;
  label?: string;
  error?: string | null;
  copied?: boolean;
  onCopy?: () => void;
  onReset?: () => void;
  onDownload?: () => void;
  rows?: number;
  readOnly?: boolean;
  className?: string;
}

export const ToolOutput: React.FC<ToolOutputProps> = ({
  output,
  label = 'Output',
  error,
  copied = false,
  onCopy,
  onReset,
  onDownload,
  rows = 6,
  className = '',
}) => {
  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          {label}
        </label>
        <div className="flex items-center space-x-2">
          {onCopy && output && !error && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCopy}
              className="text-xs"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </Button>
          )}
          {onDownload && output && !error && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onDownload}
              className="text-xs"
            >
              Download
            </Button>
          )}
          {onReset && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-xs text-gray-500"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm font-mono leading-relaxed">
          <span className="font-bold mr-2">Error:</span> {error}
        </div>
      ) : (
        <textarea
          value={output}
          readOnly
          rows={rows}
          placeholder="Output will appear here..."
          className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white text-sm font-mono leading-relaxed focus:outline-none resize-y"
        />
      )}
    </div>
  );
};

export default ToolOutput;
