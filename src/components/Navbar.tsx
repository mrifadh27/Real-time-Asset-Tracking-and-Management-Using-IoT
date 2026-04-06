import type { ViewKey } from '@/types';

interface NavbarProps {
  view: ViewKey;
  onChange: (view: ViewKey) => void;
  isConnected: boolean;
}

const tabs: { key: ViewKey; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'alerts', label: 'Alerts' },
  { key: 'settings', label: 'Settings' },
];

export const Navbar = ({ view, onChange, isConnected }: NavbarProps) => (
  <header className="border-b border-border bg-slate-900/80 px-5 py-3 backdrop-blur">
    <div className="flex items-center gap-3">
      <h1 className="text-xl font-bold text-cyan-300">NexTrack Live</h1>
      <span className="text-xs text-slate-400">ESP32 + SIM808 + MPU6050 Realtime Control Center</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${isConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
        {isConnected ? 'Firebase Connected' : 'Connection Required'}
      </span>
      <nav className="ml-auto flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`rounded-md px-3 py-2 text-sm transition ${view === tab.key ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  </header>
);
