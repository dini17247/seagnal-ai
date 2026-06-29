import React, { useState, useMemo, FormEvent } from 'react';
import { 
  Bell, 
  Search, 
  Filter, 
  AlertOctagon, 
  Check, 
  Eye, 
  ChevronRight, 
  FileCheck, 
  Info,
  Clock,
  X,
  MessageSquare,
  Archive
} from 'lucide-react';
import { Alert, Vessel, AlertType, AlertStatus, RiskLevel } from '../types';

interface AlertManagementViewProps {
  alerts: Alert[];
  vessels: Vessel[];
  onSelectVessel: (vesselId: string) => void;
  onNavigate: (view: any) => void;
  onModifyAlertStatus: (alertId: string, status: AlertStatus, reviewer?: string, notes?: string) => void;
}

export default function AlertManagementView({
  alerts,
  vessels,
  onSelectVessel,
  onNavigate,
  onModifyAlertStatus,
}: AlertManagementViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedType, setSelectedType] = useState('All');

  // Modal State for resolving alerts
  const [resolvingAlert, setResolvingAlert] = useState<Alert | null>(null);
  const [reviewerName, setReviewerName] = useState('Officer Miller');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Anomaly alert filter categories
  const alertTypes = [
    'All',
    'AIS Gap',
    'Restricted Zone Entry',
    'Speed Anomaly',
    'Loitering',
    'Route Deviation',
    'Fishing-like Movement',
  ];

  // Restrict to open alerts (unresolved)
  const openAlerts = useMemo(() => {
    return alerts.filter(
      (alert) => alert.status === 'Active' || alert.status === 'Under Review'
    );
  }, [alerts]);

  // Filters calculation
  const filteredAlerts = useMemo(() => {
    return openAlerts.filter((alert) => {
      const vessel = vessels.find((v) => v.vessel_id === alert.vessel_id);
      const vesselName = vessel ? vessel.vessel_name : 'UNKNOWN';

      const matchesSearch = 
        vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.alert_id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSeverity = selectedSeverity === 'All' || alert.severity === selectedSeverity;
      const matchesStatus = selectedStatus === 'All' || alert.status === selectedStatus;
      const matchesType = selectedType === 'All' || alert.alert_type === selectedType;

      return matchesSearch && matchesSeverity && matchesStatus && matchesType;
    });
  }, [openAlerts, vessels, searchTerm, selectedSeverity, selectedStatus, selectedType]);

  // Sort by alert_time descending
  const sortedFilteredAlerts = useMemo(() => {
    return [...filteredAlerts].sort((a, b) => {
      const timeA = a.alert_time ? new Date(a.alert_time).getTime() : 0;
      const timeB = b.alert_time ? new Date(b.alert_time).getTime() : 0;
      return timeB - timeA;
    });
  }, [filteredAlerts]);

  const handleOpenResolveModal = (alert: Alert) => {
    setResolvingAlert(alert);
    setResolutionNotes('');
  };

  const handleResolveSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!resolvingAlert) return;

    onModifyAlertStatus(
      resolvingAlert.alert_id, 
      'Resolved', 
      reviewerName || 'Officer Duty', 
      resolutionNotes || 'Reviewed. Normal parameters restored.'
    );
    setResolvingAlert(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      {/* Page Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            INTELLIGENCE DISPATCH & TRANSCRIPTION DESK
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Register and audit active kinematic geofence and speed anomalies on duty.
          </p>
          <p className="text-emerald-400 text-[11px] font-mono mt-1.5 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Resolved alerts are automatically transferred to the Incident Reports archive.</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={() => onNavigate('incident-reports')}
            className="flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer transition"
          >
            <Archive className="w-4 h-4 text-cyan-400" />
            <span>View Resolved Archive</span>
          </button>
          
          <div className="flex gap-2 text-xs font-mono">
            <div className="px-3 py-1.5 bg-rose-500/10 border border-rose-500/25 rounded-lg text-rose-450 font-bold flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 leading-none">Active</span>
              <span className="text-base font-extrabold text-rose-400 mt-1">{alerts.filter(a => a.status === 'Active').length}</span>
            </div>
            <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/25 rounded-lg text-amber-400 font-bold flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 leading-none">Under Review</span>
              <span className="text-base font-extrabold text-amber-500 mt-1">{alerts.filter(a => a.status === 'Under Review').length}</span>
            </div>
            <div className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/25 rounded-lg text-cyan-400 font-bold flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 leading-none">Total Open</span>
              <span className="text-base font-extrabold text-cyan-400 mt-1">{alerts.filter(a => a.status !== 'Resolved').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Resolve Alert overlay modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[2000] p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setResolvingAlert(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-extrabold uppercase tracking-widest text-slate-200 mb-2 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              Resolve Alert {resolvingAlert.alert_id}
            </h3>
            <p className="text-xs text-slate-500 mb-4 font-mono leading-tight">
              Type: {resolvingAlert.alert_type} // Severity: {resolvingAlert.severity}
            </p>

            <div className="mb-4 p-3 bg-slate-950 border border-slate-900 rounded-lg text-xs leading-relaxed text-slate-300">
              {resolvingAlert.description}
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1">
                  Officer Name Signature
                </label>
                <input
                  type="text"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 placeholder-slate-650 text-xs focus:outline-none focus:border-cyan-500"
                  placeholder="Officer name/stamp"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1">
                  Resolution / Investigation Notes
                </label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full h-24 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-100 placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-500 resize-none"
                  placeholder="Provide logs (e.g. verified master manifests, confirmed mechanical detour, weather routing exception)."
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingAlert(null)}
                  className="flex-1 py-2 bg-slate-950 border border-slate-800 hover:text-slate-300 text-xs font-semibold rounded-lg text-slate-500 transition cursor-pointer"
                >
                  ABORT
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-lg transition shadow-md shadow-emerald-950/20 cursor-pointer"
                >
                  FORCE ARCHIVE RESOLVED
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {openAlerts.length === 0 ? (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center flex flex-col items-center justify-center max-w-2xl mx-auto my-12 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-450 mb-6 border border-emerald-500/20">
            <Check className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-white uppercase tracking-wider mb-2">
            All alerts have been cleared.
          </h4>
          <p className="text-slate-400 text-xs max-w-md leading-relaxed mb-6">
            There are currently no active or under-review maritime anomalies.<br />
            Resolved alerts remain available in the Incident Reports archive.
          </p>
          <button
            onClick={() => onNavigate('incident-reports')}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg transition duration-200 cursor-pointer flex items-center gap-2"
          >
            <Archive className="w-4 h-4 text-cyan-400" />
            <span>Open Resolved Archive</span>
          </button>
        </div>
      ) : (
        <>
          {/* Filter and search bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-900">
            
            {/* Search Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search Vessel name, alert description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Severity */}
            <div>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="All">All Severity Levels</option>
                <option value="High">High Severity</option>
                <option value="Medium">Medium Severity</option>
                <option value="Low">Low Severity</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="All">All Open Alerts</option>
                <option value="Active">Active</option>
                <option value="Under Review">Under Review</option>
              </select>
            </div>

            {/* Alert Type */}
            <div>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                {alertTypes.map((type, idx) => (
                  <option key={idx} value={type}>
                    {type === 'All' ? 'All Anomaly Types' : type}
                  </option>
                ))}
              </select>
            </div>

          </div>

          {/* Main Alerts Table */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-950 font-mono text-[9px] text-slate-500 uppercase tracking-widest border-b border-slate-900">
                  <tr>
                    <th className="py-3 px-4">Alarm ID</th>
                    <th className="py-3 px-4">Subject Vessel</th>
                    <th className="py-3 px-4">Anomaly Event Type</th>
                    <th className="py-3 px-4">Trigger Time</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">SOP Action Guidelines</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Operational Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/50">
                  {sortedFilteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 font-sans italic">
                        No unresolved telemetry anomaly flags registered.
                      </td>
                    </tr>
                  ) : (
                    sortedFilteredAlerts.map((alert) => {
                      const targetVessel = vessels.find((v) => v.vessel_id === alert.vessel_id);
                      
                      return (
                        <tr key={alert.alert_id} className="hover:bg-slate-900/10 transition duration-100">
                          
                          {/* Alarm ID */}
                          <td className="py-3.5 px-4 align-top font-mono text-[11px] font-bold text-slate-400">
                            {alert.alert_id}
                          </td>

                          {/* Vessel name */}
                          <td className="py-3.5 px-4 align-top min-w-[170px] text-left">
                            {targetVessel ? (
                              <div className="min-w-0 text-left">
                                <button
                                  onClick={() => {
                                    onSelectVessel(alert.vessel_id);
                                    onNavigate('vessels');
                                  }}
                                  className="font-bold text-cyan-400 hover:underline hover:text-cyan-300 block w-full text-left leading-tight cursor-pointer"
                                >
                                  {targetVessel.vessel_name}
                                </button>
                                <span className="text-[10px] text-slate-500 block truncate max-w-[150px] text-left mt-0.5" title={targetVessel.vessel_type}>
                                  {targetVessel.vessel_type}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">UNKNOWN</span>
                            )}
                          </td>

                          {/* Type */}
                          <td className="py-3.5 px-4 align-top min-w-[150px] text-left font-semibold text-slate-100 leading-tight">
                            {alert.alert_type}
                          </td>

                          {/* Time */}
                          <td className="py-3.5 px-4 align-top font-mono text-[10px] text-slate-400">
                            {new Date(alert.alert_time).toLocaleString()}
                          </td>

                          {/* Severity */}
                          <td className="py-3.5 px-4 align-top">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold tracking-wider ${
                              alert.severity === 'High' ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20' :
                              alert.severity === 'Medium' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                              'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                            }`}>
                              {alert.severity}
                            </span>
                          </td>

                          {/* Description / Action */}
                          <td className="py-3.5 px-4 align-top max-w-xs xl:max-w-md">
                            <div className="font-semibold text-slate-200 truncate" title={alert.description}>
                              {alert.description}
                            </div>
                            <div className="text-[10px] text-slate-400 italic font-mono truncate mt-0.5" title={alert.recommended_action}>
                              Guideline: {alert.recommended_action}
                            </div>
                          </td>

                          {/* Status badge */}
                          <td className="py-3.5 px-4 align-top">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                              alert.status === 'Active' ? 'bg-red-500/15 text-red-400' :
                              alert.status === 'Under Review' ? 'bg-amber-500/15 text-amber-400' :
                              'text-emerald-400 bg-emerald-500/15'
                            }`}>
                              <span className={`w-1 h-1 rounded-full ${
                                alert.status === 'Active' ? 'bg-red-500 animate-pulse' :
                                alert.status === 'Under Review' ? 'bg-amber-500' :
                                'bg-emerald-500'
                              }`} />
                              {alert.status}
                            </span>
                          </td>

                          {/* Management Controls */}
                          <td className="py-3.5 px-4 align-top text-right">
                            <div className="flex justify-end gap-1.5">
                              {alert.status === 'Active' && (
                                <button
                                  onClick={() => onModifyAlertStatus(alert.alert_id, 'Under Review')}
                                  className="px-2 py-1 bg-slate-900 border border-slate-800 hover:border-amber-500/30 text-amber-500 hover:bg-slate-900/60 rounded text-[10px] uppercase font-bold tracking-wider cursor-pointer font-bold"
                                  title="Set Under Review status"
                                >
                                  AUDIT
                                </button>
                              )}
                              
                              {alert.status !== 'Resolved' ? (
                                <button
                                  onClick={() => handleOpenResolveModal(alert)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 hover:text-slate-900 rounded text-[10px] font-black uppercase tracking-wider cursor-pointer"
                                  title="Resolve and Close Alert"
                                >
                                  RESOLVE
                                </button>
                              ) : (
                                <div className="px-2 py-1 text-emerald-400/80 font-mono text-[10px] font-bold flex items-center gap-1 bg-emerald-500/5 rounded border border-emerald-500/10" title={alert.resolution_notes}>
                                  <MessageSquare className="w-3 h-3 shrink-0" />
                                  <span>CLOSED</span>
                                </div>
                              )}
                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
