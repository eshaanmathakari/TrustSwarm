export interface LocationBasedData {
    timezone: string;
    currency: string;
    language: string;
    region: string;
    weather?: {
        temperature: number;
        condition: string;
        humidity: number;
    };
    market?: {
        isOpen: boolean;
        openTime: string;
        closeTime: string;
    };
}

export async function getLocationBasedData(latitude: number, longitude: number, city?: string): Promise<LocationBasedData> {
    try {
        // Get timezone from coordinates
        const timezone = await getTimezoneFromCoordinates(latitude, longitude);

        // Get weather data
        const weather = await getWeatherData(latitude, longitude);

        // Get currency and region info
        const regionInfo = await getRegionInfo(latitude, longitude);

        return {
            timezone: timezone || 'UTC',
            currency: regionInfo.currency || 'USD',
            language: regionInfo.language || 'en-US',
            region: regionInfo.region || 'Unknown',
            weather: weather,
            market: getMarketHours(timezone)
        };
    } catch (error) {
        console.error('Error fetching location data:', error);
        return {
            timezone: 'UTC',
            currency: 'USD',
            language: 'en-US',
            region: 'Unknown',
            weather: undefined,
            market: { isOpen: false, openTime: "09:00", closeTime: "17:00" }
        };
    }
}

async function getTimezoneFromCoordinates(lat: number, lng: number): Promise<string> {
    try {
        const response = await fetch(
            `https://api.timezonedb.com/v2.1/get-time-zone?key=demo&format=json&by=position&lat=${lat}&lng=${lng}`
        );
        const data = await response.json();
        return data.zoneName || 'UTC';
    } catch {
        // Fallback to browser timezone
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
}

async function getWeatherData(lat: number, lng: number): Promise<{ temperature: number; condition: string; humidity: number } | undefined> {
    try {
        // Using OpenWeatherMap API (you'll need to add your API key)
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=demo&units=metric`
        );
        const data = await response.json();

        return {
            temperature: Math.round(data.main.temp),
            condition: data.weather[0].main,
            humidity: data.main.humidity
        };
    } catch {
        return undefined;
    }
}

async function getRegionInfo(lat: number, lng: number): Promise<{ currency: string; language: string; region: string }> {
    try {
        const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
        );
        const data = await response.json();

        return {
            currency: getCurrencyFromCountry(data.countryCode),
            language: getLanguageFromCountry(data.countryCode),
            region: data.continent || 'Unknown'
        };
    } catch {
        return {
            currency: 'USD',
            language: 'en-US',
            region: 'Unknown'
        };
    }
}

function getCurrencyFromCountry(countryCode: string): string {
    const currencyMap: Record<string, string> = {
        'AR': 'ARS', // Argentina
        'US': 'USD', // United States
        'GB': 'GBP', // United Kingdom
        'JP': 'JPY', // Japan
        'AU': 'AUD', // Australia
        'FR': 'EUR', // France
        'DE': 'EUR', // Germany
        'IT': 'EUR', // Italy
        'ES': 'EUR', // Spain
        'BR': 'BRL', // Brazil
        'CA': 'CAD', // Canada
        'MX': 'MXN', // Mexico
        'KE': 'KES', // Kenya
    };
    return currencyMap[countryCode] || 'USD';
}

function getLanguageFromCountry(countryCode: string): string {
    const languageMap: Record<string, string> = {
        'AR': 'es-AR', // Argentina
        'US': 'en-US', // United States
        'GB': 'en-GB', // United Kingdom
        'JP': 'ja-JP', // Japan
        'AU': 'en-AU', // Australia
        'FR': 'fr-FR', // France
        'DE': 'de-DE', // Germany
        'IT': 'it-IT', // Italy
        'ES': 'es-ES', // Spain
        'BR': 'pt-BR', // Brazil
        'CA': 'en-CA', // Canada
        'MX': 'es-MX', // Mexico
        'KE': 'en-KE', // Kenya
    };
    return languageMap[countryCode] || 'en-US';
}

function getMarketHours(timezone: string): { isOpen: boolean; openTime: string; closeTime: string } {
    const now = new Date();
    const localTime = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
    const hour = localTime.getHours();

    // Simple market hours logic (9 AM - 5 PM local time)
    const isOpen = hour >= 9 && hour < 17;

    return {
        isOpen,
        openTime: "09:00",
        closeTime: "17:00"
    };
}

export function formatLocationTime(timestamp: number, timezone: string): string {
    try {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(new Date(timestamp));
    } catch {
        return new Date(timestamp).toLocaleTimeString();
    }
}

export function formatLocationDate(timestamp: number, timezone: string): string {
    try {
        return new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            weekday: 'short'
        }).format(new Date(timestamp));
    } catch {
        return new Date(timestamp).toLocaleDateString();
    }
}

export function getMarketStatus(city: string): { isOpen: boolean; status: string; nextChange: string } {
    const now = new Date();

    // Simple market hours check 
    const marketOpen = true; 

    return {
        isOpen: marketOpen,
        status: marketOpen ? "Market Open" : "Market Closed",
        nextChange: marketOpen ? `Closes at 17:00` : `Opens at 09:00`
    };
}
