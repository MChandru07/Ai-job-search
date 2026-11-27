import React from 'react';
import { RotateCcw } from 'lucide-react';
import { INDIAN_CITIES, ROLE_CATEGORIES } from '../data/indianJobs';
import { IndianCity, JobFilters, PortalSource, WorkMode } from '../types/jobs';

interface FilterSidebarProps {
  filters: JobFilters;
  onChange: (next: JobFilters) => void;
  onReset: () => void;
  totalMatching: number;
}

const PORTAL_SOURCES: Array<'All Portals' | PortalSource> = [
  'All Portals',
  'Razorpay ATS',
  'Groww ATS',
  'CRED ATS',
  'Meesho ATS',
  'Paytm ATS',
  'Bosch India ATS',
  'Remotive Remote',
  'RemoteOK',
  'Himalayas Remote',
  'Jobicy Remote',
  'Arbeitnow',
  'Indeed India',
  'Glassdoor India',
  'LinkedIn India',
  'Naukri',
  'Instahyre',
  'Wellfound',
  'Cutshort',
  'Foundit',
  'Company Career',
  'Custom MCP',
  'Web Search',
];

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onChange,
  onReset,
  totalMatching,
}) => {
  const workModes: WorkMode[] = ['All', 'Hybrid', 'Remote', 'On-site'];
  const expBands: Array<{ value: JobFilters['expBand']; label: string }> = [
    { value: 'any', label: 'Any' },
    { value: '0-2', label: '0–2 yrs' },
    { value: '2-5', label: '2–5 yrs' },
    { value: '5-8', label: '5–8 yrs' },
    { value: '8+', label: '8+ yrs' },
  ];

  return (
    <aside
      aria-label="Job filters"
      className="w-full lg:w-[268px] shrink-0 bg-white border border-slate-200 rounded-xl p-5 space-y-5 self-start"
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Role & Criteria</h2>
          <p className="text-xs text-slate-500 tabular-nums mt-0.5">
            {totalMatching} {totalMatching === 1 ? 'opening' : 'openings'} matched
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 py-1 px-2 rounded hover:bg-slate-100 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          Reset
        </button>
      </div>

      {/* Role Category */}
      <div className="space-y-1.5">
        <label
          htmlFor="filter-role"
          className="block text-xs font-medium text-slate-700"
        >
          Target Role
        </label>
        <select
          id="filter-role"
          value={filters.roleCategory}
          onChange={(e) =>
            onChange({ ...filters, roleCategory: e.target.value })
          }
          className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
        >
          {ROLE_CATEGORIES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </div>

      {/* Indian Hub / City */}
      <div className="space-y-1.5">
        <label
          htmlFor="filter-city"
          className="block text-xs font-medium text-slate-700"
        >
          City / Tech Hub
        </label>
        <select
          id="filter-city"
          value={filters.city}
          onChange={(e) =>
            onChange({ ...filters, city: e.target.value as IndianCity })
          }
          className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
        >
          {INDIAN_CITIES.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
      </div>

      {/* Portal / MCP Source */}
      <div className="space-y-1.5">
        <label
          htmlFor="filter-portal"
          className="block text-xs font-medium text-slate-700"
        >
          Portal / MCP Source
        </label>
        <select
          id="filter-portal"
          value={filters.portalSource}
          onChange={(e) =>
            onChange({
              ...filters,
              portalSource: e.target.value as JobFilters['portalSource'],
            })
          }
          className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
        >
          {PORTAL_SOURCES.map((src) => (
            <option key={src} value={src}>
              {src}
            </option>
          ))}
        </select>
      </div>

      {/* Work Mode */}
      <div className="space-y-1.5">
        <span className="block text-xs font-medium text-slate-700">
          Work Mode
        </span>
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
          {workModes.map((mode) => {
            const active = filters.workMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => onChange({ ...filters, workMode: mode })}
                className={`py-1.5 px-2 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {mode}
              </button>
            );
          })}
        </div>
      </div>

      {/* Experience Band */}
      <div className="space-y-1.5">
        <span className="block text-xs font-medium text-slate-700">
          Experience Band
        </span>
        <div className="flex flex-wrap gap-1.5">
          {expBands.map((band) => {
            const active = filters.expBand === band.value;
            return (
              <button
                key={band.value}
                type="button"
                onClick={() => onChange({ ...filters, expBand: band.value })}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                {band.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Minimum CTC Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="filter-ctc"
            className="text-xs font-medium text-slate-700"
          >
            Minimum Max CTC
          </label>
          <span className="text-xs font-mono font-semibold text-slate-900 tabular-nums">
            ₹{filters.minLpa} LPA+
          </span>
        </div>
        <input
          id="filter-ctc"
          type="range"
          min={6}
          max={45}
          step={2}
          value={filters.minLpa}
          onChange={(e) =>
            onChange({ ...filters, minLpa: Number(e.target.value) })
          }
          className="w-full accent-blue-600 cursor-pointer"
        />
        <div className="flex justify-between text-[11px] font-mono text-slate-400 tabular-nums">
          <span>₹6L</span>
          <span>₹25L</span>
          <span>₹45L</span>
        </div>
      </div>

      {/* Notice Period Compatibility */}
      <div className="space-y-1.5">
        <label
          htmlFor="filter-notice"
          className="block text-xs font-medium text-slate-700"
        >
          Accepted Notice Period
        </label>
        <select
          id="filter-notice"
          value={filters.maxNoticeDays}
          onChange={(e) =>
            onChange({ ...filters, maxNoticeDays: Number(e.target.value) })
          }
          className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"
        >
          <option value={999}>Any notice period</option>
          <option value={0}>Immediate joiners</option>
          <option value={15}>Up to 15 days</option>
          <option value={30}>Up to 30 days</option>
          <option value={60}>Up to 60 days</option>
        </select>
      </div>

      {/* Minimum Match Score */}
      <div className="space-y-1.5">
        <span className="block text-xs font-medium text-slate-700">
          Minimum Match Score
        </span>
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
          {[0, 60, 75, 85].map((threshold) => {
            const active = filters.minMatch === threshold;
            return (
              <button
                key={threshold}
                type="button"
                onClick={() => onChange({ ...filters, minMatch: threshold })}
                className={`py-1.5 text-xs font-mono font-medium rounded-md transition-colors cursor-pointer tabular-nums ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {threshold === 0 ? 'All' : `${threshold}%`}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
};
