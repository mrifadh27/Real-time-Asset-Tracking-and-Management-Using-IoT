import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Device, PlaceResult } from '@/types';
import { useDebounce } from '@/hooks/useDebounce';
import { searchService } from '@/services/searchService';
import 'leaflet/dist/leaflet.css';

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const FlyTo = ({ selected }: { selected?: PlaceResult | null }) => {
  const map = useMap();

  useEffect(() => {
    if (selected) map.flyTo([selected.lat, selected.lng], 15, { duration: 0.8 });
  }, [map, selected]);

  return null;
};

interface MapViewProps {
  devices: Device[];
  selectedDevice?: Device | null;
}

export const MapView = ({ devices, selectedDevice }: MapViewProps) => {
  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [reverseLabel, setReverseLabel] = useState('');
  const debouncedQuery = useDebounce(query, 350);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setSearchLoading(true);
      const results = await searchService.search(debouncedQuery);
      if (!cancelled) {
        setSuggestions(results);
        setSearchLoading(false);
      }
    };

    if (debouncedQuery.length >= 3) {
      void run();
    } else {
      setSuggestions([]);
      setSearchLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  useEffect(() => {
    if (!selectedPlace) return;
    void searchService.reverse(selectedPlace.lat, selectedPlace.lng).then(setReverseLabel);
  }, [selectedPlace]);

  const center = useMemo<[number, number]>(() => {
    if (selectedDevice) return [selectedDevice.lat, selectedDevice.lng];
    return [7.2906, 80.6337];
  }, [selectedDevice]);

  return (
    <div className="relative h-full min-h-[500px]">
      <div className="absolute left-3 top-3 z-[1000] w-[340px] rounded-md border border-border bg-slate-900/95 p-2 backdrop-blur">
        <input
          type="text"
          placeholder="Search location (autocomplete)…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full rounded border border-border bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
        />
        {searchLoading && <p className="mt-1 text-xs text-slate-400">Searching places...</p>}
        {suggestions.length > 0 && (
          <ul className="mt-2 max-h-56 overflow-y-auto rounded border border-border bg-slate-800">
            {suggestions.map((item) => (
              <li key={`${item.lat}-${item.lng}`}>
                <button
                  type="button"
                  className="w-full border-b border-border px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-700"
                  onClick={() => {
                    setSelectedPlace(item);
                    setQuery(item.label);
                    setSuggestions([]);
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedPlace && (
          <p className="mt-2 text-xs text-slate-400">Reverse geocode: <span className="text-slate-200">{reverseLabel || 'Resolving...'}</span></p>
        )}
      </div>

      <MapContainer center={center} zoom={13} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {devices.map((device) => (
          <Marker key={device.id} position={[device.lat, device.lng]} icon={markerIcon}>
            <Popup>
              <strong>{device.name}</strong>
              <br />
              Speed: {device.speed.toFixed(1)} km/h
            </Popup>
          </Marker>
        ))}

        {selectedPlace && (
          <Marker position={[selectedPlace.lat, selectedPlace.lng]} icon={markerIcon}>
            <Popup>{selectedPlace.label}</Popup>
          </Marker>
        )}

        <FlyTo selected={selectedPlace ?? (selectedDevice ? { label: selectedDevice.name, lat: selectedDevice.lat, lng: selectedDevice.lng } : null)} />
      </MapContainer>
    </div>
  );
};
