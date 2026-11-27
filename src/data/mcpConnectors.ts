import { IndianCity, McpConnector } from '../types/jobs';

export const DEFAULT_MCP_CONNECTORS: McpConnector[] = [
  // Live Indian Company ATS Feeds (zero API keys, direct live openings)
  {
    id: 'ats-razorpay',
    name: 'Razorpay Careers (Greenhouse)',
    portalSource: 'Razorpay ATS',
    category: 'Indian Company ATS',
    transport: 'live-api',
    endpointUrl:
      'https://boards-api.greenhouse.io/v1/boards/razorpaysoftwareprivatelimited/jobs',
    description:
      'Live engineering, product, and fintech openings directly from Razorpay’s Greenhouse ATS in Bengaluru and across India.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'ats-groww',
    name: 'Groww Careers (Greenhouse)',
    portalSource: 'Groww ATS',
    category: 'Indian Company ATS',
    transport: 'live-api',
    endpointUrl: 'https://boards-api.greenhouse.io/v1/boards/groww/jobs',
    description:
      'Live WealthTech engineering, QA, data, and product openings directly from Groww’s Bengaluru ATS.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'ats-cred',
    name: 'CRED Careers (Lever)',
    portalSource: 'CRED ATS',
    category: 'Indian Company ATS',
    transport: 'live-api',
    endpointUrl: 'https://api.lever.co/v0/postings/cred?mode=json',
    description:
      'Live high-craft engineering, design, and product openings directly from CRED’s Lever ATS.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'ats-meesho',
    name: 'Meesho Careers (Lever)',
    portalSource: 'Meesho ATS',
    category: 'Indian Company ATS',
    transport: 'live-api',
    endpointUrl: 'https://api.lever.co/v0/postings/meesho?mode=json',
    description:
      'Live e-commerce engineering, data science, and analytics roles directly from Meesho’s Lever ATS.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'ats-paytm',
    name: 'Paytm Careers (Lever)',
    portalSource: 'Paytm ATS',
    category: 'Indian Company ATS',
    transport: 'live-api',
    endpointUrl: 'https://api.lever.co/v0/postings/paytm?mode=json',
    description:
      'Live fintech, backend, full-stack, and product roles across Noida/Delhi NCR, Bengaluru, and Mumbai.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'ats-bosch',
    name: 'Bosch India (SmartRecruiters)',
    portalSource: 'Bosch India ATS',
    category: 'Indian Company ATS',
    transport: 'live-api',
    endpointUrl:
      'https://api.smartrecruiters.com/v1/companies/BoschGroup/postings?country=in',
    description:
      'Live embedded, cloud, AI, and full-stack engineering roles across Bengaluru, Pune, Hyderabad, and Coimbatore.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },

  // Live Remote Job Feeds (zero API keys, direct live openings)
  {
    id: 'remotive',
    name: 'Remotive Remote Jobs',
    portalSource: 'Remotive Remote',
    category: 'Remote Feed',
    transport: 'live-api',
    endpointUrl: 'https://remotive.com/api/remote-jobs',
    description:
      'Live public remote job feed covering Worldwide, APAC, and India-eligible engineering, product, and data roles.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'remoteok',
    name: 'RemoteOK Global Feed',
    portalSource: 'RemoteOK',
    category: 'Remote Feed',
    transport: 'live-api',
    endpointUrl: 'https://remoteok.com/api',
    description:
      'Live remote engineering, DevOps, product, and design listings with direct apply links and salary bands.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'himalayas',
    name: 'Himalayas Remote Feed',
    portalSource: 'Himalayas Remote',
    category: 'Remote Feed',
    transport: 'live-api',
    endpointUrl: 'https://himalayas.app/jobs/api',
    description:
      'Live remote-first tech openings filtered for India/APAC timezone compatibility and seniority.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'jobicy',
    name: 'Jobicy Remote Tech Feed',
    portalSource: 'Jobicy Remote',
    category: 'Remote Feed',
    transport: 'live-api',
    endpointUrl: 'https://jobicy.com/api/v2/remote-jobs',
    description:
      'Live curated remote software, data, DevOps, and product positions open to APAC & global engineers.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'arbeitnow',
    name: 'Arbeitnow Remote & Tech',
    portalSource: 'Arbeitnow',
    category: 'Remote Feed',
    transport: 'live-api',
    endpointUrl: 'https://www.arbeitnow.com/api/job-board-api',
    description:
      'Live remote and international tech openings with visa-sponsored and global-remote engineering roles.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },

  // Major Indian Job Portals (Direct Pre-Filled Search + AI Grounding Sync)
  {
    id: 'indeed-india',
    name: 'Indeed India',
    portalSource: 'Indeed India',
    category: 'Indian Portal',
    transport: 'portal-search-mcp',
    endpointUrl: 'https://in.indeed.com/jobs',
    siteDomain: 'in.indeed.com',
    description:
      'India-wide job search across Bengaluru, Hyderabad, Mumbai, Pune, Delhi NCR, and Chennai.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'glassdoor-india',
    name: 'Glassdoor India',
    portalSource: 'Glassdoor India',
    category: 'Indian Portal',
    transport: 'portal-search-mcp',
    endpointUrl: 'https://www.glassdoor.co.in/Job/jobs.htm?locT=N&locId=115',
    siteDomain: 'glassdoor.co.in',
    description:
      'Indian enterprise & product openings paired with salary benchmarks and company interview insights.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'linkedin-india',
    name: 'LinkedIn India',
    portalSource: 'LinkedIn India',
    category: 'Indian Portal',
    transport: 'portal-search-mcp',
    endpointUrl: 'https://www.linkedin.com/jobs/search/',
    siteDomain: 'linkedin.com/jobs',
    description:
      'Direct recruiter-posted roles across Indian startups, unicorns, and GCCs.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'naukri',
    name: 'Naukri.com',
    portalSource: 'Naukri',
    category: 'Indian Portal',
    transport: 'portal-search-mcp',
    endpointUrl: 'https://www.naukri.com/',
    siteDomain: 'naukri.com',
    description:
      'India’s largest hiring marketplace with notice-period and CTC-bracket filters.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'instahyre',
    name: 'Instahyre',
    portalSource: 'Instahyre',
    category: 'Indian Portal',
    transport: 'portal-search-mcp',
    endpointUrl: 'https://www.instahyre.com/',
    siteDomain: 'instahyre.com',
    description:
      'Curated Indian product-company hiring platform for engineering, ML, and product roles.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'wellfound',
    name: 'Wellfound (AngelList India)',
    portalSource: 'Wellfound',
    category: 'Indian Portal',
    transport: 'portal-search-mcp',
    endpointUrl: 'https://wellfound.com/jobs',
    siteDomain: 'wellfound.com',
    description:
      'Seed to Series-C Indian startup roles with transparent equity and salary ranges.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'cutshort',
    name: 'Cutshort India',
    portalSource: 'Cutshort',
    category: 'Indian Portal',
    transport: 'portal-search-mcp',
    endpointUrl: 'https://cutshort.io/',
    siteDomain: 'cutshort.io',
    description:
      'Skill-verified Indian tech & startup hiring network for fast interview turnarounds.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
  {
    id: 'foundit',
    name: 'Foundit (Monster India)',
    portalSource: 'Foundit',
    category: 'Indian Portal',
    transport: 'portal-search-mcp',
    endpointUrl: 'https://www.foundit.in/',
    siteDomain: 'foundit.in',
    description:
      'Pan-India corporate, IT services, and GCC job listings across metro and Tier-2 hubs.',
    enabled: true,
    syncedCount: 0,
    status: 'Ready',
  },
];

export function buildPortalDeepLink(
  connectorId: string,
  role: string,
  city: IndianCity
): string {
  const q = encodeURIComponent(role === 'All Roles' ? 'Software Engineer' : role);
  const loc = encodeURIComponent(city === 'All India' ? 'India' : city);
  const slugRole = (role === 'All Roles' ? 'software-engineer' : role)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  const slugCity = (city === 'All India' ? 'india' : city)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

  switch (connectorId) {
    case 'ats-razorpay':
      return 'https://razorpay.com/jobs/';
    case 'ats-groww':
      return 'https://groww.in/careers';
    case 'ats-cred':
      return 'https://careers.cred.club/';
    case 'ats-meesho':
      return 'https://www.meesho.io/jobs';
    case 'ats-paytm':
      return 'https://jobs.lever.co/paytm';
    case 'ats-bosch':
      return 'https://careers.smartrecruiters.com/BoschGroup/india';
    case 'indeed-india':
      return `https://in.indeed.com/jobs?q=${q}&l=${loc}`;
    case 'glassdoor-india': {
      const keyword = city === 'All India' ? q : `${q}%20${loc}`;
      return `https://www.glassdoor.co.in/Job/jobs.htm?sc.keyword=${keyword}&locT=N&locId=115`;
    }
    case 'linkedin-india':
      return `https://www.linkedin.com/jobs/search/?keywords=${q}&location=${loc}`;
    case 'naukri':
      return `https://www.naukri.com/${slugRole}-jobs${city !== 'All India' ? `-in-${slugCity}` : ''}`;
    case 'instahyre':
      return `https://www.instahyre.com/search-jobs/`;
    case 'wellfound':
      return `https://wellfound.com/role/l/${slugRole}/india`;
    case 'cutshort':
      return `https://cutshort.io/jobs/${slugRole}-jobs`;
    case 'foundit':
      return `https://www.foundit.in/srp/results?query=${q}&locations=${loc}`;
    case 'remotive':
      return `https://remotive.com/remote-jobs/software-dev?search=${q}`;
    case 'remoteok':
      return `https://remoteok.com/remote-${slugRole}-jobs`;
    case 'himalayas':
      return `https://himalayas.app/jobs/worldwide/${slugRole}`;
    case 'jobicy':
      return `https://jobicy.com/jobs?q=${q}`;
    case 'arbeitnow':
      return `https://www.arbeitnow.com/jobs?q=${q}`;
    default:
      return `https://in.indeed.com/jobs?q=${q}&l=${loc}`;
  }
}
