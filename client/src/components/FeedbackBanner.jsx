import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';

const STYLE_BY_TYPE = {
  success: {
    icon: CheckCircle2,
    className:
      'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-200',
  },
  error: {
    icon: AlertCircle,
    className:
      'border-red-300 bg-red-50 text-red-800 dark:border-red-700/60 dark:bg-red-950/30 dark:text-red-200',
  },
  warning: {
    icon: TriangleAlert,
    className:
      'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200',
  },
  info: {
    icon: Info,
    className:
      'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-700/60 dark:bg-sky-950/30 dark:text-sky-200',
  },
};

export default function FeedbackBanner({ message, type = 'info', className = '' }) {
  if (!message) return null;

  const preset = STYLE_BY_TYPE[type] || STYLE_BY_TYPE.info;
  const Icon = preset.icon;

  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${preset.className} ${className}`} role="status" aria-live="polite">
      <div className="flex items-start gap-2">
        <Icon size={16} className="mt-0.5 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}
