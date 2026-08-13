import React from 'react';
import { useTranslation } from 'react-i18next';
import { Project } from '@/types/project';
import EmptyState from '@/components/ui/EmptyState';
import ProjectCard from './ProjectCard';

interface ProjectGridProps {
  projects: Project[];
}

const ProjectGrid: React.FC<ProjectGridProps> = ({ projects }) => {
  const { t } = useTranslation();

  if (!projects || projects.length === 0) {
    return (
      <EmptyState 
        icon="📦"
        title={t('projects.empty.title')}
        description={t('projects.empty.description')}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
};

export default ProjectGrid;
