import type { Device } from '@/types';
import { DeviceCard } from './DeviceCard';

interface DeviceListProps {
  devices: Device[];
  loading: boolean;
  selectedId?: string;
  onSelect: (id: string) => void;
}

export const DeviceList = ({ devices, loading, selectedId, onSelect }: DeviceListProps) => {
  if (loading) return <div className="p-4 text-sm text-slate-400">Loading telemetry stream...</div>;

  if (devices.length === 0) {
    return <div className="p-4 text-sm text-slate-400">No devices found. Check Firebase or fallback data.</div>;
  }

  return (
    <div className="space-y-2 overflow-y-auto p-3">
      {devices.map((device) => (
        <DeviceCard key={device.id} device={device} selected={selectedId === device.id} onSelect={() => onSelect(device.id)} />
      ))}
    </div>
  );
};
