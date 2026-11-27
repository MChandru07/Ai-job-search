export type IndianCity =
  | 'All India'
  | 'Bengaluru'
  | 'Hyderabad'
  | 'Mumbai'
  | 'Pune'
  | 'Delhi NCR'
  | 'Chennai'
  | 'Remote India';

export type WorkMode = 'All' | 'Hybrid' | 'On-site' | 'Remote';

export type NoticePeriod =
  | 'Immediate'
  | '15 Days'
  | '30 Days'
  | '45 Days'
  | '60 Days'
  | '90 Days';

export type ApplicationStage =
  | 'Applied'
  | 'Shortlisted'
  | 'Interview'
  | 'Offer'
  | 'Withdrawn';

export type PortalSource =
  | 'Indeed India'
  | 'Glassdoor India'
  | 'LinkedIn India'
  | 'Naukri'
  | 'Instahyre'
  | 'Wellfound'
  | 'Cutshort'
  | 'Foundit'
  | 'Remotive Remote'
  | 'RemoteOK'
  | 'Himalayas Remote'
  | 'Jobicy Remote'
  | 'Arbeitnow'
  | 'Razorpay ATS'
  | 'Groww ATS'
  | 'CRED ATS'
  | 'Meesho ATS'
  | 'Paytm ATS'
  | 'Bosch India ATS'
  | 'Company Career'
  | 'Custom MCP'
  | 'Web Search';

export interface JobListing {
  id: string;
  title: string;
  roleCategory: string;
  company: string;
  locality: string;
  city: Exclude<IndianCity, 'All India'>;
  workMode: Exclude<WorkMode, 'All'>;
  minExp: number;
  maxExp: number;
  minLpa: number;
  maxLpa: number;
  noticePreference: NoticePeriod;
  postedLabel: string;
  portalSource: PortalSource;
  applyUrl: string;
  skills: string[];
  description: string;
  highlights: string[];
  isLiveSearch?: boolean;
  sourceUrl?: string;
}

export interface CandidateProfile {
  fullName: string;
  email: string;
  phone: string;
  currentCity: Exclude<IndianCity, 'All India'>;
  targetRole: string;
  experienceYears: number;
  currentLpa: number;
  expectedLpa: number;
  noticePeriod: NoticePeriod;
  buyoutAvailable: boolean;
  skills: string[];
  portfolioUrl: string;
  linkedInUrl: string;
  resumeSummary: string;
  avatarUrl: string;
  resumeFileName?: string;
  resumeUploadedAt?: string;
  rawResumeText?: string;
}

export interface JobMatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  fitReasons: string[];
  noticeAligned: boolean;
  ctcAligned: boolean;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  city: string;
  ctcRange: string;
  portalSource: PortalSource;
  matchScore: number;
  stage: ApplicationStage;
  appliedAt: string;
  mode: 'Auto-Apply' | 'Quick Apply';
  subjectLine: string;
  coverNote: string;
  atsKeywords: string[];
  screeningSummary: string;
  followUpNote: string;
  applyUrl: string;
}

export interface AutoApplyRules {
  minMatchThreshold: number;
  maxBatchSize: number;
  includeAiCoverNote: boolean;
  includeNoticeAndCtc: boolean;
  onlyMatchingCities: boolean;
}

export interface JobFilters {
  query: string;
  roleCategory: string;
  city: IndianCity;
  workMode: WorkMode;
  expBand: 'any' | '0-2' | '2-5' | '5-8' | '8+';
  minLpa: number;
  maxNoticeDays: number; // 999 = any
  minMatch: number;
  portalSource: 'All Portals' | PortalSource;
}

export type McpTransport =
  | 'live-api'
  | 'portal-search-mcp'
  | 'custom-mcp-http'
  | 'custom-rest-json';

export interface McpConnector {
  id: string;
  name: string;
  portalSource: PortalSource;
  category: 'Indian Company ATS' | 'Remote Feed' | 'Indian Portal' | 'Custom MCP';
  transport: McpTransport;
  endpointUrl: string;
  siteDomain?: string;
  authToken?: string;
  description: string;
  enabled: boolean;
  lastSyncedAt?: string;
  syncedCount: number;
  status: 'Ready' | 'Synced' | 'Error';
  lastError?: string;
}
