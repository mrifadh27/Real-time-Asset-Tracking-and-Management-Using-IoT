import { AlertsPanel } from '@/components/AlertsPanel';
import type { AlertItem } from '@/types';

export const AlertsPage = ({ alerts }: { alerts: AlertItem[] }) => (
  <section className="p-4">
    <h2 className="mb-3 text-lg font-semibold">System Alerts</h2>
    <AlertsPanel alerts={alerts} />
  </section>
);
