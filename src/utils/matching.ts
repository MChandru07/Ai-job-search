import {
  CandidateProfile,
  JobFilters,
  JobListing,
  JobMatchResult,
  NoticePeriod,
} from '../types/jobs';

export function noticePeriodToDays(notice: NoticePeriod): number {
  switch (notice) {
    case 'Immediate':
      return 0;
    case '15 Days':
      return 15;
    case '30 Days':
      return 30;
    case '45 Days':
      return 45;
    case '60 Days':
      return 60;
    case '90 Days':
      return 90;
  }
}

export function computeJobMatch(
  job: JobListing,
  profile: CandidateProfile
): JobMatchResult {
  const candidateSkillsLower = profile.skills.map((s) => s.trim().toLowerCase());
  const resumeTextLower = `${profile.targetRole} ${profile.resumeSummary}`.toLowerCase();

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of job.skills) {
    const skLower = skill.toLowerCase();
    const inSkills = candidateSkillsLower.some(
      (cs) => cs === skLower || cs.includes(skLower) || skLower.includes(cs)
    );
    const inSummary = resumeTextLower.includes(skLower);
    if (inSkills || inSummary) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  // Skill score (0..55)
  const skillRatio =
    job.skills.length > 0 ? matchedSkills.length / job.skills.length : 0.6;
  const skillPoints = Math.round(skillRatio * 55);

  // Role alignment (0..20)
  const targetLower = profile.targetRole.toLowerCase();
  const titleLower = job.title.toLowerCase();
  const categoryLower = job.roleCategory.toLowerCase();
  let rolePoints = 8;
  if (
    targetLower === categoryLower ||
    titleLower.includes(targetLower) ||
    categoryLower.includes(targetLower.split(' ')[0])
  ) {
    rolePoints = 20;
  } else if (
    targetLower
      .split(/\s+/)
      .some((word) => word.length > 3 && (titleLower.includes(word) || categoryLower.includes(word)))
  ) {
    rolePoints = 14;
  }

  // Experience alignment (0..12)
  let expPoints = 6;
  if (
    profile.experienceYears >= job.minExp &&
    profile.experienceYears <= job.maxExp
  ) {
    expPoints = 12;
  } else if (
    Math.abs(profile.experienceYears - job.minExp) <= 1 ||
    Math.abs(profile.experienceYears - job.maxExp) <= 1
  ) {
    expPoints = 9;
  }

  // CTC alignment (0..7)
  const ctcAligned = job.maxLpa >= profile.expectedLpa * 0.9;
  const ctcPoints = ctcAligned ? 7 : job.maxLpa >= profile.currentLpa ? 4 : 1;

  // Notice period alignment (0..6)
  const candNoticeDays = noticePeriodToDays(profile.noticePeriod);
  const jobNoticeDays = noticePeriodToDays(job.noticePreference);
  const effectiveCandDays = profile.buyoutAvailable
    ? Math.max(0, candNoticeDays - 15)
    : candNoticeDays;
  const noticeAligned = effectiveCandDays <= jobNoticeDays;
  const noticePoints = noticeAligned ? 6 : 2;

  const score = Math.min(
    99,
    Math.max(25, skillPoints + rolePoints + expPoints + ctcPoints + noticePoints)
  );

  const fitReasons: string[] = [];
  if (matchedSkills.length > 0) {
    fitReasons.push(
      `${matchedSkills.length}/${job.skills.length} required skills matched`
    );
  }
  if (rolePoints >= 18) {
    fitReasons.push(`Direct role match for ${profile.targetRole}`);
  }
  if (ctcAligned) {
    fitReasons.push(`Budget ₹${job.minLpa}–${job.maxLpa} LPA covers your ₹${profile.expectedLpa} LPA target`);
  }
  if (noticeAligned) {
    fitReasons.push(`Notice period compatible (${job.noticePreference})`);
  }
  if (job.city === profile.currentCity || job.workMode === 'Remote') {
    fitReasons.push(
      job.workMode === 'Remote' ? 'Remote anywhere in India' : `Located in ${job.city}`
    );
  }

  return {
    score,
    matchedSkills,
    missingSkills,
    fitReasons,
    noticeAligned,
    ctcAligned,
  };
}

export function filterJobs(
  jobs: JobListing[],
  filters: JobFilters,
  profile: CandidateProfile
): Array<{ job: JobListing; match: JobMatchResult }> {
  const queryLower = filters.query.trim().toLowerCase();

  return jobs
    .map((job) => ({
      job,
      match: computeJobMatch(job, profile),
    }))
    .filter(({ job, match }) => {
      if (
        filters.roleCategory !== 'All Roles' &&
        job.roleCategory !== filters.roleCategory
      ) {
        return false;
      }
      if (
        filters.portalSource !== 'All Portals' &&
        job.portalSource !== filters.portalSource
      ) {
        return false;
      }
      if (filters.city !== 'All India' && job.city !== filters.city) {
        return false;
      }
      if (filters.workMode !== 'All' && job.workMode !== filters.workMode) {
        return false;
      }
      if (job.maxLpa < filters.minLpa) {
        return false;
      }
      if (match.score < filters.minMatch) {
        return false;
      }
      if (filters.maxNoticeDays < 999) {
        if (noticePeriodToDays(job.noticePreference) > filters.maxNoticeDays) {
          return false;
        }
      }
      if (filters.expBand !== 'any') {
        const [bandMin, bandMax] =
          filters.expBand === '0-2'
            ? [0, 2]
            : filters.expBand === '2-5'
            ? [2, 5]
            : filters.expBand === '5-8'
            ? [5, 8]
            : [8, 30];
        if (job.maxExp < bandMin || job.minExp > bandMax) {
          return false;
        }
      }
      if (queryLower) {
        const haystack = `${job.title} ${job.company} ${job.city} ${job.locality} ${job.skills.join(' ')} ${job.roleCategory}`.toLowerCase();
        if (!haystack.includes(queryLower)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => b.match.score - a.match.score);
}
