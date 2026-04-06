import { onValue, ref } from 'firebase/database';
import type { Device } from '@/types';
import { database } from './firebase';

const normalizeUpdatedAt = (raw: Record<string, unknown>) => {
  const value = Number(raw.updatedAt ?? raw.ts ?? raw.lastSeen ?? Date.now());
  return value > 1_000_000_000_000 ? value : Date.now();
};

const toDevice = (id: string, raw: Record<string, unknown>): Device => {
  const speed = Number(raw.speed ?? 0);
  const gpsValid = raw.gpsValid !== false;

  return {
    id,
    name: String(raw.name ?? `Device ${id}`),
    lat: Number(raw.lat ?? 0),
    lng: Number(raw.lng ?? 0),
    speed,
    heading: Number(raw.heading ?? 0),
    altitude: Number(raw.altitude ?? 0),
    updatedAt: normalizeUpdatedAt(raw),
    status: !gpsValid ? 'offline' : speed > 2 ? 'online' : 'idle',
  };
};

interface GpsSubscriptionHandlers {
  onData: (devices: Device[]) => void;
  onError: (message: string) => void;
}

export const gpsService = {
  subscribe({ onData, onError }: GpsSubscriptionHandlers): () => void {
    const assetsRef = ref(database, '/assets');

    return onValue(
      assetsRef,
      (snapshot) => {
        const payload = (snapshot.val() as Record<string, Record<string, unknown>> | null) ?? {};
        const devices = Object.entries(payload)
          .map(([id, raw]) => toDevice(id, raw))
          .filter((device) => Number.isFinite(device.lat) && Number.isFinite(device.lng));

        onData(devices);
      },
      (error) => {
        onError(error.message);
      },
    );
  },
};
