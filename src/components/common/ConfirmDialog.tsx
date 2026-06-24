import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'CONFIRM',
  cancelLabel = 'CANCEL',
  onConfirm,
  onCancel,
  isDanger = false
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl"
        >
          <h3 className="text-sm font-semibold text-slate-100 uppercase font-mono tracking-wider flex items-center gap-2">
            {isDanger ? <span className="text-red-550">🚨</span> : <span className="text-cyan-550">ℹ️</span>}
            {title}
          </h3>
          <p className="text-xs text-slate-350 leading-relaxed mt-3 mb-6">
            {message}
          </p>
          <div className="flex justify-end gap-3">
            <button 
              onClick={onCancel}
              className="px-4 py-2 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-300 rounded-lg text-xs font-mono transition-colors min-h-[44px]"
            >
              {cancelLabel}
            </button>
            <button 
              onClick={onConfirm}
              className={`px-4 py-2 text-xs font-mono font-semibold rounded-lg transition-colors min-h-[44px] ${
                isDanger 
                  ? 'bg-red-900 hover:bg-red-800 border border-red-600 text-red-100' 
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmDialog;
