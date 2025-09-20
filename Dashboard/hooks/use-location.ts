"use client";

import { useState, useEffect } from "react";
import { getLocationBasedData, type LocationBasedData } from "@/lib/location-service";

interface LocationData {
    latitude: number;
    longitude: number;
    city?: string;
    country?: string;
    timezone?: string;
    accuracy?: number;
    locationData?: LocationBasedData;
}

interface LocationState {
    location: LocationData | null;
    loading: boolean;
    error: string | null;
    permission: PermissionState | null;
}

export function useLocation() {
    const [state, setState] = useState<LocationState>({
        location: null,
        loading: false,
        error: null,
        permission: null,
    });

    const getCurrentLocation = async () => {
        if (!navigator.geolocation) {
            setState(prev => ({
                ...prev,
                error: "Geolocation is not supported by this browser",
                loading: false,
            }));
            return;
        }

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            // Check permission first
            if (navigator.permissions) {
                const permission = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
                setState(prev => ({ ...prev, permission: permission.state }));
            }

            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                    resolve,
                    reject,
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 300000, // 5 minutes
                    }
                );
            });

            const { latitude, longitude, accuracy } = position.coords;

            // Reverse geocoding to get city and country
            let city = "";
            let country = "";
            let timezone = "";

            try {
                const response = await fetch(
                    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
                );
                const data = await response.json();
                city = data.city || data.locality || "";
                country = data.countryName || "";
                timezone = data.localityInfo?.administrative?.[0]?.name || "";
            } catch (geocodeError) {
                console.warn("Reverse geocoding failed:", geocodeError);
            }

            // Fetch real location-based data
            const locationData = await getLocationBasedData(latitude, longitude, city);

            setState({
                location: {
                    latitude,
                    longitude,
                    city,
                    country,
                    timezone,
                    accuracy,
                    locationData,
                },
                loading: false,
                error: null,
                permission: state.permission,
            });
        } catch (error) {
            let errorMessage = "Failed to get location";

            if (error instanceof GeolocationPositionError) {
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Location access denied by user";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information unavailable";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Location request timed out";
                        break;
                }
            }

            setState(prev => ({
                ...prev,
                error: errorMessage,
                loading: false,
            }));
        }
    };

    const requestLocationPermission = async () => {
        try {
            await getCurrentLocation();
        } catch (error) {
            console.error("Error requesting location permission:", error);
        }
    };

    const clearLocation = () => {
        setState({
            location: null,
            loading: false,
            error: null,
            permission: null,
        });
    };

    // Auto-request location on mount if permission is granted
    useEffect(() => {
        if (navigator.permissions) {
            navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((permission) => {
                setState(prev => ({ ...prev, permission: permission.state }));
                if (permission.state === 'granted') {
                    getCurrentLocation();
                }
            });
        }
    }, []);

    return {
        ...state,
        getCurrentLocation,
        requestLocationPermission,
        clearLocation,
    };
}
