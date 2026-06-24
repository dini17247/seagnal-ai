import { 
  useAuth 
} from '../auth/AuthContext';
import { 
  LayoutDashboard, 
  Map, 
  Anchor, 
  BellRing, 
  FileText, 
  Settings, 
  LogOut,
  ShieldAlert,
  Radio,
  Users,
  Terminal
} from 'lucide-react';
import { ViewType } from '../types';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  unresolvedAlertsCount?: number;
}

export default function Sidebar({ currentView, onNavigate, unresolvedAlertsCount = 0 }: SidebarProps) {
  const { user, logout, hasPermission } = useAuth();

  const menuItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard.view' as const },
    { id: 'map' as ViewType, label: 'Vessel Map', icon: Map, permission: 'map.view' as const },
    { id: 'vessels' as ViewType, label: 'Vessel Profiles', icon: Anchor, permission: 'vessels.view' as const },
    { id: 'alerts' as ViewType, label: 'Alert Center', icon: BellRing, badgeCount: unresolvedAlertsCount, permission: 'alerts.view' as const },
    { id: 'incident-reports' as ViewType, label: 'Incident Reports', icon: FileText, permission: 'reports.view' as const },
    { id: 'settings' as ViewType, label: 'System Settings', icon: Settings, permission: 'settings.view' as const },
    { id: 'user-management' as ViewType, label: 'User Directory', icon: Users, permission: 'users.view' as const },
    { id: 'audit-logs' as ViewType, label: 'Audit Logs', icon: Terminal, permission: 'audit_logs.view' as const },
  ];

  const filteredMenuItems = menuItems.filter(item => hasPermission(item.permission));

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside className="w-64 bg-slate-750 border-r border-slate-800 flex flex-col justify-between shrink-0 h-full text-slate-200">
      {/* Top Brand Block */}
      <div className="flex flex-col">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-750">
          <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center">
            <Radio className="w-5 h-5 text-slate-750 animate-pulse" />
          </div>
          <div>
            <h1 className="font-sans font-bold text-xl tracking-tight text-white leading-none">
              SEAGNAL AI
            </h1>
            <p className="text-[9px] font-mono tracking-widest text-cyan-500 uppercase mt-0.5">
              Maritime Guard
            </p>
          </div>
        </div>
 
        {/* Current Active Operations Info */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-750/20">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow shadow-emerald-500/50 animate-pulse"></span>
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">SOC STRAITS-ALPHA-1</span>
          </div>
        </div>

        {/* Navigation Menu Grid */}
        <nav className="p-4 space-y-1">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm tracking-wide transition-all group cursor-pointer ${
                  isActive
                    ? 'bg-cyan-900/30 text-cyan-400 border-l-2 border-cyan-400 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border-l-2 border-transparent font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4.5 h-4.5 transition-transform duration-150 group-hover:scale-105 ${
                    isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-400'
                  }`} />
                  <span>{item.label}</span>
                </div>
                {item.badgeCount ? (
                  <span className={`px-1.5 py-0.2 text-[10px] font-bold font-mono rounded ${
                    isActive 
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' 
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    {item.badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile Block */}
      <div className="p-4 border-t border-slate-800 bg-slate-750 space-y-3">
        <div className="flex items-center p-2 bg-slate-900 rounded-lg border border-slate-800 gap-2">
          <div className="bg-slate-800 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold text-cyan-300 uppercase shrink-0">
            {user?.full_name ? user.full_name[0] : 'O'}
          </div>
          <div className="ml-1 overflow-hidden flex-1">
            <p className="text-xs font-bold text-white truncate">
              {user?.full_name || 'Duty Officer'}
            </p>
            <p className="text-[9px] font-mono text-cyan-500/80 uppercase truncate tracking-wider">
              {user?.role}
            </p>
          </div>
        </div>

        {/* LOG OUT BUTTON */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-800 hover:border-red-500/30 bg-slate-900/50 hover:bg-red-950/20 text-slate-400 hover:text-red-400 text-xs font-mono font-medium rounded-lg transition-colors min-h-[44px] cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>CEASE DUTY (LOGOUT)</span>
        </button>
      </div>
    </aside>
  );
}
