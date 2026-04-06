import type { AlertItem, Device } from '@/types';

export const createSystemAlerts = (devices: Device[]): AlertItem[] => {
  const alerts: AlertItem[] = [];

  devices.forEach((device) => {
    if (device.speed > 90) {
      alerts.push({
        id: `${device.id}-speed-${device.updatedAt}`,
        deviceId: device.id,
        message: `${device.name} exceeded speed threshold (${device.speed.toFixed(1)} km/h).`,
        type: 'speed',
        timestamp: device.updatedAt,
      });
    }
  });

  return alerts;
};
