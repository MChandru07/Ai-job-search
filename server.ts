import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { extractText } from 'unpdf';
import { KNOWN_SKILLS, parseResumeText } from './src/utils/resumeParser.ts';
import { INITIAL_INDIAN_JOBS } from './src/data/indianJobs.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw Object.assign(
      new Error(
        'GEMINI_API_KEY is not configured. Please add or select an API key in the Settings > Secrets panel.'
      ),
      { statusCode: 400 }
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface ParsedApiError {
  statusCode: number;
  message: string;
}

function parseGeminiError(err: unknown): ParsedApiError {
  const raw = err instanceof Error ? err.message : String(err);
  const explicitStatus =
    typeof err === 'object' &&
    err !== null &&
    'statusCode' in err &&
    typeof (err as { statusCode?: unknown }).statusCode === 'number'
      ? (err as { statusCode: number }).statusCode
      : undefined;

  let code = explicitStatus;
  let apiStatus = '';
  let apiMessage = raw;

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const inner = parsed?.error ?? parsed;
      if (typeof inner?.code === 'number') code = inner.code;
      if (typeof inner?.status === 'string') apiStatus = inner.status;
      if (typeof inner?.message === 'string') apiMessage = inner.message;
    }
  } catch {
    // Keep raw message
  }

  if (
    code === 429 ||
    apiStatus === 'RESOURCE_EXHAUSTED' ||
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('exceeded your current quota')
  ) {
    return {
      statusCode: 429,
      message:
        'Gemini API quota exceeded for AI portal search. Use a billing-enabled API key in Settings > Secrets for AI search, or sync the live Indian Company ATS & Remote MCP connectors.',
    };
  }

  if (
    code === 403 ||
    apiStatus === 'PERMISSION_DENIED' ||
    raw.includes('PERMISSION_DENIED')
  ) {
    return {
      statusCode: 403,
      message:
        'Gemini API permission denied. Please verify your API key in the Settings > Secrets panel.',
    };
  }

  if (
    code === 400 ||
    apiStatus === 'INVALID_ARGUMENT' ||
    raw.includes('API_KEY_INVALID')
  ) {
    return {
      statusCode: 400,
      message:
        'Invalid Gemini API key or request configuration. Please check your key in Settings > Secrets.',
    };
  }

  return {
    statusCode: code && code >= 400 && code < 600 ? code : 500,
    message: apiMessage || 'Upstream Gemini request failed.',
  };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithFallback<T>(
  runner: (model: string) => Promise<T>
): Promise<T> {
  try {
    return await runner('gemini-4-hydrogen');
  } catch (firstErr) {
    const parsed = parseGeminiError(firstErr);
    if (parsed.statusCode === 429 || parsed.statusCode === 503) {
      await sleep(800);
      return await runner('gemini-3.1-flash-lite');
    }
    throw firstErr;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSkillsFromText(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const skill of KNOWN_SKILLS) {
    const esc = skill.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex =
      skill.length <= 3
        ? new RegExp(`(?:^|[^a-z0-9])${esc}(?:$|[^a-z0-9])`, 'i')
        : new RegExp(`(?:^|[^a-z0-9])${esc}`, 'i');
    if (regex.test(lower)) {
      found.push(skill);
    }
    if (found.length >= 6) break;
  }
  return found;
}

function inferRoleCategory(title: string, fallback: string): string {
  const t = title.toLowerCase();
  if (t.includes('full stack') || t.includes('fullstack')) return 'Full Stack Engineer';
  if (t.includes('front end') || t.includes('frontend') || t.includes('react') || t.includes('ui engineer')) return 'Frontend Developer';
  if (t.includes('back end') || t.includes('backend') || t.includes('golang') || t.includes('java') || t.includes('sde')) return 'Backend Engineer';
  if (t.includes('data scien') || t.includes('machine learning') || t.includes('ml ') || t.includes('ai ')) return 'Data Scientist / ML';
  if (t.includes('product manager') || t.includes('product lead')) return 'Product Manager';
  if (t.includes('devops') || t.includes('sre') || t.includes('platform') || t.includes('cloud') || t.includes('infrastructure')) return 'DevOps / SRE';
  if (t.includes('design') || t.includes('ux') || t.includes('ui/ux')) return 'UI/UX Designer';
  if (t.includes('qa') || t.includes('sdet') || t.includes('test') || t.includes('quality')) return 'QA Automation';
  if (t.includes('analyst') || t.includes('analytics')) return 'Data Analyst';
  return fallback === 'All Roles' ? 'Full Stack Engineer' : fallback;
}

function normalizeIndianCity(
  loc: string
): 'Bengaluru' | 'Hyderabad' | 'Mumbai' | 'Pune' | 'Delhi NCR' | 'Chennai' | 'Remote India' {
  const l = (loc || '').toLowerCase();
  if (l.includes('bengaluru') || l.includes('bangalore')) return 'Bengaluru';
  if (l.includes('hyderabad')) return 'Hyderabad';
  if (l.includes('mumbai') || l.includes('navi mumbai') || l.includes('thane')) return 'Mumbai';
  if (l.includes('pune')) return 'Pune';
  if (l.includes('delhi') || l.includes('noida') || l.includes('gurgaon') || l.includes('gurugram') || l.includes('ncr')) return 'Delhi NCR';
  if (l.includes('chennai') || l.includes('tamil nadu')) return 'Chennai';
  if (l.includes('remote')) return 'Remote India';
  return 'Bengaluru';
}

function matchesRoleQuery(text: string, role: string): boolean {
  if (!role || role === 'All Roles') return true;
  const hay = text.toLowerCase();
  const roleLower = role.toLowerCase();

  const extraTerms: string[] = [];
  if (roleLower.includes('full stack')) {
    extraTerms.push('fullstack', 'full-stack', 'software engineer', 'sde', 'react', 'node', 'typescript');
  } else if (roleLower.includes('frontend')) {
    extraTerms.push('front-end', 'react', 'typescript', 'ui developer', 'web developer');
  } else if (roleLower.includes('backend')) {
    extraTerms.push('back-end', 'sde', 'software engineer', 'java', 'golang', 'node', 'python', 'api');
  } else if (roleLower.includes('data scientist')) {
    extraTerms.push('machine learning', 'ml', 'ai', 'python', 'deep learning');
  } else if (roleLower.includes('devops')) {
    extraTerms.push('sre', 'site reliability', 'kubernetes', 'cloud', 'platform', 'infrastructure');
  }

  const words = roleLower
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 2 && w !== 'and' && w !== 'the' && w !== 'engineer' && w !== 'developer');

  return [...words, ...extraTerms].some((w) => hay.includes(w));
}

function isIndiaOrGlobalLocation(loc: string): boolean {
  const l = (loc || '').toLowerCase();
  if (!l) return true;
  return (
    l.includes('worldwide') ||
    l.includes('anywhere') ||
    l.includes('global') ||
    l.includes('india') ||
    l.includes('apac') ||
    l.includes('asia') ||
    l.includes('remote')
  );
}

