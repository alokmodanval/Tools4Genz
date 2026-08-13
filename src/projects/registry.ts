import { ProjectDefinition } from '@/types/project';

export const projectRegistry: ProjectDefinition[] = [
  {
    id: 'ecommerce-platform',
    slug: 'ecommerce-platform',
    title: 'Full-Stack E-Commerce Platform',
    description: 'A complete e-commerce web application with product catalog, shopping cart, user checkout, and order management.',
    shortDescription: 'Modern full-stack online store with cart, checkout, and admin order tracking.',
    longDescription: 'Full-Stack E-Commerce Platform is a production-grade web project built with React, Node.js, Express, and MongoDB. It features a responsive customer-facing shopfront, state-managed shopping cart, secure API endpoints, product search and filtering, and an intuitive dashboard for managing orders and inventory.',
    category: 'web-projects',
    subcategory: 'E-Commerce',
    technology: ['React', 'Node.js', 'Express', 'MongoDB', 'Tailwind CSS'],
    technologies: ['React', 'Node.js', 'Express', 'MongoDB', 'Tailwind CSS'],
    programmingLanguages: ['JavaScript', 'TypeScript'],
    framework: 'React + Express',
    database: 'MongoDB',
    level: 'advanced',
    projectType: 'Web Application',
    price: 4999,
    currency: 'INR',
    thumbnail: '/placeholder-project.svg',
    imageUrl: '/placeholder-project.svg',
    icon: '🛒',
    images: ['/placeholder-project.svg'],
    screenshots: ['/placeholder-project.svg'],
    demoUrl: 'https://demo.tools4genz.com/ecommerce',
    documentation: 'Complete PDF documentation, setup guide, and database ER diagram included.',
    features: [
      'Responsive customer storefront with dark/light mode',
      'Persistent cart state & product search filtering',
      'REST API architecture with Express & MongoDB',
      'Order placement, invoice generation & status management',
      'Comprehensive admin dashboard for stock management',
    ],
    requirements: ['Node.js v18+', 'MongoDB local or Atlas cluster', 'npm or yarn'],
    includedItems: [
      'Complete Source Code (Frontend & Backend)',
      'Database Schema Script & Seed Data',
      'Step-by-step Setup & Installation Guide (PDF)',
      'System Architecture & ER Diagrams',
      'PPT Presentation for Academic / Client Submission',
    ],
    tags: ['E-Commerce', 'Web', 'React', 'Node.js', 'Full Stack'],
    featured: true,
    status: 'available',
    createdAt: '2026-01-15',
    seo: {
      title: 'Full-Stack E-Commerce Platform Source Code - Tools4Genz',
      description: 'Buy complete E-Commerce project source code built with React, Node.js, Express, and MongoDB.',
      keywords: ['ecommerce project source code', 'react ecommerce project', 'full stack web project'],
    },
  },
  {
    id: 'ml-sentiment-analyzer',
    slug: 'ml-sentiment-analyzer',
    title: 'AI Text Sentiment Analyzer',
    description: 'Machine learning model and web interface for real-time natural language sentiment analysis.',
    shortDescription: 'NLP model classifying text sentiment into Positive, Negative, or Neutral with confidence scores.',
    longDescription: 'AI Text Sentiment Analyzer leverages Natural Language Processing (NLP) and Machine Learning algorithms (TF-IDF vectorization, Logistic Regression, Naive Bayes) wrapped inside a Flask web application. It processes customer reviews, tweets, or feedback to deliver real-time sentiment classifications.',
    category: 'ai-projects',
    subcategory: 'Machine Learning / NLP',
    technology: ['Python', 'Scikit-Learn', 'Flask', 'NLTK', 'HTML5/CSS3'],
    technologies: ['Python', 'Scikit-Learn', 'Flask', 'NLTK', 'HTML5/CSS3'],
    programmingLanguages: ['Python'],
    framework: 'Flask',
    database: 'SQLite',
    level: 'advanced',
    projectType: 'AI / Machine Learning',
    price: 3999,
    currency: 'INR',
    thumbnail: '/placeholder-project.svg',
    imageUrl: '/placeholder-project.svg',
    icon: '🤖',
    images: ['/placeholder-project.svg'],
    screenshots: ['/placeholder-project.svg'],
    demoUrl: 'https://demo.tools4genz.com/sentiment-analyzer',
    documentation: 'Includes Jupyter Notebook for model training, metrics evaluation, and Flask integration guide.',
    features: [
      'Pre-trained NLP classification model (92%+ accuracy)',
      'Interactive Flask web dashboard for real-time text testing',
      'Batch CSV file sentiment analysis support',
      'Graphical sentiment distribution charts',
      'Jupyter notebook with complete training pipeline',
    ],
    requirements: ['Python 3.9+', 'scikit-learn', 'flask', 'nltk', 'pandas'],
    includedItems: [
      'Full Python & Flask Source Code',
      'Trained ML Model Weights (.pkl)',
      'Jupyter Notebook for Model Retraining',
      'Sample Datasets for Testing',
      'Project Synopsis & Presentation Slides',
    ],
    tags: ['AI', 'ML', 'Python', 'NLP', 'Sentiment Analysis'],
    featured: true,
    status: 'available',
    createdAt: '2026-02-01',
    seo: {
      title: 'AI Sentiment Analyzer Machine Learning Project - Tools4Genz',
      description: 'Download Python ML sentiment analysis project with Flask backend and pre-trained model.',
      keywords: ['sentiment analysis python project', 'machine learning final year project', 'flask nlp project'],
    },
  },
  {
    id: 'hospital-management',
    slug: 'hospital-management',
    title: 'Hospital Management System',
    description: 'Enterprise hospital management software for patient registration, doctor appointments, and billing.',
    shortDescription: 'Robust Java Spring Boot system managing hospital patients, doctors, beds, and billing records.',
    longDescription: 'Hospital Management System is a comprehensive enterprise project built with Java Spring Boot, Hibernate, and MySQL. It manages patient records, doctor scheduling, ward room allocations, prescription history, and invoice billing with strict role-based authorization.',
    category: 'final-year',
    subcategory: 'Enterprise Systems',
    technology: ['Java', 'Spring Boot', 'Hibernate', 'MySQL', 'Thymeleaf'],
    technologies: ['Java', 'Spring Boot', 'Hibernate', 'MySQL', 'Thymeleaf'],
    programmingLanguages: ['Java'],
    framework: 'Spring Boot',
    database: 'MySQL',
    level: 'advanced',
    projectType: 'Final Year Project',
    price: 4500,
    currency: 'INR',
    thumbnail: '/placeholder-project.svg',
    imageUrl: '/placeholder-project.svg',
    icon: '🏥',
    images: ['/placeholder-project.svg'],
    screenshots: ['/placeholder-project.svg'],
    demoUrl: 'https://demo.tools4genz.com/hospital-management',
    documentation: 'Complete IEEE format documentation report, DFD diagrams, Class diagrams, and setup manual.',
    features: [
      'Multi-role access: Admin, Doctor, Patient, Receptionist',
      'Appointment scheduling & slot availability tracker',
      'Electronic Health Record (EHR) & prescription generator',
      'Automated billing & receipt printing',
      'MySQL database with relational integrity & triggers',
    ],
    requirements: ['JDK 17+', 'MySQL 8.0+', 'Maven 3.6+'],
    includedItems: [
      'Complete Java Spring Boot Source Code',
      'MySQL Database Export (.sql file)',
      'IEEE Format Final Year Project Report (.docx & .pdf)',
      'DFD Level 0, 1, 2 Diagrams & ER Diagrams',
      'Seminar Presentation PPT (30+ slides)',
    ],
    tags: ['Hospital', 'Management', 'Java', 'Spring Boot', 'Final Year'],
    featured: true,
    status: 'available',
    createdAt: '2026-01-20',
    seo: {
      title: 'Hospital Management System Java Spring Boot Project - Tools4Genz',
      description: 'Buy Java Spring Boot hospital management system source code with report and presentation.',
      keywords: ['hospital management project java', 'spring boot final year project', 'java mysql project'],
    },
  },
  {
    id: 'chat-application',
    slug: 'chat-application',
    title: 'Real-Time Chat Application',
    description: 'Instant messaging platform supporting private chat, group rooms, and real-time notifications.',
    shortDescription: 'WebSockets powered chat app with group rooms, typing indicators, and message history.',
    longDescription: 'Real-Time Chat Application uses WebSockets via Socket.io, React, and Node.js. Users can create custom rooms, send direct private messages, share text and code snippets, see live typing status, and view historical chat logs.',
    category: 'web-projects',
    subcategory: 'Real-Time Web',
    technology: ['Node.js', 'Socket.io', 'React', 'MongoDB'],
    technologies: ['Node.js', 'Socket.io', 'React', 'MongoDB'],
    programmingLanguages: ['JavaScript'],
    framework: 'React + Node.js',
    database: 'MongoDB',
    level: 'intermediate',
    projectType: 'Web Application',
    price: 2999,
    currency: 'INR',
    thumbnail: '/placeholder-project.svg',
    imageUrl: '/placeholder-project.svg',
    icon: '💬',
    images: ['/placeholder-project.svg'],
    screenshots: ['/placeholder-project.svg'],
    tags: ['Chat', 'Real-time', 'WebSockets', 'React', 'Node.js'],
    featured: false,
    status: 'available',
    createdAt: '2026-02-10',
    features: [
      'Instant WebSocket messaging using Socket.io',
      'Private 1-on-1 chat and public group channels',
      'Typing indicators & online status presence',
      'MongoDB chat history persistence',
    ],
    requirements: ['Node.js 18+', 'MongoDB'],
    includedItems: [
      'React & Node.js Source Code',
      'Socket.io Setup Documentation',
      'Installation & Deployment Guide',
    ],
  },
  {
    id: 'task-manager-react',
    slug: 'task-manager-react',
    title: 'Kanban Task Manager App',
    description: 'Interactive Kanban drag-and-drop task management tool for individuals and project teams.',
    shortDescription: 'Productivity board application with drag-and-drop columns, priority tags, and Firebase sync.',
    longDescription: 'Kanban Task Manager is a sleek React application utilizing HTML5 Drag and Drop APIs, Firebase Firestore real-time database, and Tailwind CSS. It enables users to create task cards, assign labels, track completion, and organize tasks across Todo, In Progress, and Completed columns.',
    category: 'react-projects',
    subcategory: 'Productivity',
    technology: ['React', 'TypeScript', 'Tailwind CSS', 'Firebase'],
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Firebase'],
    programmingLanguages: ['TypeScript'],
    framework: 'React (Vite)',
    database: 'Firebase Firestore',
    level: 'intermediate',
    projectType: 'React Project',
    price: 1999,
    currency: 'INR',
    thumbnail: '/placeholder-project.svg',
    imageUrl: '/placeholder-project.svg',
    icon: '✅',
    images: ['/placeholder-project.svg'],
    screenshots: ['/placeholder-project.svg'],
    tags: ['Task', 'Kanban', 'React', 'Firebase', 'TypeScript'],
    featured: true,
    status: 'available',
    createdAt: '2026-02-12',
    features: [
      'Interactive drag-and-drop columns',
      'Task labels, priority flags, and due date reminders',
      'Firebase authentication & real-time Firestore synchronization',
      'Mobile responsive design with dark mode',
    ],
    requirements: ['Node.js 18+', 'Free Firebase Account'],
    includedItems: [
      'Complete React + TypeScript Source Code',
      'Firebase Rules Configuration',
      'Setup Guide & Deployment Instructions',
    ],
  },
  {
    id: 'ai-chatbot',
    slug: 'ai-chatbot',
    title: 'AI Conversational Assistant',
    description: 'Smart AI chatbot web interface integrated with Natural Language Understanding.',
    shortDescription: 'Conversational assistant with context memory, custom intent response rules, and API integration.',
    longDescription: 'AI Conversational Assistant features a responsive chat UI built with React and a Python FastAPI backend that processes queries using intent classification or external LLM API endpoints. Includes customizable response fallbacks, session memory, and dark mode.',
    category: 'ai-projects',
    subcategory: 'AI / Chatbots',
    technology: ['Python', 'FastAPI', 'React', 'OpenAI/Gemini API'],
    technologies: ['Python', 'FastAPI', 'React', 'OpenAI/Gemini API'],
    programmingLanguages: ['Python', 'TypeScript'],
    framework: 'FastAPI + React',
    database: 'SQLite',
    level: 'advanced',
    projectType: 'AI Project',
    price: 3499,
    currency: 'INR',
    thumbnail: '/placeholder-project.svg',
    imageUrl: '/placeholder-project.svg',
    icon: '🤖',
    images: ['/placeholder-project.svg'],
    screenshots: ['/placeholder-project.svg'],
    tags: ['AI', 'Chatbot', 'Python', 'FastAPI', 'React'],
    featured: false,
    status: 'available',
    createdAt: '2026-02-05',
    features: [
      'Real-time streaming response UI',
      'Customizable system prompts and fallback rules',
      'FastAPI async backend execution',
      'Session history persistence',
    ],
    requirements: ['Python 3.10+', 'Node.js 18+'],
    includedItems: [
      'Frontend React App & FastAPI Backend Source Code',
      'API Key setup guide & configuration samples',
      'Documentation PDF',
    ],
  },
  {
    id: 'student-result-system',
    slug: 'student-result-system',
    title: 'Student Result Management System',
    description: 'Web-based portal for academic result publishing, student transcript generation, and grade calculation.',
    shortDescription: 'PHP & MySQL web portal for school/college result management and report card exports.',
    longDescription: 'Student Result Management System provides an easy-to-use web portal where teachers can upload subject marks and students can instantly query their semester results using their roll number. Includes automated GPA calculation, pass/fail status, and PDF report card downloads.',
    category: 'final-year',
    subcategory: 'Education Software',
    technology: ['PHP', 'MySQL', 'Bootstrap 5', 'HTML5/CSS3'],
    technologies: ['PHP', 'MySQL', 'Bootstrap 5', 'HTML5/CSS3'],
    programmingLanguages: ['PHP', 'JavaScript'],
    framework: 'Core PHP',
    database: 'MySQL',
    level: 'intermediate',
    projectType: 'Final Year Project',
    price: 2500,
    currency: 'INR',
    thumbnail: '/placeholder-project.svg',
    imageUrl: '/placeholder-project.svg',
    icon: '🎓',
    images: ['/placeholder-project.svg'],
    screenshots: ['/placeholder-project.svg'],
    tags: ['Student', 'Education', 'PHP', 'MySQL', 'Result'],
    featured: false,
    status: 'available',
    createdAt: '2026-01-25',
    features: [
      'Admin portal for adding subjects, classes, and student marks',
      'Student portal for roll-number based result queries',
      'Automated grade point calculation (CGPA/Percentage)',
      'Printable PDF report card generation',
    ],
    requirements: ['XAMPP / WAMP server or PHP 8+ with MySQL'],
    includedItems: [
      'Complete PHP Source Code',
      'Database .sql Script',
      'Project Documentation & User Manual',
    ],
  },
  {
    id: 'inventory-system',
    slug: 'inventory-system',
    title: 'Warehouse Inventory Management',
    description: 'Python Django system for warehouse stock tracking, supplier management, and low-stock alerts.',
    shortDescription: 'Django enterprise web application with stock tracking, supplier records, and automated low-stock warnings.',
    longDescription: 'Warehouse Inventory Management is a Python Django application designed for small to medium businesses. It handles product SKU tracking, supplier orders, category management, and stock audit logs with low-stock email alerts.',
    category: 'python-projects',
    subcategory: 'Management Systems',
    technology: ['Python', 'Django', 'PostgreSQL', 'Bootstrap'],
    technologies: ['Python', 'Django', 'PostgreSQL', 'Bootstrap'],
    programmingLanguages: ['Python'],
    framework: 'Django',
    database: 'PostgreSQL',
    level: 'intermediate',
    projectType: 'Python Project',
    price: 3200,
    currency: 'INR',
    thumbnail: '/placeholder-project.svg',
    imageUrl: '/placeholder-project.svg',
    icon: '📦',
    images: ['/placeholder-project.svg'],
    screenshots: ['/placeholder-project.svg'],
    tags: ['Inventory', 'Django', 'Python', 'PostgreSQL'],
    featured: false,
    status: 'available',
    createdAt: '2026-01-18',
    features: [
      'SKU & stock level tracking',
      'Supplier management and purchase orders',
      'Low-stock notification alerts',
      'Django Admin panel customization',
    ],
    requirements: ['Python 3.9+', 'Django 4+'],
    includedItems: [
      'Complete Django Source Code',
      'Database Migration Scripts',
      'Setup Guide PDF',
    ],
  },
  {
    id: 'library-management',
    slug: 'library-management',
    title: 'Library Management Desktop App',
    description: 'Java GUI desktop application for managing book issue, returns, fine calculation, and catalog search.',
    shortDescription: 'JavaFX desktop system for tracking library books, member cards, and overdue fines.',
    longDescription: 'Library Management Desktop App is built using JavaFX and SQLite. It provides library administrators with a desktop UI to issue books, process returns, compute overdue fines automatically, and search the book index by ISBN or author.',
    category: 'java-projects',
    subcategory: 'Desktop Software',
    technology: ['Java', 'JavaFX', 'SQLite'],
    technologies: ['Java', 'JavaFX', 'SQLite'],
    programmingLanguages: ['Java'],
    framework: 'JavaFX',
    database: 'SQLite',
    level: 'intermediate',
    projectType: 'Java Project',
    price: 2000,
    currency: 'INR',
    thumbnail: '/placeholder-project.svg',
    imageUrl: '/placeholder-project.svg',
    icon: '📚',
    images: ['/placeholder-project.svg'],
    screenshots: ['/placeholder-project.svg'],
    tags: ['Library', 'Management', 'Java', 'JavaFX', 'Desktop'],
    featured: false,
    status: 'available',
    createdAt: '2026-02-08',
    features: [
      'Book cataloging with ISBN and category tagging',
      'Issue and return processing with due date tracking',
      'Automated late fine calculation',
      'Standalone SQLite embedded database',
    ],
    requirements: ['JDK 17+ with JavaFX'],
    includedItems: [
      'Java Source Code & .jar Executable',
      'SQLite Database File',
      'User Manual & Setup Instructions',
    ],
  },
  {
    id: 'portfolio-website',
    slug: 'portfolio-website',
    title: 'Developer Portfolio Template',
    description: 'Clean, responsive personal portfolio website template for developers and designers.',
    shortDescription: 'Modern portfolio template featuring project showcases, skills section, and contact form.',
    longDescription: 'Developer Portfolio Template is a lightweight, responsive HTML/CSS/JavaScript website template designed to showcase personal projects, technical skills, work experience, and client testimonials with dark mode support.',
    category: 'mini-projects',
    subcategory: 'Portfolio Templates',
    technology: ['HTML5', 'CSS3', 'JavaScript', 'Tailwind CSS'],
    technologies: ['HTML5', 'CSS3', 'JavaScript', 'Tailwind CSS'],
    programmingLanguages: ['HTML', 'CSS', 'JavaScript'],
    framework: 'Tailwind CSS',
    database: 'None',
    level: 'beginner',
    price: 499,
    currency: 'INR',
    thumbnail: '/placeholder-project.svg',
    imageUrl: '/placeholder-project.svg',
    icon: '💻',
    images: ['/placeholder-project.svg'],
    screenshots: ['/placeholder-project.svg'],
    tags: ['Portfolio', 'Frontend', 'HTML', 'CSS', 'Mini Project'],
    featured: false,
    status: 'available',
    createdAt: '2026-02-14',
    features: [
      'Fully responsive modern layout',
      'Light/Dark mode toggle',
      'Project showcase grid with modal details',
      'Contact form ready for Formspree/EmailJS',
    ],
    requirements: ['Any web browser or code editor'],
    includedItems: [
      'HTML/CSS/JS Source Files',
      'Customization Guide',
    ],
  },
  {
    id: 'blog-cms',
    slug: 'blog-cms',
    title: 'Modern Blog CMS Platform',
    description: 'Next.js 14 blog system with markdown support, SEO optimization, and database integration.',
    shortDescription: 'Full-stack blog platform built with Next.js, Prisma, and PostgreSQL.',
    longDescription: 'Modern Blog CMS Platform built with Next.js 14 App Router, Prisma ORM, and PostgreSQL. Features server-rendered articles, dynamic tag pages, Markdown/MDX editor, and built-in SEO metadata generator.',
    category: 'software-projects',
    subcategory: 'Content Management',
    technology: ['Next.js', 'React', 'Prisma', 'PostgreSQL', 'Tailwind CSS'],
    technologies: ['Next.js', 'React', 'Prisma', 'PostgreSQL', 'Tailwind CSS'],
    programmingLanguages: ['TypeScript'],
    framework: 'Next.js 14',
    database: 'PostgreSQL',
    level: 'advanced',
    projectType: 'Software Project',
    price: 4200,
    currency: 'INR',
    thumbnail: '/placeholder-project.svg',
    imageUrl: '/placeholder-project.svg',
    icon: '📝',
    images: ['/placeholder-project.svg'],
    screenshots: ['/placeholder-project.svg'],
    tags: ['Blog', 'CMS', 'Next.js', 'Prisma', 'PostgreSQL'],
    featured: false,
    status: 'available',
    createdAt: '2026-01-28',
    features: [
      'Next.js 14 App Router & Server Components',
      'Prisma ORM with PostgreSQL database',
      'MDX markdown content rendering',
      'Automated sitemap and open-graph SEO meta tag generation',
    ],
    requirements: ['Node.js 18+', 'PostgreSQL database'],
    includedItems: [
      'Complete Next.js Source Code',
      'Prisma Schema & Database Seed Files',
      'Deployment Guide for Vercel / Cloudflare',
    ],
  },
  {
    id: 'weather-app',
    slug: 'weather-app',
    title: 'Live Weather Forecast App',
    description: 'React weather application providing 5-day forecasts and geolocation weather lookup.',
    shortDescription: 'Interactive React weather application consuming OpenWeather API with geolocation search.',
    longDescription: 'Live Weather Forecast App built with React and OpenWeatherMap REST API. Allows users to search weather conditions for any city worldwide or auto-detect current location to display hourly and 5-day forecasts.',
    category: 'mini-projects',
    subcategory: 'API Applications',
    technology: ['React', 'OpenWeather API', 'Tailwind CSS'],
    technologies: ['React', 'OpenWeather API', 'Tailwind CSS'],
    programmingLanguages: ['JavaScript'],
    framework: 'React',
    database: 'None',
    level: 'beginner',
    projectType: 'Mini Project',
    price: 999,
    currency: 'INR',
    thumbnail: '/placeholder-project.svg',
    imageUrl: '/placeholder-project.svg',
    icon: '🌤️',
    images: ['/placeholder-project.svg'],
    screenshots: ['/placeholder-project.svg'],
    tags: ['Weather', 'API', 'React', 'Mini Project'],
    featured: false,
    status: 'available',
    createdAt: '2026-02-11',
    features: [
      'Current weather & 5-day forecast display',
      'City search with autosuggestion',
      'Automatic geolocation detection',
      'Clean UI with weather icons',
    ],
    requirements: ['Node.js 18+', 'Free OpenWeather API Key'],
    includedItems: [
      'React Source Code',
      'API Setup Instructions',
    ],
  },
];

