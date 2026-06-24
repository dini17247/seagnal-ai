import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  title = 'No Records Found', 
  description = 'No corresponding maritime traces met the specified query filters.' 
}) => {
  return (
    <div className="w-full h-48 border border-dashed border-slate-800 rounded-xl flex flex-col items-center justify-center text-center p-6 text-slate-400 font-sans">
      <div className="text-xl mb-2">🔍</div>
      <h4 className="text-sm font-medium text-slate-350">{title}</h4>
      <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
};

export default EmptyState;
