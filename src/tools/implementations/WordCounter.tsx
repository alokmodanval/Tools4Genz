import React, { useMemo } from 'react';
import ToolShell from '../components/ToolShell';
import ToolHeader from '../components/ToolHeader';
import ToolInput from '../components/ToolInput';
import { useToolState } from '../hooks/useToolState';
import { ToolComponentProps } from '@/types/tool';

export const WordCounter: React.FC<ToolComponentProps> = ({ tool }) => {
  const { input, setInput, clearInput } = useToolState({
    initialInput: 'Welcome to Tools4Genz! Paste or type your text here to count words, characters, sentences, paragraphs, and estimate reading time instantly.',
  });

  const stats = useMemo(() => {
    const text = input.trim();
    if (!text) {
      return {
        words: 0,
        charsWithSpaces: 0,
        charsNoSpaces: 0,
        sentences: 0,
        paragraphs: 0,
        readingTimeMinutes: 0,
        speakingTimeMinutes: 0,
        topWords: [] as { word: string; count: number }[],
      };
    }

    const words = text ? text.split(/\s+/).filter(Boolean) : [];
    const charsWithSpaces = input.length;
    const charsNoSpaces = input.replace(/\s/g, '').length;
    const sentences = text ? text.split(/[.!?]+/).filter(s => s.trim().length > 0).length : 0;
    const paragraphs = text ? text.split(/\n+/).filter(p => p.trim().length > 0).length : 0;
    const readingTimeMinutes = Math.ceil(words.length / 200);
    const speakingTimeMinutes = Math.ceil(words.length / 130);

    // Keyword frequency analysis
    const wordFreqMap = new Map<string, number>();
    words.forEach(w => {
      const cleanWord = w.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanWord.length > 2) {
        wordFreqMap.set(cleanWord, (wordFreqMap.get(cleanWord) || 0) + 1);
      }
    });

    const topWords = Array.from(wordFreqMap.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      words: words.length,
      charsWithSpaces,
      charsNoSpaces,
      sentences,
      paragraphs,
      readingTimeMinutes,
      speakingTimeMinutes,
      topWords,
    };
  }, [input]);

  return (
    <ToolShell>
      <ToolHeader tool={tool} />

      <ToolInput
        label="Input Text"
        placeholder="Type or paste text here..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onClear={clearInput}
        rows={8}
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl text-center border border-primary-100 dark:border-primary-800/40">
          <span className="block text-3xl font-extrabold text-primary-600 dark:text-primary-400">
            {stats.words}
          </span>
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Words
          </span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl text-center border border-gray-100 dark:border-gray-700">
          <span className="block text-3xl font-extrabold text-gray-900 dark:text-white">
            {stats.charsWithSpaces}
          </span>
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Characters
          </span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl text-center border border-gray-100 dark:border-gray-700">
          <span className="block text-3xl font-extrabold text-gray-900 dark:text-white">
            {stats.sentences}
          </span>
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Sentences
          </span>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl text-center border border-gray-100 dark:border-gray-700">
          <span className="block text-3xl font-extrabold text-gray-900 dark:text-white">
            {stats.paragraphs}
          </span>
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            Paragraphs
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        <div className="p-5 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Estimated Time
          </h4>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex justify-between">
              <span>Reading Time:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ~{stats.readingTimeMinutes} min
              </span>
            </div>
            <div className="flex justify-between">
              <span>Speaking Time:</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                ~{stats.speakingTimeMinutes} min
              </span>
            </div>
            <div className="flex justify-between">
              <span>Characters (no spaces):</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {stats.charsNoSpaces}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Top Keywords
          </h4>
          {stats.topWords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.topWords.map(item => (
                <span
                  key={item.word}
                  className="px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300"
                >
                  {item.word} <span className="text-primary-500 font-bold ml-1">({item.count})</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Enter longer text to see keyword density.</p>
          )}
        </div>
      </div>
    </ToolShell>
  );
};

export default WordCounter;
