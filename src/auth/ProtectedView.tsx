import React from 'react';
import { useAuth } from './AuthContext';
import LoginView from '../components/auth/LoginView';
import { motion } from 'motion/react';

interface ProtectedViewProps {
  children: React.ReactNode;
}

export const ProtectedView: React.FC<ProtectedViewProps> = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200 font-sans">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(6,182,212,0.3)] mb-4"
        />
        <div className="font-mono text-xs tracking-widest text-cyan-400/80 animate-pulse">
          LOADING OPERATIONAL CONTEXT...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  if (user?.account_status === 'Suspended' || user?.account_status === 'Disabled') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-sans px-4">
        <div className="w-full max-w-md bg-slate-900 border border-red-500/30 rounded-xl p-8 text-center shadow-[0_0_50px_rgba(239,68,68,0.1)]">
          <div className="w-16 h-16 bg-red-950/40 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-red-500 text-3xl font-bold">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-100 uppercase tracking-wide mb-2">
            ACCESS TERMINATED / SUSPENDED
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-6">
            Your Seagnal AI operational account ({user.email}) has been flagged as **{user.account_status}**. Contact your regional Command Administrator to renew authorization credentials.
          </p>
          <div className="border-t border-slate-800 pt-4 text-xs font-mono text-slate-500">
            SYSTEM RESOLUTION CODE: ERR_SECURITY_SUSPENSION
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedView;
