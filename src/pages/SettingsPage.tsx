export const SettingsPage = () => (
  <section className="p-4">
    <div className="max-w-2xl rounded-md border border-border bg-slate-900 p-4">
      <h2 className="mb-3 text-lg font-semibold">Integration Settings</h2>
      <ul className="list-disc space-y-2 pl-5 text-sm text-slate-300">
        <li>Firebase ready: set environment variables in a <code>.env</code> file.</li>
        <li>Service layer prepared for GPS stream and device updates.</li>
        <li>Map search uses OpenStreetMap and reverse geocoding.</li>
      </ul>
    </div>
  </section>
);
