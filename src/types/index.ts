export type DeviceStatus = 'online' | 'offline' | 'idle';

export interface Device {
  id: string;
  name: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  altitude: number;
  updatedAt: number;
  status: DeviceStatus;
}

export interface AlertItem {
  id: string;
  deviceId: string;
  message: string;
  type: 'offline' | 'geofence' | 'speed' | 'sync';
  timestamp: number;
}

export interface PlaceResult {
  label: string;
  lat: number;
  lng: number;
}

export type ViewKey = 'dashboard' | 'analytics' | 'alerts' | 'settings';