function parseLpaFromRemoteSalary(
  salaryStr: string | undefined,
  minUsd?: number,
  maxUsd?: number
): { minLpa: number; maxLpa: number } {
  if (typeof minUsd === 'number' && minUsd > 10000) {
    const minL = Math.max(12, Math.round((minUsd * 84) / 100000));
    const maxL =
      typeof maxUsd === 'number' && maxUsd >= minUsd
        ? Math.round((maxUsd * 84) / 100000)
        : minL + 12;
    return { minLpa: Math.min(minL, 90), maxLpa: Math.min(maxL, 140) };
  }
  if (salaryStr) {
    const nums =
      salaryStr
        .match(/\d[\d,]*/g)
        ?.map((n) => Number(n.replace(/,/g, ''))) ?? [];
    if (nums.length >= 1 && nums[0] >= 20000) {
      const minL = Math.max(12, Math.round((nums[0] * 84) / 100000));
      const maxL =
        nums.length >= 2 && nums[1] >= nums[0]
          ? Math.round((nums[1] * 84) / 100000)
          : minL + 10;
      return { minLpa: Math.min(minL, 90), maxLpa: Math.min(maxL, 140) };
    }
  }
  return { minLpa: 18, maxLpa: 32 };
}

function estimateIndianCompanyLpa(title: string): { minLpa: number; maxLpa: number; minExp: number; maxExp: number } {
  const t = title.toLowerCase();
  if (t.includes('staff') || t.includes('principal') || t.includes('lead') || t.includes('architect')) {
    return { minLpa: 36, maxLpa: 58, minExp: 6, maxExp: 10 };
  }
  if (t.includes('senior') || t.includes('sde ii') || t.includes('sde-2') || t.includes('sde 2') || t.includes('ii')) {
    return { minLpa: 24, maxLpa: 38, minExp: 3, maxExp: 6 };
  }
  if (t.includes('intern') || t.includes('fresher') || t.includes('associate') || t.includes('junior')) {
    return { minLpa: 10, maxLpa: 16, minExp: 0, maxExp: 2 };
  }
  return { minLpa: 18, maxLpa: 30, minExp: 2, maxExp: 5 };
}

async function fetchGreenhouseBoard(
  boardSlug: string,
  companyName: string,
  portalSource: string,
  targetRole: string,
  targetCity: string
) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${boardSlug}/jobs?content=true`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) {
    throw new Error(`${companyName} Greenhouse returned HTTP ${r.status}`);
  }
  const data = (await r.json()) as {
    jobs?: Array<{
      id: number;
      title: string;
      absolute_url: string;
      location?: { name?: string };
      content?: string;
      updated_at?: string;
    }>;
  };
  const all = data.jobs ?? [];
  const roleMatched = all.filter((j) =>
    matchesRoleQuery(`${j.title} ${j.content || ''}`, targetRole)
  );
  const cityMatched = (roleMatched.length > 0 ? roleMatched : all).filter(
    (j) =>
      targetCity === 'All India' ||
      normalizeIndianCity(j.location?.name || '') === targetCity
  );
  const picked = (
    cityMatched.length > 0
      ? cityMatched
      : roleMatched.length > 0
      ? roleMatched
      : all
  ).slice(0, 10);

  return {
    jobs: picked.map((j) => {
      const locName = j.location?.name || 'Bengaluru, India';
      const city = normalizeIndianCity(locName);
      const plain = stripHtml(j.content || '');
      const skills = extractSkillsFromText(`${j.title} ${plain}`);
      const band = estimateIndianCompanyLpa(j.title);
      return {
        id: `${boardSlug}-${j.id}`,
        title: j.title,
        roleCategory: inferRoleCategory(j.title, targetRole),
        company: companyName,
        locality: locName.split(',')[0] || city,
        city,
        workMode: locName.toLowerCase().includes('remote') ? 'Remote' : 'Hybrid',
        minExp: band.minExp,
        maxExp: band.maxExp,
        minLpa: band.minLpa,
        maxLpa: band.maxLpa,
        noticePreference: '30 Days',
        postedLabel: j.updated_at ? j.updated_at.slice(0, 10) : 'Live ATS',
        portalSource,
        applyUrl: j.absolute_url,
        skills: skills.length > 0 ? skills : ['TypeScript', 'React', 'Node.js'],
        description:
          plain.slice(0, 230) || `Live ${companyName} opening in ${locName}.`,
        highlights: [
          `Direct live opening from ${companyName} Greenhouse ATS`,
          `Location: ${locName}`,
        ],
        isLiveSearch: true,
      };
    }),
    sources: [{ uri: url, title: `${companyName} Greenhouse ATS` }],
  };
}

async function fetchLeverBoard(
  companySlug: string,
  companyName: string,
  portalSource: string,
  targetRole: string,
  targetCity: string
) {
  const url = `https://api.lever.co/v0/postings/${companySlug}?mode=json`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) {
    throw new Error(`${companyName} Lever ATS returned HTTP ${r.status}`);
  }
  const all = (await r.json()) as Array<{
    id: string;
    text: string;
    hostedUrl: string;
    applyUrl?: string;
    workplaceType?: string;
    categories?: {
      location?: string;
      team?: string;
      department?: string;
      commitment?: string;
    };
    descriptionPlain?: string;
    createdAt?: number;
  }>;

  const list = Array.isArray(all) ? all : [];
  const roleMatched = list.filter((j) =>
    matchesRoleQuery(
      `${j.text} ${j.categories?.team || ''} ${j.descriptionPlain || ''}`,
      targetRole
    )
  );
  const cityMatched = (roleMatched.length > 0 ? roleMatched : list).filter(
    (j) =>
      targetCity === 'All India' ||
      normalizeIndianCity(j.categories?.location || '') === targetCity
  );
  const picked = (
    cityMatched.length > 0
      ? cityMatched
      : roleMatched.length > 0
      ? roleMatched
      : list
  ).slice(0, 10);

  return {
    jobs: picked.map((j) => {
      const locName = j.categories?.location || 'Bengaluru';
      const city = normalizeIndianCity(locName);
      const plain = (j.descriptionPlain || '').replace(/\s+/g, ' ').trim();
      const skills = extractSkillsFromText(`${j.text} ${plain}`);
      const band = estimateIndianCompanyLpa(j.text);
      const workMode =
        j.workplaceType === 'remote' || locName.toLowerCase().includes('remote')
          ? 'Remote'
          : j.workplaceType === 'onsite'
          ? 'On-site'
          : 'Hybrid';
      return {
        id: `lever-${companySlug}-${j.id}`,
        title: j.text,
        roleCategory: inferRoleCategory(j.text, targetRole),
        company: companyName,
        locality: locName,
        city,
        workMode,
        minExp: band.minExp,
        maxExp: band.maxExp,
        minLpa: band.minLpa,
        maxLpa: band.maxLpa,
        noticePreference: '30 Days',
        postedLabel: 'Live ATS',
        portalSource,
        applyUrl: j.applyUrl || j.hostedUrl,
        skills: skills.length > 0 ? skills : ['TypeScript', 'Java', 'React'],
        description:
          plain.slice(0, 230) || `Live ${companyName} role (${j.categories?.team || 'Engineering'}).`,
        highlights: [
          `Direct live opening from ${companyName} Lever ATS`,
          `Team: ${j.categories?.team || j.categories?.department || 'Product & Tech'}`,
        ],
        isLiveSearch: true,
      };
    }),
    sources: [{ uri: url, title: `${companyName} Lever ATS` }],
  };
}

