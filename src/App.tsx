import {
  useState,
  useMemo,
  useEffect,
  useRef,
} from 'react';

import {
  defaultSettings as initialSettings,
} from './data';

import {
  Vessel,
  Movement,
  Alert,
  MaritimeZone,
  PlatformSettings,
  ViewType,
  AlertStatus,
  RiskLevel,
} from './types';

import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import VesselMapView from './components/VesselMapView';
import VesselDetailView from './components/VesselDetailView';
import AlertManagementView from './components/AlertManagementView';
import IncidentReportView from './components/IncidentReportView';
import SettingsView from './components/SettingsView';
import UserManagementView from './components/UserManagementView';
import AuditLogsView from './components/AuditLogsView';

import {
  vesselService,
} from './services/vesselService';

import {
  alertService,
} from './services/alertService';

import {
  settingsService,
} from './services/settingsService';

import {
  AuthProvider,
  useAuth,
} from './auth/AuthContext';

import LoginView from './components/auth/LoginView';
import ProtectedView from './auth/ProtectedView';
import PermissionGuard from './auth/PermissionGuard';

import PermissionDenied from './components/common/PermissionDenied';

import {
  ToastProvider,
  useToast,
} from './components/common/ToastProvider';

import LoadingPanel from './components/common/LoadingPanel';

import {
  Clock,
  ChevronRight,
  Sun,
  Moon,
  BellRing,
} from 'lucide-react';

