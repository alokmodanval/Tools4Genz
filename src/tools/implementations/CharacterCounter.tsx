import React, { useMemo } from 'react';
import ToolShell from '../components/ToolShell';
import ToolHeader from '../components/ToolHeader';
import ToolInput from '../components/ToolInput';
import { useToolState } from '../hooks/useToolState';
import { ToolComponentProps } from '@/types/tool';

export const CharacterCounter: React.FC<ToolComponentProps> = ({ tool }) => {
  const { input, setInput, clearInput } = useToolState({
    initialInput: 'Create engaging content for social media and check character limits easily.',
  });

  const stats = useMemo(() => {
    const total = input.length;
    const letters = (input.match(/[a-zA-Z]/g) || []).length;
    const digits = (input.match(/[0-9]/g) || []).length;
    const spaces = (input.match(/\s/g) || []).length;
    const symbols = total - letters - digits - spaces;

    const twitterLimit = 280;
    const instagramLimit = 2200;
    const linkedinLimit = 3000;

    return {
      total,
      letters,
      digits,
      spaces,
      symbols,
      twitterPercent: Math.min(Math.round((total / twitterLimit) * 100), 100),
      twitterRemaining: twitterLimit - total,
      instagramPercent: Math.min(Math.round((total / instagramLimit) * 100), 100),
      instagramRemaining: instagramLimit - total,
      linkedinPercent: Math.min(Math.round((total / linkedinLimit) * 100), 100),
      linkedinRemaining: linkedinLimit - total,
    };
  }, [input]);

  return (
    <ToolShell>
      <ToolHeader tool={tool} />

      <ToolInput
        label="Input Text"
        placeholder="Type or paste your text here to count characters..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onClear={clearInput}
        rows={6}
      />

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-primary-50 dark:bg-primary-900/20 p-3 rounded-xl text-center border border-primary-100 dark:border-primary-800/40">
          <span className="block text-2xl font-bold text-primary-600 dark:text-primary-400">
            {stats.total}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Total Chars</span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/40 p-3 rounded-xl text-center border border-gray-100 dark:border-gray-700">
          <span className="block text-2xl font-bold text-gray-900 dark:text-white">
            {stats.letters}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Letters</span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/40 p-3 rounded-xl text-center border border-gray-100 dark:border-gray-700">
          <span className="block text-2xl font-bold text-gray-900 dark:text-white">
            {stats.digits}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Digits</span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/40 p-3 rounded-xl text-center border border-gray-100 dark:border-gray-700">
          <span className="block text-2xl font-bold text-gray-900 dark:text-white">
            {stats.spaces}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Spaces</span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/40 p-3 rounded-xl text-center border border-gray-100 dark:border-gray-700 col-span-2 sm:col-span-1">
          <span className="block text-2xl font-bold text-gray-900 dark:text-white">
            {stats.symbols}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">Symbols</span>
        </div>
      </div>

      <div className="space-y-4 pt-2">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Social Media Limits
        </h4>
        
        {/* Twitter */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-gray-700 dark:text-gray-300">X (Twitter) Limit (280)</span>
            <span className={stats.twitterRemaining < 0 ? 'text-red-500 font-bold' : 'text-gray-500'}>
              {stats.twitterRemaining < 0 ? `${Math.abs(stats.twitterRemaining)} chars over limit!` : `${stats.twitterRemaining} left`}
            </span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${stats.twitterRemaining < 0 ? 'bg-red-500' : 'bg-sky-500'}`}
              style={{ width: `${stats.twitterPercent}%` }}
            />
          </div>
        </div>

        {/* Instagram */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-gray-700 dark:text-gray-300">Instagram Caption (2,200)</span>
            <span className="text-gray-500">{stats.instagramRemaining} left</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-pink-500 transition-all duration-300"
              style={{ width: `${stats.instagramPercent}%` }}
            />
          </div>
        </div>

        {/* LinkedIn */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="font-medium text-gray-700 dark:text-gray-300">LinkedIn Post (3,000)</span>
            <span className="text-gray-500">{stats.linkedinRemaining} left</span>
          </div>
          <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${stats.linkedinPercent}%` }}
            />
          </div>
        </div>
      </div>
    </ToolShell>
  );
};

export default CharacterCounter;
