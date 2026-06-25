import React from 'react';

import {
  AlertCircle,
  LogIn,
  ShieldAlert,
  Waves,
} from 'lucide-react';

import {
  useAuth,
} from '../../auth/AuthContext';

export const LoginView:
  React.FC = () => {
  const {
    login,
    authError,
    isLoading,
  } =
    useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(6,182,212,0.04),transparent_50%)]" />

      <div className="absolute inset-x-0 top-0 h-[1000px] bg-grid-pattern opacity-[0.015] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 border border-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <Waves className="w-8 h-8 text-cyan-400" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
            SEAGNAL AI
          </h1>

          <p className="text-xs text-slate-400 mt-1 uppercase font-mono tracking-widest">
            Coastal Intelligence Platform
          </p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-2xl relative">
          <div className="absolute top-0 right-0 p-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-950 border border-slate-800">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />

              WorkOS Secure
            </span>
          </div>

          <h2 className="text-base font-semibold text-slate-100 uppercase font-mono tracking-wider mb-6 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />

            Duty Operator Access
          </h2>

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

          <p className="text-xs text-slate-400 leading-relaxed mb-4">
            Sign in or create an account through
            WorkOS AuthKit. New accounts receive
            Viewer access by default.
          </p>

          <button
            id="workos-signin-btn"
            type="button"
            onClick={login}
            disabled={isLoading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 disabled:opacity-50 text-slate-950 font-mono font-bold text-xs uppercase py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition duration-150 min-h-[44px] cursor-pointer"
          >
            <LogIn className="w-4 h-4" />

            {isLoading
              ? 'Checking Session...'
              : 'Sign In With WorkOS'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;