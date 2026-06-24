import { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Anchor, 
  ShieldAlert, 
  Compass, 
  Waves, 
  Check, 
  X,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { Vessel, MaritimeZone, Alert } from '../types';
import VesselMap from './VesselMap';

interface VesselMapViewProps {
  vessels: Vessel[];
  zones: MaritimeZone[];
  alerts: Alert[];
  selectedVesselId: string | null;
  onSelectVessel: (vesselId: string | null) => void;
  onNavigate: (view: any) => void;
}

export default function VesselMapView({
  vessels,
  zones,
  alerts,
  selectedVesselId,
  onSelectVessel,
  onNavigate,
}: VesselMapViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [selectedAnomaly, setSelectedAnomaly] = useState('All');
  const [showAllTrails, setShowAllTrails] = useState(false);

  // Extract all unique vessel types for dropdown lists
  const vesselTypes = useMemo(() => {
    const types = new Set(vessels.map((v) => v.vessel_type));
    return ['All', ...Array.from(types)];
  }, [vessels]);

  // Extract all unique alert types/anomalies
  const anomalyTypes = [
    'All',
    'AIS Gap',
    'Restricted Zone Entry',
    'Speed Anomaly',
    'Loitering',
    'Route Deviation',
    'Fishing-like Movement',
  ];

  // Filter vessels based on requirements
  const filteredVessels = useMemo(() => {
    return vessels.filter((vessel) => {
      // 1. Search term match
      const matchesSearch = 
        vessel.vessel_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vessel.mmsi_hash.toLowerCase().includes(searchTerm.toLowerCase());

      // 2. Vessel Type match
      const matchesType = selectedType === 'All' || vessel.vessel_type === selectedType;

      // 3. Risk Level match
      const matchesRisk = selectedRisk === 'All' || vessel.risk_level === selectedRisk;

      // 4. Alert Type match associated with the vessel
      let matchesAnomaly = true;
      if (selectedAnomaly !== 'All') {
        const vesselAlerts = alerts.filter((a) => a.vessel_id === vessel.vessel_id);
        matchesAnomaly = vesselAlerts.some((a) => a.alert_type === selectedAnomaly && a.status !== 'Resolved');
      }

      return matchesSearch && matchesType && matchesRisk && matchesAnomaly;
    });
  }, [vessels, alerts, searchTerm, selectedType, selectedRisk, selectedAnomaly]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedType('All');
    setSelectedRisk('All');
    setSelectedAnomaly('All');
  };

  return (
    <div className="flex flex-col xl:flex-row h-[calc(100vh-140px)] gap-5">
      
      {/* Left Filter and Search Navigation Module */}
      <div className="w-full xl:w-96 shrink-0 bg-slate-900/30 border border-slate-900 rounded-xl p-5 flex flex-col justify-between h-full overflow-y-auto">
        <div className="space-y-5">
          {/* Module Header */}
          <div className="flex items-center justify-between border-b border-slate-900/60 pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                Target Filters
              </h3>
            </div>
            
            <button
              onClick={handleResetFilters}
              className="text-[10px] font-mono hover:text-cyan-400 text-slate-500 font-semibold uppercase flex items-center gap-1 cursor-pointer transition"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* Search Vessel Name or MMSI */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
              Keywords (Hull / MMSI)
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search POLAR STAR or MMSI..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filter by Vessel Type */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
              Vessel Hull Category
            </label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              {vesselTypes.map((type, idx) => (
                <option key={idx} value={type} className="bg-slate-950">
                  {type === 'All' ? 'All Class Categories' : type}
                </option>
              ))}
            </select>
          </div>

          {/* Filter by Threat / Risk Level */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
              Threat Classification
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {['All', 'High', 'Medium', 'Low'].map((level) => {
                const isActive = selectedRisk === level;
                return (
                  <button
                    key={level}
                    onClick={() => setSelectedRisk(level)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition border ${
                      isActive 
                        ? level === 'High' ? 'bg-rose-500/10 border-rose-500 text-rose-400 font-extrabold' : 
                          level === 'Medium' ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-extrabold' : 
                          level === 'Low' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-extrabold' : 
                          'bg-cyan-500/10 border-cyan-500 text-cyan-400 font-extrabold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter by Active Anomaly Type */}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase">
              Triggered Behavior / Anomaly
            </label>
            <select
              value={selectedAnomaly}
              onChange={(e) => setSelectedAnomaly(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              {anomalyTypes.map((anomaly, idx) => (
                <option key={idx} value={anomaly} className="bg-slate-950">
                  {anomaly === 'All' ? 'All Telemetry Triggers' : anomaly}
                </option>
              ))}
            </select>
          </div>

          {/* Map Display Toggles */}
          <div className="space-y-2 border-t border-slate-900/60 pt-4 mt-2">
            <label className="block text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-2">
              Layer Options
            </label>
            
            <button
              onClick={() => setShowAllTrails(!showAllTrails)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold border transition ${
                showAllTrails 
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
              }`}
            >
              <span className="flex items-center gap-2">
                {showAllTrails ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span>Draw Fleet Track Polylines</span>
              </span>
              <span className="text-[9px] uppercase font-mono px-1 border border-slate-700/50 rounded">
                {showAllTrails ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* Dynamic Scan Vessels Matching results list */}
        <div className="flex-1 overflow-y-auto mt-5 border-t border-slate-900/80 pt-4 flex flex-col justify-start">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
              Scan Matching Hulls
            </span>
            <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-bold">
              {filteredVessels.length} found
            </span>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[300px] xl:max-h-[220px] pr-1.5">
            {filteredVessels.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-slate-900 rounded-lg text-xs text-slate-500">
                No active targets match coordinates or telemetry query.
              </div>
            ) : (
              filteredVessels.map((vessel) => {
                const isSelected = vessel.vessel_id === selectedVesselId;
                const riskColor = 
                  vessel.risk_level === 'High' ? 'text-rose-400 border-rose-500/30' :
                  vessel.risk_level === 'Medium' ? 'text-amber-400 border-amber-500/30' : 
                  'text-cyan-400 border-cyan-500/30';
                
                return (
                  <div
                    key={vessel.vessel_id}
                    onClick={() => onSelectVessel(vessel.vessel_id)}
                    className={`p-2 rounded-lg border transition duration-150 cursor-pointer flex items-center justify-between group ${
                      isSelected
                        ? 'bg-gradient-to-r from-cyan-950/40 to-slate-900 border-cyan-500 text-cyan-400 font-semibold'
                        : 'bg-slate-950/40 hover:bg-slate-900/40 border-slate-900 text-slate-300'
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <h4 className="text-[11px] font-bold truncate tracking-wide">
                        {vessel.vessel_name}
                      </h4>
                      <p className="text-[9px] font-mono text-slate-500 truncate mt-0.5">
                        MMSI: {vessel.mmsi_hash.slice(-7)} // {vessel.vessel_type}
                      </p>
                    </div>
                    <span className={`text-[9px] font-mono font-extrabold border bg-slate-950/60 px-1 py-0.5 rounded leading-tight shrink-0 ${riskColor}`}>
                      R {vessel.risk_score}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Full Scale Maritime Radar Container Map */}
      <div className="flex-1 bg-slate-900/20 border border-slate-900 rounded-xl relative h-full flex flex-col justify-between">
        {/* Map Header Overlay */}
        <div className="absolute top-2.5 left-14 z-[1000] bg-slate-950/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-slate-800 max-w-sm pointer-events-none hidden md:block">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h4 className="text-xs font-bold text-slate-100 uppercase tracking-widest leading-none">
              STRAIT OF MALACCA RADAR CORRIDOR
            </h4>
          </div>
          <p className="text-[9px] font-mono text-slate-400 mt-1">
            Tracking: {vessels.length} hulls. Center coordinates: [2.36°N , 101.88°E]
          </p>
        </div>

        {/* Render Map */}
        <div className="flex-grow w-full h-full">
          <VesselMap
            vessels={filteredVessels}
            zones={zones}
            alerts={alerts}
            selectedVesselId={selectedVesselId}
            onSelectVessel={(id) => {
              onSelectVessel(id);
            }}
            height="100%"
            showAllTrails={showAllTrails}
          />
        </div>
      </div>
    </div>
  );
}
