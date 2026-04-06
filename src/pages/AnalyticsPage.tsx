import { useMemo } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Device } from '@/types';

export const AnalyticsPage = ({ devices }: { devices: Device[] }) => {
  const data = useMemo(
    () =>
      devices.map((device) => ({
        name: device.name,
        speed: Number(device.speed.toFixed(1)),
      })),
    [devices],
  );

  return (
    <section className="h-full p-4">
      <div className="h-full rounded-md border border-border bg-slate-900 p-4">
        <h2 className="mb-4 text-lg font-semibold">Speed Distribution (Live)</h2>
        <div className="h-[420px]">
          <ResponsiveContainer>
            <BarChart data={data}>
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Bar dataKey="speed" fill="#22d3ee" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
