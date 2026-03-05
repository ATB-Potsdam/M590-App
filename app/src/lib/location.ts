import {Capacitor} from "@capacitor/core";
import {Geolocation} from "@capacitor/geolocation";

export type LatLon = {lat: number; lon: number;};

export const getCurrentLatLon = (): Promise<LatLon> => {
    // On native: Capacitor plugin; on web, falls back to W3C API.
    if (Capacitor.getPlatform() === "web" && "geolocation" in navigator) {
        return new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, {
                enableHighAccuracy: true,
                timeout: 10_000,
                maximumAge: 0,
            })
        )
            .then(pos => ({lat: pos.coords.latitude, lon: pos.coords.longitude}));
    }
    return Geolocation.requestPermissions()
        .then(
            () => Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            })
                .then(pos => ({lat: pos.coords.latitude, lon: pos.coords.longitude}))
        );
};
