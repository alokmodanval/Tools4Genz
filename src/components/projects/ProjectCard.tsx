import React from 'react';
import { useTranslation } from 'react-i18next';
import { ProjectDefinition } from '@/types/project';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface ProjectCardProps {
  project: ProjectDefinition;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project }) => {
  const { t } = useTranslation();

  const isComingSoon = project.status === 'coming-soon';
  const isUnavailable = project.status === 'unavailable';
  const techs = project.technologies || project.technology || [];

  return (
    <Card 
      variant="elevated" 
      className="flex flex-col h-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-gray-900/50 !p-0"
    >
      <div className="relative h-48 bg-gradient-to-br from-indigo-100 via-blue-50 to-purple-100 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center border-b border-gray-100 dark:border-gray-700/50">
        <span className="text-6xl transition-transform duration-300 hover:scale-110">{project.icon || '🚀'}</span>
        
        {/* Floating Price Tag */}
        <div className="absolute top-3 right-3">
          <Badge variant="primary" className="shadow-md text-xs sm:text-sm font-extrabold px-3 py-1 bg-primary-600 text-white dark:bg-primary-500">
            ₹{project.price.toLocaleString('en-IN')}
          </Badge>
        </div>

        {/* Level Tag */}
        <div className="absolute top-3 left-3">
          <Badge 
            variant={
              project.level === 'beginner' ? 'success' : 
              project.level === 'intermediate' ? 'warning' : 'accent'
            } 
            size="sm"
            className="capitalize font-semibold shadow-xs"
          >
            {project.level}
          </Badge>
        </div>
      </div>
      
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex justify-between items-center mb-3">
          <Badge variant="outline" size="sm" className="font-semibold">
            {project.category}
          </Badge>
          {isComingSoon && (
            <Badge variant="warning" size="sm">Coming Soon</Badge>
          )}
          {project.status === 'beta' && (
            <Badge variant="accent" size="sm">Beta</Badge>
          )}
        </div>

        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
          {project.title}
        </h3>
        
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2 flex-grow">
          {project.shortDescription || project.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-6">
          {techs.slice(0, 3).map((tech: string, index: number) => (
            <Badge key={index} variant="default" size="sm">
              {tech}
            </Badge>
          ))}
          {techs.length > 3 && (
            <Badge variant="default" size="sm">
              +{techs.length - 3}
            </Badge>
          )}
        </div>

        <div className="mt-auto">
          {isComingSoon || isUnavailable ? (
            <Button variant="outline" className="w-full opacity-60 cursor-not-allowed" disabled>
              {isComingSoon ? t('common.coming_soon', 'Coming Soon') : 'Unavailable'}
            </Button>
          ) : (
            <Button variant="primary" className="w-full" href={`/projects/${project.slug}`}>
              {t('projects.view_project', 'View Project')}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ProjectCard;
