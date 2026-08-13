import React, { useState } from 'react';
import { ProjectDefinition } from '@/types/project';

export interface ProjectGalleryProps {
  project: ProjectDefinition;
  className?: string;
}

export const ProjectGallery: React.FC<ProjectGalleryProps> = ({ project, className = '' }) => {
  const allImages = [
    project.imageUrl || project.thumbnail,
    ...(project.images || []),
    ...(project.screenshots || []),
  ].filter(Boolean) as string[];

  // Deduplicate image URLs
  const uniqueImages = Array.from(new Set(allImages));
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeImage = uniqueImages[selectedIndex] || project.thumbnail || '/placeholder-project.svg';

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Image Container */}
      <div className="relative aspect-video bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-900 rounded-3xl overflow-hidden border border-gray-200/80 dark:border-gray-700/80 shadow-sm flex items-center justify-center group">
        {activeImage.startsWith('/') && !activeImage.includes('placeholder') ? (
          <img
            src={activeImage}
            alt={project.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-3">
            <span className="text-7xl transition-transform duration-300 group-hover:scale-110">
              {project.icon || '🚀'}
            </span>
            <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {project.title} Preview
            </span>
          </div>
        )}

        {/* Level & Category Floating Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          <span className="px-3 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-full text-xs font-bold text-gray-900 dark:text-white shadow-sm border border-gray-200/50 dark:border-gray-700/50">
            {project.category}
          </span>
          <span className="px-3 py-1 bg-primary-600/90 text-white backdrop-blur-md rounded-full text-xs font-bold shadow-sm capitalize">
            {project.level}
          </span>
        </div>

        {/* Price Tag Overlay */}
        <div className="absolute bottom-4 right-4 bg-gray-900/90 text-white backdrop-blur-md px-4 py-2 rounded-xl text-base font-extrabold shadow-md border border-gray-700/50">
          ₹{project.price.toLocaleString('en-IN')} {project.currency}
        </div>
      </div>

      {/* Thumbnails Row */}
      {uniqueImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 hide-scrollbar">
          {uniqueImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                selectedIndex === idx
                  ? 'border-primary-600 scale-105 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-100'
              }`}
            >
              {img.startsWith('/') && !img.includes('placeholder') ? (
                <img src={img} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-lg">
                  {project.icon || '🖼️'}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectGallery;
