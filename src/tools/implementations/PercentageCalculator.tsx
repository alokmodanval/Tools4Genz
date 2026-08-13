import React, { useState, useMemo } from 'react';
import ToolShell from '../components/ToolShell';
import ToolHeader from '../components/ToolHeader';
import { ToolComponentProps } from '@/types/tool';

export const PercentageCalculator: React.FC<ToolComponentProps> = ({ tool }) => {
  // Mode 1: What is X% of Y?
  const [val1X, setVal1X] = useState<string>('15');
  const [val1Y, setVal1Y] = useState<string>('200');

  // Mode 2: X is what % of Y?
  const [val2X, setVal2X] = useState<string>('45');
  const [val2Y, setVal2Y] = useState<string>('150');

  // Mode 3: % Change from X to Y
  const [val3X, setVal3X] = useState<string>('80');
  const [val3Y, setVal3Y] = useState<string>('100');

  const res1 = useMemo(() => {
    const x = parseFloat(val1X);
    const y = parseFloat(val1Y);
    if (isNaN(x) || isNaN(y)) return null;
    return ((x / 100) * y).toFixed(2);
  }, [val1X, val1Y]);

  const res2 = useMemo(() => {
    const x = parseFloat(val2X);
    const y = parseFloat(val2Y);
    if (isNaN(x) || isNaN(y) || y === 0) return null;
    return ((x / y) * 100).toFixed(2);
  }, [val2X, val2Y]);

  const res3 = useMemo(() => {
    const x = parseFloat(val3X);
    const y = parseFloat(val3Y);
    if (isNaN(x) || isNaN(y) || x === 0) return null;
    const diff = y - x;
    const pct = (diff / Math.abs(x)) * 100;
    return {
      diff: diff.toFixed(2),
      pct: pct.toFixed(2),
      type: diff >= 0 ? 'Increase' : 'Decrease',
    };
  }, [val3X, val3Y]);

  return (
    <ToolShell>
      <ToolHeader tool={tool} />

      <div className="space-y-6">
        {/* Mode 1 */}
        <div className="p-5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            1. What is X% of Y?
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>What is</span>
            <input
              type="number"
              value={val1X}
              onChange={e => setVal1X(e.target.value)}
              className="w-24 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-primary-500"
            />
            <span>% of</span>
            <input
              type="number"
              value={val1Y}
              onChange={e => setVal1Y(e.target.value)}
              className="w-28 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-primary-500"
            />
            <span>=</span>
            <span className="font-extrabold text-lg text-primary-600 dark:text-primary-400">
              {res1 !== null ? res1 : '—'}
            </span>
          </div>
        </div>

        {/* Mode 2 */}
        <div className="p-5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            2. X is what % of Y?
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <input
              type="number"
              value={val2X}
              onChange={e => setVal2X(e.target.value)}
              className="w-24 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-primary-500"
            />
            <span>is what % of</span>
            <input
              type="number"
              value={val2Y}
              onChange={e => setVal2Y(e.target.value)}
              className="w-28 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-primary-500"
            />
            <span>=</span>
            <span className="font-extrabold text-lg text-primary-600 dark:text-primary-400">
              {res2 !== null ? `${res2}%` : '—'}
            </span>
          </div>
        </div>

        {/* Mode 3 */}
        <div className="p-5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            3. Percentage Increase / Decrease from X to Y
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>From</span>
            <input
              type="number"
              value={val3X}
              onChange={e => setVal3X(e.target.value)}
              className="w-24 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-primary-500"
            />
            <span>to</span>
            <input
              type="number"
              value={val3Y}
              onChange={e => setVal3Y(e.target.value)}
              className="w-28 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-primary-500"
            />
            <span>=</span>
            <span className="font-extrabold text-lg text-primary-600 dark:text-primary-400">
              {res3 !== null ? `${res3.pct}% (${res3.type})` : '—'}
            </span>
          </div>
        </div>
      </div>
    </ToolShell>
  );
};

export default PercentageCalculator;
