import React, { useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
} from 'lucide-react';
import { buildPortalDeepLink } from '../data/mcpConnectors';
import {
  CandidateProfile,
  IndianCity,
  McpConnector,
  McpTransport,
} from '../types/jobs';

interface McpHubViewProps {
  profile: CandidateProfile;
  selectedCity: IndianCity;
  connectors: McpConnector[];
  syncingIds: Record<string, boolean>;
  onSyncConnector: (connector: McpConnector) => Promise<void>;
  onSyncAllOpenFeeds: () => Promise<void>;
  onAddCustomConnector: (connector: McpConnector) => void;
  onUpdateConnector: (connector: McpConnector) => void;
  onDeleteCustomConnector: (id: string) => void;
  onViewSyncedJobs: () => void;
  totalSyncedJobs: number;
}

export const McpHubView: React.FC<McpHubViewProps> = ({
  profile,
  selectedCity,
  connectors,
  syncingIds,
  onSyncConnector,
  onSyncAllOpenFeeds,
  onAddCustomConnector,
  onUpdateConnector,
  onDeleteCustomConnector,
  onViewSyncedJobs,
  totalSyncedJobs,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<
    'All' | 'Indian Company ATS' | 'Remote Feed' | 'Indian Portal' | 'Custom MCP'
  >('All');

  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newTransport, setNewTransport] =
    useState<McpTransport>('custom-mcp-http');
  const [newToken, setNewToken] = useState('');
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  const [editingPortalId, setEditingPortalId] = useState<string | null>(null);
  const [portalMcpUrl, setPortalMcpUrl] = useState('');
  const [portalMcpTransport, setPortalMcpTransport] =
    useState<McpTransport>('custom-mcp-http');

  const anyOpenSyncing = connectors
    .filter((c) => c.transport === 'live-api' || c.category === 'Custom MCP')
    .some((c) => syncingIds[c.id]);

  const filteredConnectors = connectors.filter(
    (c) => categoryFilter === 'All' || c.category === categoryFilter
  );

  const handleAddConnector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;
    const custom: McpConnector = {
      id: `custom-mcp-${Date.now()}`,
      name: newName.trim(),
      portalSource: 'Custom MCP',
      category: 'Custom MCP',
      transport: newTransport,
      endpointUrl: newUrl.trim(),
      authToken: newToken.trim() || undefined,
      description:
        newTransport === 'custom-mcp-http'
          ? 'Custom Model Context Protocol (JSON-RPC 2.0) job search server.'
          : 'Custom REST JSON job feed endpoint.',
      enabled: true,
      syncedCount: 0,
      status: 'Ready',
    };
    onAddCustomConnector(custom);
    setNewName('');
    setNewUrl('');
    setNewToken('');
  };

  const handleOpenPortalConfig = (connector: McpConnector) => {
    if (editingPortalId === connector.id) {
      setEditingPortalId(null);
      return;
    }
    setEditingPortalId(connector.id);
    setPortalMcpUrl(
      connector.transport === 'custom-mcp-http' ||
        connector.transport === 'custom-rest-json'
        ? connector.endpointUrl
        : ''
    );
    setPortalMcpTransport(
      connector.transport === 'custom-rest-json'
        ? 'custom-rest-json'
        : 'custom-mcp-http'
    );
  };

  const handleSavePortalMcp = async (connector: McpConnector) => {
    if (!portalMcpUrl.trim()) return;
    const updated: McpConnector = {
      ...connector,
      transport: portalMcpTransport,
      endpointUrl: portalMcpUrl.trim(),
      lastError: undefined,
      status: 'Ready',
    };
    onUpdateConnector(updated);
    setEditingPortalId(null);
    await onSyncConnector(updated);
  };

  const handleResetPortalDefault = (connector: McpConnector) => {
    const updated: McpConnector = {
      ...connector,
      transport: 'portal-search-mcp',
      lastError: undefined,
      status: 'Ready',
    };
    onUpdateConnector(updated);
    setEditingPortalId(null);
  };

  const mcpEndpointUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/mcp`
      : '/api/mcp';

  const handleCopyMcpUrl = () => {
    navigator.clipboard?.writeText(mcpEndpointUrl);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1 max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Indian & Remote Job MCP Connectors
          </h1>
          <p className="text-sm text-slate-600">
            Sync live Indian openings from company ATS feeds (Razorpay, Groww, CRED, Meesho, Paytm, Bosch India) and remote feeds (Remotive, RemoteOK, Himalayas, Jobicy, Arbeitnow), or connect custom MCP servers and pre-filled portals for Glassdoor India, Indeed India, LinkedIn India, and Naukri.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onViewSyncedJobs}
            className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
          >
            View Feed ({totalSyncedJobs} synced)
          </button>

          <button
            type="button"
            onClick={onSyncAllOpenFeeds}
            disabled={anyOpenSyncing}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {anyOpenSyncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {anyOpenSyncing ? 'Syncing Live Feeds...' : 'Sync All Live Feeds'}
          </button>
        </div>
      </section>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg overflow-x-auto max-w-full">
          {(
            [
              'All',
              'Indian Company ATS',
              'Remote Feed',
              'Indian Portal',
              'Custom MCP',
            ] as const
          ).map((cat) => {
            const active = categoryFilter === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-slate-500">
          Target query:{' '}
          <span className="font-medium text-slate-800">{profile.targetRole}</span> ·{' '}
          <span>{selectedCity}</span>
        </p>
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredConnectors.map((connector) => {
          const isSyncing = Boolean(syncingIds[connector.id]);
          const isEditing = editingPortalId === connector.id;
          const deepLink =
            connector.category === 'Custom MCP'
              ? connector.endpointUrl
              : buildPortalDeepLink(
                  connector.id,
                  profile.targetRole,
                  selectedCity
                );

          return (
            <article
              key={connector.id}
              className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-slate-500">
                      {connector.category} ·{' '}
                      {connector.transport === 'live-api'
                        ? 'Direct Live API'
                        : connector.transport === 'custom-mcp-http'
                        ? 'MCP JSON-RPC'
                        : connector.transport === 'custom-rest-json'
                        ? 'REST JSON'
                        : 'Portal Search + Deep Link'}
                    </p>
                    <h2 className="text-base font-bold text-slate-900 mt-0.5">
                      {connector.name}
                    </h2>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {connector.category === 'Indian Portal' && (
                      <button
                        type="button"
                        onClick={() => handleOpenPortalConfig(connector)}
                        title="Attach custom MCP or JSON feed URL"
                        aria-label={`Configure ${connector.name} MCP`}
                        className="p-1.5 text-slate-400 hover:text-slate-800 rounded cursor-pointer"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                    )}

                    {connector.category === 'Custom MCP' && (
                      <button
                        type="button"
                        onClick={() => onDeleteCustomConnector(connector.id)}
                        aria-label={`Remove ${connector.name}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {connector.description}
                </p>

                <div className="text-xs font-mono tabular-nums text-slate-500 pt-1">
                  {connector.syncedCount > 0 ? (
                    <span className="text-emerald-700 font-medium">
                      {connector.syncedCount} jobs synced · {connector.lastSyncedAt}
                    </span>
                  ) : (
                    <span>
                      {connector.transport === 'live-api'
                        ? 'Ready to sync live openings'
                        : `Ready for ${profile.targetRole} in ${selectedCity}`}
                    </span>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-xs">
                    <p className="font-semibold text-slate-800">
                      Connect {connector.name} MCP Server
                    </p>
                    <input
                      type="url"
                      value={portalMcpUrl}
                      onChange={(e) => setPortalMcpUrl(e.target.value)}
                      placeholder="https://your-glassdoor-mcp.example/mcp"
                      className="w-full h-8 px-2.5 text-xs font-mono bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-600"
                    />
                    <select
                      value={portalMcpTransport}
                      onChange={(e) =>
                        setPortalMcpTransport(e.target.value as McpTransport)
                      }
                      className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-600"
                    >
                      <option value="custom-mcp-http">MCP JSON-RPC (HTTP)</option>
                      <option value="custom-rest-json">REST JSON Feed</option>
                    </select>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleResetPortalDefault(connector)}
                        className="text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Use default
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSavePortalMcp(connector)}
                        disabled={!portalMcpUrl.trim()}
                        className="px-3 py-1 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                      >
                        Save & Sync
                      </button>
                    </div>
                  </div>
                )}

                {connector.lastError && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-2 space-y-1.5 leading-snug">
                    <p>{connector.lastError}</p>
                    {connector.category === 'Indian Portal' && (
                      <div className="flex items-center gap-3 pt-0.5">
                        <a
                          href={deepLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-blue-700 hover:underline"
                        >
                          Open {connector.name} Search
                        </a>
                        <button
                          type="button"
                          onClick={() => handleOpenPortalConfig(connector)}
                          className="font-semibold text-slate-800 hover:underline cursor-pointer"
                        >
                          Attach Custom MCP URL
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <a
                  href={deepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4 whitespace-nowrap"
                >
                  Open Portal
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>

                <button
                  type="button"
                  onClick={() => onSyncConnector(connector)}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
                >
                  {isSyncing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  {isSyncing
                    ? 'Syncing...'
                    : connector.transport === 'portal-search-mcp'
                    ? 'AI Web Sync'
                    : 'Sync Jobs'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/* Bottom Split: Add Custom Job MCP Server + Built-in BharatRole MCP Server */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Add Custom Job MCP Server */}
        <form
          onSubmit={handleAddConnector}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4"
        >
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              Add Custom Indian Job MCP or Feed Endpoint
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect an external LinkedIn, Indeed, Glassdoor, or company careers MCP HTTP server or JSON feed.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="mcp-name" className="block text-xs font-medium text-slate-700">
                Connector Name
              </label>
              <input
                id="mcp-name"
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Glassdoor India MCP"
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mcp-transport" className="block text-xs font-medium text-slate-700">
                Protocol / Transport
              </label>
              <select
                id="mcp-transport"
                value={newTransport}
                onChange={(e) => setNewTransport(e.target.value as McpTransport)}
                className="w-full h-10 px-3 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              >
                <option value="custom-mcp-http">MCP JSON-RPC (HTTP)</option>
                <option value="custom-rest-json">REST JSON Feed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="mcp-url" className="block text-xs font-medium text-slate-700">
                Server Endpoint URL
              </label>
              <input
                id="mcp-url"
                type="url"
                required
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://your-mcp-host.example/mcp"
                className="w-full h-10 px-3 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="mcp-token" className="block text-xs font-medium text-slate-700">
                Bearer Token (Optional)
              </label>
              <input
                id="mcp-token"
                type="password"
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder="Optional auth token"
                className="w-full h-10 px-3 text-xs font-mono border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Job MCP Connector
          </button>
        </form>

        {/* Built-in BharatRole MCP Server */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="pb-2 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-900">
              BharatRole MCP Server Endpoint
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Expose Indian job search and resume parsing tools over JSON-RPC 2.0 to any external MCP client.
            </p>
          </div>

          <div className="space-y-2">
            <span className="block text-xs font-medium text-slate-700">
              JSON-RPC Endpoint
            </span>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-800 truncate">
                {mcpEndpointUrl}
              </code>
              <button
                type="button"
                onClick={handleCopyMcpUrl}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer shrink-0"
              >
                {copiedEndpoint ? (
                  <Check className="w-3.5 h-3.5 text-emerald-700" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                {copiedEndpoint ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-600 space-y-1.5">
            <p className="font-medium text-slate-800">Exposed MCP Tools:</p>
            <p className="font-mono text-[11px] text-slate-700">
              • search_indian_jobs (role, city, minLpa)
            </p>
            <p className="font-mono text-[11px] text-slate-700">
              • parse_indian_resume (rawText)
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
