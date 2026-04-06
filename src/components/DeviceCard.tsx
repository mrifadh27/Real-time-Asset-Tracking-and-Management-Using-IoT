import type { Device } from '@/types';
import { formatTime } from '@/utils/format';

interface DeviceCardProps {
  device: Device;
  selected?: boolean;
  onSelect: () => void;
}

export const DeviceCard = ({ device, selected, onSelect }: DeviceCardProps) => (
  <button
    type="button"
    onClick={onSelect}
    className={`w-full rounded-md border p-3 text-left transition ${selected ? 'border-cyan-300 bg-cyan-500/10' : 'border-border bg-slate-800 hover:border-cyan-700'}`}
  >
    <div className="flex items-center justify-between">
      <div className="font-semibold text-slate-100">{device.name}</div>
      <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{device.status}</span>
    </div>
    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-400">
      <span>Speed: {device.speed.toFixed(1)} km/h</span>
      <span>Heading: {device.heading.toFixed(0)}°</span>
      <span>Lat: {device.lat.toFixed(5)}</span>
      <span>Lng: {device.lng.toFixed(5)}</span>
      <span className="col-span-2">Updated: {formatTime(device.updatedAt)}</span>
    </div>
  </button>
);
