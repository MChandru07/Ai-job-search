import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApplicationsTracker } from './components/ApplicationsTracker';
import { AutoApplyPanel } from './components/AutoApplyPanel';
import { CandidateProfileView } from './components/CandidateProfileView';
import { JobDetailDrawer } from './components/JobDetailDrawer';
import { JobsWorkspace } from './components/JobsWorkspace';
import { McpHubView } from './components/McpHubView';
import { ActiveTab, TopBar } from './components/TopBar';
import {
  DEFAULT_CANDIDATE_PROFILE,
  INITIAL_INDIAN_JOBS,
} from './data/indianJobs';
import { DEFAULT_MCP_CONNECTORS } from './data/mcpConnectors';
import {
  ApplicationStage,
  AutoApplyRules,
  CandidateProfile,
  JobApplication,
  JobFilters,
  JobListing,
  JobMatchResult,
  McpConnector,
} from './types/jobs';
import { computeJobMatch, filterJobs } from './utils/matching';

const STORAGE_KEYS = {
  profile: 'bharatrole_profile_v1',
  applications: 'bharatrole_applications_v1',
  queue: 'bharatrole_queue_v1',
  liveJobs: 'bharatrole_live_jobs_v1',
  rules: 'bharatrole_rules_v1',
  connectors: 'bharatrole_mcp_connectors_v1',
  autoRefresh: 'bharatrole_auto_refresh_v1',
  lastRefreshedAt: 'bharatrole_last_refreshed_v1',
};

const DEFAULT_FILTERS: JobFilters = {
  query: '',
  roleCategory: 'All Roles',
  city: 'All India',
  workMode: 'All',
  expBand: 'any',
  minLpa: 6,
  maxNoticeDays: 999,
  minMatch: 0,
  portalSource: 'All Portals',
};

