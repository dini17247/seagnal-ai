import React from 'react';
import { motion } from 'motion/react';

interface LoadingPanelProps {
  message?: string;
  height?: string;
}

export const LoadingPanel: React.FC<LoadingPanelProps> = ({ 
  message = 'UPDATING MARITIME TELEMETRY...', 
  height = 'h-64' 
}) => {
  return (
    <div className={`w-full ${height} flex flex-col items-center justify-center text-slate-400 font-sans`}>
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
        className="w-10 h-10 border-2 border-cyan-500/80 border-t-transparent rounded-full shadow-[0_0_15px_rgba(6,182,212,0.2)] mb-3"
      />
      <div className="font-mono text-[10px] tracking-widest text-cyan-500/70 animate-pulse">
        {message}
      </div>
    </div>
  );
};

export default LoadingPanel;
