import { MapView } from '@/components/MapView';
import type { Device } from '@/types';

interface DashboardPageProps {
  devices: Device[];
  selectedDevice?: Device | null;
}

export const DashboardPage = ({ devices, selectedDevice }: DashboardPageProps) => (
  <section className="grid h-full grid-cols-1 lg:grid-cols-[1fr_320px]">
    <MapView devices={devices} selectedDevice={selectedDevice} />
    <aside className="space-y-3 border-l border-border bg-slate-900 p-4">
      <h2 className="text-lg font-semibold text-slate-100">Live Device Snapshot</h2>
      {selectedDevice ? (
        <div className="rounded-md border border-border bg-slate-800 p-3 text-sm text-slate-300">
          <p className="font-semibold text-slate-100">{selectedDevice.name}</p>
          <p>Latitude: {selectedDevice.lat.toFixed(6)}</p>
          <p>Longitude: {selectedDevice.lng.toFixed(6)}</p>
          <p>Speed: {selectedDevice.speed.toFixed(1)} km/h</p>
          <p>Heading: {selectedDevice.heading.toFixed(0)}°</p>
          <p>Altitude: {selectedDevice.altitude.toFixed(0)} m</p>
        </div>
      ) : (
        <p className="text-sm text-slate-400">Select a device to inspect telemetry.</p>
      )}
    </aside>
  </section>
);
