import { useState, useMemo, useEffect } from 'react';
import { 
  Anchor, 
  ShieldAlert, 
  BellRing, 
  Unplug, 
  MapPin, 
  Search,
  ChevronRight,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import {
  Vessel,
  Movement,
  Alert,
  MaritimeZone,
} from '../types';
import { dashboardService, DashboardSummary } from '../services/dashboardService';
import VesselMap from './VesselMap';
import LoadingPanel from './common/LoadingPanel';
import ErrorPanel from './common/ErrorPanel';

interface DashboardViewProps {
  vessels: Vessel[];
  alerts: Alert[];
  zones: MaritimeZone[];
  movements: Movement[];
  onSelectVessel: (vesselId: string) => void;
  onNavigate: (view: any) => void;
}

export default function DashboardView({ 
  vessels, 
  alerts, 
  zones, 
  movements,
  onSelectVessel, 
  onNavigate 
}: DashboardViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [latestAlertsList, setLatestAlertsList] = useState<Alert[]>([]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumData, alertsData] = await Promise.all([
        dashboardService.getSummary(),
        dashboardService.getLatestAlerts()
      ]);
      setSummary(sumData);
      setLatestAlertsList(alertsData);
    } catch (err: any) {
      console.error('Error synchronizing dashboard:', err);
      setError('Unable to fetch live maritime dashboard metrics from Express server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [alerts, vessels]); // Reload stats if global list triggers modification

  const statsCards = useMemo(() => {
    if (!summary) return [];
    return [
      { label: 'Monitored Vessels', value: summary.monitored_vessels, sub: 'Active AIS Transponders', icon: Anchor, color: 'text-cyan-400' },
      { label: 'High Risk Vessels', value: summary.high_risk_vessels, sub: 'Require Patrol Attention', icon: ShieldAlert, color: 'text-rose-400' },
      { label: 'Active Alerts', value: summary.open_alerts, sub: 'Pending Officer Review', icon: BellRing, color: 'text-amber-400' },
      { label: 'AIS Gaps Detected', value: summary.ais_gaps, sub: 'Transponder Offlines', icon: Unplug, color: 'text-zinc-400' },
      { label: 'Zone Violations', value: summary.zone_violations, sub: 'Geofence Borders Crossed', icon: MapPin, color: 'text-red-400' },
    ];
  }, [summary]);

  // Filter vessels for the table list
  const filteredVessels = useMemo(() => {
    return vessels.filter((v) => {
      const matchesSearch = v.vessel_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            v.mmsi_hash.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRisk = selectedRisk === 'All' || v.risk_level === selectedRisk;
      return matchesSearch && matchesRisk;
    });
  }, [vessels, searchTerm, selectedRisk]);

  if (loading) return <LoadingPanel message="SYNCHRONIZING TACTICAL STATUS feeds..." />;
  if (error) return <ErrorPanel message={error} onRetry={loadDashboardData} />;

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Action Bar */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider">
            Maritime Intelligence Dashboard
          </h2>
          <p className="text-slate-400 text-xs mt-0.5 font-medium">
            Operational Sector: Strait of Malacca, West Malaysia Coasts • Royal Patrol Section 4
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={loadDashboardData}
            className="p-2 border border-slate-850 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition cursor-pointer min-h-[44px]"
            title="Refresh Server Metrics"
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
          </button>
          <button 
            onClick={() => onNavigate('map')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:zoom-box text-slate-950 text-xs font-bold tracking-wider uppercase rounded-lg shadow-md transition duration-150 min-h-[44px] cursor-pointer"
          >
            <span>Launch Tactical Map Coordinator</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Grid of 5 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {statsCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div 
              key={i} 
              className="bg-slate-900 border border-slate-800/80 p-4 rounded-xl flex flex-col justify-between h-[116px] shadow-sm hover:border-slate-700/60 transition duration-150"
            >
              <div className="flex items-start justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  {card.label}
                </span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className="mt-2">
                <span className="text-2xl font-extrabold text-white">
                  {card.value}
                </span>
                <span className="text-[10px] text-slate-500 font-medium block mt-0.5 truncate uppercase tracking-wider font-mono">
                  {card.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Map Visualization Snap panel */}
      <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2.5">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            Active Maritime Patrol Grid Feed – Malaysia Waters
          </h3>
          <button 
            onClick={() => onNavigate('map')}
            className="text-xs text-cyan-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>Full GIS Map</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="h-[280px] rounded-lg overflow-hidden border border-slate-800/80">
          <VesselMap 
            vessels={vessels} 
            zones={zones} 
            alerts={alerts} 
            movements={movements}
            height="280px"
            onSelectVessel={(id) => {
              onSelectVessel(id);
              onNavigate('vessels');
            }}
          />
        </div>
      </div>

      {/* Two Columns Layout: Vessel Table and Anomaly Alerts Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Vessel Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Vessel Fleet Directory
              </h3>
              <p className="text-[10px] text-slate-550 mt-0.5">
                Current logs of tracked ships inside tactical waters.
              </p>
            </div>
            
            {/* Search/Filter mini parameters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search name or MMSI..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 min-h-[44px]"
                />
              </div>
              <select
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 focus:outline-none min-h-[44px]"
              >
                <option value="All">All Risks</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-[10px] font-mono uppercase tracking-wider text-slate-500 border-b border-slate-800 animate-fade-in">
                <tr>
                  <th className="py-2.5 px-3">Vessel Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Speed</th>
                  <th className="py-2.5 px-3 text-center font-bold">Threat Level</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredVessels.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs font-medium">
                      No vessels found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredVessels.slice(0, 7).map((vessel, idx) => {
                    const isHigh = vessel.risk_level === 'High';
                    const isMedium = vessel.risk_level === 'Medium';
                    return (
                      <tr 
                        key={idx} 
                        className="hover:bg-slate-950/40 transition duration-100"
                      >
                        <td className="py-2.5 px-3">
                          <button
                            onClick={() => onSelectVessel(vessel.vessel_id)}
                            className="font-extrabold hover:underline text-cyan-400 text-left text-xs block truncate"
                            style={{maxWidth: '130px'}}
                            title={vessel.vessel_name}
                          >
                            {vessel.vessel_name}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {vessel.vessel_type}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400">
                          {vessel.speed} kn <span className="text-[10px] text-slate-500">({Math.round(vessel.speed * 1.852)} km/h)</span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                            isHigh ? 'bg-red-950/40 text-red-400' :
                            isMedium ? 'bg-amber-950/40 text-amber-500' :
                            'bg-emerald-950/40 text-emerald-400'
                          }`}>
                            {vessel.risk_level} • {vessel.risk_score}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => onSelectVessel(vessel.vessel_id)}
                            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-300 rounded text-[10px] font-mono uppercase transition min-h-[44px]"
                          >
                            DOSSLER
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Anomaly Feeds Alert Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
                Live Anomaly Feeds
              </h3>
              <p className="text-[10px] text-slate-550 mt-0.5">
                Real-time active alerts compiled by rule-based detection model.
              </p>
            </div>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-xs text-cyan-400 hover:underline font-bold flex items-center gap-1 cursor-pointer font-mono"
            >
              <span>RESPONSE TABLE</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-[10px] font-mono tracking-wider uppercase text-slate-500 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Anomaly Type</th>
                  <th className="py-2.5 px-3">Subject Hull</th>
                  <th className="py-2.5 px-3">Sev</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-350">
                {latestAlertsList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 text-xs font-mono text-[10px]">
                      NO LIVE DISPATCH ALERT SEEN. ALL SECTORS CALM.
                    </td>
                  </tr>
                ) : (
                  latestAlertsList.slice(0, 5).map((alert, idx) => {
                    const targetVessel = vessels.find(v => v.vessel_id === alert.vessel_id);
                    const isHigh = alert.severity === 'High';
                    const isMedium = alert.severity === 'Medium';
                    
                    return (
                      <tr key={idx} className="hover:bg-slate-950/40 transition duration-100">
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          {alert.alert_type}
                        </td>
                        <td className="py-2.5 px-3">
                          <button 
                            onClick={() => onSelectVessel(alert.vessel_id)}
                            className="hover:underline text-cyan-400 font-bold text-left block truncate"
                            style={{maxWidth: '110px'}}
                            title={targetVessel?.vessel_name}
                          >
                            {targetVessel?.vessel_name || 'UNKNOWN HULL'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                            isHigh ? 'bg-red-500' :
                            isMedium ? 'bg-amber-500' :
                            'bg-cyan-500'
                          }`} title={alert.severity + ' Severity'} />
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            alert.status === 'Active' ? 'bg-red-950/40 text-red-400' :
                            alert.status === 'Under Review' ? 'bg-amber-950/40 text-amber-500' :
                            'bg-emerald-950/40 text-emerald-400'
                          }`}>
                            {alert.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button 
                            onClick={() => onSelectVessel(alert.vessel_id)}
                            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-300 rounded text-[10px] font-mono uppercase transition cursor-pointer min-h-[44px]"
                          >
                            REVIEW
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
