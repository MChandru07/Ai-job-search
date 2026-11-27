import React, { useState } from 'react';
import {
  Check,
  ExternalLink,
  FileText,
  Globe,
  Loader2,
  Plug,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import {
  CandidateProfile,
  JobApplication,
  JobFilters,
  JobListing,
  JobMatchResult,
} from '../types/jobs';
import { FilterSidebar } from './FilterSidebar';

interface JobsWorkspaceProps {
  profile: CandidateProfile;
  filters: JobFilters;
  onFiltersChange: (next: JobFilters) => void;
  onResetFilters: () => void;
  filteredJobs: Array<{ job: JobListing; match: JobMatchResult }>;
  queuedJobIds: string[];
  applicationsByJobId: Record<string, JobApplication>;
  onToggleQueue: (jobId: string) => void;
  onQueueAllHighMatch: () => void;
  onOpenJobDetail: (job: JobListing, match: JobMatchResult) => void;
  onQuickApply: (job: JobListing, match: JobMatchResult) => Promise<void>;
  onSearchLiveJobs: () => Promise<void>;
  onRefreshAllJobs: () => Promise<void>;
  refreshingAllJobs: boolean;
  lastRefreshedAt: string | null;
  autoRefreshEnabled: boolean;
  onToggleAutoRefresh: () => void;
  refreshError: string | null;
  onOpenMcpHub: () => void;
  onOpenResumeProfile: () => void;
  liveSearching: boolean;
  liveSearchError: string | null;
  liveSources: Array<{ uri: string; title?: string }>;
}

export const JobsWorkspace: React.FC<JobsWorkspaceProps> = ({
  profile,
  filters,
  onFiltersChange,
  onResetFilters,
  filteredJobs,
  queuedJobIds,
  applicationsByJobId,
  onToggleQueue,
  onQueueAllHighMatch,
  onOpenJobDetail,
  onQuickApply,
  onSearchLiveJobs,
  onRefreshAllJobs,
  refreshingAllJobs,
  lastRefreshedAt,
  autoRefreshEnabled,
  onToggleAutoRefresh,
  refreshError,
  onOpenMcpHub,
  onOpenResumeProfile,
  liveSearching,
  liveSearchError,
  liveSources,
}) => {
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const highFitCount = filteredJobs.filter((item) => item.match.score >= 75).length;
  const appliedCount = Object.keys(applicationsByJobId).length;
  const unappliedHighFitCount = filteredJobs.filter(
    (item) => item.match.score >= 75 && !applicationsByJobId[item.job.id]
  ).length;

  const handleSingleQuickApply = async (
    job: JobListing,
    match: JobMatchResult
  ) => {
    setApplyingJobId(job.id);
    try {
      await onQuickApply(job, match);
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Header & KPI Strip */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
              Indian Jobs Matched to Your Role
            </h1>
            <p className="text-sm text-slate-600">
              Active target: <span className="font-medium text-slate-900">{profile.targetRole}</span> · {profile.experienceYears} yrs experience · {profile.noticePeriod} notice · Expected ₹{profile.expectedLpa} LPA
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 pt-0.5">
              <button
                type="button"
                onClick={onOpenResumeProfile}
                className="inline-flex items-center gap-1.5 text-blue-700 hover:underline font-medium cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                {profile.resumeFileName
                  ? `Resume attached: ${profile.resumeFileName}`
                  : 'Upload PDF / TXT Resume'}
              </button>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <button
                type="button"
                onClick={onOpenMcpHub}
                className="inline-flex items-center gap-1.5 text-slate-700 hover:text-slate-900 hover:underline font-medium cursor-pointer"
              >
                <Plug className="w-3.5 h-3.5" aria-hidden="true" />
                Connect Indeed, Glassdoor, LinkedIn & Remote MCPs
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenMcpHub}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Plug className="w-4 h-4 text-slate-600" />
              Job MCPs
            </button>

            <button
              type="button"
              onClick={onRefreshAllJobs}
              disabled={refreshingAllJobs}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <RefreshCw
                className={`w-4 h-4 text-blue-600 ${
                  refreshingAllJobs ? 'animate-spin' : ''
                }`}
              />
              {refreshingAllJobs ? 'Refreshing Jobs...' : 'Refresh All Jobs'}
            </button>

            <button
              type="button"
              onClick={onSearchLiveJobs}
              disabled={liveSearching}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-medium text-slate-800 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              {liveSearching ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <Globe className="w-4 h-4 text-blue-600" />
              )}
              {liveSearching ? 'Searching Indian Web...' : 'Discover Live Jobs'}
            </button>

            <button
              type="button"
              onClick={onQueueAllHighMatch}
              disabled={unappliedHighFitCount === 0}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              Queue {unappliedHighFitCount} High-Match Roles
            </button>
          </div>
        </div>

        {/* 4-column full-width KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Matched Openings</p>
            <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {filteredJobs.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">High Fit (75%+ Match)</p>
            <p className="text-xl font-bold font-mono tabular-nums text-emerald-700 mt-0.5">
              {highFitCount}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Queued for Auto-Apply</p>
            <p className="text-xl font-bold font-mono tabular-nums text-blue-600 mt-0.5">
              {queuedJobIds.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Applied</p>
            <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {appliedCount}
            </p>
          </div>
        </div>
      </section>

      {/* Main Split Workspace: Left Filter Rail + Right Job Feed */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Mobile filter toggle */}
        <div className="w-full lg:hidden">
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-800 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-slate-500" />
              Filters & Target Role
            </span>
            <span className="text-xs font-mono text-slate-500 tabular-nums">
              {filteredJobs.length} results
            </span>
          </button>
        </div>

        <div className={`${mobileFiltersOpen ? 'block w-full' : 'hidden'} lg:block`}>
          <FilterSidebar
            filters={filters}
            onChange={onFiltersChange}
            onReset={onResetFilters}
            totalMatching={filteredJobs.length}
          />
        </div>

        {/* Job Feed Column */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Search Input Bar */}
          <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" aria-hidden="true" />
            <input
              type="text"
              value={filters.query}
              onChange={(e) =>
                onFiltersChange({ ...filters, query: e.target.value })
              }
              placeholder="Search role title, company (Razorpay, Zerodha, Swiggy), city, portal, or skill..."
              aria-label="Search jobs"
              className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
            />
            {filters.query && (
              <button
                type="button"
                onClick={() => onFiltersChange({ ...filters, query: '' })}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 px-2 py-1 cursor-pointer whitespace-nowrap shrink-0"
              >
                Clear
              </button>
            )}
          </div>

          {/* Feed Auto-Refresh Control Bar */}
          <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-slate-600 font-mono tabular-nums">
              {refreshingAllJobs ? (
                <span className="text-blue-700 font-sans font-medium">
                  Refreshing live Indian ATS & Remote job feeds...
                </span>
              ) : (
                <span>
                  <span className="font-semibold text-slate-900">
                    {filteredJobs.length}
                  </span>{' '}
                  openings
                  {lastRefreshedAt ? ` · Last refreshed at ${lastRefreshedAt}` : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoRefreshEnabled}
                  onChange={onToggleAutoRefresh}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Auto-refresh every time</span>
              </label>

              <button
                type="button"
                onClick={onRefreshAllJobs}
                disabled={refreshingAllJobs}
                className="inline-flex items-center gap-1.5 font-medium text-blue-700 hover:text-blue-800 hover:underline disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    refreshingAllJobs ? 'animate-spin' : ''
                  }`}
                />
                {refreshingAllJobs ? 'Refreshing...' : 'Refresh Now'}
              </button>
            </div>
          </div>

          {/* Refresh Error Banner */}
          {refreshError && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700"
            >
              <span className="font-semibold">Feed refresh error:</span> {refreshError}
            </div>
          )}

          {/* Live Search Error Banner */}
          {liveSearchError && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-xs text-red-700"
            >
              <span className="font-semibold">Live search error:</span> {liveSearchError}
            </div>
          )}

          {/* Grounded Web Sources Strip */}
          {liveSources.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="font-semibold text-slate-800">Live web sources:</span>
              {liveSources.map((src, i) => (
                <a
                  key={`${src.uri}-${i}`}
                  href={src.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-700 hover:underline"
                >
                  {src.title || src.uri}
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}

          {/* Jobs List */}
          {filteredJobs.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
              <h3 className="text-base font-semibold text-slate-900">
                No Indian openings match these filters
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Widen your minimum CTC, notice period window, or sync fresh openings from Job MCPs.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Reset Filters
                </button>
                <button
                  type="button"
                  onClick={onOpenMcpHub}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
                >
                  Sync Job MCPs
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200">
              {filteredJobs.map(({ job, match }) => {
                const existingApp = applicationsByJobId[job.id];
                const isQueued = queuedJobIds.includes(job.id);
                const isApplying = applyingJobId === job.id;

                return (
                  <article
                    key={job.id}
                    className="p-5 hover:bg-slate-50/70 transition-colors duration-150"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      {/* Left Content */}
                      <div className="min-w-0 flex-1 space-y-2">
                        {/* Quiet 1-line text kicker */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                          <span className="font-semibold text-slate-800">
                            {job.company}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {job.locality}, {job.city}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{job.workMode}</span>
                          <span aria-hidden="true">·</span>
                          <span>{job.portalSource}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {job.postedLabel}
                          </span>
                        </div>

                        {/* Title & Match % */}
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenJobDetail(job, match)}
                            className="text-left text-base font-semibold text-slate-900 hover:text-blue-700 transition-colors cursor-pointer"
                          >
                            {job.title}
                          </button>

                          <span
                            className={`text-xs font-mono font-semibold tabular-nums shrink-0 ${
                              match.score >= 75
                                ? 'text-emerald-700'
                                : match.score >= 55
                                ? 'text-amber-700'
                                : 'text-slate-500'
                            }`}
                          >
                            {match.score}% role match
                          </span>
                        </div>

                        {/* Compensation, Experience & Notice line */}
                        <p className="text-xs font-mono text-slate-700 tabular-nums">
                          ₹{job.minLpa}–{job.maxLpa} LPA · {job.minExp}–{job.maxExp} yrs exp · Notice: {job.noticePreference}
                        </p>

                        {/* Description */}
                        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                          {job.description}
                        </p>

                        {/* Unboxed inline skills */}
                        <p className="text-xs text-slate-500 pt-0.5">
                          <span className="font-medium text-slate-700">Skills: </span>
                          {job.skills.map((skill, idx) => {
                            const isMatched = match.matchedSkills.includes(skill);
                            return (
                              <React.Fragment key={skill}>
                                {idx > 0 && <span aria-hidden="true"> · </span>}
                                <span
                                  className={
                                    isMatched
                                      ? 'text-slate-900 font-medium'
                                      : 'text-slate-500'
                                  }
                                >
                                  {skill}
                                </span>
                              </React.Fragment>
                            );
                          })}
                        </p>
                      </div>

                      {/* Right Actions */}
                      <div className="flex md:flex-col items-center md:items-end gap-2 shrink-0 pt-1 md:pt-0">
                        {existingApp ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg whitespace-nowrap shrink-0">
                            <Check className="w-3.5 h-3.5" />
                            Applied · {existingApp.mode}
                          </span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onToggleQueue(job.id)}
                              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                                isQueued
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              {isQueued ? 'Queued' : 'Add to Queue'}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSingleQuickApply(job, match)}
                              disabled={isApplying}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                            >
                              {isApplying && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              )}
                              {isApplying ? 'Applying...' : 'Quick Apply'}
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-3 text-xs">
                          <button
                            type="button"
                            onClick={() => onOpenJobDetail(job, match)}
                            className="text-slate-600 hover:text-slate-900 underline underline-offset-4 cursor-pointer whitespace-nowrap"
                          >
                            View details
                          </button>
                          <a
                            href={job.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 whitespace-nowrap"
                          >
                            Portal
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
