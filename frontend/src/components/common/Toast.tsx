import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration = 2200 }: Omit<ToastMessage, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);

      setToasts((prev) => {
        // Anti-Duplicate: jika notifikasi identik sedang aktif, jangan gandakan
        const isDuplicate = prev.some(
          (t) => t.type === type && t.title === title && t.message === message
        );
        if (isDuplicate) return prev;

        // Hard-cap: Batasi maksimal 2 notifikasi aktif bersamaan agar tidak spam ke bawah menutupi kiosk
        const next = [...prev, { id, type, title, message, duration }];
        return next.slice(-2);
      });

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Container on top-right: kompak max-w-sm agar tidak menutupi panel kontrol Kiosk */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const icons = {
              success: <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />,
              warning: <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />,
              error: <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />,
              info: <Info className="w-5 h-5 text-sky-400 flex-shrink-0" />,
            };

            const borderColors = {
              success: 'border-emerald-500/30 bg-emerald-950/80 backdrop-blur-md',
              warning: 'border-amber-500/30 bg-amber-950/80 backdrop-blur-md',
              error: 'border-rose-500/30 bg-rose-950/80 backdrop-blur-md',
              info: 'border-sky-500/30 bg-sky-950/80 backdrop-blur-md',
            };

            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: -15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.95 }}
                transition={{ duration: 0.18 }}
                className={`pointer-events-auto flex items-start gap-2.5 p-3 rounded-xl glass-panel-elevated border shadow-lg ${borderColors[toast.type]}`}
              >
                {icons[toast.type]}
                <div className="flex-1 pt-0.5 min-w-0">
                  {toast.title && (
                    <h5 className="text-xs font-bold text-white mb-0.5 truncate">{toast.title}</h5>
                  )}
                  <p className="text-[11px] text-slate-300 leading-snug line-clamp-2">{toast.message}</p>
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 active:scale-90 flex-shrink-0"
                  aria-label="Tutup"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast harus digunakan di dalam ToastProvider');
  }
  return context;
};
