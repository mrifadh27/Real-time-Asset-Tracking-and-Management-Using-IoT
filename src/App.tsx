import { useMemo, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Sidebar } from '@/components/Sidebar';
import { useRealtimeDevices } from '@/hooks/useRealtimeDevices';
import { createSystemAlerts } from '@/services/deviceService';
import { AlertsPage } from '@/pages/AlertsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SettingsPage } from '@/pages/SettingsPage';
import type { ViewKey } from '@/types';

const App = () => {
  const [view, setView] = useState<ViewKey>('dashboard');
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const { devices, loading, error } = useRealtimeDevices();

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedId) ?? devices[0] ?? null,
    [devices, selectedId],
  );

  const alerts = useMemo(() => createSystemAlerts(devices), [devices]);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <Navbar view={view} onChange={setView} isConnected={!error && devices.length > 0} />
      <div className="grid min-h-0 flex-1 grid-cols-[320px_1fr]">
        <Sidebar
          devices={devices}
          loading={loading}
          error={error}
          selectedId={selectedDevice?.id}
          onSelect={setSelectedId}
        />
        <main className="min-h-0 overflow-auto bg-slate-950">
          {view === 'dashboard' && <DashboardPage devices={devices} selectedDevice={selectedDevice} error={error} />}
          {view === 'analytics' && <AnalyticsPage devices={devices} />}
          {view === 'alerts' && <AlertsPage alerts={alerts} />}
          {view === 'settings' && <SettingsPage error={error} />}
        </main>
      </div>
    </div>
  );
};

export default App;
