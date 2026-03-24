import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-react';

const STYLE_BY_TYPE = {
  success: {
    icon: CheckCircle2,
    className:
      'border-emerald-300/70 bg-emerald-50/80 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-950/25 dark:text-emerald-200',
  },
  error: {
    icon: AlertCircle,
    className:
      'border-red-300/70 bg-red-50/80 text-red-800 dark:border-red-700/40 dark:bg-red-950/25 dark:text-red-200',
  },
  warning: {
    icon: TriangleAlert,
    className:
      'border-amber-300/70 bg-amber-50/80 text-amber-800 dark:border-amber-700/40 dark:bg-amber-950/25 dark:text-amber-200',
  },
  info: {
    icon: Info,
    className:
      'border-sky-300/70 bg-sky-50/80 text-sky-800 dark:border-sky-700/40 dark:bg-sky-950/25 dark:text-sky-200',
  },
};

export default function FeedbackBanner({ message, type = 'info', className = '' }) {
  if (!message) return null;

  const preset = STYLE_BY_TYPE[type] || STYLE_BY_TYPE.info;
  const Icon = preset.icon;

  const isError = type === 'error';

  return (
    <div
      className={`animate-fade-up rounded-xl border px-3 py-2 text-sm ${preset.className} ${className}`}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div className="flex items-start gap-2">
        <Icon size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}
