import React, { useState } from 'react';
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Pause,
  Play,
  Trash2,
  XCircle,
} from 'lucide-react';
import {
  AutoApplyRules,
  CandidateProfile,
  JobApplication,
  JobListing,
  JobMatchResult,
} from '../types/jobs';

export interface QueueExecutionItem {
  job: JobListing;
  match: JobMatchResult;
  status: 'Queued' | 'Tailoring' | 'Applied' | 'Failed';
  error?: string;
  application?: JobApplication;
}

interface AutoApplyPanelProps {
  profile: CandidateProfile;
  rules: AutoApplyRules;
  onUpdateRules: (next: AutoApplyRules) => void;
  queuedJobs: Array<{ job: JobListing; match: JobMatchResult }>;
  executionState: Record<
    string,
    {
      status: 'Queued' | 'Tailoring' | 'Applied' | 'Failed';
      error?: string;
      application?: JobApplication;
    }
  >;
  isRunning: boolean;
  onStartAutoApply: () => Promise<void>;
  onPauseAutoApply: () => void;
  onRemoveFromQueue: (jobId: string) => void;
  onClearQueue: () => void;
  onAutoFillQueue: () => void;
  onOpenApplications: () => void;
}

export const AutoApplyPanel: React.FC<AutoApplyPanelProps> = ({
  profile,
  rules,
  onUpdateRules,
  queuedJobs,
  executionState,
  isRunning,
  onStartAutoApply,
  onPauseAutoApply,
  onRemoveFromQueue,
  onClearQueue,
  onAutoFillQueue,
  onOpenApplications,
}) => {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  const completedCount = queuedJobs.filter(
    (q) => executionState[q.job.id]?.status === 'Applied'
  ).length;

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Role-Matched Auto-Apply Queue
          </h1>
          <p className="text-sm text-slate-600">
            Tailor role-specific cover notes and submit batch applications for{' '}
            <span className="font-medium text-slate-900">{profile.targetRole}</span>{' '}
            using your {profile.noticePeriod} notice period and ₹{profile.expectedLpa} LPA expectation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onAutoFillQueue}
            disabled={isRunning}
            className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            Auto-Fill ≥ {rules.minMatchThreshold}% Match
          </button>

          {isRunning ? (
            <button
              type="button"
              onClick={onPauseAutoApply}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Pause className="w-3.5 h-3.5" />
              Pause Batch
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartAutoApply}
              disabled={queuedJobs.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            >
              <Play className="w-3.5 h-3.5" />
              Start Auto-Apply ({Math.min(queuedJobs.length, rules.maxBatchSize)})
            </button>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Auto-Apply Rules */}
        <section className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Automation Rules
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Applies up to your batch limit in priority match order.
            </p>
            <p className="text-xs text-slate-700 mt-2">
              <span className="font-medium">Resume attached:</span>{' '}
              {profile.resumeFileName ? profile.resumeFileName : 'Profile Summary'}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <label htmlFor="rule-threshold" className="font-medium text-slate-700">
                Minimum Role Match %
              </label>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {rules.minMatchThreshold}%
              </span>
            </div>
            <input
              id="rule-threshold"
              type="range"
              min={50}
              max={90}
              step={5}
              value={rules.minMatchThreshold}
              onChange={(e) =>
                onUpdateRules({
                  ...rules,
                  minMatchThreshold: Number(e.target.value),
                })
              }
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="rule-batch" className="block text-xs font-medium text-slate-700">
              Max Applications Per Batch
            </label>
            <select
              id="rule-batch"
              value={rules.maxBatchSize}
              onChange={(e) =>
                onUpdateRules({
                  ...rules,
                  maxBatchSize: Number(e.target.value),
                })
              }
              className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600"
            >
              <option value={3}>3 applications</option>
              <option value={5}>5 applications</option>
              <option value={10}>10 applications</option>
              <option value={15}>15 applications</option>
            </select>
          </div>

          <div className="space-y-3 pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rules.includeAiCoverNote}
                onChange={(e) =>
                  onUpdateRules({
                    ...rules,
                    includeAiCoverNote: e.target.checked,
                  })
                }
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                Generate tailored recruiter pitch & ATS keywords per job before applying
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rules.includeNoticeAndCtc}
                onChange={(e) =>
                  onUpdateRules({
                    ...rules,
                    includeNoticeAndCtc: e.target.checked,
                  })
                }
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                Include notice period ({profile.noticePeriod}) & expected CTC (₹{profile.expectedLpa} LPA) in outreach
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={rules.onlyMatchingCities}
                onChange={(e) =>
                  onUpdateRules({
                    ...rules,
                    onlyMatchingCities: e.target.checked,
                  })
                }
                className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
              />
              <span className="text-xs text-slate-700 leading-relaxed">
                Restrict auto-fill to {profile.currentCity} or Remote India roles
              </span>
            </label>
          </div>

          {completedCount > 0 && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-emerald-700 font-medium tabular-nums">
                {completedCount} submitted in this batch
              </span>
              <button
                type="button"
                onClick={onOpenApplications}
                className="font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                View Tracker
              </button>
            </div>
          )}
        </section>

        {/* Right: Execution Queue Table */}
        <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Queued Openings ({queuedJobs.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any completed row to inspect the tailored recruiter note.
              </p>
            </div>
            {queuedJobs.length > 0 && !isRunning && (
              <button
                type="button"
                onClick={onClearQueue}
                className="text-xs font-medium text-slate-600 hover:text-red-600 cursor-pointer whitespace-nowrap shrink-0"
              >
                Clear Queue
              </button>
            )}
          </div>

          {queuedJobs.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Your auto-apply queue is empty
              </h3>
              <p className="text-xs text-slate-600 max-w-sm mx-auto">
                Add roles from the Jobs Feed or click Auto-Fill to select all Indian openings matching {rules.minMatchThreshold}% or higher.
              </p>
              <button
                type="button"
                onClick={onAutoFillQueue}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Auto-Fill Queue
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {queuedJobs.map(({ job, match }, index) => {
                const state = executionState[job.id] ?? { status: 'Queued' };
                const isWithinBatch = index < rules.maxBatchSize;
                const isExpanded = expandedJobId === job.id;

                return (
                  <div key={job.id} className="px-5 py-3.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400 tabular-nums w-5">
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {job.title}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 pl-7 font-mono tabular-nums mt-0.5">
                          {job.company} · {job.city} · ₹{job.minLpa}–{job.maxLpa} LPA · {match.score}% match
                          {!isWithinBatch && ' · Outside current batch cap'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 pl-7 sm:pl-0 shrink-0">
                        {state.status === 'Queued' && (
                          <span className="text-xs font-medium text-slate-500">
                            Queued
                          </span>
                        )}
                        {state.status === 'Tailoring' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Tailoring & Applying
                          </span>
                        )}
                        {state.status === 'Applied' && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedJobId(isExpanded ? null : job.id)
                            }
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Applied · View Pitch
                          </button>
                        )}
                        {state.status === 'Failed' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
                            <XCircle className="w-3.5 h-3.5" />
                            Failed
                          </span>
                        )}

                        {state.status === 'Queued' && !isRunning && (
                          <button
                            type="button"
                            onClick={() => onRemoveFromQueue(job.id)}
                            aria-label={`Remove ${job.title} from queue`}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {state.error && (
                      <p className="mt-2 ml-7 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-1.5">
                        {state.error}
                      </p>
                    )}

                    {isExpanded && state.application && (
                      <div className="mt-3 ml-7 p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900">
                            {state.application.subjectLine}
                          </span>
                          <a
                            href={state.application.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-700 hover:underline shrink-0"
                          >
                            Career Portal
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                        <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                          {state.application.coverNote}
                        </p>
                        <p className="text-slate-500">
                          <span className="font-medium text-slate-700">ATS Keywords: </span>
                          {state.application.atsKeywords.join(' · ')}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