async function fetchSmartRecruitersIndia(
  companyId: string,
  companyName: string,
  portalSource: string,
  targetRole: string,
  targetCity: string
) {
  const url = `https://api.smartrecruiters.com/v1/companies/${companyId}/postings?country=in&limit=40`;
  const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!r.ok) {
    throw new Error(`${companyName} SmartRecruiters ATS returned HTTP ${r.status}`);
  }
  const data = (await r.json()) as {
    content?: Array<{
      id: string;
      name: string;
      releasedDate?: string;
      location?: {
        city?: string;
        remote?: boolean;
        hybrid?: boolean;
        fullLocation?: string;
      };
      function?: { label?: string };
      experienceLevel?: { label?: string };
    }>;
  };
  const all = data.content ?? [];
  const roleMatched = all.filter((j) =>
    matchesRoleQuery(`${j.name} ${j.function?.label || ''}`, targetRole)
  );
  const cityMatched = (roleMatched.length > 0 ? roleMatched : all).filter(
    (j) =>
      targetCity === 'All India' ||
      normalizeIndianCity(j.location?.city || '') === targetCity
  );
  const picked = (
    cityMatched.length > 0
      ? cityMatched
      : roleMatched.length > 0
      ? roleMatched
      : all
  ).slice(0, 10);

  return {
    jobs: picked.map((j) => {
      const rawCity = j.location?.city || 'Bengaluru';
      const city = normalizeIndianCity(rawCity);
      const band = estimateIndianCompanyLpa(j.name);
      const skills = extractSkillsFromText(`${j.name} ${j.function?.label || ''}`);
      return {
        id: `sr-${companyId}-${j.id}`,
        title: j.name,
        roleCategory: inferRoleCategory(j.name, targetRole),
        company: companyName,
        locality: rawCity.charAt(0).toUpperCase() + rawCity.slice(1),
        city,
        workMode: j.location?.remote ? 'Remote' : j.location?.hybrid ? 'Hybrid' : 'On-site',
        minExp: band.minExp,
        maxExp: band.maxExp,
        minLpa: band.minLpa,
        maxLpa: band.maxLpa,
        noticePreference: '30 Days',
        postedLabel: j.releasedDate ? j.releasedDate.slice(0, 10) : 'Live ATS',
        portalSource,
        applyUrl: `https://jobs.smartrecruiters.com/${companyId}/${j.id}`,
        skills: skills.length > 0 ? skills : ['Engineering', 'Software', 'Cloud'],
        description: `Live ${companyName} opening in ${rawCity} (${j.function?.label || 'Engineering'} · ${j.experienceLevel?.label || 'Experienced'}).`,
        highlights: [
          `Direct live opening from ${companyName} SmartRecruiters ATS`,
          `Location: ${j.location?.fullLocation || `${rawCity}, India`}`,
        ],
        isLiveSearch: true,
      };
    }),
    sources: [{ uri: url, title: `${companyName} SmartRecruiters ATS` }],
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Resume Upload & Parsing (PDF + TXT/MD + raw text)
  app.post('/api/resume/parse', async (req, res) => {
    try {
      const { fileName, mimeType, fileBase64, rawText } = req.body ?? {};
      let extractedText = typeof rawText === 'string' ? rawText : '';

      if (!extractedText && typeof fileBase64 === 'string' && fileBase64.length > 0) {
        const isPdf =
          (typeof mimeType === 'string' && mimeType.includes('pdf')) ||
          (typeof fileName === 'string' && fileName.toLowerCase().endsWith('.pdf'));

        const buffer = Buffer.from(fileBase64, 'base64');

        if (isPdf) {
          const uint8 = new Uint8Array(buffer);
          const result = await extractText(uint8, { mergePages: true });
          extractedText = Array.isArray(result.text)
            ? result.text.join('\n')
            : String(result.text ?? '');
        } else {
          extractedText = buffer.toString('utf-8');
        }
      }

      const cleaned = extractedText.trim();
      if (!cleaned) {
        return res.status(400).json({
          error:
            'Could not extract readable text from the resume. Please upload a text-based PDF, TXT, or MD file, or paste your resume text.',
        });
      }

      const parsedFields = parseResumeText(cleaned);

      res.json({
        extractedText: cleaned,
        parsedFields,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to parse resume file.';
      console.error('[/api/resume/parse] error:', msg);
      res.status(500).json({ error: msg });
    }
  });

  // Live Indian Jobs Discovery using Gemini Search Grounding
  app.post('/api/jobs/search', async (req, res) => {
    try {
      const { role, city, experienceYears, minLpa, siteDomain, portalLabel } =
        req.body ?? {};
      const targetRole =
        typeof role === 'string' && role.trim()
          ? role.trim()
          : 'Full Stack Engineer';
      const targetCity =
        typeof city === 'string' && city.trim() && city !== 'All India'
          ? city.trim()
          : 'Bengaluru, Hyderabad, Mumbai, Pune, or Delhi NCR';
      const exp = typeof experienceYears === 'number' ? experienceYears : 3;
      const lpa = typeof minLpa === 'number' ? minLpa : 12;
      const siteClause =
        typeof siteDomain === 'string' && siteDomain.trim()
          ? ` Prioritize results from site:${siteDomain.trim()}.`
          : '';
      const sourceName =
        typeof portalLabel === 'string' && portalLabel.trim()
          ? portalLabel.trim()
          : 'Web Search';

      const ai = getGeminiClient();

      const prompt = `Search for real, active Indian job openings for the role "${targetRole}" in ${targetCity} suitable for ~${exp} years experience with compensation around or above ${lpa} LPA.${siteClause}
Return ONLY a valid JSON array (no markdown fences, no commentary) of 5 distinct Indian job openings found from recent listings.
Each object must strictly follow this shape:
{
  "title": "Exact job title",
  "roleCategory": "${targetRole === 'All Roles' ? 'Full Stack Engineer' : targetRole}",
  "company": "Company name",
  "locality": "Neighborhood or Tech Park (e.g. Koramangala, HITEC City, Cyber Hub)",
  "city": "One of: Bengaluru, Hyderabad, Mumbai, Pune, Delhi NCR, Chennai, Remote India",
  "workMode": "One of: Hybrid, On-site, Remote",
  "minExp": 2,
  "maxExp": 5,
  "minLpa": 18,
  "maxLpa": 28,
  "noticePreference": "One of: Immediate, 15 Days, 30 Days, 45 Days, 60 Days",
  "postedLabel": "Recent",
  "applyUrl": "Direct career or job URL",
  "skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4", "Skill 5"],
  "description": "Concise 2-sentence job summary",
  "highlights": ["Highlight 1", "Highlight 2"]
}`;

      const response = await generateWithFallback((model) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        })
      );

      const rawText = (response.text ?? '').trim();
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return res.status(502).json({
          error: 'Could not parse structured job listings from search results.',
        });
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed)) {
        return res.status(502).json({
          error: 'Unexpected response structure from live job search.',
        });
      }

      const chunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const webSources = chunks
        .map((c) => c.web)
        .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
        .slice(0, 6);

      const allowedCities = new Set([
        'Bengaluru',
        'Hyderabad',
        'Mumbai',
        'Pune',
        'Delhi NCR',
        'Chennai',
        'Remote India',
      ]);
      const allowedModes = new Set(['Hybrid', 'On-site', 'Remote']);
      const allowedNotice = new Set([
        'Immediate',
        '15 Days',
        '30 Days',
        '45 Days',
        '60 Days',
        '90 Days',
      ]);

      const normalizedJobs = parsed.slice(0, 6).map((item, idx) => {
        const cityVal = allowedCities.has(item.city) ? item.city : 'Bengaluru';
        const modeVal = allowedModes.has(item.workMode)
          ? item.workMode
          : 'Hybrid';
        const noticeVal = allowedNotice.has(item.noticePreference)
          ? item.noticePreference
          : '30 Days';
        const fallbackSource =
          webSources[idx % Math.max(1, webSources.length)]?.uri;

        return {
          id: `live-${Date.now()}-${idx}`,
          title: String(item.title || `${targetRole} Opening`),
          roleCategory: String(
            item.roleCategory ||
              (targetRole === 'All Roles' ? 'Full Stack Engineer' : targetRole)
          ),
          company: String(item.company || 'Indian Tech Company'),
          locality: String(item.locality || cityVal),
          city: cityVal,
          workMode: modeVal,
          minExp: Number.isFinite(Number(item.minExp))
            ? Number(item.minExp)
            : 2,
          maxExp: Number.isFinite(Number(item.maxExp))
            ? Number(item.maxExp)
            : 5,
          minLpa: Number.isFinite(Number(item.minLpa))
            ? Number(item.minLpa)
            : lpa,
          maxLpa: Number.isFinite(Number(item.maxLpa))
            ? Number(item.maxLpa)
            : lpa + 10,
          noticePreference: noticeVal,
          postedLabel: String(item.postedLabel || 'Live Search'),
          portalSource: sourceName,
          applyUrl:
            typeof item.applyUrl === 'string' &&
            item.applyUrl.startsWith('http')
              ? item.applyUrl
              : fallbackSource || 'https://www.naukri.com/',
          skills: Array.isArray(item.skills)
            ? item.skills.slice(0, 6).map(String)
            : ['TypeScript', 'React', 'Node.js'],
          description: String(
            item.description ||
              `Role-matched opening for ${targetRole} in ${cityVal}.`
          ),
          highlights: Array.isArray(item.highlights)
            ? item.highlights.slice(0, 3).map(String)
            : [`Discovered via ${sourceName}`],
          isLiveSearch: true,
          sourceUrl: fallbackSource || undefined,
        };
      });

      res.json({
        jobs: normalizedJobs,
        sources: webSources,
      });
    } catch (err: unknown) {
      const { statusCode, message } = parseGeminiError(err);
      if (statusCode >= 500) {
        console.error('[/api/jobs/search] error:', message);
      } else {
        console.warn(`[/api/jobs/search] ${statusCode}:`, message);
      }
      res.status(statusCode).json({ error: message, code: statusCode });
    }
  });

  interface ConnectorInput {
    id: string;
    name: string;
    category?: string;
    transport?: string;
    portalSource?: string;
    endpointUrl?: string;
    siteDomain?: string;
    authToken?: string;
  }

  const DEFAULT_OPEN_FEED_CONNECTORS: ConnectorInput[] = [
    { id: 'ats-razorpay', name: 'Razorpay Careers ATS', transport: 'live-api', portalSource: 'Razorpay ATS' },
    { id: 'ats-groww', name: 'Groww Careers ATS', transport: 'live-api', portalSource: 'Groww ATS' },
    { id: 'ats-cred', name: 'CRED Careers ATS', transport: 'live-api', portalSource: 'CRED ATS' },
    { id: 'ats-meesho', name: 'Meesho Careers ATS', transport: 'live-api', portalSource: 'Meesho ATS' },
    { id: 'ats-paytm', name: 'Paytm Careers ATS', transport: 'live-api', portalSource: 'Paytm ATS' },
    { id: 'ats-bosch', name: 'Bosch India Careers ATS', transport: 'live-api', portalSource: 'Bosch India ATS' },
    { id: 'remotive', name: 'Remotive Remote Feed', transport: 'live-api', portalSource: 'Remotive Remote' },
    { id: 'remoteok', name: 'RemoteOK India-Friendly', transport: 'live-api', portalSource: 'RemoteOK' },
    { id: 'himalayas', name: 'Himalayas Remote Tech', transport: 'live-api', portalSource: 'Himalayas Remote' },
    { id: 'jobicy', name: 'Jobicy Remote Tech', transport: 'live-api', portalSource: 'Jobicy Remote' },
    { id: 'arbeitnow', name: 'Arbeitnow Tech Feed', transport: 'live-api', portalSource: 'Arbeitnow' },
  ];

  async function executeConnectorSync(
    connector: ConnectorInput,
    targetRole: string,
    targetCity: string,
    experienceYears?: number,
    minLpa?: number
  ): Promise<{ jobs: Array<Record<string, unknown>>; sources: Array<{ uri: string; title?: string }> }> {
    // Indian Company Direct ATS Connectors (Greenhouse, Lever & SmartRecruiters)
    if (connector.id === 'ats-razorpay') {
      return fetchGreenhouseBoard(
        'razorpaysoftwareprivatelimited',
        'Razorpay',
        'Razorpay ATS',
        targetRole,
        targetCity
      );
    }
    if (connector.id === 'ats-groww') {
      return fetchGreenhouseBoard(
        'groww',
        'Groww',
        'Groww ATS',
        targetRole,
        targetCity
      );
    }
    if (connector.id === 'ats-cred') {
      return fetchLeverBoard(
        'cred',
        'CRED',
        'CRED ATS',
        targetRole,
        targetCity
      );
    }
    if (connector.id === 'ats-meesho') {
      return fetchLeverBoard(
        'meesho',
        'Meesho',
        'Meesho ATS',
        targetRole,
        targetCity
      );
    }
    if (connector.id === 'ats-paytm') {
      return fetchLeverBoard(
        'paytm',
        'Paytm',
        'Paytm ATS',
        targetRole,
        targetCity
      );
    }
    if (connector.id === 'ats-bosch') {
      return fetchSmartRecruitersIndia(
        'BoschGroup',
        'Bosch India',
        'Bosch India ATS',
        targetRole,
        targetCity
      );
    }

    // 1. Remotive Remote Live API
    if (connector.id === 'remotive') {
      const url = `https://remotive.com/api/remote-jobs?limit=40`;
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) {
        throw new Error(`Remotive API returned HTTP ${r.status}`);
      }
      const data = (await r.json()) as {
        jobs?: Array<{
          id: number;
          url: string;
          title: string;
          company_name: string;
          tags?: string[];
          publication_date?: string;
          candidate_required_location?: string;
          salary?: string;
          description?: string;
        }>;
      };

      const rawList = data.jobs ?? [];
      const globalMatches = rawList.filter((j) =>
        isIndiaOrGlobalLocation(j.candidate_required_location || '')
      );
      const roleMatches = globalMatches.filter((j) =>
        matchesRoleQuery(`${j.title} ${(j.tags || []).join(' ')}`, targetRole)
      );
      const picked = (
        roleMatches.length > 0
          ? roleMatches
          : globalMatches.length > 0
          ? globalMatches
          : rawList
      ).slice(0, 8);

      const jobs = picked.map((j) => {
        const { minLpa: mMin, maxLpa: mMax } = parseLpaFromRemoteSalary(j.salary);
        const desc = stripHtml(j.description || '').slice(0, 220);
        const parsedSkills = extractSkillsFromText(`${j.title} ${desc}`);
        const skills =
          Array.isArray(j.tags) && j.tags.length > 0
            ? j.tags.slice(0, 6)
            : parsedSkills.length > 0
            ? parsedSkills
            : ['Remote', 'TypeScript', 'React'];
        return {
          id: `remotive-${j.id}`,
          title: j.title,
          roleCategory: inferRoleCategory(j.title, targetRole),
          company: j.company_name,
          locality: j.candidate_required_location || 'Worldwide / India',
          city: 'Remote India',
          workMode: 'Remote',
          minExp: 2,
          maxExp: 6,
          minLpa: mMin,
          maxLpa: mMax,
          noticePreference: '30 Days',
          postedLabel: j.publication_date
            ? j.publication_date.slice(0, 10)
            : 'Recent',
          portalSource: 'Remotive Remote',
          applyUrl: j.url,
          skills,
          description:
            desc || `Remote role at ${j.company_name} open to India/global candidates.`,
          highlights: [
            `Eligibility: ${j.candidate_required_location || 'Worldwide'}`,
            j.salary ? `Reported compensation: ${j.salary}` : 'Remote-first team',
          ],
          isLiveSearch: true,
        };
      });

      return { jobs, sources: [{ uri: url, title: 'Remotive Remote API' }] };
    }

    // 2. RemoteOK Live API
    if (connector.id === 'remoteok') {
      const r = await fetch('https://remoteok.com/api', {
        headers: { 'User-Agent': 'BharatRole/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) {
        throw new Error(`RemoteOK API returned HTTP ${r.status}`);
      }
      const data = (await r.json()) as Array<{
        id?: string;
        company?: string;
        position?: string;
        tags?: string[];
        description?: string;
        location?: string;
        salary_min?: number;
        salary_max?: number;
        apply_url?: string;
        url?: string;
        date?: string;
      }>;
      const rawList = Array.isArray(data)
        ? data.filter((item) => Boolean(item.position && item.company))
        : [];
      const globalList = rawList.filter((j) =>
        isIndiaOrGlobalLocation(j.location || '')
      );
      const roleList = globalList.filter((j) =>
        matchesRoleQuery(`${j.position} ${(j.tags || []).join(' ')}`, targetRole)
      );
      const picked = (
        roleList.length > 0
          ? roleList
          : globalList.length > 0
          ? globalList
          : rawList
      ).slice(0, 8);

      const jobs = picked.map((j, i) => {
        const { minLpa: mMin, maxLpa: mMax } = parseLpaFromRemoteSalary(
          undefined,
          j.salary_min,
          j.salary_max
        );
        const desc = stripHtml(j.description || '').slice(0, 220);
        return {
          id: `remoteok-${j.id || i}`,
          title: j.position || 'Remote Engineer',
          roleCategory: inferRoleCategory(j.position || '', targetRole),
          company: j.company || 'Remote Company',
          locality: j.location || 'Worldwide / India',
          city: 'Remote India',
          workMode: 'Remote',
          minExp: 2,
          maxExp: 6,
          minLpa: mMin,
          maxLpa: mMax,
          noticePreference: '30 Days',
          postedLabel: j.date ? String(j.date).slice(0, 10) : 'Recent',
          portalSource: 'RemoteOK',
          applyUrl: j.apply_url || j.url || 'https://remoteok.com/',
          skills:
            Array.isArray(j.tags) && j.tags.length > 0
              ? j.tags.slice(0, 6)
              : ['Remote', 'JavaScript'],
          description:
            desc || `Remote role at ${j.company} open to global/India engineers.`,
          highlights: [
            `Location: ${j.location || 'Worldwide'}`,
            'Synced live from RemoteOK feed',
          ],
          isLiveSearch: true,
        };
      });

      return {
        jobs,
        sources: [{ uri: 'https://remoteok.com/api', title: 'RemoteOK Live Feed' }],
      };
    }

    // 3. Himalayas Remote Live API
    if (connector.id === 'himalayas') {
      const url = 'https://himalayas.app/jobs/api?limit=30';
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) {
        throw new Error(`Himalayas API returned HTTP ${r.status}`);
      }
      const data = (await r.json()) as {
        jobs?: Array<{
          guid?: string;
          title?: string;
          excerpt?: string;
          companyName?: string;
          minSalary?: number;
          maxSalary?: number;
          locationRestrictions?: string[];
          categories?: string[];
          applicationLink?: string;
        }>;
      };
      const rawList = data.jobs ?? [];
      const globalList = rawList.filter((j) => {
        const locs = j.locationRestrictions ?? [];
        return locs.length === 0 || locs.some((l) => isIndiaOrGlobalLocation(l));
      });
      const roleList = globalList.filter((j) =>
        matchesRoleQuery(
          `${j.title || ''} ${(j.categories || []).join(' ')}`,
          targetRole
        )
      );
      const picked = (
        roleList.length > 0
          ? roleList
          : globalList.length > 0
          ? globalList
          : rawList
      ).slice(0, 8);

      const jobs = picked.map((j, i) => {
        const { minLpa: mMin, maxLpa: mMax } = parseLpaFromRemoteSalary(
          undefined,
          j.minSalary,
          j.maxSalary
        );
        const stableSlug = String(j.guid || `${j.companyName || ''}-${j.title || i}`)
          .replace(/[^a-zA-Z0-9_-]/g, '')
          .slice(-48);
        return {
          id: `himalayas-${stableSlug || i}`,
          title: j.title || 'Remote Tech Role',
          roleCategory: inferRoleCategory(j.title || '', targetRole),
          company: j.companyName || 'Remote Team',
          locality:
            j.locationRestrictions && j.locationRestrictions.length > 0
              ? j.locationRestrictions.slice(0, 2).join(', ')
              : 'Worldwide / India',
          city: 'Remote India',
          workMode: 'Remote',
          minExp: 2,
          maxExp: 6,
          minLpa: mMin,
          maxLpa: mMax,
          noticePreference: '30 Days',
          postedLabel: 'Live Feed',
          portalSource: 'Himalayas Remote',
          applyUrl: j.applicationLink || 'https://himalayas.app/jobs',
          skills:
            Array.isArray(j.categories) && j.categories.length > 0
              ? j.categories.slice(0, 5)
              : ['Remote', 'Engineering'],
          description:
            stripHtml(j.excerpt || '').slice(0, 220) ||
            `Remote opportunity at ${j.companyName || 'hiring team'}.`,
          highlights: ['Synced live from Himalayas Remote API'],
          isLiveSearch: true,
        };
      });

      return {
        jobs,
        sources: [{ uri: url, title: 'Himalayas Remote API' }],
      };
    }

    // 4. Jobicy Remote Tech Feed
    if (connector.id === 'jobicy') {
      const url = 'https://jobicy.com/api/v2/remote-jobs?count=25';
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) {
        throw new Error(`Jobicy API returned HTTP ${r.status}`);
      }
      const data = (await r.json()) as {
        jobs?: Array<{
          id: number;
          url: string;
          jobTitle: string;
          companyName: string;
          jobIndustry?: string[];
          jobGeo?: string;
          jobExcerpt?: string;
          pubDate?: string;
        }>;
      };
      const rawList = data.jobs ?? [];
      const globalList = rawList.filter((j) =>
        isIndiaOrGlobalLocation(j.jobGeo || '')
      );
      const roleList = globalList.filter((j) =>
        matchesRoleQuery(
          `${j.jobTitle} ${(j.jobIndustry || []).join(' ')}`,
          targetRole
        )
      );
      const picked = (
        roleList.length > 0
          ? roleList
          : globalList.length > 0
          ? globalList
          : rawList
      ).slice(0, 8);

      const jobs = picked.map((j) => {
        const desc = stripHtml(j.jobExcerpt || '').slice(0, 220);
        const skills = extractSkillsFromText(`${j.jobTitle} ${desc}`);
        return {
          id: `jobicy-${j.id}`,
          title: j.jobTitle,
          roleCategory: inferRoleCategory(j.jobTitle, targetRole),
          company: j.companyName,
          locality: j.jobGeo || 'Anywhere / APAC',
          city: 'Remote India',
          workMode: 'Remote',
          minExp: 2,
          maxExp: 6,
          minLpa: 18,
          maxLpa: 32,
          noticePreference: '30 Days',
          postedLabel: j.pubDate ? j.pubDate.slice(0, 10) : 'Live Feed',
          portalSource: 'Jobicy Remote',
          applyUrl: j.url,
          skills:
            skills.length > 0
              ? skills
              : j.jobIndustry?.slice(0, 4) ?? ['Remote', 'Tech'],
          description: desc || `Remote role at ${j.companyName}.`,
          highlights: [`Region: ${j.jobGeo || 'Global Remote'}`],
          isLiveSearch: true,
        };
      });

      return {
        jobs,
        sources: [{ uri: url, title: 'Jobicy Remote API' }],
      };
    }

    // 5. Arbeitnow Tech Feed
    if (connector.id === 'arbeitnow') {
      const url = 'https://www.arbeitnow.com/api/job-board-api';
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) {
        throw new Error(`Arbeitnow API returned HTTP ${r.status}`);
      }
      const data = (await r.json()) as {
        data?: Array<{
          slug: string;
          company_name: string;
          title: string;
          description: string;
          remote: boolean;
          url: string;
          tags?: string[];
          location?: string;
        }>;
      };
      const rawList = data.data ?? [];
      const remoteList = rawList.filter((j) => j.remote);
      const roleList = remoteList.filter((j) =>
        matchesRoleQuery(`${j.title} ${(j.tags || []).join(' ')}`, targetRole)
      );
      const picked = (
        roleList.length > 0
          ? roleList
          : remoteList.length > 0
          ? remoteList
          : rawList
      ).slice(0, 8);

      const jobs = picked.map((j) => {
        const desc = stripHtml(j.description || '').slice(0, 220);
        const skills = extractSkillsFromText(`${j.title} ${desc}`);
        return {
          id: `arbeitnow-${j.slug}`,
          title: j.title,
          roleCategory: inferRoleCategory(j.title, targetRole),
          company: j.company_name,
          locality: j.location || 'Remote / International',
          city: 'Remote India',
          workMode: j.remote ? 'Remote' : 'Hybrid',
          minExp: 2,
          maxExp: 6,
          minLpa: 20,
          maxLpa: 36,
          noticePreference: '30 Days',
          postedLabel: 'Live Feed',
          portalSource: 'Arbeitnow',
          applyUrl: j.url,
          skills:
            skills.length > 0
              ? skills
              : j.tags?.slice(0, 5) ?? ['Remote', 'Software'],
          description: desc || `Tech opening at ${j.company_name}.`,
          highlights: [j.remote ? 'Remote eligible' : `Location: ${j.location}`],
          isLiveSearch: true,
        };
      });

      return {
        jobs,
        sources: [{ uri: url, title: 'Arbeitnow Tech Feed' }],
      };
    }

    // 6. Custom MCP Server (JSON-RPC 2.0 over HTTP)
    if (connector.transport === 'custom-mcp-http') {
      if (!connector.endpointUrl) {
        throw new Error(`Missing endpointUrl for ${connector.name}.`);
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (connector.authToken) {
        headers.Authorization = `Bearer ${connector.authToken}`;
      }

      const rpcResp = await fetch(connector.endpointUrl, {
        method: 'POST',
        headers,
        signal: AbortSignal.timeout(8000),
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'tools/call',
          params: {
            name: 'search_indian_jobs',
            arguments: {
              role: targetRole,
              city: targetCity,
              experienceYears: experienceYears ?? 3,
              minLpa: minLpa ?? 12,
            },
          },
        }),
      });

      if (!rpcResp.ok) {
        throw new Error(`MCP server returned HTTP ${rpcResp.status}`);
      }

      const rpcJson = (await rpcResp.json()) as {
        error?: { message?: string };
        result?: {
          jobs?: Array<Record<string, unknown>>;
          content?: Array<{ type?: string; text?: string }>;
        };
      };

      if (rpcJson.error) {
        throw new Error(rpcJson.error.message || 'MCP server returned an error.');
      }

      let rawJobs: Array<Record<string, unknown>> = [];
      if (Array.isArray(rpcJson.result?.jobs)) {
        rawJobs = rpcJson.result.jobs;
      } else if (Array.isArray(rpcJson.result?.content)) {
        const textPart = rpcJson.result.content.find((c) => typeof c.text === 'string')?.text;
        if (textPart) {
          const parsedText = JSON.parse(textPart);
          rawJobs = Array.isArray(parsedText)
            ? parsedText
            : Array.isArray(parsedText?.jobs)
            ? parsedText.jobs
            : [];
        }
      }

      const jobs = rawJobs.slice(0, 12).map((item, idx) => ({
        id: `mcp-${connector.id}-${String(item.id || idx)}`,
        title: String(item.title || `${targetRole} Role`),
        roleCategory: String(
          item.roleCategory || inferRoleCategory(String(item.title || ''), targetRole)
        ),
        company: String(item.company || connector.name),
        locality: String(item.locality || item.city || 'India'),
        city: (item.city as string) || 'Bengaluru',
        workMode: (item.workMode as string) || 'Hybrid',
        minExp: Number(item.minExp ?? 2),
        maxExp: Number(item.maxExp ?? 5),
        minLpa: Number(item.minLpa ?? 15),
        maxLpa: Number(item.maxLpa ?? 28),
        noticePreference: String(item.noticePreference || '30 Days'),
        postedLabel: String(item.postedLabel || 'MCP Sync'),
        portalSource: connector.portalSource || 'Custom MCP',
        applyUrl: String(item.applyUrl || connector.endpointUrl),
        skills: Array.isArray(item.skills)
          ? item.skills.slice(0, 6).map(String)
          : ['TypeScript', 'React'],
        description: String(
          item.description || `Job synced via MCP connector ${connector.name}.`
        ),
        highlights: Array.isArray(item.highlights)
          ? item.highlights.slice(0, 3).map(String)
          : [`Synced from ${connector.name}`],
        isLiveSearch: true,
      }));

      return {
        jobs,
        sources: [{ uri: connector.endpointUrl, title: connector.name }],
      };
    }

    // 7. Custom REST JSON Feed
    if (connector.transport === 'custom-rest-json') {
      if (!connector.endpointUrl) {
        throw new Error(`Missing endpointUrl for ${connector.name}.`);
      }
      const headers: Record<string, string> = {};
      if (connector.authToken) {
        headers.Authorization = `Bearer ${connector.authToken}`;
      }
      const resp = await fetch(connector.endpointUrl, {
        headers,
        signal: AbortSignal.timeout(8000),
      });
      if (!resp.ok) {
        throw new Error(`REST job feed returned HTTP ${resp.status}`);
      }
      const json = (await resp.json()) as
        | Array<Record<string, unknown>>
        | { jobs?: Array<Record<string, unknown>>; data?: Array<Record<string, unknown>> };
      const arr = Array.isArray(json)
        ? json
        : Array.isArray(json.jobs)
        ? json.jobs
        : Array.isArray(json.data)
        ? json.data
        : [];

      const jobs = arr.slice(0, 12).map((item, idx) => ({
        id: `rest-${connector.id}-${String(item.id || idx)}`,
        title: String(item.title || item.position || `${targetRole} Opening`),
        roleCategory: inferRoleCategory(
          String(item.title || item.position || ''),
          targetRole
        ),
        company: String(item.company || item.company_name || connector.name),
        locality: String(item.locality || item.location || 'India'),
        city: (item.city as string) || 'Remote India',
        workMode: (item.workMode as string) || 'Remote',
        minExp: Number(item.minExp ?? 2),
        maxExp: Number(item.maxExp ?? 5),
        minLpa: Number(item.minLpa ?? 16),
        maxLpa: Number(item.maxLpa ?? 30),
        noticePreference: String(item.noticePreference || '30 Days'),
        postedLabel: String(item.postedLabel || 'Feed Sync'),
        portalSource: connector.portalSource || 'Custom MCP',
        applyUrl: String(item.applyUrl || item.url || connector.endpointUrl),
        skills: Array.isArray(item.skills)
          ? item.skills.slice(0, 6).map(String)
          : Array.isArray(item.tags)
          ? item.tags.slice(0, 6).map(String)
          : ['TypeScript', 'React'],
        description: stripHtml(
          String(item.description || `Synced from ${connector.name}.`)
        ).slice(0, 220),
        highlights: [`Synced from ${connector.name}`],
        isLiveSearch: true,
      }));

      return {
        jobs,
        sources: [{ uri: connector.endpointUrl, title: connector.name }],
      };
    }

    // 8. Portal-Scoped Search MCP (Indeed India, Glassdoor India, LinkedIn India, Naukri, etc.)
    if (connector.transport === 'portal-search-mcp') {
      const ai = getGeminiClient();
      const cityLabel =
        targetCity === 'All India'
          ? 'Bengaluru, Hyderabad, Mumbai, Pune, or Delhi NCR'
          : targetCity;
      const prompt = `Search for real, active Indian job openings on ${connector.name} (site:${connector.siteDomain}) for "${targetRole}" in ${cityLabel} around ${experienceYears ?? 3} years experience and ${minLpa ?? 12}+ LPA.
Return ONLY a valid JSON array (no markdown fences) of 5 distinct listings from ${connector.name} matching:
{
  "title": "Job title",
  "roleCategory": "${targetRole === 'All Roles' ? 'Full Stack Engineer' : targetRole}",
  "company": "Company name",
  "locality": "Neighborhood or city",
  "city": "One of: Bengaluru, Hyderabad, Mumbai, Pune, Delhi NCR, Chennai, Remote India",
  "workMode": "One of: Hybrid, On-site, Remote",
  "minExp": 2,
  "maxExp": 5,
  "minLpa": 16,
  "maxLpa": 28,
  "noticePreference": "30 Days",
  "postedLabel": "Recent",
  "applyUrl": "URL on ${connector.siteDomain} or company career page",
  "skills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4"],
  "description": "2-sentence summary",
  "highlights": ["Highlight 1", "Highlight 2"]
}`;

      const response = await generateWithFallback((model) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: { tools: [{ googleSearch: {} }] },
        })
      );

      const rawText = (response.text ?? '').trim();
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw Object.assign(
          new Error(`Could not parse structured job results from ${connector.name}.`),
          { statusCode: 502 }
        );
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const chunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const webSources = chunks
        .map((c) => c.web)
        .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
        .slice(0, 6);

      const jobs = (Array.isArray(parsed) ? parsed : []).slice(0, 6).map((item, idx) => ({
        id: `${connector.id}-${Date.now()}-${idx}`,
        title: String(item.title || `${targetRole} Opening`),
        roleCategory: String(
          item.roleCategory || inferRoleCategory(String(item.title || ''), targetRole)
        ),
        company: String(item.company || 'Indian Employer'),
        locality: String(item.locality || item.city || 'India'),
        city: String(item.city || 'Bengaluru'),
        workMode: String(item.workMode || 'Hybrid'),
        minExp: Number(item.minExp ?? 2),
        maxExp: Number(item.maxExp ?? 5),
        minLpa: Number(item.minLpa ?? 14),
        maxLpa: Number(item.maxLpa ?? 26),
        noticePreference: String(item.noticePreference || '30 Days'),
        postedLabel: String(item.postedLabel || 'Recent'),
        portalSource: connector.portalSource || connector.name,
        applyUrl:
          typeof item.applyUrl === 'string' && item.applyUrl.startsWith('http')
            ? item.applyUrl
            : webSources[idx % Math.max(1, webSources.length)]?.uri ||
              connector.endpointUrl ||
              'https://www.naukri.com/',
        skills: Array.isArray(item.skills)
          ? item.skills.slice(0, 6).map(String)
          : ['TypeScript', 'React', 'Node.js'],
        description: String(item.description || `Opening discovered via ${connector.name}.`),
        highlights: Array.isArray(item.highlights)
          ? item.highlights.slice(0, 3).map(String)
          : [`Synced via ${connector.name}`],
        isLiveSearch: true,
      }));

      return { jobs, sources: webSources };
    }

    throw Object.assign(
      new Error('Unsupported MCP connector transport.'),
      { statusCode: 400 }
    );
  }

  // Sync a Single Job MCP / Live Feed Connector
  app.post('/api/mcp/sync', async (req, res) => {
    try {
      const { connector, role, city, experienceYears, minLpa } = req.body ?? {};
      if (!connector || typeof connector !== 'object') {
        return res.status(400).json({ error: 'Missing connector configuration.' });
      }

      const targetRole =
        typeof role === 'string' && role.trim()
          ? role.trim()
          : 'Full Stack Engineer';
      const targetCity =
        typeof city === 'string' && city.trim() ? city.trim() : 'All India';

      const result = await executeConnectorSync(
        connector as ConnectorInput,
        targetRole,
        targetCity,
        typeof experienceYears === 'number' ? experienceYears : undefined,
        typeof minLpa === 'number' ? minLpa : undefined
      );
      return res.json(result);
    } catch (err: unknown) {
      const { statusCode, message } = parseGeminiError(err);
      if (statusCode >= 500) {
        console.error('[/api/mcp/sync] error:', message);
      } else {
        console.warn(`[/api/mcp/sync] ${statusCode}:`, message);
      }
      res.status(statusCode).json({ error: message, code: statusCode });
    }
  });

  // Batch Refresh All Live ATS, Remote & Custom MCP Feeds (zero Gemini quota needed)
  app.post('/api/mcp/refresh-all', async (req, res) => {
    try {
      const { connectors: bodyConnectors, role, city, experienceYears, minLpa } =
        req.body ?? {};

      const targetRole =
        typeof role === 'string' && role.trim()
          ? role.trim()
          : 'Full Stack Engineer';
      const targetCity =
        typeof city === 'string' && city.trim() ? city.trim() : 'All India';

      const requested: ConnectorInput[] =
        Array.isArray(bodyConnectors) && bodyConnectors.length > 0
          ? bodyConnectors.filter(
              (c: ConnectorInput) =>
                c &&
                typeof c === 'object' &&
                (c.transport === 'live-api' ||
                  c.transport === 'custom-mcp-http' ||
                  c.transport === 'custom-rest-json')
            )
          : DEFAULT_OPEN_FEED_CONNECTORS;

      const settled = await Promise.allSettled(
        requested.map(async (connector) => {
          const out = await executeConnectorSync(
            connector,
            targetRole,
            targetCity,
            typeof experienceYears === 'number' ? experienceYears : undefined,
            typeof minLpa === 'number' ? minLpa : undefined
          );
          return { connectorId: connector.id, ...out };
        })
      );

      const seenKeys = new Set<string>();
      const allJobs: Array<Record<string, unknown>> = [];
      const allSources: Array<{ uri: string; title?: string }> = [];
      const seenSourceUris = new Set<string>();
      const statsByConnectorId: Record<
        string,
        { ok: boolean; count: number; error?: string }
      > = {};

      settled.forEach((outcome, index) => {
        const connector = requested[index];
        if (outcome.status === 'fulfilled') {
          const { jobs, sources } = outcome.value;
          statsByConnectorId[connector.id] = { ok: true, count: jobs.length };
          for (const job of jobs) {
            const key = `${String(job.company || '').toLowerCase()}::${String(job.title || '').toLowerCase()}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              allJobs.push(job);
            }
          }
          for (const src of sources) {
            if (src.uri && !seenSourceUris.has(src.uri)) {
              seenSourceUris.add(src.uri);
              allSources.push(src);
            }
          }
        } else {
          const reason =
            outcome.reason instanceof Error
              ? outcome.reason.message
              : String(outcome.reason);
          statsByConnectorId[connector.id] = {
            ok: false,
            count: 0,
            error: reason,
          };
          console.warn(`[/api/mcp/refresh-all] ${connector.id} failed:`, reason);
        }
      });

      res.json({
        jobs: allJobs,
        sources: allSources.slice(0, 8),
        statsByConnectorId,
        refreshedAt: new Date().toISOString(),
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to refresh live job feeds.';
      console.error('[/api/mcp/refresh-all] error:', msg);
      res.status(500).json({ error: msg });
    }
  });

  // Built-in BharatRole MCP Server Endpoint (JSON-RPC 2.0)
  app.post('/api/mcp', (req, res) => {
    const { id, method, params } = req.body ?? {};
    if (method === 'initialize') {
      return res.json({
        jsonrpc: '2.0',
        id: id ?? 1,
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: { name: 'bharatrole-indian-jobs-mcp', version: '1.0.0' },
          capabilities: { tools: {} },
        },
      });
    }

    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id: id ?? 1,
        result: {
          tools: [
            {
              name: 'search_indian_jobs',
              description:
                'Search role-matched Indian tech and enterprise jobs by role, city, experience, and minimum ₹ LPA.',
              inputSchema: {
                type: 'object',
                properties: {
                  role: { type: 'string' },
                  city: { type: 'string' },
                  minLpa: { type: 'number' },
                },
              },
            },
            {
              name: 'parse_indian_resume',
              description:
                'Extract skills, notice period, ₹ LPA, city, and role from raw resume text.',
              inputSchema: {
                type: 'object',
                properties: { rawText: { type: 'string' } },
                required: ['rawText'],
              },
            },
          ],
        },
      });
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments ?? {};
      if (toolName === 'search_indian_jobs') {
        const role = String(args.role || '');
        const city = String(args.city || 'All India');
        const minLpa = Number(args.minLpa || 0);
        const matches = INITIAL_INDIAN_JOBS.filter((j) => {
          if (city !== 'All India' && j.city !== city) return false;
          if (j.maxLpa < minLpa) return false;
          return matchesRoleQuery(`${j.title} ${j.roleCategory} ${j.skills.join(' ')}`, role);
        }).slice(0, 10);

        return res.json({
          jsonrpc: '2.0',
          id: id ?? 1,
          result: {
            jobs: matches,
            content: [{ type: 'text', text: JSON.stringify(matches) }],
          },
        });
      }

      if (toolName === 'parse_indian_resume') {
        const parsed = parseResumeText(String(args.rawText || ''));
        return res.json({
          jsonrpc: '2.0',
          id: id ?? 1,
          result: {
            parsed,
            content: [{ type: 'text', text: JSON.stringify(parsed) }],
          },
        });
      }

      return res.status(404).json({
        jsonrpc: '2.0',
        id: id ?? 1,
        error: { code: -32601, message: `Unknown tool: ${toolName}` },
      });
    }

    res.status(400).json({
      jsonrpc: '2.0',
      id: id ?? null,
      error: { code: -32601, message: `Unsupported MCP method: ${method}` },
    });
  });

  // Tailor application subject, cover note & Indian portal screening answers
  app.post('/api/applications/tailor', async (req, res) => {
    try {
      const { job, profile, includeNoticeAndCtc } = req.body ?? {};
      if (!job || !profile) {
        return res
          .status(400)
          .json({ error: 'Missing job or candidate profile.' });
      }

      const ai = getGeminiClient();

      const prompt = `Draft a crisp, natural Indian job application package for this candidate applying to this specific opening.

Candidate:
- Name: ${profile.fullName}
- Target Role: ${profile.targetRole}
- Experience: ${profile.experienceYears} years
- Current City: ${profile.currentCity}
- Notice Period: ${profile.noticePeriod}${profile.buyoutAvailable ? ' (Buyout available)' : ''}
- Current / Expected CTC: ₹${profile.currentLpa} LPA / ₹${profile.expectedLpa} LPA
- Skills: ${(profile.skills || []).join(', ')}
- Summary: ${profile.resumeSummary}

Target Job:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.locality}, ${job.city} (${job.workMode})
- Required Skills: ${(job.skills || []).join(', ')}
- Experience Range: ${job.minExp}-${job.maxExp} yrs
- Budget: ₹${job.minLpa}-${job.maxLpa} LPA
- Description: ${job.description}

Instructions:
- Keep the coverNote to 3-4 concise, authentic sentences tailored to the job and candidate's real background (no fluff, no robotic phrasing).
- ${includeNoticeAndCtc ? 'Include a clear closing line stating notice period readiness and expected CTC alignment.' : 'Focus purely on technical/role fit without quoting CTC figures.'}
- screeningSummary should be 1 crisp sentence covering location readiness, notice period (${profile.noticePeriod}), and years of relevant experience.`;

      const response = await generateWithFallback((model) =>
        ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                subjectLine: {
                  type: Type.STRING,
                  description: 'Concise email/portal application subject line.',
                },
                coverNote: {
                  type: Type.STRING,
                  description:
                    'Tailored 3-4 sentence pitch for the hiring manager.',
                },
                atsKeywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Top 4 overlapping ATS keywords to emphasize.',
                },
                screeningSummary: {
                  type: Type.STRING,
                  description: 'One-line Indian portal screening response.',
                },
              },
              required: [
                'subjectLine',
                'coverNote',
                'atsKeywords',
                'screeningSummary',
              ],
            },
          },
        })
      );

      const jsonStr = (response.text ?? '{}').trim();
      const parsed = JSON.parse(jsonStr);
      res.json(parsed);
    } catch (err: unknown) {
      const { statusCode, message } = parseGeminiError(err);
      if (statusCode >= 500) {
        console.error('[/api/applications/tailor] error:', message);
      } else {
        console.warn(`[/api/applications/tailor] ${statusCode}:`, message);
      }
      res.status(statusCode).json({ error: message, code: statusCode });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BharatRole server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Server startup error:', err);
  process.exit(1);
});
