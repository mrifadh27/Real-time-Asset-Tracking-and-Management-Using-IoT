interface SettingsPageProps {
  error: string | null;
}

export const SettingsPage = ({ error }: SettingsPageProps) => (
  <section className="p-4">
    <div className="max-w-3xl rounded-md border border-border bg-slate-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">Production Integration Settings</h2>
      <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
        <li>Realtime source path: <code>/assets/&lt;device_id&gt;</code> in Firebase Realtime Database.</li>
        <li>No fake or demo dataset is used in this build.</li>
        <li>Firmware must send numeric <code>lat</code>, <code>lng</code>, <code>speed</code>, and <code>heading</code> fields.</li>
      </ul>
      {error ? (
        <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>
      ) : (
        <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-300">Firebase configuration is loaded and ready.</p>
      )}
    </div>
  </section>
);
