import { useEffect, useMemo, useState } from 'react';
import type { Device } from '@/types';
import { gpsService } from '@/services/gpsService';
import { firebaseConfigError } from '@/services/firebase';

export const useRealtimeDevices = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(firebaseConfigError);

  useEffect(() => {
    if (firebaseConfigError) {
      setLoading(false);
      return () => undefined;
    }

    const unsubscribe = gpsService.subscribe({
      onData: (payload) => {
        setDevices(payload);
        setError(null);
        setLoading(false);
      },
      onError: (message) => {
        setError(`Realtime subscription failed: ${message}`);
        setLoading(false);
      },
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const selected = useMemo(() => devices[0] ?? null, [devices]);

  return { devices, selected, loading, error };
};
