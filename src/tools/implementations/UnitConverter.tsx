import React, { useState, useMemo } from 'react';
import ToolShell from '../components/ToolShell';
import ToolHeader from '../components/ToolHeader';
import { ToolComponentProps } from '@/types/tool';

type CategoryType = 'length' | 'weight' | 'temperature' | 'digital';

const unitCategories: Record<CategoryType, { name: string; units: Record<string, number | ((val: number, to: string) => number)> }> = {
  length: {
    name: 'Length',
    units: {
      meter: 1,
      kilometer: 1000,
      centimeter: 0.01,
      millimeter: 0.001,
      mile: 1609.344,
      foot: 0.3048,
      inch: 0.0254,
    },
  },
  weight: {
    name: 'Weight',
    units: {
      kilogram: 1,
      gram: 0.001,
      milligram: 0.000001,
      pound: 0.45359237,
      ounce: 0.028349523125,
    },
  },
  temperature: {
    name: 'Temperature',
    units: {
      celsius: 1,
      fahrenheit: 1,
      kelvin: 1,
    },
  },
  digital: {
    name: 'Digital Storage',
    units: {
      byte: 1,
      kilobyte: 1024,
      megabyte: 1048576,
      gigabyte: 1073741824,
      terabyte: 1099511627776,
    },
  },
};

export const UnitConverter: React.FC<ToolComponentProps> = ({ tool }) => {
  const [category, setCategory] = useState<CategoryType>('length');
  const [val, setVal] = useState<string>('10');
  const [fromUnit, setFromUnit] = useState<string>('meter');
  const [toUnit, setToUnit] = useState<string>('foot');

  const convertedValue = useMemo(() => {
    const num = parseFloat(val);
    if (isNaN(num)) return '—';

    if (category === 'temperature') {
      let celsius = num;
      if (fromUnit === 'fahrenheit') celsius = (num - 32) * (5 / 9);
      if (fromUnit === 'kelvin') celsius = num - 273.15;

      let result = celsius;
      if (toUnit === 'fahrenheit') result = celsius * (9 / 5) + 32;
      if (toUnit === 'kelvin') result = celsius + 273.15;
      return result.toFixed(2);
    }

    const units = unitCategories[category].units as Record<string, number>;
    const baseValue = num * (units[fromUnit] || 1);
    const result = baseValue / (units[toUnit] || 1);

    if (Math.abs(result) < 0.0001 && result !== 0) {
      return result.toExponential(4);
    }
    return Number.isInteger(result) ? result.toString() : result.toFixed(4);
  }, [category, val, fromUnit, toUnit]);

  const handleCategoryChange = (newCat: CategoryType) => {
    setCategory(newCat);
    const unitKeys = Object.keys(unitCategories[newCat].units);
    setFromUnit(unitKeys[0]);
    setToUnit(unitKeys[1] || unitKeys[0]);
  };

  return (
    <ToolShell>
      <ToolHeader tool={tool} />

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
        {(Object.keys(unitCategories) as CategoryType[]).map(catKey => (
          <button
            key={catKey}
            type="button"
            onClick={() => handleCategoryChange(catKey)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              category === catKey
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {unitCategories[catKey].name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-200 dark:border-gray-700">
        {/* From */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">From:</label>
          <input
            type="number"
            value={val}
            onChange={e => setVal(e.target.value)}
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-mono focus:ring-2 focus:ring-primary-500"
          />
          <select
            value={fromUnit}
            onChange={e => setFromUnit(e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm capitalize focus:ring-2 focus:ring-primary-500"
          >
            {Object.keys(unitCategories[category].units).map(u => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {/* To */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">To:</label>
          <div className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-mono text-lg font-bold min-h-[44px] flex items-center">
            {convertedValue}
          </div>
          <select
            value={toUnit}
            onChange={e => setToUnit(e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white text-sm capitalize focus:ring-2 focus:ring-primary-500"
          >
            {Object.keys(unitCategories[category].units).map(u => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      </div>
    </ToolShell>
  );
};

export default UnitConverter;
