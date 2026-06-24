import React from 'react';
import { useAuth, MOCK_USERS } from '../../auth/AuthContext';
import { ShieldAlert, Waves, LogIn, AlertCircle } from 'lucide-react';

export const LoginView: React.FC = () => {
  const {
    login,
    authError,
    isLoading,
    isMockAuth,
    selectMockUser,
  } = useAuth();

  const handleMockClick = (uid: string) => {
    selectMockUser(uid);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">

      {/* Decorative ambient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.04),transparent_50%)]" />
      <div className="absolute inset-x-0 top-0 h-[1000px] bg-grid-pattern opacity-[0.015] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">

        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 border border-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <Waves className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white uppercase font-sans">
            SEAGNAL AI
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase font-mono tracking-widest">
            COASTAL INTELLIGENCE PLATFORM
          </p>
        </div>

        {/* Primary Login Card */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl relative">

          <div className="absolute top-0 right-0 p-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-950 border border-slate-850">
              <span className={`w-1.5 h-1.5 rounded-full ${isMockAuth ? 'bg-amber-500 animate-pulse' : 'bg-cyan-500'}`} />
              {isMockAuth ? 'MOCK AUTH MODE' : 'WORKOS SECURE'}
            </span>
          </div>

          <h2 className="text-base font-semibold text-slate-100 uppercase font-mono tracking-wider mb-6 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            Duty Operator Access
          </h2>

          {/* Authentication error — shown when WorkOS returns an error or network fails */}
          {authError && (
            <div className="bg-red-950/30 border border-red-500/35 rounded-xl p-4 mb-5 flex gap-3">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-mono font-bold text-red-400 uppercase tracking-wider mb-1">
                  Authentication Error
                </p>
                <p className="text-[11px] font-mono text-red-300 leading-relaxed">
                  {authError}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed font-sans mb-4">
              Access requires authentication via WorkOS AuthKit. Click below to be redirected to the secure login portal.
            </p>

            <button
              id="workos-signin-btn"
              onClick={login}
              disabled={isLoading}
              className="w-full bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 disabled:opacity-50 text-slate-950 font-mono font-bold text-xs uppercase py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-150 min-h-[44px] cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {isLoading ? 'INITIATING SECURE REDIRECT...' : 'SIGN IN WITH WORKOS'}
            </button>
          </div>
        </div>

        {/* Developer Quick Role Switcher — only visible when server responds with a mock session */}
        {isMockAuth && (
          <div className="bg-slate-900 border border-amber-500/20 rounded-2xl p-6 mt-6 shadow-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-xs font-semibold text-amber-400 uppercase font-mono tracking-wider">
                DEVELOPER ACCESS (AUTH_REQUIRED=false)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
              Select a pre-assigned role profile to log in instantly (only available when AUTH_REQUIRED is disabled):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {MOCK_USERS.map((mockUser) => (
                <button
                  key={mockUser.user_id}
                  onClick={() => handleMockClick(mockUser.auth_uid)}
                  className="bg-slate-950/85 hover:bg-cyan-950/30 text-slate-300 hover:text-cyan-300 border border-slate-800 hover:border-cyan-800/40 rounded-xl p-2.5 text-left transition duration-150 min-h-[44px] cursor-pointer flex flex-col justify-center"
                >
                  <span className="text-[10px] font-semibold tracking-wide truncate block">
                    {mockUser.full_name.split(' (')[0]}
                  </span>
                  <span className="text-[8px] font-mono text-slate-500 truncate block mt-0.5 uppercase tracking-wider">
                    {mockUser.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default LoginView;
