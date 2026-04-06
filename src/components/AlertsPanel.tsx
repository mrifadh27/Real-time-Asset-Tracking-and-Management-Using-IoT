import type { AlertItem } from '@/types';
import { formatTime } from '@/utils/format';

interface AlertsPanelProps {
  alerts: AlertItem[];
}

export const AlertsPanel = ({ alerts }: AlertsPanelProps) => {
  if (alerts.length === 0) {
    return <div className="rounded-md border border-border bg-slate-800 p-4 text-sm text-slate-400">No active alerts.</div>;
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <article key={alert.id} className="rounded-md border border-border bg-slate-800 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-200">{alert.message}</h3>
              <p className="text-xs text-slate-400">Device: {alert.deviceId}</p>
            </div>
            <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-xs uppercase text-cyan-300">{alert.type}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{formatTime(alert.timestamp)}</p>
        </article>
      ))}
    </div>
  );
};
