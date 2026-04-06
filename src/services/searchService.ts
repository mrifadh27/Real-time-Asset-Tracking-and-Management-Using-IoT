import { OpenStreetMapProvider } from 'leaflet-geosearch';
import type { PlaceResult } from '@/types';

const provider = new OpenStreetMapProvider();

export const searchService = {
  async search(query: string): Promise<PlaceResult[]> {
    if (query.trim().length < 3) return [];
    const results = await provider.search({ query });

    return results.slice(0, 6).map((item) => ({
      label: item.label,
      lat: Number(item.y),
      lng: Number(item.x),
    }));
  },

  async reverse(lat: number, lng: number): Promise<string> {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lng));

    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

    const data = (await response.json()) as { display_name?: string };
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  },
};