function BaseAppLayout() {
  const {
    user,
    isAuthenticated,
    hasPermission,
  } = useAuth();

  const {
    showToast,
  } = useToast();

  const [
    currentView,
    setCurrentView,
  ] = useState<ViewType>(
    'dashboard'
  );

  const [
    vessels,
    setVessels,
  ] = useState<Vessel[]>([]);

  const [
    movements,
    setMovements,
  ] = useState<Movement[]>([]);

  const [
    alerts,
    setAlerts,
  ] = useState<Alert[]>([]);

  const [
    zones,
    setZones,
  ] = useState<
    MaritimeZone[]
  >([]);

  const [
    settings,
    setSettings,
  ] =
    useState<PlatformSettings>(
      initialSettings
    );

  const [
    loadingFeeds,
    setLoadingFeeds,
  ] =
    useState<boolean>(true);

  const [
    dataError,
    setDataError,
  ] =
    useState<string | null>(
      null
    );

  const [
    selectedVesselId,
    setSelectedVesselId,
  ] =
    useState<string | null>(
      null
    );

  const mainRef =
    useRef<HTMLElement>(
      null
    );

  const canViewSettings =
    hasPermission(
      'settings.view'
    );

  const canViewUsers =
    hasPermission(
      'users.view'
    );

  const canViewAuditLogs =
    hasPermission(
      'audit_logs.view'
    );

  const syncPlatformData =
    async () => {
      if (!isAuthenticated) {
        return;
      }

      try {
        setLoadingFeeds(true);
        setDataError(null);

        const settingsRequest =
          canViewSettings
            ? settingsService
                .getSettings()
            : Promise.resolve(
                initialSettings
              );

        const [
          allVessels,
          allMovements,
          allAlerts,
          allZones,
          currentSet,
        ] = await Promise.all([
          vesselService
            .listVessels({
              limit: 500,
            }),

          vesselService
            .getMapMovements(
              40
            ),

          alertService
            .listAlerts(),

          vesselService
            .getMaritimeZones(),

          settingsRequest,
        ]);

        setVessels(
          allVessels
        );

        setMovements(
          allMovements
        );

        setAlerts(
          allAlerts
        );

        if (
          allZones &&
          allZones.length > 0
        ) {
          setZones(
            allZones
          );
        }

        setSettings(
          currentSet
        );
      } catch (
        err: any
      ) {
        const msg =
          err?.message ||
          'Unknown error loading platform data.';

        console.error(
          '[App] Platform data sync failed:',
          msg
        );

        setDataError(
          msg
        );
      } finally {
        setLoadingFeeds(
          false
        );
      }
    };

  useEffect(() => {
    void syncPlatformData();
  }, [
    isAuthenticated,
    canViewSettings,
  ]);

  useEffect(() => {
    if (
      mainRef.current
    ) {
      mainRef.current.scrollTop =
        0;
    }
  }, [currentView]);

  useEffect(() => {
    const unauthorizedSettings =
      currentView ===
        'settings' &&
      !canViewSettings;

    const unauthorizedUsers =
      currentView ===
        'user-management' &&
      !canViewUsers;

    const unauthorizedAuditLogs =
      currentView ===
        'audit-logs' &&
      !canViewAuditLogs;

    if (
      unauthorizedSettings ||
      unauthorizedUsers ||
      unauthorizedAuditLogs
    ) {
      setCurrentView(
        'dashboard'
      );
    }
  }, [
    currentView,
    canViewSettings,
    canViewUsers,
    canViewAuditLogs,
  ]);

  const [
    isLightMode,
    setIsLightMode,
  ] =
    useState<boolean>(
      false
    );

  useEffect(() => {
    if (isLightMode) {
      document
        .documentElement
        .classList
        .add(
          'light-mode'
        );

      document
        .documentElement
        .classList
        .remove(
          'dark'
        );
    } else {
      document
        .documentElement
        .classList
        .remove(
          'light-mode'
        );

      document
        .documentElement
        .classList
        .add(
          'dark'
        );
    }
  }, [isLightMode]);

  const [
    currentTimeUTC,
    setCurrentTimeUTC,
  ] =
    useState<string>('');

  useEffect(() => {
    const interval =
      setInterval(() => {
        const now =
          new Date();

        setCurrentTimeUTC(
          now
            .toISOString()
            .replace(
              'T',
              ' '
            )
            .slice(
              0,
              19
            ) + ' Z'
        );
      }, 1000);

    return () =>
      clearInterval(
        interval
      );
  }, []);

  const handleModifyAlertStatus =
    async (
      alertId: string,
      newStatus:
        AlertStatus,
      reviewer?: string,
      notes?: string
    ) => {
      try {
        const targetAlert =
          alerts.find(
            (alert) =>
              alert.alert_id ===
              alertId
          );

        if (
          !targetAlert
        ) {
          return;
        }

        if (
          newStatus ===
          'Under Review'
        ) {
          const defaultNotes =
            `Audit initiated on anomaly by officer ${
              user?.full_name ||
              'Duty'
            }.`;

          await alertService
            .auditAlert(
              alertId,
              notes ||
                defaultNotes
            );

          showToast(
            'Telemetry alert flagged as Under Review.',
            'info'
          );
        } else if (
          newStatus ===
          'Resolved'
        ) {
          const defNotes =
            notes ||
            'Incident resolved. Shipping corridor operating inside default tolerances.';

          await alertService
            .resolveAlert(
              alertId,
              defNotes
            );

          showToast(
            `Alert ${alertId} resolved. Transferred to archive files.`,
            'success'
          );
        }

        await syncPlatformData();
      } catch (err) {
        console.error(
          'Express transaction failure modifying status:',
          err
        );

        setAlerts(
          (
            prevAlerts
          ) =>
            prevAlerts.map(
              (alert) => {
                if (
                  alert.alert_id ===
                  alertId
                ) {
                  const parsedAlert:
                    Alert = {
                    ...alert,
                    status:
                      newStatus,
                  };

                  if (
                    newStatus ===
                    'Under Review'
                  ) {
                    parsedAlert.reviewed_by =
                      reviewer ||
                      user?.full_name ||
                      'Duty Officer';
                  } else if (
                    newStatus ===
                    'Resolved'
                  ) {
                    parsedAlert.reviewed_by =
                      reviewer ||
                      user?.full_name ||
                      'Duty Officer';

                    parsedAlert.resolution_notes =
                      notes ||
                      'Resolution logged locally.';

                    parsedAlert.resolved_at =
                      new Date()
                        .toISOString();
                  }

                  return parsedAlert;
                }

                return alert;
              }
            )
        );

        if (
          newStatus ===
          'Resolved'
        ) {
          const targetAlert =
            alerts.find(
              (alert) =>
                alert.alert_id ===
                alertId
            );

          if (
            targetAlert
          ) {
            const targetVesselId =
              targetAlert.vessel_id;

            setVessels(
              (
                prevVessels
              ) =>
                prevVessels.map(
                  (
                    vessel
                  ) => {
                    if (
                      vessel.vessel_id ===
                      targetVesselId
                    ) {
                      const newScore =
                        Math.max(
                          10,
                          vessel.risk_score -
                            25
                        );

                      const newLevel =
                        newScore >=
                        settings.high_risk_threshold
                          ? 'High'
                          : newScore >=
                              settings.medium_risk_threshold
                            ? 'Medium'
                            : 'Low';

                      return {
                        ...vessel,
                        risk_score:
                          newScore,
                        risk_level:
                          newLevel,
                        status:
                          'Telemetry verified. Anomaly cleared.',
                      };
                    }

                    return vessel;
                  }
                )
            );
          }

          showToast(
            'Optimized local mitigation applied.',
            'success'
          );
        }
      }
    };

  const handleSaveSettings =
    async (
      newSettings:
        PlatformSettings
    ) => {
      if (
        !hasPermission(
          'settings.update'
        )
      ) {
        showToast(
          'Administrator permission is required to update system settings.',
          'error'
        );

        return;
      }

      try {
        await settingsService
          .updateSettings(
            newSettings
          );

        showToast(
          'System thresholds updated successfully.',
          'success'
        );

        await syncPlatformData();
      } catch (err) {
        console.error(
          'Settings backup unavailable:',
          err
        );

        setSettings(
          newSettings
        );

        setVessels(
          (
            prevVessels
          ) =>
            prevVessels.map(
              (
                vessel
              ) => {
                const score =
                  vessel.risk_score;

                let level:
                  RiskLevel =
                  'Low';

                if (
                  score >=
                  newSettings.high_risk_threshold
                ) {
                  level =
                    'High';
                } else if (
                  score >=
                  newSettings.medium_risk_threshold
                ) {
                  level =
                    'Medium';
                }

                return {
                  ...vessel,
                  risk_level:
                    level,
                };
              }
            )
        );

        showToast(
          'Threshold boundaries set locally.',
          'success'
        );
      }
    };

  const handleVesselFocus =
    (
      vesselId: string
    ) => {
      setSelectedVesselId(
        vesselId
      );

      setCurrentView(
        'vessels'
      );
    };

  const activeViewHeader =
    useMemo(() => {
      switch (
        currentView
      ) {
        case 'dashboard':
          return {
            title:
              'Operational Overview',
            desc:
              'Real-time telemetry feeds and anomaly scoring boards.',
          };

        case 'map':
          return {
            title:
              'Tactical GIS Map radar corridor',
            desc:
              'Active shipping vessel tracks, restricted military geofences, and vector coordinates.',
          };

        case 'vessels':
          return {
            title:
              'Vessel Intel specs file',
            desc:
              'MMSI registries, historical area trends, and AI telemetry explanation dossiers.',
          };

        case 'alerts':
          return {
            title:
              'Platform Anomaly Alert center',
            desc:
              'Comprehensive list of active AIS intervals and geofencing violations.',
          };

        case 'incident-reports':
          return {
            title:
              'Coast Guard Prosecution summaries',
            desc:
              'Declassified tactical brief compilations with customizable duty commander journals.',
          };

        case 'settings':
          return {
            title:
              'Security Command settings',
            desc:
              'Tune kinematics limits, scoring bounds, and geofence guidelines.',
          };

        case 'user-management':
          return {
            title:
              'Security User Directory',
            desc:
              'Credential profiles, permission levels, and secure officer registration indices.',
          };

        case 'audit-logs':
          return {
            title:
              'Security audit logs trail',
            desc:
              'Trace administrative signups, officer edits, and tactical interdicts.',
          };

        default:
          return {
            title:
              'Seagnal AI Terminal',
            desc:
              'Coastal Maritime Intelligence & Anomaly Detection Dashboard.',
          };
      }
    }, [currentView]);

  if (
    loadingFeeds
  ) {
    return (
      <LoadingPanel message="Synchronizing tactical platform metrics..." />
    );
  }

  if (dataError) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans px-4">
        <div className="w-full max-w-lg bg-slate-900 border border-red-500/30 rounded-xl p-8 text-center shadow-2xl">
          <div className="w-14 h-14 bg-red-950/40 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <span className="text-red-400 text-2xl">
              ⚠
            </span>
          </div>

          <h2 className="text-lg font-semibold text-slate-100 uppercase tracking-wide mb-2">
            Database Connection Error
          </h2>

          <p className="text-sm text-slate-400 leading-relaxed mb-2">
            Failed to load operational data from the backend API.
          </p>

          <pre className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 rounded p-3 mb-6 text-left overflow-auto max-h-32 font-mono">
            {dataError}
          </pre>

          <button
            onClick={
              syncPlatformData
            }
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs uppercase py-2.5 px-6 rounded-lg transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <Sidebar
        currentView={
          currentView
        }
        onNavigate={(
          view
        ) => {
          if (
            view ===
              'settings' &&
            !canViewSettings
          ) {
            showToast(
              'Administrator access is required for System Settings.',
              'error'
            );

            return;
          }

          if (
            view ===
              'user-management' &&
            !canViewUsers
          ) {
            showToast(
              'Administrator access is required for User Directory.',
              'error'
            );

            return;
          }

          if (
            view ===
              'audit-logs' &&
            !canViewAuditLogs
          ) {
            showToast(
              'Administrator access is required for Audit Logs.',
              'error'
            );

            return;
          }

          setCurrentView(
            view
          );

          setSelectedVesselId(
            null
          );
        }}
        unresolvedAlertsCount={
          alerts.filter(
            (alert) =>
              alert.status !==
              'Resolved'
          ).length
        }
      />

      <div className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden bg-slate-950/20">
        <header className="h-16 border-b border-slate-900 bg-slate-950 flex items-center justify-between px-6 shrink-0 relative z-45">
          <div className="flex items-center gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase font-bold">
                  Seagnal Operations Central
                </span>

                <ChevronRight className="w-3 h-3 text-slate-700" />

                <span className="text-[10px] font-mono text-cyan-400 font-extrabold uppercase bg-cyan-950/85 px-2 py-0.5 border border-cyan-500/20 rounded tracking-widest leading-none">
                  {currentView}
                </span>
              </div>

              <h2 className="text-xs font-bold text-white tracking-wider mt-1 uppercase">
                {
                  activeViewHeader.title
                }
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() =>
                setIsLightMode(
                  !isLightMode
                )
              }
              className="px-3.5 py-1.5 rounded-lg border border-slate-850 bg-slate-900 hover:bg-slate-850 text-slate-350 flex items-center gap-2 cursor-pointer transition"
              title={
                isLightMode
                  ? 'Switch to Dark Mode'
                  : 'Switch to Light Mode'
              }
            >
              {isLightMode ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />

                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                    DARK_MODE
                  </span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500 animate-spin-slow" />

                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider">
                    LIGHT_MODE
                  </span>
                </>
              )}
            </button>

            <div className="bg-slate-900 px-3.5 py-1.5 rounded-lg border border-slate-850 flex items-center gap-2 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />

              <span className="font-mono text-xs font-semibold tracking-wider text-slate-300">
                {currentTimeUTC ||
                  '2026-06-23 10:20:00 Z'}
              </span>
            </div>

            <button
              onClick={() =>
                setCurrentView(
                  'alerts'
                )
              }
              className="bg-rose-950/20 hover:bg-rose-950/40 border border-rose-500/20 hover:border-rose-500/35 px-3 py-1.5 rounded-lg flex items-center gap-2 text-rose-455 transition shrink-0 cursor-pointer text-xs"
            >
              <BellRing className="w-3.5 h-3.5 animate-bounce-slow text-rose-400" />

              <span className="font-mono font-extrabold uppercase">
                {
                  alerts.filter(
                    (alert) =>
                      alert.status !==
                      'Resolved'
                  ).length
                }{' '}
                WARNINGS
              </span>
            </button>
          </div>
        </header>

        <main
          ref={mainRef}
          className="flex-grow overflow-y-auto p-6 bg-slate-950/30 relative z-30"
        >
          {currentView ===
            'dashboard' && (
            <DashboardView
              vessels={
                vessels
              }
              alerts={
                alerts
              }
              zones={
                zones
              }
              movements={
                movements
              }
              onSelectVessel={
                handleVesselFocus
              }
              onNavigate={(
                view
              ) =>
                setCurrentView(
                  view
                )
              }
            />
          )}

          {currentView ===
            'map' && (
            <VesselMapView
              vessels={
                vessels
              }
              zones={
                zones
              }
              alerts={
                alerts
              }
              movements={
                movements
              }
              selectedVesselId={
                selectedVesselId
              }
              onSelectVessel={
                setSelectedVesselId
              }
              onNavigate={(
                view
              ) =>
                setCurrentView(
                  view
                )
              }
            />
          )}

          {currentView ===
            'vessels' && (
            <VesselDetailView
              vessels={
                vessels
              }
              alerts={
                alerts
              }
              zones={
                zones
              }
              movements={
                movements
              }
              selectedVesselId={
                selectedVesselId
              }
              onBack={() => {
                setSelectedVesselId(
                  null
                );

                setCurrentView(
                  'dashboard'
                );
              }}
              onSelectVessel={
                setSelectedVesselId
              }
              onNavigate={(
                view
              ) =>
                setCurrentView(
                  view
                )
              }
              onModifyAlertStatus={
                handleModifyAlertStatus
              }
            />
          )}

          {currentView ===
            'alerts' && (
            <AlertManagementView
              alerts={
                alerts
              }
              vessels={
                vessels
              }
              onSelectVessel={
                handleVesselFocus
              }
              onNavigate={(
                view
              ) =>
                setCurrentView(
                  view
                )
              }
              onModifyAlertStatus={
                handleModifyAlertStatus
              }
            />
          )}

          {currentView ===
            'incident-reports' && (
            <IncidentReportView
              vessels={
                vessels
              }
              alerts={
                alerts
              }
              zones={
                zones
              }
              selectedVesselId={
                selectedVesselId
              }
              onSelectVessel={
                handleVesselFocus
              }
              onNavigate={(
                view
              ) =>
                setCurrentView(
                  view
                )
              }
            />
          )}

          {currentView ===
            'settings' && (
            <PermissionGuard
              permission="settings.view"
              fallback={
                <PermissionDenied requiredPermission="settings.view" />
              }
            >
              <SettingsView
                settings={
                  settings
                }
                onSaveSettings={
                  handleSaveSettings
                }
              />
            </PermissionGuard>
          )}

          {currentView ===
            'user-management' && (
            <PermissionGuard
              permission="users.view"
              fallback={
                <PermissionDenied requiredPermission="users.view" />
              }
            >
              <UserManagementView />
            </PermissionGuard>
          )}

          {currentView ===
            'audit-logs' && (
            <PermissionGuard
              permission="audit_logs.view"
              fallback={
                <PermissionDenied requiredPermission="audit_logs.view" />
              }
            >
              <AuditLogsView />
            </PermissionGuard>
          )}
        </main>

        <footer className="h-8 bg-slate-950 border-t border-slate-900 px-6 flex items-center justify-between text-[9px] font-mono tracking-widest text-[#475569] shrink-0 select-none">
          <span>
            HOST COORD: 13.run.poly // CLUSTER INGRESS: SECURE SSL
          </span>

          <span className="flex items-center gap-1 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />

            <span>
              Patrol Radar Connection Live // sector: Alpha 4 Clear
            </span>
          </span>
        </footer>
      </div>
    </div>
  );
}

function ProtectedLayoutWrapper() {
  const {
    isAuthenticated,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <LoadingPanel message="Authenticating secure duty clearance..." />
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <ProtectedView>
      <BaseAppLayout />
    </ProtectedView>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <ProtectedLayoutWrapper />
      </AuthProvider>
    </ToastProvider>
  );
}