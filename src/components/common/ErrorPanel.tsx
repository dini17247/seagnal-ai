import React from 'react';

interface ErrorPanelProps {
  message?: string;
  onRetry?: () => void;
  title?: string;
}

export const ErrorPanel: React.FC<ErrorPanelProps> = ({ 
  message = 'Request failed due to a missing response from server gateway.', 
  onRetry,
  title = 'OPERATIONAL OVERFLOW' 
}) => {
  return (
    <div className="w-full bg-red-950/20 border border-red-500/25 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm my-4">
      <div className="flex items-start gap-3">
        <span className="text-red-500 text-2xl mt-0.5">⚠️</span>
        <div>
          <h4 className="text-sm font-semibold text-red-400 tracking-wide uppercase font-mono">{title}</h4>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
      {onRetry && (
        <button 
          onClick={onRetry} 
          className="px-4 py-2 bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 hover:border-red-500/50 text-red-200 rounded-lg text-xs font-mono transition-colors focus:ring-2 focus:ring-red-500 max-h-11 min-h-[44px]"
        >
          RETRY TRANSACTION
        </button>
      )}
    </div>
  );
};

export default ErrorPanel;
