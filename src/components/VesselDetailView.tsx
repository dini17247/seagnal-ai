import { useEffect, useMemo, useState } from 'react';
import {
  Anchor,
  MapPin,
  ShieldAlert,
  Clock,
  Cpu,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Ship,
  Sparkles,
  BookOpen,
  Search,
} from 'lucide-react';

import { Vessel, Alert, MaritimeZone, Movement } from '../types';
import { mockAIEvaluation } from '../data';
import VesselMap from './VesselMap';

interface VesselDetailViewProps {
  vessels: Vessel[];
  movements: Movement[];
  alerts: Alert[];
  zones: MaritimeZone[];
  selectedVesselId: string | null;
  onBack: () => void;
  onSelectVessel: (vesselId: string) => void;
  onNavigate: (view: any) => void;
  onModifyAlertStatus?: (
    alertId: string,
    status: 'Resolved' | 'Under Review',
  ) => void;
  onAddAlert?: (vesselId: string, alertType: string, text: string) => void;
}

export default function VesselDetailView({
  vessels,
  alerts,
  zones,
  movements,
  selectedVesselId,
  onBack,
  onSelectVessel,
  onNavigate,
  onModifyAlertStatus,
}: VesselDetailViewProps) {
  const [selectedSpecId, setSelectedSpecId] = useState<string>(
    selectedVesselId || '',
  );
  const [profileOpen, setProfileOpen] = useState<boolean>(
    Boolean(selectedVesselId),
  );
  const [profileSearch, setProfileSearch] = useState('');
  const [actionNotice, setActionNotice] = useState<string>('');

  useEffect(() => {
    if (
      selectedVesselId &&
      vessels.some((vessel) => vessel.vessel_id === selectedVesselId)
    ) {
      setSelectedSpecId(selectedVesselId);
      setProfileOpen(true);
      setActionNotice('');
    }

    if (!selectedVesselId) {
      setProfileOpen(false);
      setSelectedSpecId('');
      setActionNotice('');
    }
  }, [selectedVesselId, vessels]);

  const currentVessel = useMemo(() => {
    return vessels.find((v) => v.vessel_id === selectedSpecId) || vessels[0];
  }, [vessels, selectedSpecId]);

  const filteredVessels = useMemo(() => {
    const search = profileSearch.trim().toLowerCase();

    const sortedVessels = [...vessels].sort((a, b) => {
      const riskRank: Record<string, number> = {
        High: 3,
        Medium: 2,
        Low: 1,
      };

      const riskDifference =
        (riskRank[b.risk_level] || 0) - (riskRank[a.risk_level] || 0);

      if (riskDifference !== 0) {
        return riskDifference;
      }

      return b.risk_score - a.risk_score;
    });

    if (!search) {
      return sortedVessels;
    }

    return sortedVessels.filter((vessel) => {
      return (
        vessel.vessel_name.toLowerCase().includes(search) ||
        vessel.vessel_id.toLowerCase().includes(search) ||
        vessel.vessel_type.toLowerCase().includes(search) ||
        vessel.risk_level.toLowerCase().includes(search) ||
        vessel.status.toLowerCase().includes(search) ||
        Boolean(vessel.mmsi_hash?.toLowerCase().includes(search)) ||
        Boolean(vessel.flag_state?.toLowerCase().includes(search)) ||
        Boolean(vessel.destination?.toLowerCase().includes(search))
      );
    });
  }, [vessels, profileSearch]);

  const highRiskCount = useMemo(() => {
    return vessels.filter((vessel) => vessel.risk_level === 'High').length;
  }, [vessels]);

  const activeAlertCount = useMemo(() => {
    return alerts.filter((alert) => alert.status !== 'Resolved').length;
  }, [alerts]);

  const vesselsWithAlertsCount = useMemo(() => {
    const vesselIds = new Set(
      alerts
        .filter((alert) => alert.status !== 'Resolved')
        .map((alert) => alert.vessel_id),
    );

    return vesselIds.size;
  }, [alerts]);

  const getActiveAlertCount = (vesselId: string) => {
    return alerts.filter(
      (alert) => alert.vessel_id === vesselId && alert.status !== 'Resolved',
    ).length;
  };

  const getMovementCount = (vesselId: string) => {
    return movements.filter((movement) => movement.vessel_id === vesselId)
      .length;
  };

  const openProfile = (vesselId: string) => {
    setSelectedSpecId(vesselId);
    setProfileOpen(true);
    setActionNotice('');
    onSelectVessel(vesselId);

    window.setTimeout(() => {
      document.getElementById('vessel-profile-detail')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  const closeProfile = () => {
    setProfileOpen(false);
    setSelectedSpecId('');
    setActionNotice('');
  };

  const currentMovements = useMemo(() => {
    if (!currentVessel) {
      return [];
    }

    return movements
      .filter((movement) => movement.vessel_id === currentVessel.vessel_id)
      .sort(
        (first, second) =>
          new Date(first.timestamp).getTime() -
          new Date(second.timestamp).getTime(),
      );
  }, [currentVessel, movements]);

  const vesselAlerts = useMemo(() => {
    if (!currentVessel) {
      return [];
    }

    return alerts.filter((a) => a.vessel_id === currentVessel.vessel_id);
  }, [alerts, currentVessel]);

  const vesselMapZones = useMemo(() => {
    const linkedZoneIds = new Set(
      vesselAlerts
        .map((alert) => alert.zone_id)
        .filter((zoneId): zoneId is string => Boolean(zoneId)),
    );

    const linkedZones = zones.filter((zone) => linkedZoneIds.has(zone.zone_id));

    if (linkedZones.length > 0) {
      return linkedZones.slice(0, 4);
    }

    return zones.filter((zone) => zone.risk_level === 'High').slice(0, 3);
  }, [vesselAlerts, zones]);

  const aiExplanation = useMemo(() => {
    const defaultAI = {
      summary:
        'Establishing real-time Kinematics context... This vessel exhibits traditional sailing parameters under normal course guidelines. No hostile triggers detected in physical proximity.',
      confidence: 50,
      indicators: [{ name: 'Stable Telemetry Bounds', weight: 'Nominal Behavior' }],
      recommended_actions: [
        'Continue periodic sensor ping sweep.',
        'Re-check destination pilots manifesto.',
      ],
    };

    if (!currentVessel) {
      return defaultAI;
    }

    return (
      mockAIEvaluation[
        currentVessel.vessel_id as keyof typeof mockAIEvaluation
      ] || defaultAI
    );
  }, [currentVessel]);

  const triggerTacticalAction = (actionName: string) => {
    setActionNotice(
      `TACTICAL ACTION INITIATED: ${actionName} - Transmitting coordinates on VHF-16 encrypted naval lines.`,
    );

    setTimeout(() => {
      setActionNotice('');
    }, 4000);
  };

  const getRiskColor = (level: string) => {
    if (level === 'High') {
      return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    }

    if (level === 'Medium') {
      return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    }

    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  };

  if (vessels.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
        <p className="text-slate-400">
          Loading vessel profiles. Expand active list.
        </p>
      </div>
    );
  }

  if (!profileOpen || !currentVessel) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
          <div>
            <h2 className="text-2xl font-black text-slate-100 tracking-wider uppercase flex items-center gap-2">
              <Ship className="w-6 h-6 text-cyan-400" />
              Vessel Profile Index
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Search and open a vessel profile before viewing registry details,
              AIS movement logs, risk indicators, and tactical actions.
            </p>
          </div>

          <button
            onClick={onBack}
            className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition"
          >
            Back to Dashboard
          </button>
        </div>
        
        <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-850 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                Vessel Profile List
              </h3>

              <p className="text-[11px] text-slate-500 mt-1">
                Search by vessel name, ID, MMSI, type, flag state, risk level,
                status, or destination.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
                placeholder="Search vessel profile..."
                className="w-full lg:w-96 pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="p-4 space-y-3 max-h-[calc(100vh-360px)] overflow-y-auto">
            {filteredVessels.length === 0 ? (
              <div className="px-4 py-10 rounded-xl border border-dashed border-slate-800 text-xs text-slate-500 text-center">
                No vessel profile matched the search.
              </div>
            ) : (
              filteredVessels.map((vessel) => {
                const vesselActiveAlerts = getActiveAlertCount(vessel.vessel_id);
                const vesselMovementCount = getMovementCount(vessel.vessel_id);

                return (
                  <div
                    key={vessel.vessel_id}
                    className="rounded-xl border border-slate-850 bg-slate-950/60 hover:border-slate-700 transition p-4"
                  >
                    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-black text-slate-100 tracking-wide truncate">
                            {vessel.vessel_name}
                          </h4>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${getRiskColor(
                              vessel.risk_level,
                            )}`}
                          >
                            {vessel.risk_score} / {vessel.risk_level}
                          </span>

                          {vesselActiveAlerts > 0 && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[9px] font-bold uppercase">
                              {vesselActiveAlerts} Active Alert
                              {vesselActiveAlerts > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-2 text-[10px] font-mono text-slate-500">
                          <span>ID: {vessel.vessel_id}</span>
                          <span>MMSI: {vessel.mmsi_hash || 'N/A'}</span>
                          <span>Type: {vessel.vessel_type}</span>
                          <span>Flag: {vessel.flag_state || 'N/A'}</span>
                        </div>

                        <div className="mt-2 grid grid-cols-1 lg:grid-cols-3 gap-2 text-[10px] text-slate-500">
                          <span className="truncate">
                            Destination: {vessel.destination || 'UNKNOWN'}
                          </span>
                          <span className="font-mono">
                            AIS: {new Date(vessel.last_ais_time).toLocaleString()}
                          </span>
                          <span className="font-mono">
                            Movement logs: {vesselMovementCount}
                          </span>
                        </div>

                        <p className="mt-2 text-[11px] text-slate-400 line-clamp-1">
                          {vessel.status}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row xl:flex-col gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openProfile(vessel.vessel_id)}
                          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider cursor-pointer"
                        >
                          Open Profile
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            onSelectVessel(vessel.vessel_id);
                            onNavigate('incident-reports');
                          }}
                          className="px-4 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-cyan-300 rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                        >
                          Incident Report
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="vessel-profile-detail" className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={closeProfile}
            className="p-2 bg-slate-950 border border-slate-900 hover:border-slate-800 hover:bg-slate-950/80 text-slate-400 hover:text-slate-200 rounded-lg cursor-pointer transition"
            title="Back to profile list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-slate-100 tracking-wider">
                {currentVessel.vessel_name}
              </h2>

              <span
                className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono border font-extrabold ${getRiskColor(
                  currentVessel.risk_level,
                )}`}
              >
                {currentVessel.risk_level} RISK THREAT
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1">
              Primary MMSI Identifier:{' '}
              <span className="font-mono text-cyan-400 font-semibold">
                {currentVessel.mmsi_hash}
              </span>{' '}
              // Class-Type: {currentVessel.vessel_type} // Source:{' '}
              {currentVessel.source_dataset ||
                'BigQuery maritime tables / controlled mock AIS data'}
            </p>
          </div>
        </div>

        <button
          onClick={closeProfile}
          className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer transition"
        >
          Back to Profile List
        </button>
      </div>

      {actionNotice && (
        <div className="bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 rounded-xl p-4 text-xs font-mono font-semibold animate-pulse flex items-center gap-2.5">
          <Cpu className="w-5 h-5 text-cyan-400 animate-spin shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-5 space-y-6 h-fit">
          <div className="flex items-center gap-2 border-b border-slate-900/60 pb-3">
            <Anchor className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
              Vessel Registry Specs
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-500 block">Flag State</span>
              <span className="font-semibold text-slate-200">
                {currentVessel.flag_state || 'N/A'}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-500 block">Threat Score</span>
              <span className="font-extrabold font-mono text-rose-500 text-sm leading-none bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/20 w-fit">
                {currentVessel.risk_score} / 100
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-500 block">Telemetry status</span>
              <span className="font-semibold text-slate-200">
                {currentVessel.status}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-500 block">
                Active Heading Azimuth
              </span>
              <span className="font-semibold font-mono text-slate-200">
                {currentVessel.heading}° (compass)
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-500 block">AIS Contact Time</span>
              <span className="font-semibold text-slate-200">
                {new Date(currentVessel.last_ais_time).toLocaleTimeString()}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-slate-500 block">Speed Knots</span>
              <span className="font-bold text-cyan-400 font-mono">
                {currentVessel.speed} kn{' '}
                <span className="text-xs text-slate-400 font-sans">
                  ({Math.round(currentVessel.speed * 1.852)} km/h)
                </span>
              </span>
            </div>

            <div className="col-span-2 border-t border-slate-900/60 pt-4 grid grid-cols-2 gap-y-4">
              <div className="space-y-0.5">
                <span className="text-slate-500 block">
                  Reported Destination
                </span>
                <span
                  className="font-semibold text-slate-200 truncate block max-w-[150px]"
                  title={currentVessel.destination}
                >
                  {currentVessel.destination || 'UNKNOWN'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-500 block">Estimated ETA</span>
                <span className="font-semibold text-slate-200 truncate block text-[11px] font-mono leading-normal">
                  {currentVessel.eta
                    ? new Date(currentVessel.eta).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-500 block">Physical Length</span>
                <span className="font-semibold text-slate-200">
                  {currentVessel.length
                    ? `${currentVessel.length} meters`
                    : 'N/A'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-500 block">Hull Beam Width</span>
                <span className="font-semibold text-slate-200">
                  {currentVessel.width
                    ? `${currentVessel.width} meters`
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-900/80 pt-5 space-y-2.5">
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block">
              GPS Coordinate Anchor
            </span>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-900 text-[11px] font-mono text-cyan-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5" />
                <span>LAT: {currentVessel.latitude.toFixed(5)}°N</span>
              </div>

              <span>LNG: {currentVessel.longitude.toFixed(5)}°E</span>
            </div>

            <div className="h-72 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 relative shadow-inner shadow-slate-950/60">
              <VesselMap
                vessels={[currentVessel]}
                zones={vesselMapZones}
                alerts={alerts}
                movements={currentMovements}
                selectedVesselId={currentVessel.vessel_id}
                height="100%"
                showAllTrails={true}
                showAnimation={false}
                compact
                showProfileButton={false}
                onSelectVessel={(id) => {
                  setSelectedSpecId(id);
                  onSelectVessel(id);
                }}
                onOpenVesselProfile={(id) => {
                  setSelectedSpecId(id);
                  onSelectVessel(id);
                }}
                onOpenIntelReport={(id) => {
                  setSelectedSpecId(id);
                  onSelectVessel(id);
                  onNavigate('incident-reports');
                }}
              />
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-350">
                  Historical AIS Movement Logs
                </h3>

                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Chronological satellite reporting coordinates and speed
                  indicators.
                </p>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[9px]">
                <span className="px-1.5 py-0.5 bg-cyan-100 dark:bg-cyan-950/40 text-cyan-705 dark:text-cyan-400 font-bold rounded border border-cyan-200 dark:border-cyan-900/30">
                  SAT TELEMETRY
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-150 dark:border-slate-800">
              {currentMovements.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  No historical movement coordinates logged for this vessel.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-[9px] font-mono uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-3">Timestamp (UTC)</th>
                      <th className="py-2 px-3">Latitude</th>
                      <th className="py-2 px-3">Longitude</th>
                      <th className="py-2 px-3">Speed</th>
                      <th className="py-2 px-3 text-right">Heading</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 bg-white dark:bg-slate-900/10">
                    {currentMovements.map((mv, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition duration-100"
                      >
                        <td className="py-2 px-3 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                          {new Date(mv.timestamp).toLocaleString()}
                        </td>

                        <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-350">
                          {mv.latitude.toFixed(5)}°N
                        </td>

                        <td className="py-2 px-3 font-mono text-slate-700 dark:text-slate-350">
                          {mv.longitude.toFixed(5)}°E
                        </td>

                        <td className="py-2 px-3 font-mono font-bold text-cyan-600 dark:text-cyan-400">
                          {mv.speed} kn{' '}
                          <span className="text-[10px] text-slate-500 dark:text-slate-500 font-sans">
                            ({Math.round(mv.speed * 1.852)} km/h)
                          </span>
                        </td>

                        <td className="py-2 px-3 font-mono text-right text-slate-500 dark:text-slate-450">
                          {mv.heading}°
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-5 md:col-span-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-slate-900/60 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="bg-violet-500/15 p-1 rounded-lg border border-violet-500/30 text-violet-400 shrink-0">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                    </div>

                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-300">
                      AI Gen-2 Analytical Explanation
                    </h3>
                  </div>

                  <div className="flex items-center gap-1 bg-violet-950/40 border border-violet-500/20 px-2 py-0.5 rounded text-[9px] font-mono text-violet-400 font-bold">
                    <span>CONFIDENCE {aiExplanation.confidence}%</span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-950/40 p-3.5 rounded-lg border border-slate-900 text-justify font-sans">
                  &quot;{aiExplanation.summary}&quot;
                </p>

                <div className="mt-4 space-y-2">
                  <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase block">
                    Anomaly Footprint Indicators
                  </span>

                  <div className="space-y-1.5">
                    {aiExplanation.indicators.map((ind, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-xs p-2 bg-slate-950/20 border border-slate-900/80 rounded"
                      >
                        <span className="text-slate-400">{ind.name}</span>
                        <span className="text-[10px] font-semibold text-rose-400 font-mono uppercase bg-rose-500/5 px-1.5 py-0.2 rounded border border-rose-500/10">
                          {ind.weight}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 text-[9px] font-mono text-slate-500 border-t border-slate-900/60 pt-3">
                Models Used: Gemini-1.5, synthetic radar overlays, maritime
                threat weights.
              </div>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-5 md:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-slate-900/60 pb-3 mb-4">
                  <BookOpen className="w-4 h-4 text-rose-400" />
                  <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                    SOP Operations Actions
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {aiExplanation.recommended_actions.map((act, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs bg-slate-950/30 border border-slate-900/80 p-2.5 rounded-lg"
                    >
                      <span className="text-rose-400 font-mono font-bold mt-0.5 shrink-0">
                        #{i + 1}
                      </span>
                      <span className="text-slate-300 leading-relaxed">
                        {act}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 mt-5 border-t border-slate-900/60 pt-4">
                <button
                  onClick={() =>
                    triggerTacticalAction('Dispatch Interceptor Squadron')
                  }
                  className="w-full text-center py-2 bg-rose-600 hover:bg-rose-500 text-white hover:text-slate-950 rounded-lg text-xs font-bold tracking-widest uppercase shadow transition duration-150 cursor-pointer"
                >
                  DISPATCH INTERCEPT PATROL
                </button>

                <button
                  onClick={() => triggerTacticalAction('Broadcast Digital Warning')}
                  className="w-full text-center py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-semibold tracking-wider transition cursor-pointer"
                >
                  BROADCAST VHF WARNING
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-5">
            <div className="flex items-center gap-2 border-b border-slate-900/60 pb-3 mb-4">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                Triggered Alarms Context
              </h3>
            </div>

            <div className="space-y-3">
              {vesselAlerts.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-900 rounded-lg text-xs text-slate-500">
                  Excellent: No flagged active anomaly alarms. Safe operating
                  parameters.
                </div>
              ) : (
                vesselAlerts.map((alert) => (
                  <div
                    key={alert.alert_id}
                    className="p-4 bg-slate-950/60 border border-slate-900 rounded-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold font-mono tracking-wide ${
                            alert.severity === 'High'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                          }`}
                        >
                          {alert.severity} Severity
                        </span>

                        <h4 className="text-xs font-bold text-slate-200">
                          {alert.alert_type}
                        </h4>

                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(alert.alert_time).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-relaxed">
                        {alert.description}
                      </p>
                    </div>

                    <div className="flex flex-row md:flex-col gap-2 shrink-0 self-end md:self-center">
                      {alert.status !== 'Resolved' ? (
                        <button
                          onClick={() => {
                            if (onModifyAlertStatus) {
                              onModifyAlertStatus(alert.alert_id, 'Resolved');
                            }

                            setActionNotice(
                              `ALARM_DEACTIVATION: Flagged Alert ${alert.alert_id} resolved.`,
                            );
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 rounded text-xs font-bold tracking-wider uppercase transition cursor-pointer"
                        >
                          SOLVED
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold font-mono bg-emerald-500/5 px-3 py-1 rounded border border-emerald-500/10">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>RESOLVED</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                onSelectVessel(currentVessel.vessel_id);
                onNavigate('incident-reports');
              }}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-xs font-black uppercase tracking-wider cursor-pointer flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" />
              Open Incident Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}