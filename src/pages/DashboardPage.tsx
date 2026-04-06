import { MapView } from '@/components/MapView';
import { formatTime } from '@/utils/format';
import type { Device } from '@/types';

interface DashboardPageProps {
  devices: Device[];
  selectedDevice?: Device | null;
  error: string | null;
}

export const DashboardPage = ({ devices, selectedDevice, error }: DashboardPageProps) => {
  const onlineCount = devices.filter((device) => device.status === 'online').length;
  const idleCount = devices.filter((device) => device.status === 'idle').length;
  const offlineCount = devices.filter((device) => device.status === 'offline').length;

  return (
    <section className="grid h-full grid-cols-1 lg:grid-cols-[1fr_360px]">
      <MapView devices={devices} selectedDevice={selectedDevice} />
      <aside className="space-y-4 border-l border-border bg-slate-900 p-4">
        <h2 className="text-lg font-semibold text-slate-100">Live Operations Panel</h2>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-300">Online<br />{onlineCount}</div>
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-amber-300">Idle<br />{idleCount}</div>
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300">Offline<br />{offlineCount}</div>
        </div>

        {error && <p className="rounded-md border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}

        {selectedDevice ? (
          <div className="rounded-md border border-border bg-slate-800 p-3 text-sm text-slate-300">
            <p className="font-semibold text-slate-100">{selectedDevice.name}</p>
            <p className="mt-2">Latitude: {selectedDevice.lat.toFixed(6)}</p>
            <p>Longitude: {selectedDevice.lng.toFixed(6)}</p>
            <p>Speed: {selectedDevice.speed.toFixed(1)} km/h</p>
            <p>Heading: {selectedDevice.heading.toFixed(0)}°</p>
            <p>Altitude: {selectedDevice.altitude.toFixed(1)} m</p>
            <p>Status: {selectedDevice.status}</p>
            <p className="mt-1 text-xs text-slate-400">Updated: {formatTime(selectedDevice.updatedAt)}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Waiting for live telemetry from Firebase /assets path.</p>
        )}
      </aside>
    </section>
  );
};
