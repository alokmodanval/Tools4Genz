import React from 'react';

export interface ToolInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  charCount?: number;
  wordCount?: number;
  onClear?: () => void;
  actions?: React.ReactNode;
}

export const ToolInput: React.FC<ToolInputProps> = ({
  label,
  helperText,
  charCount,
  wordCount,
  onClear,
  actions,
  value,
  onChange,
  placeholder,
  rows = 6,
  className = '',
  disabled,
  ...props
}) => {
  return (
    <div className={`flex flex-col space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        {label && (
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {label}
          </label>
        )}
        <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
          {charCount !== undefined && <span>Chars: {charCount}</span>}
          {wordCount !== undefined && <span>Words: {wordCount}</span>}
          {actions}
          {onClear && value && !disabled && (
            <button
              type="button"
              onClick={onClear}
              className="text-gray-400 hover:text-red-500 transition-colors font-medium cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm font-mono transition duration-150 disabled:opacity-60 resize-y"
        {...props}
      />
      {helperText && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
      )}
    </div>
  );
};

export default ToolInput;
