import React, { useState, FormEvent } from 'react';
import { 
  Settings, 
  HelpCircle, 
  Check, 
  ShieldCheck, 
  Clock, 
  Sliders, 
  BellRing, 
  Database, 
  Compass, 
  Lock,
  RefreshCw
} from 'lucide-react';
import { PlatformSettings } from '../types';

interface SettingsViewProps {
  settings: PlatformSettings;
  onSaveSettings: (newSettings: PlatformSettings) => void;
}

export default function SettingsView({ settings, onSaveSettings }: SettingsViewProps) {
  const [aisGap, setAisGap] = useState(settings.ais_gap_threshold);
  const [highRisk, setHighRisk] = useState(settings.high_risk_threshold);
  const [mediumRisk, setMediumRisk] = useState(settings.medium_risk_threshold);
  const [zoneRules, setZoneRules] = useState(settings.restricted_zone_rules);
  const [notifToggle, setNotifToggle] = useState(settings.alert_notification);
  const [geofenceToggle, setGeofenceToggle] = useState(settings.geofence_triggers);
  const [escalationToggle, setEscalationToggle] = useState(settings.auto_escalation);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    setTimeout(() => {
      onSaveSettings({
        ais_gap_threshold: aisGap,
        high_risk_threshold: highRisk,
        medium_risk_threshold: mediumRisk,
        restricted_zone_rules: zoneRules,
        alert_notification: notifToggle,
        geofence_triggers: geofenceToggle,
        auto_escalation: escalationToggle,
      });
      setSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }, 600);
  };

  const handleRestoreDefaults = () => {
    setAisGap(1.5);
    setHighRisk(75);
    setMediumRisk(40);
    setZoneRules('All unauthorized civilian vessels, fishing trawlers, and military transits without pre-clearance must flag high risk upon crossing geofenced zones.');
    setNotifToggle(true);
    setGeofenceToggle(true);
    setEscalationToggle(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            PLATFORM TRIGGER CONFIGURATION
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Tune radar calculation thresholds, automatic threat grading brackets, and SOP routing rules.
          </p>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 rounded-xl p-4 text-xs font-mono font-bold animate-pulse flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>TACTICAL SETTINGS SUCCESSFULLY APPLIED: Threshold parameters synchronized with Malacca Straits SOC cluster servers.</span>
        </div>
      )}

      {/* Main double column layout */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: Main settings parameters forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Kinematics trigger ranges */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-5 space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-900/60 pb-3">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-350">
                Marine Sensor & Threat Grading Settings
              </h3>
            </div>

            <div className="space-y-6">
              {/* AIS Gap Range slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    AIS Signal Interval Limit Gap (Threshold Hours)
                  </span>
                  <span className="text-xs font-bold font-mono text-cyan-400 block px-2 py-0.5 bg-slate-950 border border-slate-900 rounded">
                    {aisGap} hrs
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-sans leading-normal">
                  Minimum continuous telemetry absence period required before a hull flags an official &quot;AIS Gap&quot; safety violation alert.
                </p>
                <input
                  type="range"
                  min="0.5"
                  max="12"
                  step="0.5"
                  value={aisGap}
                  onChange={(e) => setAisGap(parseFloat(e.target.value))}
                  className="w-full accent-cyan-500 cursor-pointer bg-slate-950 h-2 rounded-lg"
                />
              </div>

              {/* Risk Level Scoring brackets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-900/40">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">
                      High-Risk Threat Limit
                    </span>
                    <span className="text-xs font-bold font-mono text-rose-500">
                      Score &ge; {highRisk}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Threat metrics (0-100) above this score boundary trigger priority watch alerts and trigger quick intercepts.
                  </p>
                  <input
                    type="number"
                    min="60"
                    max="95"
                    value={highRisk}
                    onChange={(e) => setHighRisk(parseInt(e.target.value) || 75)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">
                      Medium-Risk Anomaly Limit
                    </span>
                    <span className="text-xs font-bold font-mono text-amber-500">
                      Score &ge; {mediumRisk}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-550 leading-normal">
                    Lowest threat threshold necessary before starting active operations reviews and logging hull status logs.
                  </p>
                  <input
                    type="number"
                    min="20"
                    max="55"
                    value={mediumRisk}
                    onChange={(e) => setMediumRisk(parseInt(e.target.value) || 40)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* System Operating Rules */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-900/60 pb-3">
              <Database className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-350">
                SOP Geofence Evaluation Logic
              </h3>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold font-mono tracking-wider text-slate-500 uppercase">
                Restricted Zone Behavior Instruction Manual
              </label>
              <p className="text-[10px] text-slate-500 mt-0.5 mb-2 leading-normal">
                These rules are parsed by the AI matching compiler to automatically flag anomalies when vessels execute specific patterns inside military boundaries or coral conservation zones.
              </p>
              <textarea
                value={zoneRules}
                onChange={(e) => setZoneRules(e.target.value)}
                className="w-full h-28 p-3 bg-slate-950 border border-slate-850 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500 font-mono leading-relaxed resize-none"
                placeholder="Enter rules guidelines..."
              />
            </div>
          </div>

        </div>

        {/* Column 3: Platform Switches & save actions */}
        <div className="space-y-6">
          
          {/* Switch box */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-5 space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-900/60 pb-3">
              <BellRing className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-350">
                Surveillance Beacons
              </h3>
            </div>

            {/* Notification toggle */}
            <div className="flex items-start justify-between gap-3 p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-300 block">Terminal Sound Beacons</span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Fires audible alert alarms instantly during geofence violations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotifToggle(!notifToggle)}
                className={`w-10 h-6 rounded-full transition-colors relative shrink-0 focus:outline-none cursor-pointer ${
                  notifToggle ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              >
                <span className={`absolute top-1 bg-slate-950 w-4 h-4 rounded-full transition-transform ${
                  notifToggle ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>

            {/* Geofence compilation toggle */}
            <div className="flex items-start justify-between gap-3 p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-300 block">Automatic Satellite Geofencing</span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Continuously compare AIS GPS vector records against polygon vectors.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGeofenceToggle(!geofenceToggle)}
                className={`w-10 h-6 rounded-full transition-colors relative shrink-0 focus:outline-none cursor-pointer ${
                  geofenceToggle ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              >
                <span className={`absolute top-1 bg-slate-950 w-4 h-4 rounded-full transition-transform ${
                  geofenceToggle ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>

            {/* Auto escalation toggle */}
            <div className="flex items-start justify-between gap-3 p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-300 block">Intruder Defense Escalation</span>
                <p className="text-[10px] text-slate-500 leading-normal">
                  Escalates medium anomalies to active naval patrol queues if unreviewed for over 30 min.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEscalationToggle(!escalationToggle)}
                className={`w-10 h-6 rounded-full transition-colors relative shrink-0 focus:outline-none cursor-pointer ${
                  escalationToggle ? 'bg-cyan-500' : 'bg-slate-800'
                }`}
              >
                <span className={`absolute top-1 bg-slate-950 w-4 h-4 rounded-full transition-transform ${
                  escalationToggle ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>

          </div>

          {/* Settings Actions */}
          <div className="bg-slate-900/30 border border-slate-900 rounded-xl p-5 space-y-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full text-center py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-extrabold rounded-lg text-xs tracking-wider uppercase transition shadow-md shadow-cyan-950/30 cursor-pointer"
            >
              {saving ? 'SYNCING SERVERS...' : 'APPLY PLATFORM TUNING'}
            </button>

            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="w-full text-center py-2 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-850 hover:border-slate-800 rounded-lg text-xs font-semibold tracking-wider transition cursor-pointer"
            >
              RESTORE FACTORY SETTINGS
            </button>
          </div>

        </div>

      </form>
    </div>
  );
}
