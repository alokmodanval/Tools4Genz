export interface SelectOption {
  value: string;
  label: string;
  category?: string;
  description?: string;
}

export const studentProjectTypeOptions: SelectOption[] = [
  { value: 'Final Year Project', label: 'Final Year Project', description: 'Comprehensive capstone project with documentation & presentation' },
  { value: 'Mini Project', label: 'Mini Project', description: 'Semester mini project with core functionality & setup' },
  { value: 'AI/ML Project', label: 'AI / ML Project', description: 'Machine learning model, NLP, vision, or neural network project' },
  { value: 'Web Project', label: 'Web Application Project', description: 'Full-stack or frontend modern web app' },
  { value: 'Python Project', label: 'Python Application', description: 'Django, Flask, Data Science, or Automation script' },
  { value: 'React Project', label: 'React / Next.js App', description: 'Modern SPA or SSR web application' },
  { value: 'Java Project', label: 'Java / Spring Boot App', description: 'Java desktop or Spring Boot web service' },
  { value: 'Software Project', label: 'Desktop / Enterprise Software', description: 'Cross-platform desktop application' },
  { value: 'Project Documentation', label: 'Documentation & Synopsis', description: 'IEEE report, DFD, ER diagrams, PPT presentation' },
  { value: 'Deployment Assistance', label: 'Deployment & Setup', description: 'Cloud hosting, server configuration, domain setup' },
];

export const clientServiceTypeOptions: SelectOption[] = [
  { value: 'Business Website', label: 'Corporate & Business Website', description: 'Professional responsive company website' },
  { value: 'Landing Page', label: 'High-Converting Landing Page', description: 'Lead generation & product launch page' },
  { value: 'E-Commerce', label: 'E-Commerce Online Store', description: 'Complete shopfront with payment & order management' },
  { value: 'Web Application', label: 'SaaS / Custom Web App', description: 'Interactive cloud web software platform' },
  { value: 'Custom Software', label: 'Custom Enterprise Software', description: 'Tailored software for internal business operations' },
  { value: 'AI Solution', label: 'AI & Machine Learning Solution', description: 'Custom LLM bot, recommendation engine, or NLP' },
  { value: 'Automation', label: 'Business Process Automation', description: 'Workflow automation & web scraping tools' },
  { value: 'API Development', label: 'API & Backend Services', description: 'RESTful / GraphQL backend integration' },
  { value: 'Maintenance', label: 'Website Maintenance & Support', description: 'Security updates, speed optimization & bug fixes' },
];

export const studentBudgetOptions: SelectOption[] = [
  { value: 'Under ₹1,000', label: 'Under ₹1,000' },
  { value: '₹1,000–₹3,000', label: '₹1,000 – ₹3,000' },
  { value: '₹3,000–₹5,000', label: '₹3,000 – ₹5,000' },
  { value: '₹5,000–₹10,000', label: '₹5,000 – ₹10,000' },
  { value: 'Above ₹10,000', label: 'Above ₹10,000' },
  { value: 'Custom Budget', label: 'Discuss Custom Budget' },
];

export const clientBudgetOptions: SelectOption[] = [
  { value: 'Under ₹10,000', label: 'Under ₹10,000' },
  { value: '₹10,000–₹25,000', label: '₹10,000 – ₹25,000' },
  { value: '₹25,000–₹50,000', label: '₹25,000 – ₹50,000' },
  { value: '₹50,000–₹1,00,000', label: '₹50,000 – ₹1,00,000' },
  { value: 'Above ₹1,00,000', label: 'Above ₹1,00,000' },
  { value: 'Custom Budget', label: 'Discuss Custom Budget' },
];

export const technologyStackOptions: SelectOption[] = [
  { value: 'Python', label: 'Python (Django / Flask / ML)' },
  { value: 'React', label: 'React / Next.js' },
  { value: 'Node.js', label: 'Node.js / Express' },
  { value: 'Java', label: 'Java / Spring Boot' },
  { value: 'PHP', label: 'PHP / Laravel / MySQL' },
  { value: 'Flutter', label: 'Flutter / Dart Mobile App' },
  { value: 'C++', label: 'C++ / C#' },
  { value: 'HTML/CSS/JS', label: 'HTML5 / CSS3 / JavaScript' },
  { value: 'Other', label: 'Other / Don\'t Know (We will recommend)' },
];

export const academicYearOptions: SelectOption[] = [
  { value: '1st Year', label: '1st Year (Fresher)' },
  { value: '2nd Year', label: '2nd Year (Sophomore)' },
  { value: '3rd Year', label: '3rd Year (Junior)' },
  { value: '4th Year', label: '4th Year (Senior / Final)' },
  { value: 'Post Graduate', label: 'Post Graduate (M.Tech / MCA)' },
];

export const contactMethodOptions: SelectOption[] = [
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
];
