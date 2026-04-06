import type { Device } from '@/types';

const base: Device[] = [
  { id: 'asset-01', name: 'Truck 01', lat: 7.2906, lng: 80.6337, speed: 48, heading: 122, altitude: 520, status: 'online', updatedAt: Date.now() },
  { id: 'asset-02', name: 'Container 12', lat: 7.2711, lng: 80.6219, speed: 22, heading: 90, altitude: 515, status: 'idle', updatedAt: Date.now() },
  { id: 'asset-03', name: 'Forklift A', lat: 7.3072, lng: 80.6404, speed: 4, heading: 250, altitude: 522, status: 'online', updatedAt: Date.now() },
];

export const mockDataService = {
  getDevices(): Device[] {
    return base.map((item) => ({
      ...item,
      lat: item.lat + (Math.random() - 0.5) * 0.002,
      lng: item.lng + (Math.random() - 0.5) * 0.002,
      speed: Math.max(0, item.speed + (Math.random() - 0.5) * 5),
      updatedAt: Date.now(),
    }));
  },
};
