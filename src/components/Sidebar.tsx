import type { Device } from '@/types';
import { DeviceList } from './DeviceList';

interface SidebarProps {
  devices: Device[];
  loading: boolean;
  selectedId?: string;
  onSelect: (id: string) => void;
}

export const Sidebar = ({ devices, loading, selectedId, onSelect }: SidebarProps) => (
  <aside className="h-full w-80 border-r border-border bg-slate-900">
    <div className="border-b border-border px-4 py-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Assets</h2>
      <p className="text-xs text-slate-500">Live telemetry + status overview</p>
    </div>
    <DeviceList devices={devices} loading={loading} selectedId={selectedId} onSelect={onSelect} />
  </aside>
);
