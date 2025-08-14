// src/lib/location.ts
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

export type LatLon = { lat: number; lon: number };

export async function getCurrentLatLon(): Promise<LatLon> {
  // Request when needed
  await Geolocation.requestPermissions();

  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 10_000,
    maximumAge: 0,
  });
  return { lat: pos.coords.latitude, lon: pos.coords.longitude };
}

// Optional: web-only explicit fallback
export async function getCurrentLatLonWebFallback(): Promise<LatLon> {
  if (Capacitor.getPlatform() === 'web' && 'geolocation' in navigator) {
    const pos = await new Promise<GeolocationPosition>((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, {
        enableHighAccuracy: true,
        timeout: 10_000,
      })
    );
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  }
  return getCurrentLatLon();
}
