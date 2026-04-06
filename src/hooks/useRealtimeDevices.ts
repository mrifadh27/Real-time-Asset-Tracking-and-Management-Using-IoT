import { useEffect, useMemo, useState } from 'react';
import type { Device } from '@/types';
import { gpsService } from '@/services/gpsService';
import { mockDataService } from '@/services/mockDataService';

export const useRealtimeDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = gpsService.subscribe((payload) => {
      if (payload.length === 0) {
        setDevices(mockDataService.getDevices());
      } else {
        setDevices(payload);
      }
      setLoading(false);
    });

    const interval = window.setInterval(() => {
      setDevices((prev) => (prev.length > 0 ? mockDataService.getDevices().map((d, i) => ({ ...d, id: prev[i]?.id ?? d.id })) : prev));
    }, 6000);

    return () => {
      unsubscribe();
      window.clearInterval(interval);
    };
  }, []);

  const selected = useMemo(() => devices[0] ?? null, [devices]);

  return { devices, selected, loading };
};
