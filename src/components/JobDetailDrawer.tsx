import React, { useEffect, useState } from 'react';
import {
  Check,
  ExternalLink,
  Loader2,
  Send,
  Wand2,
  X,
} from 'lucide-react';
import {
  CandidateProfile,
  JobApplication,
  JobListing,
  JobMatchResult,
} from '../types/jobs';

interface JobDetailDrawerProps {
  job: JobListing | null;
  match: JobMatchResult | null;
  profile: CandidateProfile;
  existingApplication?: JobApplication;
  isQueued: boolean;
  onClose: () => void;
  onToggleQueue: (jobId: string) => void;
  onQuickApply: (
    job: JobListing,
    match: JobMatchResult,
    customDraft?: {
      subjectLine: string;
      coverNote: string;
      atsKeywords: string[];
      screeningSummary: string;
    }
  ) => Promise<void>;
}

export const JobDetailDrawer: React.FC<JobDetailDrawerProps> = ({
  job,
  match,
  profile,
  existingApplication,
  isQueued,
  onClose,
  onToggleQueue,
  onQuickApply,
}) => {
  const [tailoring, setTailoring] = useState(false);
  const [applying, setApplying] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [subjectLine, setSubjectLine] = useState('');
  const [coverNote, setCoverNote] = useState('');
  const [atsKeywords, setAtsKeywords] = useState<string[]>([]);
  const [screeningSummary, setScreeningSummary] = useState('');

  useEffect(() => {
    if (!job) return;
    setTailorError(null);
    if (existingApplication) {
      setSubjectLine(existingApplication.subjectLine);
      setCoverNote(existingApplication.coverNote);
      setAtsKeywords(existingApplication.atsKeywords);
      setScreeningSummary(existingApplication.screeningSummary);
    } else {
      setSubjectLine(
        `Application for ${job.title} — ${profile.fullName} (${profile.experienceYears} yrs, ${profile.noticePeriod})`
      );
      setCoverNote(
        `Hi Hiring Team at ${job.company},\n\nI am writing to apply for the ${job.title} role in ${job.city}. With ${profile.experienceYears} years of experience working with ${profile.skills.slice(0, 5).join(', ')}, I can contribute immediately to your engineering roadmap.\n\nMy notice period is ${profile.noticePeriod}${profile.buyoutAvailable ? ' (buyout available)' : ''} and my expected CTC is ₹${profile.expectedLpa} LPA.\n\nBest regards,\n${profile.fullName}`
      );
      setAtsKeywords(match?.matchedSkills.slice(0, 4) ?? []);
      setScreeningSummary(
        `${profile.experienceYears} yrs experience · Notice: ${profile.noticePeriod} · Expected CTC: ₹${profile.expectedLpa} LPA · Location: ${profile.currentCity}`
      );
    }
  }, [job, existingApplication, profile, match]);

  if (!job || !match) return null;

  const handleTailorWithAI = async () => {
    setTailoring(true);
    setTailorError(null);
    try {
      const res = await fetch('/api/applications/tailor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job,
          profile,
          includeNoticeAndCtc: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not tailor cover note.');
      }
      setSubjectLine(data.subjectLine || subjectLine);
      setCoverNote(data.coverNote || coverNote);
      if (Array.isArray(data.atsKeywords)) {
        setAtsKeywords(data.atsKeywords);
      }
      if (data.screeningSummary) {
        setScreeningSummary(data.screeningSummary);
      }
    } catch (err: unknown) {
      setTailorError(
        err instanceof Error ? err.message : 'Unable to tailor cover note.'
      );
    } finally {
      setTailoring(false);
    }
  };

  const handleApplyClick = async () => {
    setApplying(true);
    try {
      await onQuickApply(job, match, {
        subjectLine,
        coverNote,
        atsKeywords,
        screeningSummary,
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/35"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-job-title"
    >
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 w-full max-w-xl bg-white h-full border-l border-slate-200 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500">
              {job.company} · {job.portalSource} · {job.postedLabel}
            </p>
            <h2
              id="drawer-job-title"
              className="text-lg font-bold text-slate-900 mt-1 leading-snug"
            >
              {job.title}
            </h2>
            <p className="text-xs text-slate-600 mt-1.5 font-mono tabular-nums">
              {job.locality}, {job.city} · {job.workMode} · {job.minExp}–{job.maxExp} yrs · ₹{job.minLpa}–{job.maxLpa} LPA · Notice: {job.noticePreference}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close job details"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Role Match Summary */}
          <div className="pb-5 border-b border-slate-100 space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-semibold text-slate-900">
                Profile Alignment
              </span>
              <span
                className={`text-sm font-mono font-semibold tabular-nums ${
                  match.score >= 75
                    ? 'text-emerald-700'
                    : match.score >= 55
                    ? 'text-amber-700'
                    : 'text-slate-600'
                }`}
              >
                {match.score}% match
              </span>
            </div>

            <div className="text-xs text-slate-600 space-y-1">
              {match.fitReasons.map((reason) => (
                <div key={reason}>• {reason}</div>
              ))}
            </div>

            <div className="pt-1 space-y-1.5 text-xs">
              <div>
                <span className="font-medium text-slate-700">Matched skills: </span>
                <span className="text-slate-600">
                  {match.matchedSkills.length > 0
                    ? match.matchedSkills.join(' · ')
                    : 'None directly listed'}
                </span>
              </div>
              {match.missingSkills.length > 0 && (
                <div>
                  <span className="font-medium text-slate-700">Gaps to address: </span>
                  <span className="text-slate-500">
                    {match.missingSkills.join(' · ')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description & Highlights */}
          <div className="pb-5 border-b border-slate-100 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Role Overview
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">
              {job.description}
            </p>
            <ul className="space-y-1.5 text-xs text-slate-600 pt-1">
              {job.highlights.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          {/* Tailored Application Pitch */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Application Outreach & Screening Note
              </h3>
              {!existingApplication && (
                <button
                  type="button"
                  onClick={handleTailorWithAI}
                  disabled={tailoring}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  {tailoring ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  {tailoring ? 'Tailoring...' : 'Tailor Pitch'}
                </button>
              )}
            </div>

            {tailorError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {tailorError}
              </p>
            )}

            <div className="space-y-2.5">
              <div>
                <label
                  htmlFor="drawer-subject"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Subject Line
                </label>
                <input
                  id="drawer-subject"
                  type="text"
                  value={subjectLine}
                  onChange={(e) => setSubjectLine(e.target.value)}
                  disabled={Boolean(existingApplication)}
                  className="w-full h-9 px-3 text-xs border border-slate-200 rounded-lg text-slate-900 bg-white focus:outline-none focus:border-blue-600 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label
                  htmlFor="drawer-cover-note"
                  className="block text-xs font-medium text-slate-700 mb-1"
                >
                  Cover Note
                </label>
                <textarea
                  id="drawer-cover-note"
                  rows={5}
                  value={coverNote}
                  onChange={(e) => setCoverNote(e.target.value)}
                  disabled={Boolean(existingApplication)}
                  className="w-full p-3 text-xs leading-relaxed border border-slate-200 rounded-lg text-slate-800 bg-white focus:outline-none focus:border-blue-600 disabled:bg-slate-50"
                />
              </div>

              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-700">Screening summary: </span>
                {screeningSummary}
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Drawer Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <a
            href={job.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4 whitespace-nowrap shrink-0"
          >
            Company Career Link
            <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
          </a>

          <div className="flex items-center gap-2.5">
            {!existingApplication && (
              <button
                type="button"
                onClick={() => onToggleQueue(job.id)}
                className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isQueued
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                {isQueued ? 'In Auto-Apply Queue' : 'Add to Queue'}
              </button>
            )}

            {existingApplication ? (
              <span className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg whitespace-nowrap shrink-0">
                <Check className="w-3.5 h-3.5" />
                Applied ({existingApplication.stage})
              </span>
            ) : (
              <button
                type="button"
                onClick={handleApplyClick}
                disabled={applying}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {applying ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                {applying ? 'Submitting...' : 'Quick Apply Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