// Query Helpers
export function getProjectBySlug(slug: string): ProjectDefinition | undefined {
  return projectRegistry.find(p => p.slug === slug);
}

export function getAllProjects(): ProjectDefinition[] {
  return projectRegistry;
}

export function getRelatedProjects(project: ProjectDefinition, limit = 3): ProjectDefinition[] {
  return projectRegistry
    .filter(p => p.id !== project.id)
    .map(p => {
      let score = 0;
      if (p.category === project.category) score += 5;
      if (p.level === project.level) score += 2;
      const commonTech = (p.technologies || p.technology || []).filter(t =>
        (project.technologies || project.technology || []).includes(t)
      );
      score += commonTech.length * 3;
      return { project: p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.project);
}

export interface SearchOptions {
  query?: string;
  category?: string;
  technology?: string;
  level?: string;
  sortBy?: string;
}

export function searchProjects(
  projectsList: ProjectDefinition[],
  options: SearchOptions = {}
): ProjectDefinition[] {
  const { query = '', category = 'all', technology = 'all', level = 'all', sortBy = 'newest' } = options;

  let results = projectsList.filter(project => {
    const matchesCategory = category === 'all' || project.category === category;
    const projectTechs = project.technologies || project.technology || [];
    const matchesTech = technology === 'all' || projectTechs.includes(technology);
    const matchesLevel = level === 'all' || project.level === level;

    const q = query.trim().toLowerCase();
    const matchesSearch =
      !q ||
      project.title.toLowerCase().includes(q) ||
      project.description.toLowerCase().includes(q) ||
      (project.longDescription && project.longDescription.toLowerCase().includes(q)) ||
      projectTechs.some(t => t.toLowerCase().includes(q)) ||
      project.tags.some(tag => tag.toLowerCase().includes(q));

    return matchesCategory && matchesTech && matchesLevel && matchesSearch;
  });

  switch (sortBy) {
    case 'price-low-high':
    case 'price-low':
      results = results.sort((a, b) => a.price - b.price);
      break;
    case 'price-high-low':
    case 'price-high':
      results = results.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      results = results.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'name-desc':
      results = results.sort((a, b) => b.title.localeCompare(a.title));
      break;
    case 'featured':
      results = results.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
      break;
    case 'newest':
    default:
      results = results.sort((a, b) => ((b.createdAt || '') > (a.createdAt || '') ? 1 : -1));
      break;
  }

  return results;
}
