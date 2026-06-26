import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Database,
  Gauge,
  Link2,
  MapPinned,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Alert, Vessel } from '../types';
import type {
  AIActionItem,
  AIConfidenceLevel,
  AISummaryResponse,
} from '../services/aiService';

interface GeminiIncidentBriefProps {
  vessel: Vessel;
  alerts: Alert[];
  response: AISummaryResponse | null;
  isGenerating: boolean;
  errorMessage?: string;
  onGenerate: () => void;
}

const severityColour: Record<string, string> = {
  High: '#fb7185',
  Medium: '#fbbf24',
  Low: '#22d3ee',
};

function confidenceClass(confidence: AIConfidenceLevel): string {
  if (confidence === 'High') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
  }
  if (confidence === 'Moderate') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  return 'border-slate-600 bg-slate-800/70 text-slate-300';
}

function riskClass(level: string): string {
  if (level === 'High') {
    return 'border-rose-500/30 bg-rose-500/10 text-rose-400';
  }
  if (level === 'Medium') {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  }
  return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300';
}

function priorityClass(priority: AIActionItem['priority']): string {
  if (priority === 'Critical') {
    return 'border-rose-500/40 bg-rose-500/15 text-rose-300';
  }
  if (priority === 'High') {
    return 'border-orange-500/40 bg-orange-500/15 text-orange-300';
  }
  if (priority === 'Medium') {
    return 'border-amber-500/40 bg-amber-500/15 text-amber-300';
  }
  return 'border-cyan-500/40 bg-cyan-500/15 text-cyan-300';
}

function formatMetric(value: number | null, suffix = ''): string {
  return value === null ? 'N/A' : `${value.toFixed(1)}${suffix}`;
}

