import React, { useMemo, useState } from 'react';
import { Download, ExternalLink, Search } from 'lucide-react';
import { ApplicationStage, JobApplication } from '../types/jobs';

interface ApplicationsTrackerProps {
  applications: JobApplication[];
  onUpdateStage: (id: string, stage: ApplicationStage) => void;
  onUpdateFollowUp: (id: string, note: string) => void;
  onBrowseJobs: () => void;
}

const STAGES: Array<'All' | ApplicationStage> = [
  'All',
  'Applied',
  'Shortlisted',
  'Interview',
  'Offer',
  'Withdrawn',
];

export const ApplicationsTracker: React.FC<ApplicationsTrackerProps> = ({
  applications,
  onUpdateStage,
  onUpdateFollowUp,
  onBrowseJobs,
}) => {
  const [stageFilter, setStageFilter] = useState<'All' | ApplicationStage>('All');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(
    applications[0]?.id ?? null
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications.filter((app) => {
      if (stageFilter !== 'All' && app.stage !== stageFilter) return false;
      if (q) {
        const text = `${app.jobTitle} ${app.company} ${app.city} ${app.portalSource}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [applications, stageFilter, search]);

  const selectedApp =
    applications.find((a) => a.id === selectedId) ?? filtered[0] ?? null;

  const handleExportCsv = () => {
    const headers = [
      'Company',
      'Role',
      'City',
      'CTC Range',
      'Match %',
      'Mode',
      'Stage',
      'Applied At',
      'Portal',
      'Career URL',
    ];
    const rows = applications.map((a) => [
      a.company,
      a.jobTitle,
      a.city,
      a.ctcRange,
      `${a.matchScore}%`,
      a.mode,
      a.stage,
      a.appliedAt,
      a.portalSource,
      a.applyUrl,
    ]);
    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bharatrole-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Submitted Applications
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track interview stages, review tailored cover notes, and export your Indian job application log.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={applications.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer disabled:opacity-45 whitespace-nowrap shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </section>

      {applications.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-3">
          <h2 className="text-base font-semibold text-slate-900">
            No applications submitted yet
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Use Quick Apply on any Indian job opening or run an Auto-Apply batch to start tracking responses here.
          </p>
          <button
            type="button"
            onClick={onBrowseJobs}
            className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
          >
            Browse Matched Jobs
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 cols: High-density table */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* Filter & Search Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto">
                {STAGES.map((stage) => {
                  const active = stageFilter === stage;
                  return (
                    <button
                      key={stage}
                      type="button"
                      onClick={() => setStageFilter(stage)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {stage}
                    </button>
                  );
                })}
              </div>

              <div className="relative w-full sm:w-56">
                <Search
                  className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter company or role..."
                  aria-label="Filter applications"
                  className="w-full h-8 pl-8 pr-3 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                    <th className="py-2.5 px-4">Company & Role</th>
                    <th className="py-2.5 px-3">Hub</th>
                    <th className="py-2.5 px-3 text-right">CTC</th>
                    <th className="py-2.5 px-3 text-right">Match</th>
                    <th className="py-2.5 px-4">Stage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filtered.map((app) => {
                    const isSelected = selectedApp?.id === app.id;
                    return (
                      <tr
                        key={app.id}
                        onClick={() => setSelectedId(app.id)}
                        className={`h-11 cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-slate-900 truncate max-w-[240px]">
                            {app.company}
                          </div>
                          <div className="text-slate-500 truncate max-w-[240px]">
                            {app.jobTitle}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {app.city}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700 whitespace-nowrap">
                          {app.ctcRange}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-medium text-emerald-700 whitespace-nowrap">
                          {app.matchScore}%
                        </td>
                        <td
                          className="py-2.5 px-4 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            aria-label={`Stage for ${app.company}`}
                            value={app.stage}
                            onChange={(e) =>
                              onUpdateStage(
                                app.id,
                                e.target.value as ApplicationStage
                              )
                            }
                            className="h-7 px-2 text-xs font-medium bg-white border border-slate-200 rounded-md text-slate-800 focus:outline-none focus:border-blue-600"
                          >
                            <option value="Applied">Applied</option>
                            <option value="Shortlisted">Shortlisted</option>
                            <option value="Interview">Interview</option>
                            <option value="Offer">Offer</option>
                            <option value="Withdrawn">Withdrawn</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right 4 cols: Selected Application Detail */}
          <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            {selectedApp ? (
              <>
                <div className="pb-3 border-b border-slate-100 space-y-1">
                  <p className="text-xs text-slate-500 font-mono tabular-nums">
                    {selectedApp.mode} · {selectedApp.appliedAt}
                  </p>
                  <h2 className="text-base font-bold text-slate-900">
                    {selectedApp.jobTitle}
                  </h2>
                  <p className="text-xs text-slate-600">
                    {selectedApp.company} · {selectedApp.city} · {selectedApp.ctcRange}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <span className="font-semibold text-slate-800 block">
                    Subject Sent
                  </span>
                  <p className="text-slate-700">{selectedApp.subjectLine}</p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <span className="font-semibold text-slate-800 block">
                    Tailored Cover Note
                  </span>
                  <p className="text-slate-700 whitespace-pre-line leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                    {selectedApp.coverNote}
                  </p>
                </div>

                <div className="space-y-1.5 text-xs">
                  <label
                    htmlFor="app-followup"
                    className="font-semibold text-slate-800 block"
                  >
                    Recruiter Follow-up Notes
                  </label>
                  <textarea
                    id="app-followup"
                    rows={3}
                    value={selectedApp.followUpNote}
                    onChange={(e) =>
                      onUpdateFollowUp(selectedApp.id, e.target.value)
                    }
                    placeholder="Log HR call notes, interview dates, or recruiter email..."
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                  />
                </div>

                <a
                  href={selectedApp.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:underline"
                >
                  Open {selectedApp.company} Career Portal
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </>
            ) : (
              <p className="text-xs text-slate-500">
                Select an application row to inspect the outreach pitch.
              </p>
            )}
          </aside>
        </div>
      )}
    </div>
  );
};
