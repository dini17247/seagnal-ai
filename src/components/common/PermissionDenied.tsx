import React from 'react';

interface PermissionDeniedProps {
  requiredPermission?: string;
}

export const PermissionDenied: React.FC<PermissionDeniedProps> = ({ 
  requiredPermission 
}) => {
  return (
    <div className="w-full flex items-center justify-center py-16 px-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-xl p-8 text-center shadow-lg">
        <div className="w-14 h-14 bg-amber-950/20 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
          <span className="text-amber-500 text-2xl font-bold">🔒</span>
        </div>
        <h3 className="text-sm font-semibold text-slate-100 uppercase font-mono tracking-wider mb-2">
          AUTHORIZATION GRANTED ONLY TO KEY OFFICIALS
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          This operation is restricted from your currently assigned duty role. To audit alerts or modify alarm parameters, elevate permissions with the regional command desk.
        </p>
        {requiredPermission && (
          <div className="inline-block px-3 py-1 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-cyan-500/70">
            SECURE_ID: {requiredPermission}
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionDenied;
