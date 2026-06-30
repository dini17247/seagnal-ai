import type { Alert, Vessel } from '../types';
import type { AIActionItem, AISummaryResponse } from '../services/aiService';

interface PrintableIncidentReportProps {
  vessel: Vessel;
  alerts: Alert[];
  officerNotes: string;
  response: AISummaryResponse | null;
  savedReportNumber?: string;
}

function formatDateTime(value?: string): string {
  if (!value) return 'Not supplied';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function PrintList({ items }: { items: string[] }) {
  if (!items.length) {
    return <p className="report-empty">No evidence-supported item was identified.</p>;
  }

  return (
    <ul className="report-list">
      {items.map((item, index) => (
        <li key={`${index}-${item.slice(0, 28)}`}>{item}</li>
      ))}
    </ul>
  );
}

function ActionGroup({
  number,
  title,
  items,
}: {
  number: string;
  title: string;
  items: AIActionItem[];
}) {
  return (
    <section className="report-section report-action-section">
      <div className="report-section-title">
        <span>{number}</span>
        <h2>{title}</h2>
      </div>

      {items.length === 0 ? (
        <p className="report-empty">No evidence-supported action was generated.</p>
      ) : (
        <div className="report-action-list">
          {items.map((item, index) => (
            <article key={`${index}-${item.action.slice(0, 28)}`} className="report-action-card">
              <div className="report-action-card-header">
                <span className={`report-priority report-priority-${item.priority.toLowerCase()}`}>
                  {item.priority}
                </span>
                <span>{item.timeframe}</span>
              </div>
              <h3>{item.action}</h3>
              <p><strong>Operational reason:</strong> {item.reason}</p>
              <p><strong>Escalation trigger:</strong> {item.escalation_trigger}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function PrintableIncidentReport({
  vessel,
  alerts,
  officerNotes,
  response,
  savedReportNumber,
}: PrintableIncidentReportProps) {
  if (!response) return null;

  const report = response.report;
  const metrics = response.data_snapshot.derived_metrics;
  const reportNumber = savedReportNumber || `SEG-${vessel.vessel_id}-INTEL`;

  const severityCounts = {
    High: alerts.filter((alert) => alert.severity === 'High').length,
    Medium: alerts.filter((alert) => alert.severity === 'Medium').length,
    Low: alerts.filter((alert) => alert.severity === 'Low').length,
  };

  const alertTotal = Math.max(alerts.length, 1);

  return (
    <article id="printable-incident-report" className="print-only report-document">
      <header className="report-cover">
        <div className="report-cover-topline">
          <div className="report-brand">
            <span className="report-brand-mark">S</span>
            <div>
              <strong>SEAGNAL AI</strong>
              <small>Maritime Operations Intelligence</small>
            </div>
          </div>
          <span className="report-classification">CONFIDENTIAL · OPERATIONAL USE</span>
        </div>

        <div className="report-cover-body">
          <div className="report-cover-copy">
            <p className="report-eyebrow">INCIDENT INTELLIGENCE ASSESSMENT</p>
            <h1>{report.incident_classification}</h1>
            <p className="report-cover-summary">{report.executive_summary}</p>
          </div>

          <aside className="report-identity-card">
            <div><span>Report number</span><strong>{reportNumber}</strong></div>
            <div><span>Subject vessel</span><strong>{vessel.vessel_name}</strong></div>
            <div><span>Generated</span><strong>{formatDateTime(response.generated_at)}</strong></div>
            <div><span>Intelligence source</span><strong>{response.provider_status === 'live' ? 'Live Gemini' : 'Deterministic fallback'}</strong></div>
          </aside>
        </div>

        <div className="report-risk-strip">
          <div>
            <span>Threat level</span>
            <strong>{report.threat_assessment.level}</strong>
          </div>
          <div>
            <span>Risk score</span>
            <strong>{Math.round(report.threat_assessment.score)}/100</strong>
          </div>
          <div>
            <span>Assessment confidence</span>
            <strong>{report.confidence_level}</strong>
          </div>
          <div>
            <span>Evidence set</span>
            <strong>{response.data_snapshot.alert_count} alert(s) · {response.data_snapshot.movement_count} movement(s)</strong>
          </div>
        </div>
      </header>

      <main className="report-main">
        <section className="report-section">
          <div className="report-section-title">
            <span>01</span>
            <h2>Case overview</h2>
          </div>

          <div className="report-two-column">
            <div className="report-panel">
              <h3>Threat rationale</h3>
              <p>{report.threat_assessment.rationale}</p>
            </div>
            <div className="report-panel">
              <h3>Operational context</h3>
              <dl className="report-definition-list">
                <div><dt>Vessel status</dt><dd>{vessel.status}</dd></div>
                <div><dt>Current risk classification</dt><dd>{vessel.risk_level} ({vessel.risk_score}/100)</dd></div>
                <div><dt>Latest AIS</dt><dd>{formatDateTime(vessel.last_ais_time)}</dd></div>
                <div><dt>Destination</dt><dd>{vessel.destination || 'Not supplied'}</dd></div>
              </dl>
            </div>
          </div>
        </section>

        <section className="report-section">
          <div className="report-section-title">
            <span>02</span>
            <h2>Vessel and evidence profile</h2>
          </div>

          <div className="report-two-column">
            <div className="report-panel report-panel-plain">
              <h3>Vessel particulars</h3>
              <table className="report-table report-key-value-table">
                <tbody>
                  <tr><th>Vessel ID</th><td>{vessel.vessel_id}</td></tr>
                  <tr><th>MMSI</th><td>{vessel.mmsi_hash}</td></tr>
                  <tr><th>Vessel type</th><td>{vessel.vessel_type}</td></tr>
                  <tr><th>Flag state</th><td>{vessel.flag_state || 'Not supplied'}</td></tr>
                  <tr><th>Position</th><td>{vessel.latitude.toFixed(5)}, {vessel.longitude.toFixed(5)}</td></tr>
                  <tr><th>Speed / heading</th><td>{vessel.speed.toFixed(1)} kn / {vessel.heading.toFixed(0)}°</td></tr>
                  <tr><th>ETA</th><td>{formatDateTime(vessel.eta)}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="report-panel report-panel-plain">
              <h3>Computed evidence metrics</h3>
              <table className="report-table report-key-value-table">
                <tbody>
                  <tr><th>Unresolved alerts</th><td>{metrics.unresolved_alerts}</td></tr>
                  <tr><th>High-severity alerts</th><td>{metrics.high_severity_alerts}</td></tr>
                  <tr><th>Observed speed range</th><td>{metrics.minimum_speed_knots ?? 'N/A'}–{metrics.maximum_speed_knots ?? 'N/A'} kn</td></tr>
                  <tr><th>Maximum speed change</th><td>{metrics.maximum_speed_change_knots ?? 'N/A'} kn</td></tr>
                  <tr><th>Maximum heading change</th><td>{metrics.maximum_heading_change_degrees ?? 'N/A'}°</td></tr>
                  <tr><th>Maximum observation gap</th><td>{metrics.maximum_observation_gap_minutes ?? 'N/A'} min</td></tr>
                  <tr><th>Observation window</th><td>{metrics.observation_window_minutes ?? 'N/A'} min</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="report-evidence-grid">
            <div className="report-evidence-card">
              <span>Selected alerts</span>
              <strong>{response.data_snapshot.alert_count}</strong>
            </div>
            <div className="report-evidence-card">
              <span>Movement observations</span>
              <strong>{response.data_snapshot.movement_count}</strong>
            </div>
            <div className="report-evidence-card">
              <span>Related zones</span>
              <strong>{response.data_snapshot.related_zone_count}</strong>
            </div>
            <div className="report-evidence-card">
              <span>Low-speed observations</span>
              <strong>{metrics.low_speed_observations}</strong>
            </div>
          </div>
        </section>

        <section className="report-section">
          <div className="report-section-title">
            <span>03</span>
            <h2>Alert severity distribution</h2>
          </div>

          <div className="report-severity-chart">
            {Object.entries(severityCounts).map(([severity, count]) => (
              <div key={severity} className="report-severity-row">
                <div className="report-severity-label"><span>{severity}</span><strong>{count}</strong></div>
                <div className="report-severity-track">
                  <div
                    className={`report-severity-fill report-severity-${severity.toLowerCase()}`}
                    style={{ width: `${count === 0 ? 0 : Math.max(8, (count / alertTotal) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {metrics.repeated_anomaly_types.length > 0 && (
            <p className="report-inline-note">
              <strong>Repeated anomaly types:</strong> {metrics.repeated_anomaly_types.join(', ')}
            </p>
          )}
        </section>

        <section className="report-section">
          <div className="report-section-title">
            <span>04</span>
            <h2>Key findings</h2>
          </div>
          <PrintList items={report.key_findings} />
        </section>

        <section className="report-section">
          <div className="report-section-title">
            <span>05</span>
            <h2>Spatial and temporal assessment</h2>
          </div>
          <p>{report.spatial_temporal_assessment}</p>
        </section>

        <section className="report-section">
          <div className="report-section-title">
            <span>06</span>
            <h2>Evidence relationships</h2>
          </div>

          {report.evidence_relationships.length === 0 ? (
            <p className="report-empty">No reliable cross-alert relationship was identified.</p>
          ) : (
            <div className="report-relationship-list">
              {report.evidence_relationships.map((relationship, index) => (
                <article key={`${index}-${relationship.title}`} className="report-relationship-card">
                  <div className="report-relationship-card-header">
                    <h3>{relationship.title}</h3>
                    <span>{relationship.confidence} confidence</span>
                  </div>
                  <p>{relationship.relationship}</p>
                  {relationship.supporting_alert_ids.length > 0 && (
                    <p className="report-reference">
                      Supporting alerts: {relationship.supporting_alert_ids.join(', ')}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="report-section">
          <div className="report-section-title">
            <span>07</span>
            <h2>Probable event sequence</h2>
          </div>

          {report.probable_sequence.length === 0 ? (
            <p className="report-empty">No reliable sequence could be established.</p>
          ) : (
            <ol className="report-timeline">
              {report.probable_sequence.map((step, index) => (
                <li key={`${index}-${step.slice(0, 28)}`}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{step.replace(/^\d+\.\s*/, '')}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="report-section">
          <div className="report-section-title">
            <span>08</span>
            <h2>Competing explanations and verification gaps</h2>
          </div>

          <div className="report-two-column">
            <div className="report-panel report-panel-warning">
              <h3>Alternative explanations</h3>
              <PrintList items={report.alternative_explanations} />
            </div>
            <div className="report-panel report-panel-danger">
              <h3>Information requiring verification</h3>
              <PrintList items={report.information_gaps} />
            </div>
          </div>
        </section>

        {/* <div className="report-page-break" /> */}

        <ActionGroup number="09" title="Immediate operational actions" items={report.recommended_actions.immediate} />
        <ActionGroup number="10" title="Monitoring plan" items={report.recommended_actions.monitoring} />
        <ActionGroup number="11" title="Follow-up actions" items={report.recommended_actions.follow_up} />

        <section className="report-section">
          <div className="report-section-title">
            <span>12</span>
            <h2>Officer notes</h2>
          </div>
          <p className="report-prewrap">{officerNotes.trim() || 'No officer notes were recorded.'}</p>
        </section>

        <section className="report-section report-conclusion">
          <div className="report-section-title">
            <span>13</span>
            <h2>Analyst conclusion</h2>
          </div>
          <p>{report.analyst_conclusion}</p>
        </section>

        <section className="report-section report-appendix">
          <div className="report-section-title">
            <span>A</span>
            <h2>Selected alert evidence appendix</h2>
          </div>

          {alerts.length === 0 ? (
            <p className="report-empty">No alert records were supplied for this report.</p>
          ) : (
            <table className="report-table report-alert-table">
              <thead>
                <tr>
                  <th>Alert ID</th>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Triggered</th>
                  <th>Status</th>
                  <th>Zone</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.alert_id}>
                    <td>{alert.alert_id}</td>
                    <td>{alert.alert_type}</td>
                    <td>{alert.severity}</td>
                    <td>{formatDateTime(alert.alert_time)}</td>
                    <td>{alert.status}</td>
                    <td>{alert.zone_id || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      <footer className="report-footer">
        <div>
          <strong>Analytical limitation</strong>
          <p>{report.disclaimer}</p>
        </div>
        <div className="report-footer-meta">
          <span>{reportNumber}</span>
          <span>Model: {response.model}</span>
          <span>Authorized officer review required</span>
        </div>
      </footer>
    </article>
  );
}
