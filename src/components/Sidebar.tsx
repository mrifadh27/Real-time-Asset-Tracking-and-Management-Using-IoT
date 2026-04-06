import type { Device } from '@/types';
import { DeviceList } from './DeviceList';

interface SidebarProps {
  devices: Device[];
  loading: boolean;
  error: string | null;
  selectedId?: string;
  onSelect: (id: string) => void;
}

export const Sidebar = ({ devices, loading, error, selectedId, onSelect }: SidebarProps) => (
  <aside className="h-full w-80 border-r border-border bg-slate-900">
    <div className="border-b border-border px-4 py-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Assets</h2>
      <p className="text-xs text-slate-500">Realtime telemetry from Firebase</p>
      {error && <p className="mt-2 rounded bg-rose-500/10 px-2 py-1 text-xs text-rose-300">{error}</p>}
    </div>
    <DeviceList devices={devices} loading={loading} selectedId={selectedId} onSelect={onSelect} />
  </aside>
);
