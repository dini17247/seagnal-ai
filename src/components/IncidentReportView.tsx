import { useState, useMemo, useEffect, useRef } from 'react';
import {
  FileText,
  Printer,
  UserCheck,
  Globe,
  AlertTriangle,
  Save,
  Check,
  Clock,
  Terminal,
  ArrowRight,
  Cpu,
  Search,
  Archive,
  BookOpen,
} from 'lucide-react';

import { Vessel, Alert, MaritimeZone } from '../types';
import { aiService, type AISummaryResponse } from '../services/aiService';
import { reportService, type IncidentReportDto } from '../services/reportService';
import GeminiIncidentBrief from './GeminiIncidentBrief';
import PrintableIncidentReport from './PrintableIncidentReport';

interface IncidentReportViewProps {
  vessels: Vessel[];
  alerts: Alert[];
  zones: MaritimeZone[];
  selectedVesselId?: string | null;
  onSelectVessel: (vesselId: string) => void;
  onNavigate: (view: any) => void;
}

export default function IncidentReportView({
  vessels,
  alerts,
  zones,
  selectedVesselId: focusedVesselId,
  onSelectVessel,
  onNavigate,
}: IncidentReportViewProps) {
  const [selectedVesselId, setSelectedVesselId] = useState<string>(
    focusedVesselId ||
      vessels.find((v) => v.vessel_id === 'V-002')?.vessel_id ||
      vessels[0]?.vessel_id ||
      '',
  );

  const [subTab, setSubTab] = useState<'dossier' | 'archive'>('dossier');
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  const [indexSearch, setIndexSearch] = useState('');
  const [detailDraftSearch, setDetailDraftSearch] = useState('');

  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveSeverity, setArchiveSeverity] = useState('All');
  const [archiveType, setArchiveType] = useState('All');

  const [generatedAiReport, setGeneratedAiReport] =
    useState<AISummaryResponse | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiGenerationError, setAiGenerationError] = useState<string>('');

  const [selectedAgentId, setSelectedAgentId] = useState<string>('orch');

  const [officerNotes, setOfficerNotes] = useState<{ [key: string]: string }>({
    'V-001':
      'Pacific Pioneer queried over slow positioning in Port of Klang. Hull inspections cleared cargo load manifests.',
    'V-002':
      'Tanker Neptune tracked halting standard transponder beacons near ecologically protected geofence limits. Dispatched patrol vessel SEACRAFT 7 to coordinate intercept. Interceptor crew confirms vessel master requested steering mechanical diagnostic hold. Visual confirm of hull sides indicates zero leakage or oil sheen spills as of 19:30 UTC.',
    'V-004':
      'Bluefin V shows illegal unreported commercial bottom-trawling signs. Circular trawling track verified in Navy bounds. Forwarded formal warnings to the Vietnamese fisheries authorities.',
    'V-008':
      'Sierra 9 registered as high priority threat target. 8-hour AIS transponder blackout confirms attempt to bypass military customs checks. Relayed last contact coordinates to radar sweeps.',
  });

  const [savingNote, setSavingNote] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [savedReports, setSavedReports] = useState<
    Record<string, { id: string; reportNumber: string }>
  >({});

  const [allSavedReports, setAllSavedReports] = useState<IncidentReportDto[]>(
    [],
  );
  const [loadingSavedReports, setLoadingSavedReports] = useState(false);
  const [savedReportError, setSavedReportError] = useState('');
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const lastFocusedWorkspaceVesselIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      focusedVesselId &&
      vessels.some((vessel) => vessel.vessel_id === focusedVesselId) &&
      lastFocusedWorkspaceVesselIdRef.current !== focusedVesselId
    ) {
      lastFocusedWorkspaceVesselIdRef.current = focusedVesselId;

      setSelectedVesselId(focusedVesselId);
      setSubTab('dossier');
      setWorkspaceOpen(true);
      setGeneratedAiReport(null);
      setActiveReportId(null);
      setAiGenerationError('');
      setDetailDraftSearch('');

      window.setTimeout(() => {
        document.getElementById('incident-report-workspace')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    }
  }, [focusedVesselId, vessels]);

  const currentVessel = useMemo(() => {
    return vessels.find((v) => v.vessel_id === selectedVesselId) || vessels[0];
  }, [vessels, selectedVesselId]);

  const resolvedAlerts = useMemo(() => {
    return alerts.filter((a) => a.status === 'Resolved');
  }, [alerts]);

  const sortedResolvedAlerts = useMemo(() => {
    return [...resolvedAlerts].sort((a, b) => {
      const timeA = a.resolved_at
        ? new Date(a.resolved_at).getTime()
        : new Date(a.alert_time).getTime();

      const timeB = b.resolved_at
        ? new Date(b.resolved_at).getTime()
        : new Date(b.alert_time).getTime();

      return timeB - timeA;
    });
  }, [resolvedAlerts]);

  const filteredResolvedAlerts = useMemo(() => {
    return sortedResolvedAlerts.filter((alert) => {
      const targetVessel = vessels.find((v) => v.vessel_id === alert.vessel_id);
      const vesselName = targetVessel?.vessel_name || '';

      const matchSearch =
        vesselName.toLowerCase().includes(archiveSearch.toLowerCase()) ||
        alert.alert_type.toLowerCase().includes(archiveSearch.toLowerCase()) ||
        alert.description.toLowerCase().includes(archiveSearch.toLowerCase()) ||
        (alert.resolution_notes || '')
          .toLowerCase()
          .includes(archiveSearch.toLowerCase()) ||
        (alert.reviewed_by || '')
          .toLowerCase()
          .includes(archiveSearch.toLowerCase());

      const matchSeverity =
        archiveSeverity === 'All' || alert.severity === archiveSeverity;

      const matchType =
        archiveType === 'All' || alert.alert_type === archiveType;

      return matchSearch && matchSeverity && matchType;
    });
  }, [
    sortedResolvedAlerts,
    vessels,
    archiveSearch,
    archiveSeverity,
    archiveType,
  ]);

  const archiveAlertTypes = useMemo(() => {
    const types = new Set<string>();
    resolvedAlerts.forEach((a) => types.add(a.alert_type));
    return ['All', ...Array.from(types)];
  }, [resolvedAlerts]);

  const vesselAlerts = useMemo(() => {
    return alerts.filter((a) => a.vessel_id === currentVessel?.vessel_id);
  }, [alerts, currentVessel]);

  const prioritizedVesselAlerts = useMemo(() => {
    const severityRank: Record<Alert['severity'], number> = {
      High: 3,
      Medium: 2,
      Low: 1,
    };

    return [...vesselAlerts].sort((first, second) => {
      const firstOpen = first.status === 'Resolved' ? 0 : 1;
      const secondOpen = second.status === 'Resolved' ? 0 : 1;

      if (firstOpen !== secondOpen) {
        return secondOpen - firstOpen;
      }

      const severityDifference =
        severityRank[second.severity] - severityRank[first.severity];

      if (severityDifference !== 0) {
        return severityDifference;
      }

      return (
        new Date(second.alert_time).getTime() -
        new Date(first.alert_time).getTime()
      );
    });
  }, [vesselAlerts]);

  const loadSavedReports = async () => {
    try {
      setLoadingSavedReports(true);
      setSavedReportError('');

      const reports = await reportService.listReports();

      setAllSavedReports(reports);

      const latestByVessel: Record<
        string,
        { id: string; reportNumber: string }
      > = {};

      reports.forEach((report) => {
        if (!latestByVessel[report.vessel_id]) {
          latestByVessel[report.vessel_id] = {
            id: report.id,
            reportNumber: report.report_number,
          };
        }
      });

      setSavedReports((current) => ({
        ...latestByVessel,
        ...current,
      }));
    } catch (error: any) {
      console.error(error);

      setSavedReportError(
        error?.message || 'Saved reports could not be loaded from Cloud SQL.',
      );
    } finally {
      setLoadingSavedReports(false);
    }
  };

  useEffect(() => {
    void loadSavedReports();
  }, []);

  const savedReportsForCurrentVessel = useMemo(() => {
    if (!currentVessel) {
      return [];
    }

    return allSavedReports
      .filter((report) => report.vessel_id === currentVessel.vessel_id)
      .sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime(),
      );
  }, [allSavedReports, currentVessel]);

  const filteredSavedReportsForCurrentVessel = useMemo(() => {
    const search = detailDraftSearch.trim().toLowerCase();

    if (!search) {
      return savedReportsForCurrentVessel;
    }

    return savedReportsForCurrentVessel.filter((report) => {
      return (
        report.report_number.toLowerCase().includes(search) ||
        report.report_status.toLowerCase().includes(search) ||
        report.officer_notes?.toLowerCase().includes(search) ||
        report.final_recommendation?.toLowerCase().includes(search)
      );
    });
  }, [savedReportsForCurrentVessel, detailDraftSearch]);

  const activeSavedReport = useMemo(() => {
    if (!activeReportId) {
      return null;
    }

    return (
      allSavedReports.find((report) => report.id === activeReportId) || null
    );
  }, [activeReportId, allSavedReports]);

  const vesselReportIndex = useMemo(() => {
    return vessels
      .map((vessel) => {
        const vesselReports = allSavedReports.filter(
          (report) => report.vessel_id === vessel.vessel_id,
        );

        const latestReport = vesselReports
          .slice()
          .sort(
            (a, b) =>
              new Date(b.updated_at || b.created_at).getTime() -
              new Date(a.updated_at || a.created_at).getTime(),
          )[0];

        const activeAlertCount = alerts.filter(
          (alert) =>
            alert.vessel_id === vessel.vessel_id && alert.status !== 'Resolved',
        ).length;

        return {
          vessel,
          draftCount: vesselReports.length,
          latestReport,
          activeAlertCount,
        };
      })
      .sort((a, b) => {
        if (b.draftCount !== a.draftCount) {
          return b.draftCount - a.draftCount;
        }

        return b.vessel.risk_score - a.vessel.risk_score;
      });
  }, [vessels, alerts, allSavedReports]);

  const filteredVesselReportIndex = useMemo(() => {
    const search = indexSearch.trim().toLowerCase();

    if (!search) {
      return vesselReportIndex;
    }

    return vesselReportIndex.filter(
      ({ vessel, latestReport, draftCount, activeAlertCount }) => {
        return (
          vessel.vessel_name.toLowerCase().includes(search) ||
          vessel.vessel_id.toLowerCase().includes(search) ||
          vessel.vessel_type.toLowerCase().includes(search) ||
          vessel.risk_level.toLowerCase().includes(search) ||
          vessel.mmsi_hash?.toLowerCase().includes(search) ||
          latestReport?.report_number.toLowerCase().includes(search) ||
          String(draftCount).includes(search) ||
          String(activeAlertCount).includes(search)
        );
      },
    );
  }, [vesselReportIndex, indexSearch]);

  const aiAgents = useMemo(
    () => [
      {
        id: 'orch',
        name: 'Maritime Orchestrator Agent',
        role: 'Combines all analysis and produces final risk result.',
        status: 'OPTIMAL',
        ping: '9ms',
        logs: [
          'Scanning sensory streams across Malaysian Sector 4 corridor...',
          `Recalculating multi-criteria decision matrices for ${
            currentVessel?.vessel_name || 'Subject'
          }.`,
          'Correlating AIS Transponder downtime with reported ETA timelines.',
        ],
      },
      {
        id: 'mov',
        name: 'Vessel Movement Agent',
        role: 'Checks speed, direction, route, and movement pattern.',
        status: 'MONITORING',
        ping: '14ms',
        logs: [
          'Feeding coordinates to kinematic vector prediction pipeline.',
          `Velocity pattern analysis triggered on ${
            currentVessel?.vessel_name || 'Subject'
          } (${currentVessel?.speed} kn / ${Math.round(
            (currentVessel?.speed || 0) * 1.852,
          )} km/h).`,
          'Verified alignment against international vessel lane corridors.',
        ],
      },
      {
        id: 'gap',
        name: 'AIS Gap Agent',
        role: 'Detects missing AIS signals.',
        status: 'STANDBY',
        ping: '11ms',
        logs: [
          'Continuous interval counter active for all Malacca radar vessels.',
          `Warning: Last ping time computed as ${
            currentVessel?.last_ais_time
              ? new Date(currentVessel.last_ais_time).toLocaleTimeString()
              : 'N/A'
          } UTC.`,
          'Monitoring signal Drop/Restore hysteresis thresholds.',
        ],
      },
      {
        id: 'zone',
        name: 'Zone Risk Agent',
        role: 'Checks restricted-zone entry.',
        status: 'ACTIVE',
        ping: '7ms',
        logs: [
          'Performing ray-casting polygon intersection sweeps on Geofences.',
          `Checking proximity bounds of ${
            currentVessel?.vessel_name || 'Subject'
          } to Malaysia Marine sanctuaries.`,
          'Triggering exclusion zone penetration alarms.',
        ],
      },
      {
        id: 'explain',
        name: 'Explanation Agent',
        role: 'Generates simple explanation for users.',
        status: 'IDLE',
        ping: '124ms',
        logs: [
          'Formulating human-readable intelligence brief structures.',
          `Packaging metadata payload for ${
            currentVessel?.vessel_name || 'Subject'
          } for explanation compilation.`,
          'Inference block successfully committed to operations database.',
        ],
      },
    ],
    [currentVessel],
  );

  const openWorkspaceForVessel = (vesselId: string) => {
    setSelectedVesselId(vesselId);
    setGeneratedAiReport(null);
    setActiveReportId(null);
    setAiGenerationError('');
    setDetailDraftSearch('');
    setWorkspaceOpen(true);
    setSubTab('dossier');

    window.setTimeout(() => {
      document.getElementById('incident-report-workspace')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 100);
  };

  const backToReportIndex = () => {
    setWorkspaceOpen(false);
    setGeneratedAiReport(null);
    setActiveReportId(null);
    setAiGenerationError('');
    setDetailDraftSearch('');
  };

  const handleOpenSavedReport = (report: IncidentReportDto) => {
    try {
      const parsedAiSummary = report.ai_summary
        ? JSON.parse(report.ai_summary)
        : null;

      if (!parsedAiSummary?.report) {
        throw new Error(
          'Saved report does not contain a valid AI report payload.',
        );
      }

      setSelectedVesselId(report.vessel_id);
      setGeneratedAiReport(parsedAiSummary);

      setOfficerNotes((current) => ({
        ...current,
        [report.vessel_id]: report.officer_notes || '',
      }));

      setSavedReports((current) => ({
        ...current,
        [report.vessel_id]: {
          id: report.id,
          reportNumber: report.report_number,
        },
      }));

      setActiveReportId(report.id);
      setSaveSuccess(false);
      setAiGenerationError('');
      setWorkspaceOpen(true);
      setSubTab('dossier');

      window.setTimeout(() => {
        document.getElementById('active-report-banner')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    } catch (error: any) {
      console.error(error);

      setAiGenerationError(
        error?.message || 'Saved report could not be opened.',
      );
    }
  };

  const handleGenerateAiSummary = async () => {
    if (!currentVessel) return;

    try {
      setIsGeneratingAi(true);
      setAiGenerationError('');

      const relevantAlertIds = prioritizedVesselAlerts
        .slice(0, 12)
        .map((alert) => alert.alert_id);

      const response = await aiService.generateIncidentSummary({
        vessel_id: currentVessel.vessel_id,
        alert_ids: relevantAlertIds,
        officer_context: officerNotes[currentVessel.vessel_id] || '',
      });

      setGeneratedAiReport(response);
      setActiveReportId(null);
    } catch (error: any) {
      console.error(error);

      setAiGenerationError(
        error?.message ||
          'The incident report could not be generated. Check the API and data connections.',
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const saveCurrentReport = async (
    options: { createNew?: boolean } = {},
  ) => {
    if (!currentVessel) {
      throw new Error('No vessel is selected.');
    }

    if (!generatedAiReport) {
      throw new Error(
        'Generate the professional AI report before saving or printing the dossier.',
      );
    }

    const existingReport = options.createNew
      ? undefined
      : activeReportId
        ? { id: activeReportId }
        : savedReports[currentVessel.vessel_id];

    const payload = {
      officer_notes: officerNotes[currentVessel.vessel_id] || '',
      ai_summary: JSON.stringify(generatedAiReport),
      final_recommendation: generatedAiReport.report.analyst_conclusion,
      alert_ids: prioritizedVesselAlerts
        .slice(0, 12)
        .map((alert) => alert.alert_id),
    };

    const saved = existingReport
      ? await reportService.updateReport(existingReport.id, payload)
      : await reportService.createReport({
          vessel_id: currentVessel.vessel_id,
          primary_alert_id: prioritizedVesselAlerts[0]?.alert_id,
          ...payload,
        });

    setSavedReports((current) => ({
      ...current,
      [currentVessel.vessel_id]: {
        id: saved.id,
        reportNumber: saved.report_number,
      },
    }));

    setActiveReportId(saved.id);

    setAllSavedReports((current) => {
      const withoutSaved = current.filter((report) => report.id !== saved.id);

      return [saved, ...withoutSaved].sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at).getTime() -
          new Date(a.updated_at || a.created_at).getTime(),
      );
    });

    return saved;
  };

  const handleSaveReport = async () => {
    try {
      setSavingNote(true);
      setSaveSuccess(false);
      setAiGenerationError('');

      const saved = await saveCurrentReport();

      setSaveSuccess(true);

      window.setTimeout(() => setSaveSuccess(false), 3000);

      return saved;
    } catch (error: any) {
      console.error(error);

      setAiGenerationError(
        error?.message ||
          'The report could not be saved. Check report permissions and backend storage.',
      );
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveAsNewDraft = async () => {
    try {
      setSavingNote(true);
      setSaveSuccess(false);
      setAiGenerationError('');

      const saved = await saveCurrentReport({
        createNew: true,
      });

      setSaveSuccess(true);

      window.setTimeout(() => setSaveSuccess(false), 3000);

      return saved;
    } catch (error: any) {
      console.error(error);

      setAiGenerationError(
        error?.message || 'The report could not be saved as a new draft.',
      );
    } finally {
      setSavingNote(false);
    }
  };

  const handlePrintReport = async () => {
    if (!currentVessel || !generatedAiReport) {
      setAiGenerationError(
        'Generate the professional AI report before printing or saving it as PDF.',
      );
      return;
    }

    const printableReport = document.getElementById(
      'printable-incident-report',
    );

    if (!printableReport) {
      setAiGenerationError(
        'The printable report layout is not available. Refresh the page and try again.',
      );
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1100,height=850');

    if (!printWindow) {
      setAiGenerationError(
        'The browser blocked the print window. Allow pop-ups for localhost and try again.',
      );
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Preparing Seagnal Report...</title>
  <style>
    body {
      margin: 0;
      padding: 32px;
      font-family: Arial, sans-serif;
      background: #ffffff;
      color: #0f172a;
    }
  </style>
</head>
<body>
  <h3>Preparing report...</h3>
  <p>The latest report is being saved before the print window opens.</p>
</body>
</html>`);
    printWindow.document.close();

    let savedReport: IncidentReportDto;

    try {
      setSavingNote(true);
      setSaveSuccess(false);
      setAiGenerationError('');

      savedReport = await saveCurrentReport();

      await reportService.exportReport(savedReport.id);

      setSaveSuccess(true);

      window.setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: any) {
      console.error(error);

      setAiGenerationError(
        error?.message || 'The report could not be saved before printing.',
      );

      printWindow.document.open();
      printWindow.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Report Save Failed</title>
  <style>
    body {
      margin: 0;
      padding: 32px;
      font-family: Arial, sans-serif;
      background: #ffffff;
      color: #991b1b;
    }
  </style>
</head>
<body>
  <h3>Report could not be printed</h3>
  <p>The latest report must be saved before printing.</p>
</body>
</html>`);
      printWindow.document.close();

      return;
    } finally {
      setSavingNote(false);
    }

    const reportNumber =
      savedReport?.report_number ||
      savedReports[currentVessel.vessel_id]?.reportNumber ||
      `SEG-${currentVessel.vessel_id}-INTEL`;

    const safeVesselName = currentVessel.vessel_name.replace(
      /[^a-z0-9]+/gi,
      '_',
    );

    const styleMarkup = Array.from(
      document.querySelectorAll<HTMLStyleElement>('style'),
    )
      .map((style) => style.outerHTML)
      .join('\n');

    const stylesheetMarkup = Array.from(
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'),
    )
      .map((link) => {
        const absoluteHref = new URL(link.href, window.location.href).href;

        return `<link rel="stylesheet" href="${absoluteHref}" />`;
      })
      .join('\n');

    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>${reportNumber}_${safeVesselName}</title>
  ${stylesheetMarkup}
  ${styleMarkup}
  <style>
    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
    }

    body {
      color: #152238 !important;
    }

    .print-only {
      display: block !important;
    }

    @page {
      size: A4 portrait;
      margin: 7mm 8mm 8mm;
    }

    @media print {
      html,
      body {
        width: auto !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
      }

      .report-document {
        width: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>
  ${printableReport.outerHTML}
</body>
</html>`);
    printWindow.document.close();

    const openPrintDialog = () => {
      printWindow.focus();

      window.setTimeout(() => {
        printWindow.print();
      }, 350);
    };

    if (printWindow.document.readyState === 'complete') {
      openPrintDialog();
    } else {
      printWindow.addEventListener('load', openPrintDialog, { once: true });
    }
  };

  if (!currentVessel) {
    return (
      <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-xl">
        <p className="text-slate-400">
          Loading Fleet records. Expand active list.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-905 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            {subTab === 'dossier'
              ? workspaceOpen
                ? 'INCIDENT REPORT WORKSPACE'
                : 'INCIDENT REPORT INDEX'
              : 'RESOLVED INCIDENT HISTORICAL ARCHIVE'}
          </h2>

          <p className="text-slate-400 text-xs mt-1">
            {subTab === 'dossier'
              ? workspaceOpen
                ? 'Generate, open, update, print, or save Cloud SQL incident report drafts.'
                : 'Select a vessel report workspace or open the latest saved draft.'
              : 'Audit-ready repository of closed maritime anomalies, officer resolution statements, and timestamped actions.'}
          </p>
        </div>

        {subTab === 'dossier' && workspaceOpen && (
          <button
            type="button"
            onClick={backToReportIndex}
            className="px-4 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-300 rounded-lg uppercase tracking-wider"
          >
            Back to Report Index
          </button>
        )}
      </div>

      <div className="flex border-b border-slate-900 gap-1 pb-px">
        <button
          onClick={() => {
            setSubTab('dossier');
            setWorkspaceOpen(false);
          }}
          className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition duration-150 cursor-pointer flex items-center gap-2 ${
            subTab === 'dossier'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/10'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/10'
          }`}
        >
          <BookOpen className="w-4 h-4 text-cyan-400" />
          <span>Report Index</span>
        </button>

        <button
          onClick={() => setSubTab('archive')}
          className={`px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition duration-150 cursor-pointer flex items-center gap-2 relative ${
            subTab === 'archive'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/10'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/10'
          }`}
        >
          <Archive className="w-4 h-4 text-amber-500" />
          <span>Resolved Archive</span>

          {resolvedAlerts.length > 0 && (
            <span className="bg-slate-950 text-amber-500 text-[10px] px-1.5 py-0.5 rounded-full font-sans font-bold border border-slate-850">
              {resolvedAlerts.length}
            </span>
          )}
        </button>
      </div>

      {subTab === 'dossier' ? (
        workspaceOpen ? (
          <>
            <div
              id="incident-report-workspace"
              className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-850 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-400">
                    Active Vessel Workspace
                  </div>

                  <h3 className="mt-1 text-xl font-black text-slate-100 uppercase tracking-wider">
                    {currentVessel.vessel_name}
                  </h3>

                  <p className="text-[11px] text-slate-500 mt-1">
                    Vessel ID: {currentVessel.vessel_id} • MMSI:{' '}
                    {currentVessel.mmsi_hash || 'N/A'} • Risk:{' '}
                    {currentVessel.risk_score}/{currentVessel.risk_level}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-3">
                    <div className="text-[9px] text-slate-500 font-mono uppercase">
                      Drafts
                    </div>
                    <div className="text-lg font-black text-cyan-300">
                      {savedReportsForCurrentVessel.length}
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-3">
                    <div className="text-[9px] text-slate-500 font-mono uppercase">
                      Alerts
                    </div>
                    <div className="text-lg font-black text-amber-300">
                      {vesselAlerts.length}
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-3">
                    <div className="text-[9px] text-slate-500 font-mono uppercase">
                      Zones
                    </div>
                    <div className="text-lg font-black text-slate-200">
                      {zones.length}
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-850 rounded-xl px-4 py-3">
                    <div className="text-[9px] text-slate-500 font-mono uppercase">
                      Opened
                    </div>
                    <div className="text-lg font-black text-emerald-300">
                      {activeReportId ? 'Yes' : 'No'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-4 border-b border-slate-850">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                    <Archive className="w-4 h-4 text-amber-400" />
                    Saved Drafts / Reports
                  </h3>

                  <p className="text-[11px] text-slate-500 mt-1">
                    Search and open saved Cloud SQL reports for{' '}
                    {currentVessel.vessel_name}.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={detailDraftSearch}
                      onChange={(e) => setDetailDraftSearch(e.target.value)}
                      placeholder="Search drafts..."
                      className="w-full sm:w-72 pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void loadSavedReports()}
                    disabled={loadingSavedReports}
                    className="px-3 py-2 bg-slate-950 hover:bg-slate-850 disabled:opacity-50 border border-slate-800 rounded-lg text-[11px] font-mono font-bold uppercase text-slate-300"
                  >
                    {loadingSavedReports ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>

              {savedReportError && (
                <div className="px-5 py-3 border-b border-rose-500/20 bg-rose-950/20 text-xs text-rose-300">
                  {savedReportError}
                </div>
              )}

              <div className="p-4 max-h-[320px] overflow-y-auto space-y-3">
                {filteredSavedReportsForCurrentVessel.length === 0 ? (
                  <div className="px-4 py-6 rounded-xl border border-dashed border-slate-800 text-xs text-slate-500 text-center">
                    No saved draft matched this search.
                  </div>
                ) : (
                  filteredSavedReportsForCurrentVessel.map((report, index) => (
                    <div
                      key={report.id}
                      className={`rounded-xl border p-4 transition ${
                        activeReportId === report.id
                          ? 'border-cyan-500/50 bg-cyan-950/15'
                          : 'border-slate-850 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-mono">
                              #{index + 1}
                            </span>

                            <span className="font-mono text-sm font-black text-cyan-300">
                              {report.report_number}
                            </span>

                            {activeReportId === report.id && (
                              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 text-[9px] font-black uppercase">
                                Opened
                              </span>
                            )}

                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                report.report_status === 'Finalized'
                                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                  : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                              }`}
                            >
                              {report.report_status}
                            </span>
                          </div>

                          <div className="mt-2 text-[10px] text-slate-500 font-mono">
                            Updated{' '}
                            {new Date(
                              report.updated_at || report.created_at,
                            ).toLocaleString()}
                          </div>

                          <p className="mt-2 text-xs text-slate-400 line-clamp-2">
                            {report.officer_notes ||
                              'No officer notes recorded.'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenSavedReport(report)}
                          className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider"
                        >
                          {activeReportId === report.id ? 'Opened' : 'Open Draft'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {activeSavedReport && (
              <div
                id="active-report-banner"
                className="border border-cyan-500/30 bg-cyan-950/20 rounded-2xl px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="text-[10px] font-mono font-black uppercase tracking-widest text-cyan-400">
                    Opened Cloud SQL Draft
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3">
                    <span className="text-base font-black text-slate-100 font-mono">
                      {activeSavedReport.report_number}
                    </span>

                    <span className="px-2 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold uppercase">
                      {activeSavedReport.report_status}
                    </span>

                    <span className="text-[11px] text-slate-400 font-mono">
                      Updated:{' '}
                      {new Date(
                        activeSavedReport.updated_at ||
                          activeSavedReport.created_at,
                      ).toLocaleString()}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-1">
                    You are currently editing this saved draft. Click Save
                    Changes to update this draft, or Save as New Draft to create
                    a separate version.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveReportId(null);
                    setGeneratedAiReport(null);
                    setSaveSuccess(false);
                    setAiGenerationError('');
                  }}
                  className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-950 hover:bg-slate-900 text-[10px] font-black uppercase tracking-wider text-slate-300"
                >
                  Clear Opened Draft
                </button>
              </div>
            )}

            <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden p-6 md:p-8 space-y-8 relative">
              <div className="absolute top-10 right-10 border-4 border-rose-500/20 text-rose-500/20 px-4 py-2 rounded-lg font-black text-xs md:text-sm tracking-widest uppercase transform rotate-12 pointer-events-none font-mono select-none">
                CONFIDENTIAL // SEAGNAL NET
              </div>

              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-slate-850 pb-6">
                <div className="space-y-2">
                  <div className="text-[10px] font-mono tracking-widest text-[#64748b] uppercase font-bold">
                    MARITIME SAFETY AGENCY // DEFENSE INTELLIGENCE DOSSIER
                  </div>

                  <h1 className="text-3xl font-black text-white tracking-widest uppercase">
                    SUBJECT: {currentVessel.vessel_name}
                  </h1>

                  <p className="text-xs text-slate-400">
                    Registered MMSI Identifier:{' '}
                    <span className="font-mono text-cyan-400 font-semibold">
                      {currentVessel.mmsi_hash}
                    </span>{' '}
                    // Class classification: {currentVessel.vessel_type}
                  </p>
                </div>

                <div className="flex flex-col md:items-end font-mono">
                  <div className="text-right text-[11px] text-slate-400">
                    SYSTEM REPORT ID:{' '}
                    <span className="text-slate-350 font-bold">
                      SEG-{currentVessel.vessel_id}-INTEL
                    </span>
                  </div>

                  <div className="text-right text-[11px] text-slate-400 mt-1">
                    REVISION:{' '}
                    <span className="text-cyan-400 font-semibold">
                      2026-06-23 v2.0
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/60 text-center space-y-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">
                    Threat Score
                  </span>

                  <div className="text-3xl font-extrabold text-rose-500 font-mono">
                    {currentVessel.risk_score}
                  </div>

                  <span
                    className={`text-[9px] uppercase px-2 py-0.5 rounded border leading-none font-mono font-bold block ${
                      currentVessel.risk_level === 'High'
                        ? 'text-rose-400 border-rose-500/20 bg-rose-500/5'
                        : currentVessel.risk_level === 'Medium'
                          ? 'text-amber-400 border-amber-500/20 bg-amber-500/5'
                          : 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5'
                    }`}
                  >
                    {currentVessel.risk_level} Risk Threat
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/60 space-y-1 flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block text-center mb-1">
                    Coordinates snapshot
                  </span>

                  <div className="text-xs font-mono text-cyan-400 text-center">
                    LAT: {currentVessel.latitude.toFixed(5)}°N
                  </div>

                  <div className="text-xs font-mono text-cyan-400 text-center border-t border-slate-900 pt-1 mt-1">
                    LNG: {currentVessel.longitude.toFixed(5)}°E
                  </div>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/60 space-y-1 text-center flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">
                    Velocity / Bearing
                  </span>

                  <div className="text-sm font-black text-slate-200 font-mono leading-tight">
                    {currentVessel.speed} kn (
                    {Math.round(currentVessel.speed * 1.852)} km/h)
                  </div>

                  <span className="text-[10px] text-slate-500 font-mono block">
                    Heading: {currentVessel.heading}° Azimuth
                  </span>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850/60 space-y-1 text-center flex flex-col justify-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest block">
                    AIS telemetry ping
                  </span>

                  <div className="text-xs font-bold text-slate-300 leading-normal font-mono">
                    {new Date(currentVessel.last_ais_time).toLocaleTimeString()}{' '}
                    UTC
                  </div>

                  <span className="text-[9px] text-slate-500 block capitalize italic">
                    Status: {currentVessel.status}
                  </span>
                </div>
              </div>

              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-850/60 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-905 pb-3">
                  <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />

                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-100">
                      Seagnal AI Agent Orchestration Status Console (Sec. 8)
                    </h3>

                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Multi-agent tracking pipeline checking proximity limits,
                      gaps logs and preparing analytical summaries.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                  {aiAgents.map((agent) => {
                    const works = agent.id === selectedAgentId;

                    return (
                      <button
                        type="button"
                        key={agent.id}
                        onClick={() => setSelectedAgentId(agent.id)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all group cursor-pointer ${
                          works
                            ? 'bg-cyan-950/20 border-cyan-500/40 shadow shadow-cyan-500/10'
                            : 'bg-slate-900/30 border-slate-900 hover:border-slate-850'
                        }`}
                      >
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase block leading-none">
                            Agent ID: {agent.id.toUpperCase()}
                          </span>

                          <span
                            className="text-xs font-black text-slate-200 tracking-tight block truncate"
                            title={agent.name}
                          >
                            {agent.name.split(' ')[1] || agent.name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1 mt-3">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[8px] font-mono font-bold leading-none ${
                              agent.status === 'OPTIMAL'
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : agent.status === 'MONITORING'
                                  ? 'bg-cyan-500/15 text-cyan-400'
                                  : agent.status === 'ACTIVE'
                                    ? 'bg-rose-500/15 text-rose-400 animate-pulse'
                                    : 'bg-slate-700/25 text-slate-400'
                            }`}
                          >
                            {agent.status}
                          </span>

                          <span className="text-[9px] font-mono text-slate-600 font-semibold">
                            {agent.ping}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {(() => {
                  const agent =
                    aiAgents.find((a) => a.id === selectedAgentId) ||
                    aiAgents[0];

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-900">
                      <div className="lg:col-span-5 space-y-1.5 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-cyan-400 font-mono tracking-wider uppercase">
                          Focused Agent Profile
                        </span>

                        <h4 className="text-sm font-extrabold text-slate-100">
                          {agent.name}
                        </h4>

                        <p className="text-xs text-slate-450 leading-relaxed text-justify">
                          {agent.role}
                        </p>
                      </div>

                      <div className="lg:col-span-7 bg-slate-950 p-3 rounded-lg border border-slate-900/60 font-mono text-[10px] space-y-2 select-text">
                        <div className="flex items-center justify-between border-b border-slate-900 pb-1.5 text-slate-500 font-bold uppercase tracking-wider">
                          <span>Active Telemetry Subprocess logs</span>
                          <span className="text-emerald-500 animate-pulse">
                            ● LIVE CONSOLE CONNECTED
                          </span>
                        </div>

                        <div className="space-y-1 text-slate-350 leading-normal">
                          {agent.logs.map((log, li) => (
                            <div key={li} className="flex gap-2.5">
                              <span className="text-slate-600">
                                [{18 + li}:48:{10 + li * 2}]
                              </span>
                              <span className="text-emerald-500/80">&gt;</span>
                              <span className="flex-1 text-justify">{log}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <GeminiIncidentBrief
                vessel={currentVessel}
                alerts={vesselAlerts}
                response={generatedAiReport}
                isGenerating={isGeneratingAi}
                errorMessage={aiGenerationError}
                onGenerate={handleGenerateAiSummary}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-850 pb-2">
                      <Globe className="w-4 h-4 text-cyan-400" />
                      SATELLITE POSITION & TACTICAL ANALYSIS
                    </h3>

                    <div className="text-xs text-slate-300 space-y-3 font-sans leading-relaxed text-justify">
                      <p>
                        Vessel hull{' '}
                        <strong className="text-cyan-400">
                          {currentVessel.vessel_name}
                        </strong>{' '}
                        flag state{' '}
                        <strong className="text-slate-200">
                          {currentVessel.flag_state || 'N/A'}
                        </strong>{' '}
                        registering physical dimensions of{' '}
                        <span className="font-mono text-slate-200">
                          {currentVessel.length || 'N/A'}m x{' '}
                          {currentVessel.width || 'N/A'}m
                        </span>{' '}
                        is currently inspected under the Seagnal AI Watch System.
                      </p>

                      <p>
                        The AI rating structures compute general threat
                        classifications based on geofence crossovers and missing
                        transponder downtime logs.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-850 pb-2">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      ANOMALY EVENT CHRONOLOGICAL LOGS
                    </h3>

                    <div className="space-y-2">
                      {vesselAlerts.length === 0 ? (
                        <div className="text-xs text-slate-500 italic py-2 pr-2">
                          Zero alerts logged for this vessel timeline. Operating
                          within standard maritime guidelines.
                        </div>
                      ) : (
                        vesselAlerts.map((alert) => {
                          const isResolved = alert.status === 'Resolved';

                          return (
                            <div
                              key={alert.alert_id}
                              className={`flex gap-3 text-xs leading-normal p-2.5 rounded-lg border transition ${
                                isResolved
                                  ? 'bg-emerald-950/10 border-emerald-500/20'
                                  : 'bg-slate-950/40 border-slate-900'
                              }`}
                            >
                              <span
                                className={`font-mono font-bold shrink-0 mt-0.5 ${
                                  isResolved
                                    ? 'text-emerald-400'
                                    : 'text-cyan-400'
                                }`}
                              >
                                [{alert.alert_id}]
                              </span>

                              <div className="space-y-1.5 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-slate-200">
                                    {alert.alert_type}
                                  </span>

                                  <span className="text-[9px] font-mono text-slate-500">
                                    {new Date(
                                      alert.alert_time,
                                    ).toLocaleString()}
                                  </span>

                                  <span
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold ${
                                      isResolved
                                        ? 'bg-emerald-500/15 text-emerald-400'
                                        : alert.status === 'Under Review'
                                          ? 'bg-amber-500/15 text-amber-400'
                                          : 'bg-red-500/15 text-red-500'
                                    }`}
                                  >
                                    {alert.status.toUpperCase()}
                                  </span>
                                </div>

                                <p className="text-slate-450 text-justify text-[11px] font-sans leading-normal">
                                  {alert.description}
                                </p>

                                {isResolved ? (
                                  <div className="mt-1.5 bg-emerald-950/15 p-2 rounded border border-emerald-900/30 text-[10px] space-y-1">
                                    <div className="flex items-center justify-between text-emerald-400 font-mono font-bold">
                                      <span>
                                        ✔ RESOLVED BY:{' '}
                                        {alert.reviewed_by || 'Duty Officer'}
                                      </span>
                                      <span>
                                        {alert.resolved_at
                                          ? new Date(
                                              alert.resolved_at,
                                            ).toLocaleString()
                                          : ''}
                                      </span>
                                    </div>

                                    <p className="text-slate-300 italic">
                                      Resolution Notes: {alert.resolution_notes}
                                    </p>
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-cyan-500/80 font-mono italic">
                                    Recommended SOP: {alert.recommended_action}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-3 bg-slate-950 p-5 rounded-2xl border border-slate-850/60 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                          <Terminal className="w-4 h-4 text-cyan-400" />
                          Officer Prosecution Logs
                        </h3>

                        {saveSuccess && (
                          <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Saved{' '}
                            {savedReports[currentVessel.vessel_id]
                              ?.reportNumber || ''}
                          </span>
                        )}
                      </div>

                      <p className="text-[10px] text-slate-550 leading-normal">
                        Write down operational actions, VH hails, mechanical
                        feedback, and final interception reports directly in the
                        log block.
                      </p>
                    </div>

                    <textarea
                      value={officerNotes[selectedVesselId] || ''}
                      onChange={(e) => {
                        setOfficerNotes({
                          ...officerNotes,
                          [selectedVesselId]: e.target.value,
                        });
                      }}
                      className="w-full h-44 mt-3 p-3 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-xs focus:outline-none focus:border-cyan-500 resize-none font-mono leading-relaxed"
                      placeholder="Compose briefing updates... E.g. Dispatched sea patrol at 19:30. Mechanical engine failure confirmed..."
                    />

                    <div className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
                      <button
                        onClick={handleSaveReport}
                        disabled={savingNote || !generatedAiReport}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-850 hover:text-cyan-400 disabled:opacity-50 border border-slate-805 hover:border-cyan-500/30 text-xs font-bold text-slate-300 tracking-wider uppercase rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>
                          {savingNote
                            ? 'SAVING...'
                            : activeReportId
                              ? 'SAVE CHANGES'
                              : 'SAVE REPORT DRAFT'}
                        </span>
                      </button>

                      <button
                        onClick={handleSaveAsNewDraft}
                        disabled={savingNote || !generatedAiReport}
                        className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-black tracking-wider uppercase rounded-lg flex items-center justify-center gap-2 transition cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>SAVE AS NEW DRAFT</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-5 bg-rose-950/10 border border-rose-500/10 rounded-2xl">
                    <div className="flex items-center gap-2 text-rose-400 mb-3 border-b border-rose-500/10 pb-2">
                      <AlertTriangle className="w-4.5 h-4.5 animate-bounce-slow text-rose-400 shrink-0" />

                      <h4 className="text-xs font-bold uppercase tracking-widest">
                        Official Recommended Interdict Directive
                      </h4>
                    </div>

                    <div className="text-xs text-rose-300 leading-relaxed font-sans font-medium text-justify">
                      {vesselAlerts.length > 0
                        ? vesselAlerts[0].recommended_action
                        : 'Conduct standard localized radar sweep sweeps. Report any velocity changes below limits immediately to command desk.'}
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-500 font-mono uppercase">
                      <span>Priority Index:</span>

                      <span className="text-rose-500 font-bold bg-rose-500/5 px-2 py-0.5 rounded border border-rose-500/20">
                        {currentVessel.risk_level === 'High'
                          ? 'IMMEDIATE PATROL FORCE DISPATCHED'
                          : 'ROUTINE CORRIDOR SCANNING'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between border-t border-slate-850 pt-6 gap-4">
                <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-cyan-500/40" />
                    <span>Security Classification: CONFIDENTIAL BRIEF</span>
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      onSelectVessel(currentVessel.vessel_id);
                      onNavigate('vessels');
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-850 hover:text-white border border-slate-800 text-xs font-semibold tracking-wider text-slate-300 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span>Vessel Specs Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={handlePrintReport}
                    disabled={!generatedAiReport}
                    className="no-print px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 text-slate-950 text-xs font-black tracking-widest uppercase rounded-lg flex items-center gap-1.5 transition shadow-lg shadow-cyan-950/40 cursor-pointer min-h-[44px]"
                  >
                    <Printer className="w-4 h-4 text-slate-950" />
                    <span>PRINT / SAVE PDF</span>
                  </button>
                </div>
              </div>
            </div>

            <PrintableIncidentReport
              vessel={currentVessel}
              alerts={prioritizedVesselAlerts.slice(0, 12)}
              officerNotes={officerNotes[currentVessel.vessel_id] || ''}
              response={generatedAiReport}
              savedReportNumber={
                savedReports[currentVessel.vessel_id]?.reportNumber
              }
            />
          </>
        ) : (
          <div className="space-y-4">
            <div className="bg-slate-900/30 border border-slate-900 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-850 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">
                    Vessel Report List
                  </h3>

                  <p className="text-[11px] text-slate-500 mt-1">
                    Search vessels and open a workspace or latest saved Cloud SQL
                    draft.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={indexSearch}
                      onChange={(e) => setIndexSearch(e.target.value)}
                      placeholder="Search vessel, MMSI, risk, report number..."
                      className="w-full sm:w-96 pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => void loadSavedReports()}
                    disabled={loadingSavedReports}
                    className="px-3 py-2 bg-slate-950 hover:bg-slate-850 disabled:opacity-50 border border-slate-800 rounded-lg text-[11px] font-mono font-bold uppercase text-slate-300"
                  >
                    {loadingSavedReports ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>

              {savedReportError && (
                <div className="px-5 py-3 border-b border-rose-500/20 bg-rose-950/20 text-xs text-rose-300">
                  {savedReportError}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-200 min-w-[980px]">
                  <thead className="bg-slate-950 font-mono text-[9px] text-slate-500 uppercase tracking-widest border-b border-slate-900">
                    <tr>
                      <th className="py-3 px-4">Vessel</th>
                      <th className="py-3 px-4">Identifier</th>
                      <th className="py-3 px-4">Risk</th>
                      <th className="py-3 px-4">Open Alerts</th>
                      <th className="py-3 px-4">Saved Drafts</th>
                      <th className="py-3 px-4">Latest Report</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800/40">
                    {filteredVesselReportIndex.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-12 text-center text-slate-500"
                        >
                          No vessels matched the search.
                        </td>
                      </tr>
                    ) : (
                      filteredVesselReportIndex.map(
                        ({
                          vessel,
                          draftCount,
                          latestReport,
                          activeAlertCount,
                        }) => (
                          <tr
                            key={vessel.vessel_id}
                            className="hover:bg-slate-900/40 transition"
                          >
                            <td className="py-4 px-4">
                              <div className="font-bold text-slate-100">
                                {vessel.vessel_name}
                              </div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                {vessel.vessel_type}
                              </div>
                            </td>

                            <td className="py-4 px-4 font-mono text-[10px] text-slate-400">
                              <div>ID: {vessel.vessel_id}</div>
                              <div>MMSI: {vessel.mmsi_hash || 'N/A'}</div>
                            </td>

                            <td className="py-4 px-4">
                              <span
                                className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${
                                  vessel.risk_level === 'High'
                                    ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                                    : vessel.risk_level === 'Medium'
                                      ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                      : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                                }`}
                              >
                                {vessel.risk_score} / {vessel.risk_level}
                              </span>
                            </td>

                            <td className="py-4 px-4 font-mono text-slate-300">
                              {activeAlertCount}
                            </td>

                            <td className="py-4 px-4 font-mono text-cyan-300 font-bold">
                              {draftCount}
                            </td>

                            <td className="py-4 px-4">
                              {latestReport ? (
                                <div>
                                  <div className="font-mono text-cyan-300 font-bold">
                                    {latestReport.report_number}
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">
                                    {new Date(
                                      latestReport.updated_at ||
                                        latestReport.created_at,
                                    ).toLocaleString()}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-500">
                                  No saved report
                                </span>
                              )}
                            </td>

                            <td className="py-4 px-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openWorkspaceForVessel(vessel.vessel_id)
                                  }
                                  className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-850 text-[10px] font-black uppercase text-slate-300"
                                >
                                  Open Workspace
                                </button>

                                <button
                                  type="button"
                                  disabled={!latestReport}
                                  onClick={() => {
                                    if (latestReport) {
                                      handleOpenSavedReport(latestReport);
                                    }
                                  }}
                                  className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-[10px] font-black uppercase"
                                >
                                  Open Latest
                                </button>
                              </div>
                            </td>
                          </tr>
                        ),
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-900">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />

              <input
                type="text"
                placeholder="Search Vessel name, notes, analyst ID..."
                value={archiveSearch}
                onChange={(e) => setArchiveSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-200 placeholder-slate-600 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 min-h-[44px]"
              />
            </div>

            <div>
              <select
                value={archiveSeverity}
                onChange={(e) => setArchiveSeverity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-200 text-xs focus:outline-none cursor-pointer min-h-[44px]"
              >
                <option value="All">All Severities</option>
                <option value="High">High Severity</option>
                <option value="Medium">Medium Severity</option>
                <option value="Low">Low Severity</option>
              </select>
            </div>

            <div>
              <select
                value={archiveType}
                onChange={(e) => setArchiveType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-slate-200 text-xs focus:outline-none cursor-pointer min-h-[44px]"
              >
                {archiveAlertTypes.map((type, idx) => (
                  <option key={idx} value={type}>
                    {type === 'All' ? 'All Anomaly Types' : type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-900/30 border border-slate-900 rounded-xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-200 min-w-[900px] md:min-w-0">
                <thead className="bg-slate-950 font-mono text-[9px] text-slate-500 uppercase tracking-widest border-b border-slate-900">
                  <tr>
                    <th className="py-3 px-4">Alarm ID</th>
                    <th className="py-3 px-4">Subject Vessel</th>
                    <th className="py-3 px-4">Anomaly Event Type</th>
                    <th className="py-3 px-4">Trigger Time</th>
                    <th className="py-3 px-4">Severity</th>
                    <th className="py-3 px-4">Resolution Summary</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/40">
                  {resolvedAlerts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-16 text-center text-slate-500 font-sans"
                      >
                        <div className="flex flex-col items-center justify-center space-y-2 font-mono">
                          <Archive className="w-10 h-10 text-slate-600 mb-2 shrink-0 animate-pulse text-amber-500" />
                          <p className="font-semibold text-slate-450 uppercase text-xs tracking-wider">
                            Archive clear.
                          </p>
                          <p className="text-[10px] text-slate-500 max-w-xs leading-relaxed uppercase">
                            No alerts have been resolved. Completed cases will
                            populate here.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredResolvedAlerts.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-slate-500 font-sans italic"
                      >
                        No resolved incidents matches the active filters.
                      </td>
                    </tr>
                  ) : (
                    filteredResolvedAlerts.map((alert) => {
                      const targetVessel = vessels.find(
                        (v) => v.vessel_id === alert.vessel_id,
                      );

                      return (
                        <tr
                          key={alert.alert_id}
                          className="hover:bg-slate-900/10 transition duration-105"
                        >
                          <td className="py-4 px-4 font-mono text-[11px] font-bold text-slate-400">
                            {alert.alert_id}
                          </td>

                          <td className="py-4 px-4">
                            {targetVessel ? (
                              <div className="min-w-0">
                                <span className="font-bold text-slate-100 block">
                                  {targetVessel.vessel_name}
                                </span>

                                <span className="text-[10px] text-slate-500 block leading-tight font-mono">
                                  {targetVessel.vessel_type}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">UNKNOWN</span>
                            )}
                          </td>

                          <td className="py-4 px-4 font-semibold text-slate-250">
                            {alert.alert_type}
                          </td>

                          <td className="py-4 px-4 font-mono text-[10px] text-slate-400 leading-normal">
                            {new Date(alert.alert_time).toLocaleString()}
                          </td>

                          <td className="py-4 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold tracking-wider ${
                                alert.severity === 'High'
                                  ? 'bg-rose-500/10 text-rose-450 border border-rose-500/20'
                                  : alert.severity === 'Medium'
                                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                              }`}
                            >
                              {alert.severity}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 max-w-sm">
                            <div className="bg-emerald-950/10 border border-emerald-900/20 p-2 rounded-lg space-y-1 text-[11px]">
                              <div className="flex items-center justify-between font-mono text-[9px] text-emerald-450 font-extrabold tracking-wider border-b border-emerald-900/20 pb-0.5 leading-none">
                                <span>
                                  OFFICER:{' '}
                                  {alert.reviewed_by || 'Duty Officer'}
                                </span>

                                <span>
                                  {alert.resolved_at
                                    ? new Date(
                                        alert.resolved_at,
                                      ).toLocaleString()
                                    : 'CLOSED'}
                                </span>
                              </div>

                              <p
                                className="text-slate-300 italic line-clamp-2 leading-relaxed"
                                title={alert.resolution_notes}
                              >
                                Notes:{' '}
                                {alert.resolution_notes ||
                                  'Resolution recorded.'}
                              </p>
                            </div>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <div className="flex justify-end gap-1.5 font-mono">
                              <button
                                onClick={() => {
                                  onSelectVessel(alert.vessel_id);
                                  onNavigate('vessels');
                                }}
                                className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-850 text-cyan-400 rounded text-[10px] uppercase tracking-wider cursor-pointer font-bold"
                              >
                                PROFILE
                              </button>

                              <button
                                onClick={() => {
                                  if (targetVessel) {
                                    openWorkspaceForVessel(
                                      targetVessel.vessel_id,
                                    );
                                  }
                                }}
                                className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 hover:text-slate-900 rounded text-[10px] font-bold uppercase tracking-wider cursor-pointer font-black"
                              >
                                DOSSIER
                              </button>
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
        </div>
      )}
    </div>
  );
}