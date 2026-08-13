import React from 'react';
import ToolShell from '../components/ToolShell';
import ToolHeader from '../components/ToolHeader';
import ToolInput from '../components/ToolInput';
import ToolOutput from '../components/ToolOutput';
import ToolControls from '../components/ToolControls';
import Button from '@/components/ui/Button';
import { useToolState } from '../hooks/useToolState';
import { ToolComponentProps } from '@/types/tool';

export const CaseConverter: React.FC<ToolComponentProps> = ({ tool }) => {
  const {
    input,
    setInput,
    output,
    setOutput,
    error,
    copied,
    copyToClipboard,
    reset,
    clearInput,
  } = useToolState({
    initialInput: 'hello world tools4genz text converter',
    initialOutput: 'HELLO WORLD TOOLS4GENZ TEXT CONVERTER',
  });

  const getWords = (str: string) => {
    return str
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  };

  const convertTo = (type: string) => {
    if (!input.trim()) {
      setOutput('');
      return;
    }
    const words = getWords(input);
    let result: string;

    switch (type) {
      case 'uppercase':
        result = input.toUpperCase();
        break;
      case 'lowercase':
        result = input.toLowerCase();
        break;
      case 'title':
        result = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        break;
      case 'camel':
        result = words
          .map((w, i) =>
            i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
          )
          .join('');
        break;
      case 'pascal':
        result = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
        break;
      case 'snake':
        result = words.map(w => w.toLowerCase()).join('_');
        break;
      case 'kebab':
        result = words.map(w => w.toLowerCase()).join('-');
        break;
      case 'constant':
        result = words.map(w => w.toUpperCase()).join('_');
        break;
      default:
        result = input;
    }
    setOutput(result);
  };

  return (
    <ToolShell>
      <ToolHeader tool={tool} />

      <ToolInput
        label="Input Text"
        placeholder="Enter text to convert case..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onClear={() => {
          clearInput();
          setOutput('');
        }}
        rows={5}
      />

      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
          Select Target Case
        </label>
        <ToolControls>
          <Button variant="primary" size="sm" onClick={() => convertTo('uppercase')}>
            UPPERCASE
          </Button>
          <Button variant="outline" size="sm" onClick={() => convertTo('lowercase')}>
            lowercase
          </Button>
          <Button variant="outline" size="sm" onClick={() => convertTo('title')}>
            Title Case
          </Button>
          <Button variant="outline" size="sm" onClick={() => convertTo('camel')}>
            camelCase
          </Button>
          <Button variant="outline" size="sm" onClick={() => convertTo('pascal')}>
            PascalCase
          </Button>
          <Button variant="outline" size="sm" onClick={() => convertTo('snake')}>
            snake_case
          </Button>
          <Button variant="outline" size="sm" onClick={() => convertTo('kebab')}>
            kebab-case
          </Button>
          <Button variant="outline" size="sm" onClick={() => convertTo('constant')}>
            CONSTANT_CASE
          </Button>
        </ToolControls>
      </div>

      <ToolOutput
        label="Converted Output"
        output={output}
        error={error}
        copied={copied}
        onCopy={() => copyToClipboard()}
        onReset={reset}
        rows={5}
      />
    </ToolShell>
  );
};

export default CaseConverter;
