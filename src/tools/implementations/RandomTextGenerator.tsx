import React, { useState } from 'react';
import ToolShell from '../components/ToolShell';
import ToolHeader from '../components/ToolHeader';
import ToolOutput from '../components/ToolOutput';
import ToolControls from '../components/ToolControls';
import Button from '@/components/ui/Button';
import { useToolState } from '../hooks/useToolState';
import { ToolComponentProps } from '@/types/tool';

const loremWords = [
  'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
  'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
  'magna', 'aliqua', 'ut', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
  'exercitation', 'ullamco', 'laboris', 'nisi', 'ut', 'aliquip', 'ex', 'ea',
  'commodo', 'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'in',
  'voluptate', 'velit', 'esse', 'cillum', 'dolore', 'eu', 'fugiat', 'nulla',
  'pariatur', 'excepteur', 'sint', 'occaecat', 'cupidatat', 'non', 'proident',
  'sunt', 'in', 'culpa', 'qui', 'officia', 'deserunt', 'mollit', 'anim', 'id', 'est', 'laborum'
];

export const RandomTextGenerator: React.FC<ToolComponentProps> = ({ tool }) => {
  const [count, setCount] = useState<number>(3);
  const [unit, setUnit] = useState<'paragraphs' | 'sentences' | 'words'>('paragraphs');

  const generateText = (cnt = count, type = unit) => {
    if (type === 'words') {
      const words: string[] = [];
      for (let i = 0; i < cnt; i++) {
        words.push(loremWords[i % loremWords.length]);
      }
      return words.join(' ');
    }

    if (type === 'sentences') {
      const sentences: string[] = [];
      for (let i = 0; i < cnt; i++) {
        const sentenceLength = 6 + (i % 6);
        const sentenceWords: string[] = [];
        for (let j = 0; j < sentenceLength; j++) {
          sentenceWords.push(loremWords[(i * 7 + j) % loremWords.length]);
        }
        const str = sentenceWords.join(' ');
        sentences.push(str.charAt(0).toUpperCase() + str.slice(1) + '.');
      }
      return sentences.join(' ');
    }

    // paragraphs
    const paragraphs: string[] = [];
    for (let p = 0; p < cnt; p++) {
      const sentenceCount = 4 + (p % 3);
      const sentences: string[] = [];
      for (let s = 0; s < sentenceCount; s++) {
        const wCount = 7 + ((p + s) % 5);
        const wList: string[] = [];
        for (let w = 0; w < wCount; w++) {
          wList.push(loremWords[(p * 13 + s * 7 + w) % loremWords.length]);
        }
        const str = wList.join(' ');
        sentences.push(str.charAt(0).toUpperCase() + str.slice(1) + '.');
      }
      paragraphs.push(sentences.join(' '));
    }
    return paragraphs.join('\n\n');
  };

  const initialGenerated = generateText(3, 'paragraphs');

  const {
    output,
    setOutput,
    error,
    copied,
    copyToClipboard,
    reset,
  } = useToolState({
    initialOutput: initialGenerated,
  });

  const handleGenerate = () => {
    setOutput(generateText(count, unit));
  };

  return (
    <ToolShell>
      <ToolHeader tool={tool} />

      <div className="p-5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Count:</label>
          <input
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-20 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Type:</label>
          <select
            value={unit}
            onChange={e => setUnit(e.target.value as 'paragraphs' | 'sentences' | 'words')}
            className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="paragraphs">Paragraphs</option>
            <option value="sentences">Sentences</option>
            <option value="words">Words</option>
          </select>
        </div>

        <ToolControls className="pt-0">
          <Button variant="primary" size="sm" onClick={handleGenerate}>
            Generate Text
          </Button>
        </ToolControls>
      </div>

      <ToolOutput
        label="Generated Text"
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

export default RandomTextGenerator;
