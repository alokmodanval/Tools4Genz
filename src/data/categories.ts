import { ToolCategoryInfo } from '../types/tool';
import { ProjectCategoryInfo } from '../types/project';

export const toolCategories: ToolCategoryInfo[] = [
  { id: 'ai-tools', name: 'AI Tools', icon: '🤖', count: 2 },
  { id: 'productivity', name: 'Productivity', icon: '⚡', count: 2 },
  { id: 'developer-tools', name: 'Developer Tools', icon: '👨‍💻', count: 2 },
  { id: 'student-tools', name: 'Student Tools', icon: '🎓', count: 2 },
  { id: 'business-tools', name: 'Business Tools', icon: '💼', count: 2 },
  { id: 'image-tools', name: 'Image Tools', icon: '🖼️', count: 2 },
  { id: 'writing-tools', name: 'Writing Tools', icon: '✍️', count: 2 },
  { id: 'utility-tools', name: 'Utility Tools', icon: '🛠️', count: 2 },
];

export const projectCategories: ProjectCategoryInfo[] = [
  { id: 'final-year', name: 'Final Year Projects', icon: '🎓', count: 2 },
  { id: 'mini-projects', name: 'Mini Projects', icon: '🚀', count: 2 },
  { id: 'web-projects', name: 'Web Projects', icon: '🌐', count: 2 },
  { id: 'ai-projects', name: 'AI/ML Projects', icon: '🧠', count: 2 },
  { id: 'python-projects', name: 'Python Projects', icon: '🐍', count: 1 },
  { id: 'java-projects', name: 'Java Projects', icon: '☕', count: 1 },
  { id: 'react-projects', name: 'React Projects', icon: '⚛️', count: 1 },
  { id: 'software-projects', name: 'Software Projects', icon: '💻', count: 1 },
];
