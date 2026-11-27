import { IndianCity, NoticePeriod } from '../types/jobs';

export const KNOWN_SKILLS = [
  'TypeScript',
  'JavaScript',
  'React',
  'Next.js',
  'Angular',
  'Vue.js',
  'Node.js',
  'Express',
  'NestJS',
  'Python',
  'Django',
  'FastAPI',
  'Flask',
  'Java',
  'Spring Boot',
  'Go',
  'Golang',
  'Rust',
  'C++',
  'C#',
  '.NET',
  'Ruby on Rails',
  'PHP',
  'Laravel',
  'PostgreSQL',
  'MySQL',
  'MongoDB',
  'Redis',
  'Elasticsearch',
  'Kafka',
  'RabbitMQ',
  'GraphQL',
  'REST APIs',
  'Microservices',
  'AWS',
  'GCP',
  'Azure',
  'Docker',
  'Kubernetes',
  'Terraform',
  'CI/CD',
  'GitHub Actions',
  'Jenkins',
  'Linux',
  'Tailwind CSS',
  'HTML/CSS',
  'Motion',
  'Redux',
  'Vite',
  'Webpack',
  'Playwright',
  'Cypress',
  'Selenium',
  'Jest',
  'PyTorch',
  'TensorFlow',
  'Scikit-learn',
  'XGBoost',
  'LangChain',
  'LLM',
  'SQL',
  'dbt',
  'Airflow',
  'Spark',
  'Tableau',
  'Power BI',
  'Snowflake',
  'BigQuery',
  'Figma',
  'Design Systems',
  'User Research',
  'Prototyping',
  'Product Strategy',
  'A/B Testing',
  'B2B SaaS',
  'System Design',
  'WebSockets',
  'Prometheus',
  'Grafana',
  'React Native',
  'Flutter',
  'Swift',
  'Kotlin',
];

export interface ParsedResumeData {
  fullName?: string;
  email?: string;
  phone?: string;
  currentCity?: Exclude<IndianCity, 'All India'>;
  targetRole?: string;
  experienceYears?: number;
  currentLpa?: number;
  expectedLpa?: number;
  noticePeriod?: NoticePeriod;
  skills: string[];
  portfolioUrl?: string;
  linkedInUrl?: string;
  resumeSummary: string;
}