function BulletList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (!items.length) {
    return <p className="text-xs italic text-slate-500">{emptyText}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li
          key={`${index}-${item.slice(0, 24)}`}
          className="flex gap-2 text-xs leading-relaxed text-slate-300"
        >
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ActionList({
  title,
  items,
  className,
}: {
  title: string;
  items: AIActionItem[];
  className: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${className}`}>
      <div className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-200">
        {title}
      </div>
      {items.length === 0 ? (
        <p className="text-xs italic text-slate-500">
          No evidence-supported action was generated for this category.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            <article
              key={`${index}-${item.action.slice(0, 24)}`}
              className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase ${priorityClass(item.priority)}`}
                >
                  {item.priority}
                </span>
                <span className="font-mono text-[9px] text-slate-500">
                  {item.timeframe}
                </span>
              </div>
              <p className="text-xs font-bold leading-relaxed text-slate-200">
                {item.action}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
                <span className="font-bold text-slate-300">Reason:</span> {item.reason}
              </p>
              <p className="mt-2 text-[11px] leading-relaxed text-amber-200/80">
                <span className="font-bold">Escalation trigger:</span>{' '}
                {item.escalation_trigger}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GeminiIncidentBrief({
  vessel,
  alerts,
  response,
  isGenerating,
  errorMessage,
  onGenerate,
}: GeminiIncidentBriefProps) {
  const severityData = ['High', 'Medium', 'Low'].map((severity) => ({
    severity,
    count: alerts.filter((alert) => alert.severity === severity).length,
    fill: severityColour[severity],
  }));

  const typeCounts = Array.from(
    alerts.reduce((map, alert) => {
      map.set(alert.alert_type, (map.get(alert.alert_type) || 0) + 1);
      return map;
    }, new Map<string, number>()),
  )
    .map(([type, count]) => ({ type, count }))
    .sort((first, second) => second.count - first.count)
    .slice(0, 6);

  if (!response) {
    return (
      <section className="overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-950/35 via-slate-950 to-slate-950 shadow-xl">
        <div className="grid gap-8 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-violet-300">
              <Sparkles className="h-5 w-5" />
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em]">
                Gemini intelligence report
              </span>
            </div>
            <h3 className="max-w-2xl text-2xl font-black tracking-tight text-white">
              Generate an evidence-linked incident assessment for {vessel.vessel_name}
            </h3>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-400">
              The report now prioritizes unresolved and high-severity alerts, calculates
              movement changes before calling Gemini, and requires every recommendation to
              include a reason, timeframe, and measurable escalation trigger.
            </p>
            {errorMessage && (
              <div className="flex gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-200">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            <button
              type="button"
              onClick={onGenerate}
              disabled={isGenerating}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-600 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-70"
            >
              {isGenerating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <BrainCircuit className="h-4 w-4" />
              )}
              {isGenerating ? 'Correlating evidence…' : 'Generate professional report'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 self-center">
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <Database className="mb-3 h-5 w-5 text-cyan-400" />
              <div className="text-2xl font-black text-white">{alerts.length}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Linked alerts
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <ShieldAlert className="mb-3 h-5 w-5 text-rose-400" />
              <div className="text-2xl font-black text-white">{vessel.risk_score}</div>
              <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Current risk score
              </div>
            </div>
            <div className="col-span-2 rounded-xl border border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Evidence scope
                  </div>
                  <div className="mt-1 text-sm font-bold text-slate-200">
                    Alerts + movement + zones + officer context
                  </div>
                </div>
                <Link2 className="h-6 w-6 text-violet-400" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const report = response.report;
  const metrics = response.data_snapshot.derived_metrics;

  return (
    <section className="space-y-5 rounded-2xl border border-violet-500/25 bg-slate-950 p-5 shadow-2xl lg:p-7">
      <header className="flex flex-col gap-4 border-b border-slate-800 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
              <Sparkles className="h-4 w-4" />
              Seagnal Gemini intelligence assessment
            </span>
            <span
              className={`rounded-full border px-2 py-1 font-mono text-[9px] font-black uppercase tracking-wider ${
                response.provider_status === 'live'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
            >
              {response.provider_status === 'live'
                ? 'Live Gemini'
                : 'Deterministic fallback'}
            </span>
          </div>
          <h3 className="text-xl font-black text-white">
            {report.incident_classification}
          </h3>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500">
            <span>Model: {response.model}</span>
            <span>Generated: {new Date(response.generated_at).toLocaleString()}</span>
            <span>Vessel: {response.data_snapshot.vessel_id}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${riskClass(report.threat_assessment.level)}`}
          >
            {report.threat_assessment.level} risk ·{' '}
            {Math.round(report.threat_assessment.score)}/100
          </span>
          <span
            className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${confidenceClass(report.confidence_level)}`}
          >
            {report.confidence_level} confidence
          </span>
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="no-print inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300 transition hover:border-violet-500/50 hover:text-violet-200 disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`}
            />
            Regenerate
          </button>
        </div>
      </header>

      {response.provider_warning && (
        <div className="flex gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{response.provider_warning}</span>
        </div>
      )}

      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-950/40 to-slate-900/40 p-5">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-violet-300">
          <Target className="h-4 w-4" /> Executive assessment
        </div>
        <p className="text-sm leading-7 text-slate-200">{report.executive_summary}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            Threat rationale
          </div>
          <p className="text-xs leading-relaxed text-slate-300">
            {report.threat_assessment.rationale}
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <Database className="h-3.5 w-3.5" /> Evidence coverage
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xl font-black text-white">
                {response.data_snapshot.alert_count}
              </div>
              <div className="text-[9px] uppercase text-slate-500">Alerts</div>
            </div>
            <div>
              <div className="text-xl font-black text-white">
                {response.data_snapshot.movement_count}
              </div>
              <div className="text-[9px] uppercase text-slate-500">Movements</div>
            </div>
            <div>
              <div className="text-xl font-black text-white">
                {response.data_snapshot.related_zone_count}
              </div>
              <div className="text-[9px] uppercase text-slate-500">Zones</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            <Clock3 className="h-3.5 w-3.5" /> Latest AIS evidence
          </div>
          <div className="text-sm font-bold text-cyan-300">
            {new Date(response.data_snapshot.latest_ais_time).toLocaleString()}
          </div>
          <div className="mt-1 font-mono text-[10px] text-slate-500">
            {vessel.latitude.toFixed(5)}, {vessel.longitude.toFixed(5)}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Unresolved alerts', metrics.unresolved_alerts.toString()],
          ['Max observation gap', formatMetric(metrics.maximum_observation_gap_minutes, ' min')],
          ['Max speed change', formatMetric(metrics.maximum_speed_change_knots, ' kn')],
          ['Max heading change', formatMetric(metrics.maximum_heading_change_degrees, '°')],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-800 bg-slate-900/40 p-4"
          >
            <div className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-wider text-slate-500">
              <Gauge className="h-3.5 w-3.5" /> {label}
            </div>
            <div className="font-mono text-lg font-black text-slate-100">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Alert severity distribution
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={severityData}
                margin={{ top: 5, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis
                  dataKey="severity"
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(71, 85, 105, 0.12)' }}
                  contentStyle={{
                    background: '#020617',
                    border: '1px solid #334155',
                    borderRadius: 10,
                    fontSize: 11,
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {severityData.map((entry) => (
                    <Cell key={entry.severity} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <div className="mb-4 text-[10px] font-black uppercase tracking-wider text-slate-400">
            Linked anomaly types
          </div>
          <div className="h-52">
            {typeCounts.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={typeCounts}
                  layout="vertical"
                  margin={{ top: 5, right: 12, left: 20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: '#64748b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    dataKey="type"
                    type="category"
                    width={115}
                    tick={{ fill: '#94a3b8', fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(71, 85, 105, 0.12)' }}
                    contentStyle={{
                      background: '#020617',
                      border: '1px solid #334155',
                      borderRadius: 10,
                      fontSize: 11,
                    }}
                  />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs italic text-slate-500">
                No linked alerts are available for charting.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/35 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-cyan-300">
              <CheckCircle2 className="h-4 w-4" /> Key findings
            </div>
            <BulletList
              items={report.key_findings}
              emptyText="No evidence-supported key findings were generated."
            />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/35 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-cyan-300">
              <MapPinned className="h-4 w-4" /> Spatial and temporal assessment
            </div>
            <p className="text-xs leading-relaxed text-slate-300">
              {report.spatial_temporal_assessment}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/35 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-cyan-300">
              <Clock3 className="h-4 w-4" /> Probable event sequence
            </div>
            {report.probable_sequence.length ? (
              <ol className="space-y-3">
                {report.probable_sequence.map((step, index) => (
                  <li
                    key={`${index}-${step.slice(0, 20)}`}
                    className="flex gap-3 text-xs leading-relaxed text-slate-300"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 font-mono text-[10px] font-black text-cyan-300">
                      {index + 1}
                    </span>
                    <span className="pt-1">{step.replace(/^\d+\.\s*/, '')}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs italic text-slate-500">
                No reliable event sequence could be established.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/35 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-violet-300">
              <Link2 className="h-4 w-4" /> Evidence relationships
            </div>
            {report.evidence_relationships.length ? (
              <div className="space-y-3">
                {report.evidence_relationships.map((relationship, index) => (
                  <div
                    key={`${index}-${relationship.title}`}
                    className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h5 className="text-xs font-bold text-slate-200">
                        {relationship.title}
                      </h5>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[8px] font-black uppercase ${confidenceClass(relationship.confidence)}`}
                      >
                        {relationship.confidence}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-400">
                      {relationship.relationship}
                    </p>
                    {relationship.supporting_alert_ids.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {relationship.supporting_alert_ids.map((id) => (
                          <span
                            key={id}
                            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[8px] text-cyan-300"
                          >
                            {id}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs italic text-slate-500">
                No reliable cross-alert relationship was identified.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="mb-3 text-[10px] font-black uppercase tracking-wider text-amber-300">
              Alternative explanations
            </div>
            <BulletList
              items={report.alternative_explanations}
              emptyText="No evidence-supported alternative explanation was identified."
            />
          </div>

          <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
            <div className="mb-3 text-[10px] font-black uppercase tracking-wider text-rose-300">
              Information gaps requiring verification
            </div>
            <BulletList
              items={report.information_gaps}
              emptyText="No material information gap was identified."
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ActionList
          title="Immediate action"
          items={report.recommended_actions.immediate}
          className="border-rose-500/20 bg-rose-500/5"
        />
        <ActionList
          title="Monitoring plan"
          items={report.recommended_actions.monitoring}
          className="border-cyan-500/20 bg-cyan-500/5"
        />
        <ActionList
          title="Follow-up"
          items={report.recommended_actions.follow_up}
          className="border-violet-500/20 bg-violet-500/5"
        />
      </div>

      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <div className="mb-2 text-[10px] font-black uppercase tracking-wider text-emerald-300">
          Analyst conclusion
        </div>
        <p className="text-sm leading-relaxed text-slate-200">
          {report.analyst_conclusion}
        </p>
      </div>

      <footer className="flex gap-2 rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-[10px] leading-relaxed text-slate-500">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
        <span>{report.disclaimer}</span>
      </footer>
    </section>
  );
}
