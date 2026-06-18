import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export default function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      <AnimatePresence>
        {toasts.map((toast) => {
          let icon = <Info className="h-5 w-5 text-blue-500" />;
          let bg = "bg-white/95 dark:bg-slate-900/95 border-blue-200/50 dark:border-blue-900/30";
          
          if (toast.type === "success") {
            icon = <CheckCircle className="h-5 w-5 text-emerald-500" />;
            bg = "bg-white/95 dark:bg-slate-900/95 border-emerald-200/50 dark:border-emerald-900/30";
          } else if (toast.type === "error") {
            icon = <AlertCircle className="h-5 w-5 text-rose-500" />;
            bg = "bg-white/95 dark:bg-slate-900/95 border-rose-200/50 dark:border-rose-900/30";
          } else if (toast.type === "warning") {
            icon = <AlertCircle className="h-5 w-5 text-amber-500" />;
            bg = "bg-white/95 dark:bg-slate-900/95 border-amber-200/50 dark:border-amber-900/30";
          }

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.85, transition: { duration: 0.15 } }}
              className={`pointer-events-auto flex items-center justify-between p-4 rounded-2xl border shadow-lg backdrop-blur-md ${bg} transition-colors duration-200`}
            >
              <div className="flex items-center gap-3">
                {icon}
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                  {toast.message}
                </span>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
