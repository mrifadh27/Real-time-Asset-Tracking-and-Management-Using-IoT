import { onValue, ref } from 'firebase/database';
import type { Device } from '@/types';
import { database, isFirebaseConfigured } from './firebase';

const toDevice = (id: string, raw: Record<string, unknown>): Device => ({
  id,
  name: String(raw.name ?? `Device ${id}`),
  lat: Number(raw.lat ?? 0),
  lng: Number(raw.lng ?? 0),
  speed: Number(raw.speed ?? 0),
  heading: Number(raw.heading ?? 0),
  altitude: Number(raw.altitude ?? 0),
  updatedAt: Number(raw.updatedAt ?? Date.now()),
  status: 'online',
});

export const gpsService = {
  subscribe(onData: (devices: Device[]) => void): () => void {
    if (!isFirebaseConfigured || !database) {
      onData([]);
      return () => undefined;
    }

    const assetsRef = ref(database, '/assets');
    const unsubscribe = onValue(assetsRef, (snapshot) => {
      const payload = (snapshot.val() as Record<string, Record<string, unknown>> | null) ?? {};
      const devices = Object.entries(payload).map(([id, raw]) => toDevice(id, raw));
      onData(devices);
    });

    return unsubscribe;
  },
};
