import React from 'react';
import { useTranslation } from 'react-i18next';
import { ToolCategory, ToolCategoryInfo } from '@/types/tool';

export interface ToolFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: ToolCategory | 'all';
  onCategoryChange: (category: ToolCategory | 'all') => void;
  categories: ToolCategoryInfo[];
  sortBy?: string;
  onSortChange?: (sort: string) => void;
}

const ToolFilters: React.FC<ToolFiltersProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  sortBy = 'featured',
  onSortChange,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col space-y-4 mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm transition-colors shadow-sm"
            placeholder={t('tools.search_placeholder', 'Search tools by name, description, or tags...')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Sort Selector */}
        {onSortChange && (
          <div className="w-full md:w-56 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors shadow-sm"
            >
              <option value="featured">{t('tools.sort_featured', 'Featured First')}</option>
              <option value="name-asc">{t('tools.sort_name_asc', 'Name A-Z')}</option>
              <option value="name-desc">{t('tools.sort_name_desc', 'Name Z-A')}</option>
              <option value="newest">{t('tools.sort_newest', 'Newest')}</option>
            </select>
          </div>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex overflow-x-auto pb-2 md:pb-0 gap-2 hide-scrollbar">
        <button
          onClick={() => onCategoryChange('all')}
          className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-primary-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
        >
          {t('tools.all_categories', 'All Categories')}
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
              selectedCategory === category.id
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <span>{category.icon}</span>
            {category.name || category.id}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ToolFilters;
