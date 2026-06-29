import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  MapPin,
  Anchor,
  ShieldAlert,
  Compass,
  Waves,
  X,
  RefreshCw,
  Eye,
  EyeOff,
  BellRing,
} from 'lucide-react';
import {
  Vessel,
  Movement,
  MaritimeZone,
  Alert,
} from '../types';
import VesselMap from './VesselMap';

interface VesselMapViewProps {
  vessels: Vessel[];
  zones: MaritimeZone[];
  alerts: Alert[];
  movements: Movement[];
  selectedVesselId: string | null;
  onSelectVessel: (vesselId: string | null) => void;
  onNavigate: (view: any) => void;
}

export default function VesselMapView({
  vessels,
  zones,
  alerts,
  movements,
  selectedVesselId,
  onSelectVessel,
  onNavigate,
}: VesselMapViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedRisk, setSelectedRisk] = useState('All');
  const [selectedAnomaly, setSelectedAnomaly] = useState('All');
  const [zoneDisplayMode, setZoneDisplayMode] = useState<'Priority' | 'All' | 'Hidden'>('Priority');
  const [mapDensity, setMapDensity] = useState<'Focus' | 'All'>('All');
  const [showAllTrails, setShowAllTrails] = useState(false);

  const dataSourceLabel = useMemo(() => {
    const sources = Array.from(
      new Set(
        [
          ...vessels.map((vessel) => vessel.source_dataset),
          ...zones.map((zone) => zone.source_dataset),
        ].filter((source): source is string => Boolean(source && source.trim()))
      )
    );

    return sources.length ? sources.slice(0, 3).join(', ') : 'BigQuery maritime tables / controlled mock AIS data';
  }, [vessels, zones]);

  const vesselTypes = useMemo(() => {
    const types = new Set(vessels.map((v) => v.vessel_type).filter(Boolean));
    return ['All', ...Array.from(types).sort()];
  }, [vessels]);

  const anomalyTypes = useMemo(() => {
    const defaultTypes = [
      'AIS Gap',
      'Restricted Zone Entry',
      'Speed Anomaly',
      'Loitering',
      'Route Deviation',
      'Fishing-like Movement',
    ];
    const liveTypes = alerts.map((alert) => alert.alert_type).filter(Boolean);
    return ['All', ...Array.from(new Set([...defaultTypes, ...liveTypes]))];
  }, [alerts]);

  const selectedVessel = useMemo(
    () => vessels.find((vessel) => vessel.vessel_id === selectedVesselId) ?? null,
    [vessels, selectedVesselId]
  );

  const selectedVesselAlerts = useMemo(() => {
    if (!selectedVesselId) return [];
    return alerts.filter((alert) => alert.vessel_id === selectedVesselId && alert.status !== 'Resolved');
  }, [alerts, selectedVesselId]);

  const statusSummary = useMemo(() => {
    const activeAlerts = alerts.filter((alert) => alert.status !== 'Resolved').length;
    return {
      high: vessels.filter((vessel) => vessel.risk_level === 'High').length,
      medium: vessels.filter((vessel) => vessel.risk_level === 'Medium').length,
      low: vessels.filter((vessel) => vessel.risk_level === 'Low').length,
      activeAlerts,
    };
  }, [vessels, alerts]);

  const filteredVessels = useMemo(() => {
    return vessels.filter((vessel) => {
      const normalizedSearch = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !normalizedSearch ||
        vessel.vessel_name.toLowerCase().includes(normalizedSearch) ||
        vessel.mmsi_hash.toLowerCase().includes(normalizedSearch);

      const matchesType = selectedType === 'All' || vessel.vessel_type === selectedType;
      const matchesRisk = selectedRisk === 'All' || vessel.risk_level === selectedRisk;

      const matchesAnomaly =
        selectedAnomaly === 'All' ||
        alerts.some(
          (alert) =>
            alert.vessel_id === vessel.vessel_id &&
            alert.alert_type === selectedAnomaly &&
            alert.status !== 'Resolved'
        );

      return matchesSearch && matchesType && matchesRisk && matchesAnomaly;
    });
  }, [vessels, alerts, searchTerm, selectedType, selectedRisk, selectedAnomaly]);

  const priorityVessels = useMemo(() => {
    return [...filteredVessels]
      .sort((a, b) => b.risk_score - a.risk_score)
      .slice(0, 12);
  }, [filteredVessels]);


  const buildBalancedFocusVessels = (items: Vessel[]) => {
    const sortByAlertThenRisk = (a: Vessel, b: Vessel) => {
      const alertA = alerts.some((alert) => alert.vessel_id === a.vessel_id && alert.status !== 'Resolved') ? 1 : 0;
      const alertB = alerts.some((alert) => alert.vessel_id === b.vessel_id && alert.status !== 'Resolved') ? 1 : 0;
      return alertB - alertA || b.risk_score - a.risk_score;
    };

    if (selectedRisk !== 'All') {
      return [...items].sort(sortByAlertThenRisk).slice(0, 36);
    }

    const high = items.filter((vessel) => vessel.risk_level === 'High').sort(sortByAlertThenRisk).slice(0, 14);
    const medium = items.filter((vessel) => vessel.risk_level === 'Medium').sort(sortByAlertThenRisk).slice(0, 14);
    const low = items.filter((vessel) => vessel.risk_level === 'Low').sort(sortByAlertThenRisk).slice(0, 8);

    return [...high, ...medium, ...low];
  };

  const visibleMapVessels = useMemo(() => {
    if (selectedRisk === 'All' || mapDensity === 'All') {
      return filteredVessels;
    }

    const selected = selectedVesselId
      ? filteredVessels.find((vessel) => vessel.vessel_id === selectedVesselId)
      : null;

    const priority = buildBalancedFocusVessels(filteredVessels);

    const merged = selected ? [selected, ...priority] : priority;

    return merged.filter(
      (vessel, index, array) =>
        array.findIndex((item) => item.vessel_id === vessel.vessel_id) === index
    );
  }, [alerts, filteredVessels, mapDensity, selectedRisk, selectedVesselId]);

  const visibleMovements = useMemo(() => {
    const visibleIds = new Set(visibleMapVessels.map((vessel) => vessel.vessel_id));
    return movements.filter((movement) => visibleIds.has(movement.vessel_id));
  }, [movements, visibleMapVessels]);

  const visibleMapAlertCount = useMemo(() => {
    const visibleIds = new Set(visibleMapVessels.map((vessel) => vessel.vessel_id));
    return alerts.filter((alert) => alert.status !== 'Resolved' && visibleIds.has(alert.vessel_id)).length;
  }, [alerts, visibleMapVessels]);

  const visibleZones = useMemo(() => {
    if (zoneDisplayMode === 'Hidden') {
      return [];
    }

    if (zoneDisplayMode === 'All') {
      return zones;
    }

    const alertZoneIds = new Set(
      alerts
        .filter((alert) => alert.status !== 'Resolved' && alert.zone_id)
        .map((alert) => alert.zone_id as string)
    );

    const selectedZones = zones.filter((zone) => alertZoneIds.has(zone.zone_id));
    const fallbackHighRiskZones = zones.filter((zone) => zone.risk_level === 'High');
    const merged = [...selectedZones, ...fallbackHighRiskZones].filter(
      (zone, index, array) => array.findIndex((item) => item.zone_id === zone.zone_id) === index
    );

    return merged.slice(0, 24);
  }, [alerts, zones, zoneDisplayMode]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedType('All');
    setSelectedRisk('All');
    setSelectedAnomaly('All');
    setZoneDisplayMode('Priority');
    setMapDensity('All');
    setShowAllTrails(false);
  };

  const riskBadgeClass = (riskLevel?: string) => {
    if (riskLevel === 'High') return 'bg-rose-500/10 border-rose-500/40 text-rose-300';
    if (riskLevel === 'Medium') return 'bg-amber-500/10 border-amber-500/40 text-amber-300';
    return 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300';
  };

  const openIntelReport = (vesselId: string) => {
    onSelectVessel(vesselId);
    onNavigate('incident-reports');
  };

  const openVesselProfile = (vesselId: string) => {
    onSelectVessel(vesselId);
    onNavigate('vessels');
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[390px_minmax(0,1fr)] min-h-[calc(100vh-140px)] gap-5">
      <aside className="bg-slate-900/45 border border-slate-800/80 rounded-2xl overflow-y-auto flex flex-col min-h-[420px] xl:max-h-[calc(100vh-140px)] shadow-xl shadow-slate-950/30">
        <div className="p-5 border-b border-slate-800/80 bg-gradient-to-br from-slate-900 to-slate-950/80">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-extrabold text-slate-100 uppercase tracking-[0.22em]">
                  Vessel Map
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Use this page to filter vessels, inspect restricted zones, and open a selected ship profile from the live BigQuery demo feed.
              </p>
            </div>
            <button
              onClick={handleResetFilters}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-slate-700/70 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5">
              <Anchor className="w-3.5 h-3.5 text-cyan-400 mb-1" />
              <p className="text-lg font-black text-slate-100 leading-none">{vessels.length}</p>
              <p className="text-[9px] text-slate-500 uppercase font-mono mt-1">Vessels</p>
            </div>
            <div className="rounded-xl bg-rose-950/20 border border-rose-900/40 p-2.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400 mb-1" />
              <p className="text-lg font-black text-rose-200 leading-none">{statusSummary.high}</p>
              <p className="text-[9px] text-rose-400/80 uppercase font-mono mt-1">High</p>
            </div>
            <div className="rounded-xl bg-amber-950/20 border border-amber-900/40 p-2.5">
              <Compass className="w-3.5 h-3.5 text-amber-400 mb-1" />
              <p className="text-lg font-black text-amber-200 leading-none">{statusSummary.medium}</p>
              <p className="text-[9px] text-amber-400/80 uppercase font-mono mt-1">Medium</p>
            </div>
            <div className="rounded-xl bg-slate-950/70 border border-slate-800 p-2.5">
              <BellRing className="w-3.5 h-3.5 text-slate-300 mb-1" />
              <p className="text-lg font-black text-slate-100 leading-none">{statusSummary.activeAlerts}</p>
              <p className="text-[9px] text-slate-500 uppercase font-mono mt-1">Alerts</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4 border-b border-slate-800/80">
          <div>
            <label className="block text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
              Search vessel or MMSI
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Example: POLAR STAR or MMSI hash"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3">
            <div>
              <label className="block text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                Vessel type
              </label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                {vesselTypes.map((type) => (
                  <option key={type} value={type} className="bg-slate-950">
                    {type === 'All' ? 'All vessel types' : type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                Active anomaly
              </label>
              <select
                value={selectedAnomaly}
                onChange={(e) => setSelectedAnomaly(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                {anomalyTypes.map((anomaly) => (
                  <option key={anomaly} value={anomaly} className="bg-slate-950">
                    {anomaly === 'All' ? 'All anomaly types' : anomaly}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
              Risk level
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {['All', 'High', 'Medium', 'Low'].map((level) => {
                const isActive = selectedRisk === level;
                return (
                  <button
                    key={level}
                    onClick={() => {
                      setSelectedRisk(level);

                      if (level === 'All') {
                        setMapDensity('All');
                      }
                    }}
                    className={`py-2 rounded-xl text-[10px] font-bold uppercase transition border ${
                      isActive
                        ? level === 'High'
                          ? 'bg-rose-500/10 border-rose-500/60 text-rose-300'
                          : level === 'Medium'
                            ? 'bg-amber-500/10 border-amber-500/60 text-amber-300'
                            : level === 'Low'
                              ? 'bg-cyan-500/10 border-cyan-500/60 text-cyan-300'
                              : 'bg-slate-100 text-slate-950 border-slate-100'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
              Map vessel display
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(['Focus', 'All'] as const).map((mode) => {
                const isActive = mapDensity === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setMapDensity(mode)}
                    className={`py-2 rounded-xl text-[10px] font-bold uppercase transition border ${
                      isActive
                        ? 'bg-cyan-500/10 border-cyan-500/60 text-cyan-300'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                    title={
                      mode === 'Focus'
                        ? 'Cleaner view: show only selected and highest-priority vessels on the map'
                        : 'Show every vessel that matches the filters'
                    }
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
              All risk level always shows every matching vessel on the map. Focus mode only reduces markers when High, Medium, or Low risk is selected.            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
              Restricted zone layer
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Priority', 'All', 'Hidden'] as const).map((mode) => {
                const isActive = zoneDisplayMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setZoneDisplayMode(mode)}
                    className={`py-2 rounded-xl text-[10px] font-bold uppercase transition border ${
                      isActive
                        ? 'bg-cyan-500/10 border-cyan-500/60 text-cyan-300'
                        : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                    title={
                      mode === 'Priority'
                        ? 'Show a cleaner subset of alert-linked / high-risk zones'
                        : mode === 'All'
                          ? 'Show every restricted zone from BigQuery'
                          : 'Hide restricted zone boundaries'
                    }
                  >
                    {mode}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
              Priority mode keeps the map readable by showing {visibleZones.length} of {zones.length} zones. Use All only when you need full geofence inspection.
            </p>
          </div>

          <button
            onClick={() => setShowAllTrails(!showAllTrails)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold border transition ${
              showAllTrails
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <span className="flex items-center gap-2">
              {showAllTrails ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>Show vessel movement trails</span>
            </span>
            <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 border border-slate-700/70 rounded-md">
              {showAllTrails ? 'ON' : 'OFF'}
            </span>
          </button>
        </div>

        {selectedVessel && (
          <div className="p-5 border-b border-slate-800/80 bg-slate-950/35">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] font-mono text-cyan-400 mb-1">Selected target</p>
                <h4 className="text-sm font-extrabold text-slate-100 truncate">{selectedVessel.vessel_name}</h4>
                <p className="text-[10px] font-mono text-slate-500 truncate">{selectedVessel.vessel_type} • MMSI {selectedVessel.mmsi_hash.slice(-7)}</p>
              </div>
              <button
                onClick={() => onSelectVessel(null)}
                className="text-slate-500 hover:text-slate-300"
                title="Clear selected vessel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                <p className="text-[9px] text-slate-500 uppercase font-mono">Speed</p>
                <p className="text-xs font-bold text-cyan-300">{selectedVessel.speed} kn</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
                <p className="text-[9px] text-slate-500 uppercase font-mono">Heading</p>
                <p className="text-xs font-bold text-slate-200">{selectedVessel.heading}°</p>
              </div>
              <div className={`rounded-lg border p-2 ${riskBadgeClass(selectedVessel.risk_level)}`}>
                <p className="text-[9px] opacity-80 uppercase font-mono">Risk</p>
                <p className="text-xs font-black">{selectedVessel.risk_score}</p>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Active alerts linked to this vessel: <span className="font-bold text-slate-200">{selectedVesselAlerts.length}</span>. Click the map marker to view the popup, or open the profile for full vessel history.
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => openVesselProfile(selectedVessel.vessel_id)}
                className="px-3 py-2 rounded-lg bg-cyan-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider hover:bg-cyan-400 transition"
              >
                Open profile
              </button>
              <button
                onClick={() => onNavigate('alerts')}
                className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 text-[10px] font-extrabold uppercase tracking-wider hover:border-amber-500/50 hover:text-amber-300 transition"
              >
                View alerts
              </button>
              <button
                onClick={() => openIntelReport(selectedVessel.vessel_id)}
                className="col-span-2 px-3 py-2 rounded-lg border border-cyan-500/40 bg-cyan-950/20 text-cyan-300 text-[10px] font-extrabold uppercase tracking-wider hover:border-cyan-400/70 hover:bg-cyan-950/35 transition"
              >
                Open intel report
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-visible p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono tracking-[0.18em] text-slate-500 uppercase">
              Matching vessels
            </span>
            <span className="text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-400 px-2 py-1 rounded-lg font-bold">
              {filteredVessels.length} found
            </span>
          </div>

          <div className="space-y-2 pr-1.5 pb-2">
            {priorityVessels.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-xl text-xs text-slate-500">
                No vessels match the current filters.
              </div>
            ) : (
              priorityVessels.map((vessel) => {
                const isSelected = vessel.vessel_id === selectedVesselId;
                return (
                  <button
                    key={vessel.vessel_id}
                    onClick={() => onSelectVessel(vessel.vessel_id)}
                    className={`w-full p-3 rounded-xl border transition duration-150 cursor-pointer text-left ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/70 text-cyan-200 shadow-lg shadow-cyan-950/20'
                        : 'bg-slate-950/45 hover:bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-[12px] font-extrabold truncate tracking-wide">
                          {vessel.vessel_name}
                        </h4>
                        <p className="text-[9px] font-mono text-slate-500 truncate mt-1">
                          {vessel.vessel_type} • {vessel.speed} kn • {vessel.status}
                        </p>
                      </div>
                      <span className={`text-[10px] font-mono font-extrabold border px-2 py-1 rounded-lg shrink-0 ${riskBadgeClass(vessel.risk_level)}`}>
                        {vessel.risk_score}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </aside>

      <section className="relative bg-slate-950/30 border border-slate-800/80 rounded-2xl overflow-hidden h-[calc(100vh-140px)] min-h-[620px] shadow-xl shadow-slate-950/30">
        <div className="absolute top-4 left-14 z-[1000] bg-slate-950/90 backdrop-blur-md px-4 py-3 rounded-xl border border-slate-700/70 max-w-md pointer-events-none hidden md:block shadow-xl shadow-slate-950/40">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-cyan-400 animate-pulse" />
            <h4 className="text-xs font-extrabold text-slate-100 uppercase tracking-[0.22em] leading-none">
              Guam Demo Maritime Corridor
            </h4>
          </div>
          <p className="text-[10px] font-mono text-slate-400 mt-1.5 leading-relaxed">
            {visibleMapVessels.length}/{filteredVessels.length} vessels shown • {selectedRisk === 'All' ? 'all risk levels visible' : `${mapDensity.toLowerCase()} risk view`} • {visibleMapAlertCount} active map alerts • {visibleZones.length}/{zones.length} zones • Source: {dataSourceLabel}
          </p>
        </div>

        <VesselMap
          vessels={visibleMapVessels}
          zones={visibleZones}
          alerts={alerts}
          movements={visibleMovements}
          selectedVesselId={selectedVesselId}
          onSelectVessel={(id) => onSelectVessel(id)}
          onOpenIntelReport={openIntelReport}
          onOpenVesselProfile={openVesselProfile}
          height="100%"
          showAllTrails={showAllTrails}
        />
      </section>
    </div>
  );
}