const DEFAULT_RULES: AutoApplyRules = {
  minMatchThreshold: 75,
  maxBatchSize: 5,
  includeAiCoverNote: true,
  includeNoticeAndCtc: true,
  onlyMatchingCities: false,
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('jobs');

  const [profile, setProfile] = useState<CandidateProfile>(() =>
    loadJson(STORAGE_KEYS.profile, DEFAULT_CANDIDATE_PROFILE)
  );
  const [applications, setApplications] = useState<JobApplication[]>(() =>
    loadJson(STORAGE_KEYS.applications, [])
  );
  const [queuedJobIds, setQueuedJobIds] = useState<string[]>(() =>
    loadJson(STORAGE_KEYS.queue, [])
  );
  const [liveJobs, setLiveJobs] = useState<JobListing[]>(() =>
    loadJson(STORAGE_KEYS.liveJobs, [])
  );
  const [rules, setRules] = useState<AutoApplyRules>(() =>
    loadJson(STORAGE_KEYS.rules, DEFAULT_RULES)
  );
  const [connectors, setConnectors] = useState<McpConnector[]>(() => {
    const saved = loadJson<McpConnector[]>(STORAGE_KEYS.connectors, []);
    const savedById = new Map(saved.map((c) => [c.id, c]));
    const mergedDefaults = DEFAULT_MCP_CONNECTORS.map((def) => {
      const prev = savedById.get(def.id);
      return prev
        ? {
            ...def,
            transport:
              prev.transport === 'custom-mcp-http' ||
              prev.transport === 'custom-rest-json'
                ? prev.transport
                : def.transport,
            endpointUrl:
              prev.transport === 'custom-mcp-http' ||
              prev.transport === 'custom-rest-json'
                ? prev.endpointUrl
                : def.endpointUrl,
            syncedCount: prev.syncedCount,
            lastSyncedAt: prev.lastSyncedAt,
            status: prev.status,
          }
        : def;
    });
    const customOnly = saved.filter((c) => c.category === 'Custom MCP');
    return [...customOnly, ...mergedDefaults];
  });

  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);
  const [selectedJob, setSelectedJob] = useState<{
    job: JobListing;
    match: JobMatchResult;
  } | null>(null);

  const [liveSearching, setLiveSearching] = useState(false);
  const [liveSearchError, setLiveSearchError] = useState<string | null>(null);
  const [liveSources, setLiveSources] = useState<
    Array<{ uri: string; title?: string }>
  >([]);

  const [syncingIds, setSyncingIds] = useState<Record<string, boolean>>({});
  const [refreshingAllJobs, setRefreshingAllJobs] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(() =>
    loadJson(STORAGE_KEYS.autoRefresh, true)
  );
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(() =>
    loadJson(STORAGE_KEYS.lastRefreshedAt, null)
  );

  const [isAutoApplying, setIsAutoApplying] = useState(false);
  const pauseRequestedRef = useRef(false);
  const refreshSeqRef = useRef(0);
  const lastRefreshTsRef = useRef(0);
  const hasMountedFilterEffectRef = useRef(false);
  const [executionState, setExecutionState] = useState<
    Record<
      string,
      {
        status: 'Queued' | 'Tailoring' | 'Applied' | 'Failed';
        error?: string;
        application?: JobApplication;
      }
    >
  >({});

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.applications,
      JSON.stringify(applications)
    );
  }, [applications]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(queuedJobIds));
  }, [queuedJobIds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.liveJobs, JSON.stringify(liveJobs));
  }, [liveJobs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.rules, JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.connectors, JSON.stringify(connectors));
  }, [connectors]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.autoRefresh,
      JSON.stringify(autoRefreshEnabled)
    );
  }, [autoRefreshEnabled]);

  useEffect(() => {
    if (lastRefreshedAt) {
      localStorage.setItem(
        STORAGE_KEYS.lastRefreshedAt,
        JSON.stringify(lastRefreshedAt)
      );
    }
  }, [lastRefreshedAt]);

  const allJobs = useMemo(() => {
    return [...liveJobs, ...INITIAL_INDIAN_JOBS];
  }, [liveJobs]);

  const filteredJobs = useMemo(
    () => filterJobs(allJobs, filters, profile),
    [allJobs, filters, profile]
  );

  const applicationsByJobId = useMemo(() => {
    const map: Record<string, JobApplication> = {};
    for (const app of applications) {
      map[app.jobId] = app;
    }
    return map;
  }, [applications]);

  const connectorsRef = useRef(connectors);
  connectorsRef.current = connectors;

  const applicationsByJobIdRef = useRef(applicationsByJobId);
  applicationsByJobIdRef.current = applicationsByJobId;

  const queuedJobIdsRef = useRef(queuedJobIds);
  queuedJobIdsRef.current = queuedJobIds;

  const highMatchCount = useMemo(() => {
    return allJobs.filter((job) => computeJobMatch(job, profile).score >= 75)
      .length;
  }, [allJobs, profile]);

  const queuedJobsWithMatch = useMemo(() => {
    return queuedJobIds
      .map((id) => allJobs.find((j) => j.id === id))
      .filter((j): j is JobListing => Boolean(j))
      .map((job) => ({ job, match: computeJobMatch(job, profile) }))
      .sort((a, b) => b.match.score - a.match.score);
  }, [queuedJobIds, allJobs, profile]);

  const createDeterministicDraft = (
    job: JobListing,
    match: JobMatchResult,
    includeNoticeAndCtc: boolean
  ) => {
    const skillsText =
      match.matchedSkills.length > 0
        ? match.matchedSkills.join(', ')
        : profile.skills.slice(0, 4).join(', ');
    const noticeLine = includeNoticeAndCtc
      ? `\n\nMy notice period is ${profile.noticePeriod}${profile.buyoutAvailable ? ' (buyout available)' : ''} and my expected CTC is ₹${profile.expectedLpa} LPA.`
      : '';
    const resumeLine = profile.resumeFileName
      ? ` Attached resume: ${profile.resumeFileName}.`
      : '';
    return {
      subjectLine: `Application for ${job.title} — ${profile.fullName} (${profile.experienceYears} yrs)`,
      coverNote: `Hi Hiring Team at ${job.company},\n\nI am applying for the ${job.title} opening in ${job.city}. Over ${profile.experienceYears} years I have built production systems using ${skillsText}, aligning closely with your team's stack.${resumeLine}${noticeLine}\n\nRegards,\n${profile.fullName}`,
      atsKeywords: match.matchedSkills.slice(0, 4),
      screeningSummary: `${profile.experienceYears} yrs exp · Notice: ${profile.noticePeriod} · Expected CTC: ₹${profile.expectedLpa} LPA · ${profile.currentCity}`,
    };
  };

  const recordApplication = (
    job: JobListing,
    match: JobMatchResult,
    mode: 'Auto-Apply' | 'Quick Apply',
    draft: {
      subjectLine: string;
      coverNote: string;
      atsKeywords: string[];
      screeningSummary: string;
    }
  ): JobApplication => {
    const newApp: JobApplication = {
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      city: `${job.city} (${job.workMode})`,
      ctcRange: `₹${job.minLpa}–${job.maxLpa} LPA`,
      portalSource: job.portalSource,
      matchScore: match.score,
      stage: 'Applied',
      appliedAt: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }),
      mode,
      subjectLine: draft.subjectLine,
      coverNote: draft.coverNote,
      atsKeywords: draft.atsKeywords,
      screeningSummary: draft.screeningSummary,
      followUpNote: '',
      applyUrl: job.applyUrl,
    };

    setApplications((prev) => [
      newApp,
      ...prev.filter((existing) => existing.jobId !== job.id),
    ]);
    setQueuedJobIds((prev) => prev.filter((id) => id !== job.id));
    return newApp;
  };

  const handleQuickApply = async (
    job: JobListing,
    match: JobMatchResult,
    customDraft?: {
      subjectLine: string;
      coverNote: string;
      atsKeywords: string[];
      screeningSummary: string;
    }
  ) => {
    const draft =
      customDraft ??
      createDeterministicDraft(job, match, rules.includeNoticeAndCtc);
    recordApplication(job, match, 'Quick Apply', draft);
  };

  const handleToggleQueue = (jobId: string) => {
    if (applicationsByJobId[jobId]) return;
    setQueuedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  const handleQueueAllHighMatch = () => {
    const eligible = filteredJobs
      .filter(
        ({ job, match }) =>
          match.score >= 75 &&
          !applicationsByJobId[job.id] &&
          !queuedJobIds.includes(job.id)
      )
      .map(({ job }) => job.id);

    if (eligible.length > 0) {
      setQueuedJobIds((prev) => [...prev, ...eligible]);
    }
    setActiveTab('auto-apply');
  };

  const handleAutoFillQueue = () => {
    const eligible = allJobs
      .map((job) => ({ job, match: computeJobMatch(job, profile) }))
      .filter(({ job, match }) => {
        if (applicationsByJobId[job.id]) return false;
        if (match.score < rules.minMatchThreshold) return false;
        if (
          rules.onlyMatchingCities &&
          job.city !== profile.currentCity &&
          job.workMode !== 'Remote'
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.match.score - a.match.score)
      .map(({ job }) => job.id);

    setQueuedJobIds(eligible);
    setExecutionState({});
  };

  const handleStartAutoApply = async () => {
    if (queuedJobsWithMatch.length === 0) return;
    pauseRequestedRef.current = false;
    setIsAutoApplying(true);

    const batch = queuedJobsWithMatch.slice(0, rules.maxBatchSize);

    for (const { job, match } of batch) {
      if (pauseRequestedRef.current) break;
      if (applicationsByJobId[job.id]) continue;

      setExecutionState((prev) => ({
        ...prev,
        [job.id]: { status: 'Tailoring' },
      }));

      try {
        let draft = createDeterministicDraft(
          job,
          match,
          rules.includeNoticeAndCtc
        );

        if (rules.includeAiCoverNote) {
          const res = await fetch('/api/applications/tailor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              job,
              profile,
              includeNoticeAndCtc: rules.includeNoticeAndCtc,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to tailor application.');
          }
          draft = {
            subjectLine: data.subjectLine || draft.subjectLine,
            coverNote: data.coverNote || draft.coverNote,
            atsKeywords: Array.isArray(data.atsKeywords)
              ? data.atsKeywords
              : draft.atsKeywords,
            screeningSummary: data.screeningSummary || draft.screeningSummary,
          };
        }

        const createdApp = recordApplication(job, match, 'Auto-Apply', draft);

        setExecutionState((prev) => ({
          ...prev,
          [job.id]: { status: 'Applied', application: createdApp },
        }));
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Auto-apply request failed.';
        setExecutionState((prev) => ({
          ...prev,
          [job.id]: { status: 'Failed', error: message },
        }));
      }
    }

    setIsAutoApplying(false);
  };

  const handlePauseAutoApply = () => {
    pauseRequestedRef.current = true;
    setIsAutoApplying(false);
  };

  const mergeSyncedJobs = (incoming: JobListing[]) => {
    setLiveJobs((prev) => {
      const existingKeys = new Set(
        prev.map((j) => `${j.company.toLowerCase()}::${j.title.toLowerCase()}`)
      );
      const fresh = incoming.filter(
        (j) =>
          !existingKeys.has(
            `${j.company.toLowerCase()}::${j.title.toLowerCase()}`
          )
      );
      return [...fresh, ...prev];
    });
  };

  const handleSearchLiveJobs = async () => {
    setLiveSearching(true);
    setLiveSearchError(null);
    try {
      const roleToSearch =
        filters.roleCategory !== 'All Roles'
          ? filters.roleCategory
          : profile.targetRole;
      const res = await fetch('/api/jobs/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: roleToSearch,
          city: filters.city,
          experienceYears: profile.experienceYears,
          minLpa: filters.minLpa,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Live Indian job discovery failed.');
      }

      if (Array.isArray(data.jobs)) {
        mergeSyncedJobs(data.jobs as JobListing[]);
      }
      if (Array.isArray(data.sources)) {
        setLiveSources(data.sources);
      }
    } catch (err: unknown) {
      setLiveSearchError(
        err instanceof Error ? err.message : 'Live job search failed.'
      );
    } finally {
      setLiveSearching(false);
    }
  };

  const handleSyncConnector = async (connector: McpConnector) => {
    setSyncingIds((prev) => ({ ...prev, [connector.id]: true }));
    try {
      const roleToSearch =
        filters.roleCategory !== 'All Roles'
          ? filters.roleCategory
          : profile.targetRole;
      const res = await fetch('/api/mcp/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connector,
          role: roleToSearch,
          city: filters.city,
          experienceYears: profile.experienceYears,
          minLpa: filters.minLpa,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to sync ${connector.name}`);
      }

      const incoming = Array.isArray(data.jobs) ? (data.jobs as JobListing[]) : [];
      mergeSyncedJobs(incoming);

      if (Array.isArray(data.sources) && data.sources.length > 0) {
        setLiveSources(data.sources);
      }

      const syncedTime = new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === connector.id
            ? {
                ...c,
                syncedCount: incoming.length,
                lastSyncedAt: syncedTime,
                status: 'Synced',
                lastError: undefined,
              }
            : c
        )
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : `Sync failed for ${connector.name}`;
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === connector.id
            ? { ...c, status: 'Error', lastError: message }
            : c
        )
      );
    } finally {
      setSyncingIds((prev) => ({ ...prev, [connector.id]: false }));
    }
  };

  const refreshAllJobs = useCallback(
    async (override?: { role?: string; city?: string }) => {
      const seq = ++refreshSeqRef.current;
      const openFeeds = connectorsRef.current.filter(
        (c) =>
          c.transport === 'live-api' ||
          c.transport === 'custom-mcp-http' ||
          c.transport === 'custom-rest-json'
      );

      if (openFeeds.length === 0) return;

      setRefreshingAllJobs(true);
      setRefreshError(null);
      setSyncingIds((prev) => {
        const next = { ...prev };
        for (const c of openFeeds) next[c.id] = true;
        return next;
      });

      try {
        const roleToSearch =
          override?.role ??
          (filters.roleCategory !== 'All Roles'
            ? filters.roleCategory
            : profile.targetRole);
        const cityToSearch = override?.city ?? filters.city;

        const res = await fetch('/api/mcp/refresh-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            connectors: openFeeds,
            role: roleToSearch,
            city: cityToSearch,
            experienceYears: profile.experienceYears,
            minLpa: filters.minLpa,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to refresh live job feeds.');
        }

        if (seq !== refreshSeqRef.current) return;

        const incoming = Array.isArray(data.jobs)
          ? (data.jobs as JobListing[])
          : [];
        const stats = (data.statsByConnectorId ?? {}) as Record<
          string,
          { ok: boolean; count: number; error?: string }
        >;

        setLiveJobs((prev) => {
          const preserved = prev.filter(
            (j) =>
              Boolean(applicationsByJobIdRef.current[j.id]) ||
              queuedJobIdsRef.current.includes(j.id)
          );
          const seenKeys = new Set<string>([
            ...preserved.map(
              (j) => `${j.company.toLowerCase()}::${j.title.toLowerCase()}`
            ),
            ...INITIAL_INDIAN_JOBS.map(
              (j) => `${j.company.toLowerCase()}::${j.title.toLowerCase()}`
            ),
          ]);
          const fresh = incoming.filter((j) => {
            const key = `${j.company.toLowerCase()}::${j.title.toLowerCase()}`;
            if (seenKeys.has(key)) return false;
            seenKeys.add(key);
            return true;
          });
          return [...preserved, ...fresh];
        });

        if (Array.isArray(data.sources) && data.sources.length > 0) {
          setLiveSources(data.sources);
        }

        const syncedTime = new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        setLastRefreshedAt(syncedTime);
        lastRefreshTsRef.current = Date.now();

        setConnectors((prev) =>
          prev.map((c) => {
            const st = stats[c.id];
            if (!st) return c;
            return st.ok
              ? {
                  ...c,
                  syncedCount: st.count,
                  lastSyncedAt: syncedTime,
                  status: 'Synced',
                  lastError: undefined,
                }
              : {
                  ...c,
                  status: 'Error',
                  lastError: st.error || 'Feed refresh failed',
                };
          })
        );
      } catch (err: unknown) {
        if (seq !== refreshSeqRef.current) return;
        setRefreshError(
          err instanceof Error
            ? err.message
            : 'Unable to refresh live job feeds right now.'
        );
      } finally {
        if (seq === refreshSeqRef.current) {
          setRefreshingAllJobs(false);
        }
        setSyncingIds((prev) => {
          const next = { ...prev };
          for (const c of openFeeds) next[c.id] = false;
          return next;
        });
      }
    },
    [filters.roleCategory, filters.city, filters.minLpa, profile.targetRole, profile.experienceYears]
  );

  const refreshAllJobsRef = useRef(refreshAllJobs);
  refreshAllJobsRef.current = refreshAllJobs;

  // Refresh all live jobs automatically on startup / page reload
  useEffect(() => {
    if (autoRefreshEnabled) {
      void refreshAllJobsRef.current();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-refresh live jobs whenever target role or city changes
  useEffect(() => {
    if (!hasMountedFilterEffectRef.current) {
      hasMountedFilterEffectRef.current = true;
      return;
    }
    if (!autoRefreshEnabled) return;
    const timer = window.setTimeout(() => {
      void refreshAllJobsRef.current();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [filters.roleCategory, filters.city, profile.targetRole, autoRefreshEnabled]);

  // Refresh when returning to Jobs Feed (if > 5s since last refresh) and every 60s
  useEffect(() => {
    if (!autoRefreshEnabled || activeTab !== 'jobs') return;
    if (Date.now() - lastRefreshTsRef.current > 5000) {
      void refreshAllJobsRef.current();
    }
    const interval = window.setInterval(() => {
      void refreshAllJobsRef.current();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [activeTab, autoRefreshEnabled]);

  const handleSyncAllOpenFeeds = async () => {
    await refreshAllJobs();
  };

  const handleAddCustomConnector = (connector: McpConnector) => {
    setConnectors((prev) => [connector, ...prev]);
  };

  const handleUpdateConnector = (updated: McpConnector) => {
    setConnectors((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  };

  const handleDeleteCustomConnector = (id: string) => {
    setConnectors((prev) => prev.filter((c) => c.id !== id));
  };

  const handleTriggerTopBarAutoApply = () => {
    if (queuedJobIds.length === 0) {
      handleAutoFillQueue();
    }
    setActiveTab('auto-apply');
  };

  const handleUpdateStage = (id: string, stage: ApplicationStage) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, stage } : app))
    );
  };

  const handleUpdateFollowUp = (id: string, followUpNote: string) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === id ? { ...app, followUpNote } : app))
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        queuedCount={queuedJobIds.length}
        appliedCount={applications.length}
        onTriggerAutoApply={handleTriggerTopBarAutoApply}
      />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {activeTab === 'jobs' && (
          <JobsWorkspace
            profile={profile}
            filters={filters}
            onFiltersChange={setFilters}
            onResetFilters={() => setFilters(DEFAULT_FILTERS)}
            filteredJobs={filteredJobs}
            queuedJobIds={queuedJobIds}
            applicationsByJobId={applicationsByJobId}
            onToggleQueue={handleToggleQueue}
            onQueueAllHighMatch={handleQueueAllHighMatch}
            onOpenJobDetail={(job, match) => setSelectedJob({ job, match })}
            onQuickApply={handleQuickApply}
            onSearchLiveJobs={handleSearchLiveJobs}
            onRefreshAllJobs={() => refreshAllJobs()}
            refreshingAllJobs={refreshingAllJobs}
            lastRefreshedAt={lastRefreshedAt}
            autoRefreshEnabled={autoRefreshEnabled}
            onToggleAutoRefresh={() => setAutoRefreshEnabled((v) => !v)}
            refreshError={refreshError}
            onOpenMcpHub={() => setActiveTab('mcps')}
            onOpenResumeProfile={() => setActiveTab('profile')}
            liveSearching={liveSearching}
            liveSearchError={liveSearchError}
            liveSources={liveSources}
          />
        )}

        {activeTab === 'mcps' && (
          <McpHubView
            profile={profile}
            selectedCity={filters.city}
            connectors={connectors}
            syncingIds={syncingIds}
            onSyncConnector={handleSyncConnector}
            onSyncAllOpenFeeds={handleSyncAllOpenFeeds}
            onAddCustomConnector={handleAddCustomConnector}
            onUpdateConnector={handleUpdateConnector}
            onDeleteCustomConnector={handleDeleteCustomConnector}
            onViewSyncedJobs={() => setActiveTab('jobs')}
            totalSyncedJobs={liveJobs.length}
          />
        )}

        {activeTab === 'auto-apply' && (
          <AutoApplyPanel
            profile={profile}
            rules={rules}
            onUpdateRules={setRules}
            queuedJobs={queuedJobsWithMatch}
            executionState={executionState}
            isRunning={isAutoApplying}
            onStartAutoApply={handleStartAutoApply}
            onPauseAutoApply={handlePauseAutoApply}
            onRemoveFromQueue={(id) =>
              setQueuedJobIds((prev) => prev.filter((item) => item !== id))
            }
            onClearQueue={() => {
              setQueuedJobIds([]);
              setExecutionState({});
            }}
            onAutoFillQueue={handleAutoFillQueue}
            onOpenApplications={() => setActiveTab('applications')}
          />
        )}

        {activeTab === 'applications' && (
          <ApplicationsTracker
            applications={applications}
            onUpdateStage={handleUpdateStage}
            onUpdateFollowUp={handleUpdateFollowUp}
            onBrowseJobs={() => setActiveTab('jobs')}
          />
        )}

        {activeTab === 'profile' && (
          <CandidateProfileView
            profile={profile}
            onSaveProfile={setProfile}
            highMatchCount={highMatchCount}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>
            BharatRole · Indian Career & Role-Matched Auto-Apply Workspace
          </span>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setActiveTab('jobs')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Jobs Feed
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mcps')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Job MCPs
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('auto-apply')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Auto-Apply Queue
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('applications')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Applications
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className="hover:text-slate-900 cursor-pointer"
            >
              Resume Profile
            </button>
          </div>
        </div>
      </footer>

      <JobDetailDrawer
        job={selectedJob?.job ?? null}
        match={selectedJob?.match ?? null}
        profile={profile}
        existingApplication={
          selectedJob ? applicationsByJobId[selectedJob.job.id] : undefined
        }
        isQueued={
          selectedJob ? queuedJobIds.includes(selectedJob.job.id) : false
        }
        onClose={() => setSelectedJob(null)}
        onToggleQueue={handleToggleQueue}
        onQuickApply={handleQuickApply}
      />
    </div>
  );
}
