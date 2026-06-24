import React, { useState, useEffect } from 'react';
import { userService, AuditLogDto } from '../services/userService';
import LoadingPanel from './common/LoadingPanel';
import ErrorPanel from './common/ErrorPanel';
import EmptyState from './common/EmptyState';
import { Terminal, Calendar, Filter, FileSpreadsheet, Search } from 'lucide-react';

export const AuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and search variables
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.listAuditLogs();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Unable to load structural audit log archives.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs
    .filter(item => {
      if (filterType !== 'ALL' && item.resource_type !== filterType) return false;
      if (search.trim() !== '') {
        const query = search.toLowerCase();
        const matchesDesc = item.action_description.toLowerCase().includes(query);
        const matchesEmail = item.user_email?.toLowerCase().includes(query) || false;
        const matchesAction = item.action_type.toLowerCase().includes(query);
        return matchesDesc || matchesEmail || matchesAction;
      }
      return true;
    })
    // Ensure newest first
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (loading) return <LoadingPanel message="LOADING SECURE PLATFORM AUDIT RECORDS..." />;
  if (error) return <ErrorPanel message={error} onRetry={fetchLogs} />;

  const uniqueResourceTypes = Array.from(new Set(logs.map(l => l.resource_type)));

  return (
    <div className="space-y-6">
      
      {/* View Header Info */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-amber-950/25 border border-amber-800/30 rounded-xl flex items-center justify-center text-amber-500">
            <Terminal className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100 font-mono tracking-wider uppercase">Administrative Audit Logs Corridor</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Read-only immutable operational journal. Every transponder review, resolution write, and rule set adjustment is registered with authorized timestamps securely.
            </p>
          </div>
        </div>
      </div>

      {/* Filtering & Searching Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search email, actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-mono text-slate-200 bg-slate-950/90 border border-slate-800 rounded-lg focus:border-cyan-500/50 outline-none placeholder-slate-600 min-h-[44px]"
          />
        </div>

        {/* Category Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Filter className="w-3 nav-icon text-slate-500" />
            CLASS_FILTER
          </span>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs font-mono rounded-lg px-3 py-2 text-slate-300 focus:border-cyan-500/55 outline-none tracking-wide min-h-[44px]"
          >
            <option value="ALL">ALL RESOURCE CLASSES</option>
            {uniqueResourceTypes.map(t => (
              <option key={t as string} value={t as string}>{((t as string) || '').toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-925">
          <h4 className="text-xs font-semibold text-slate-350 tracking-wider font-mono">TRACKED TRANSACTIONS ({filteredLogs.length})</h4>
        </div>

        {filteredLogs.length === 0 ? (
          <EmptyState title="No Audit entries matches" description="Alter search parameters or filters to find records." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-950/40">
                  <th className="py-4 px-6 w-32">Timestamp</th>
                  <th className="py-4 px-6 w-44">Operations officer</th>
                  <th className="py-4 px-6 w-36">Action group</th>
                  <th className="py-4 px-6">Event details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px] text-slate-300">
                {filteredLogs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-950/25 transition-colors">
                    <td className="py-4 px-6 text-slate-400 tracking-tight whitespace-nowrap text-[10px]">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="w-3 h-3 text-slate-600 block shrink-0" />
                        {new Date(item.created_at).toISOString().replace('T', ' ').slice(0, 19)}
                      </span>
                    </td>
                    <td className="py-4 px-6 truncate text-cyan-400/90 text-[10px]">
                      {item.user_email || 'SYSTEM_DAEMON'}
                    </td>
                    <td className="py-4 px-6 font-semibold">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] truncate max-w-full ${
                        item.action_type.includes('Resolve') || item.action_type.includes('Create')
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30' 
                          : item.action_type.includes('Susp') || item.action_type.includes('Danger')
                          ? 'bg-red-950/40 text-red-400 border border-red-900/30'
                          : 'bg-slate-950 border border-slate-850 text-slate-400'
                      }`}>
                        {item.action_type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-sans text-xs text-slate-300 leading-relaxed break-words">
                      {item.action_description}
                      {item.resource_id && (
                        <span className="inline-block px-1.5 py-0.2 bg-slate-950 text-slate-500 rounded font-mono text-[9px] ml-1 tracking-wider uppercase">
                          ID: {item.resource_id}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default AuditLogsView;
