import React from 'react';

export type ActiveTab = 'jobs' | 'mcps' | 'auto-apply' | 'applications' | 'profile';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  queuedCount: number;
  appliedCount: number;
  onTriggerAutoApply: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  queuedCount,
  appliedCount,
  onTriggerAutoApply,
}) => {
  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'jobs', label: 'Jobs Feed' },
    { id: 'mcps', label: 'Job MCPs' },
    {
      id: 'auto-apply',
      label: queuedCount > 0 ? `Auto-Apply (${queuedCount})` : 'Auto-Apply',
    },
    {
      id: 'applications',
      label: appliedCount > 0 ? `Applications (${appliedCount})` : 'Applications',
    },
    { id: 'profile', label: 'Resume Profile' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('jobs')}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded border-[#1939ff]"
        >
          Jobs Role
        </button>

        {/* Zone 2: 5 clean single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-4 whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  isActive
                    ? 'text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action button */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onTriggerAutoApply}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Run Auto-Apply
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Mobile navigation"
        className="flex md:hidden items-center justify-between border-t border-slate-100 px-3 overflow-x-auto"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`py-2.5 px-2 text-xs font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-slate-900 font-semibold'
                  : 'border-transparent text-slate-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