export function parseResumeText(rawText: string): ParsedResumeData {
  const clean = rawText.replace(/\r\n/g, '\n').trim();
  const lower = clean.toLowerCase();

  // Email
  const emailMatch = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch?.[0];

  // Indian phone (+91 or 10-digit starting 6-9)
  const phoneMatch = clean.match(/(?:\+91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/);
  const phone = phoneMatch?.[0]?.replace(/\s+/g, ' ').trim();

  // LinkedIn & GitHub URLs
  const linkedInMatch = clean.match(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+\/?/i);
  const githubMatch = clean.match(/https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+\/?/i);

  // Full Name heuristic: first non-empty line without @ or http if < 5 words
  const lines = clean
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  let fullName: string | undefined;
  for (const line of lines.slice(0, 4)) {
    if (
      !line.includes('@') &&
      !line.includes('http') &&
      !/\d{5}/.test(line) &&
      line.split(/\s+/).length >= 2 &&
      line.split(/\s+/).length <= 4 &&
      line.length <= 42
    ) {
      fullName = line.replace(/[^a-zA-Z.\s]/g, '').trim();
      if (fullName) break;
    }
  }

  // City detection
  let currentCity: Exclude<IndianCity, 'All India'> | undefined;
  if (/\b(bengaluru|bangalore|koramangala|indiranagar|hsr|whitefield|bellandur)\b/i.test(clean)) {
    currentCity = 'Bengaluru';
  } else if (/\b(hyderabad|hitec city|madhapur|gachibowli|secunderabad)\b/i.test(clean)) {
    currentCity = 'Hyderabad';
  } else if (/\b(mumbai|navi mumbai|thane|powai|lower parel|bkc|andheri)\b/i.test(clean)) {
    currentCity = 'Mumbai';
  } else if (/\b(pune|baner|kharadi|magarpatta|hinjewadi|wakad)\b/i.test(clean)) {
    currentCity = 'Pune';
  } else if (/\b(delhi|gurugram|gurgaon|noida|ncr|faridabad|ghaziabad)\b/i.test(clean)) {
    currentCity = 'Delhi NCR';
  } else if (/\b(chennai|omr|taramani|guindy|velachery)\b/i.test(clean)) {
    currentCity = 'Chennai';
  } else if (/\bremote\b/i.test(clean)) {
    currentCity = 'Remote India';
  }

  // Experience years
  const expMatch =
    clean.match(/(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/i) ||
    clean.match(/experience\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?)/i);
  const experienceYears = expMatch ? Math.min(30, Number(expMatch[1])) : undefined;

  // Notice period
  let noticePeriod: NoticePeriod | undefined;
  if (/\b(immediate\s*joiner|serving\s*notice|0\s*days?\s*notice)\b/i.test(clean)) {
    noticePeriod = 'Immediate';
  } else if (/\b15\s*days?\b/i.test(clean)) {
    noticePeriod = '15 Days';
  } else if (/\b30\s*days?|1\s*month\b/i.test(clean)) {
    noticePeriod = '30 Days';
  } else if (/\b45\s*days?\b/i.test(clean)) {
    noticePeriod = '45 Days';
  } else if (/\b60\s*days?|2\s*months?\b/i.test(clean)) {
    noticePeriod = '60 Days';
  } else if (/\b90\s*days?|3\s*months?\b/i.test(clean)) {
    noticePeriod = '90 Days';
  }

  // CTC in LPA
  const currentCtcMatch = clean.match(/(?:current|present)\s*(?:ctc|package|salary)?\s*[:\-]?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*lpa/i);
  const expectedCtcMatch = clean.match(/(?:expected|target)\s*(?:ctc|package|salary)?\s*[:\-]?\s*(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)\s*lpa/i);

  // Target Role detection
  let targetRole: string | undefined;
  if (/\b(full[\s-]?stack|mern|mean)\b/i.test(clean)) {
    targetRole = 'Full Stack Engineer';
  } else if (/\b(front[\s-]?end|react developer|ui developer)\b/i.test(clean)) {
    targetRole = 'Frontend Developer';
  } else if (/\b(back[\s-]?end|java developer|node\.?js developer|golang|sde)\b/i.test(clean)) {
    targetRole = 'Backend Engineer';
  } else if (/\b(data scientist|machine learning|ml engineer|ai engineer)\b/i.test(clean)) {
    targetRole = 'Data Scientist / ML';
  } else if (/\b(product manager|associate product manager|apm)\b/i.test(clean)) {
    targetRole = 'Product Manager';
  } else if (/\b(devops|sre|site reliability|cloud engineer|platform engineer)\b/i.test(clean)) {
    targetRole = 'DevOps / SRE';
  } else if (/\b(ui\/ux|product designer|ux designer)\b/i.test(clean)) {
    targetRole = 'UI/UX Designer';
  } else if (/\b(qa|sdet|test automation|playwright|selenium)\b/i.test(clean)) {
    targetRole = 'QA Automation';
  } else if (/\b(data analyst|analytics engineer|business analyst)\b/i.test(clean)) {
    targetRole = 'Data Analyst';
  }

  // Skill extraction
  const skills: string[] = [];
  for (const skill of KNOWN_SKILLS) {
    const escaped = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern =
      skill.length <= 3
        ? new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i')
        : new RegExp(`(?:^|[^a-z0-9])${escaped}`, 'i');
    if (pattern.test(lower)) {
      skills.push(skill);
    }
  }

  // Build concise summary from first ~550 chars of meaningful body lines
  const summaryLines = lines
    .filter((l) => l.length > 25 && !l.startsWith('http'))
    .slice(0, 5)
    .join(' ');
  const resumeSummary =
    summaryLines.length > 480
      ? `${summaryLines.slice(0, 477).trim()}...`
      : summaryLines || clean.slice(0, 450);

  return {
    fullName,
    email,
    phone,
    currentCity,
    targetRole,
    experienceYears,
    currentLpa: currentCtcMatch ? Number(currentCtcMatch[1]) : undefined,
    expectedLpa: expectedCtcMatch ? Number(expectedCtcMatch[1]) : undefined,
    noticePeriod,
    skills: skills.slice(0, 18),
    portfolioUrl: githubMatch?.[0],
    linkedInUrl: linkedInMatch?.[0],
    resumeSummary,
  };
}
