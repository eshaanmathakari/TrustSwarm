"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TVNoise from "@/components/ui/tv-noise";
import { useLocation } from "@/hooks/use-location";
import { formatLocationTime, formatLocationDate } from "@/lib/location-service";
import Image from "next/image";

export default function Widget() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { location, loading, error } = useLocation();
  const locationData = location?.locationData;

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    if (locationData?.timezone) {
      return formatLocationTime(date.getTime(), locationData.timezone);
    }
    return date.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    if (locationData?.timezone) {
      const formattedDate = formatLocationDate(date.getTime(), locationData.timezone);
      const [dayOfWeek, month, day, year] = formattedDate.split(', ');
      return {
        dayOfWeek: dayOfWeek || date.toLocaleDateString("en-US", { weekday: "long" }),
        restOfDate: `${month} ${day}, ${year}` || date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
      };
    }

    const dayOfWeek = date.toLocaleDateString("en-US", {
      weekday: "long",
    });
    const restOfDate = date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    return { dayOfWeek, restOfDate };
  };

  const dateInfo = formatDate(currentTime);

  // Get real location info
  const displayLocation = location?.city && location?.country
    ? `${location.city.toUpperCase()}, ${location.country.toUpperCase()}`
    : 'LOCATION UNAVAILABLE';

  const displayTemperature = locationData?.weather?.temperature
    ? `${locationData.weather.temperature}°C`
    : '--°C';

  const displayTimezone = locationData?.timezone
    ? locationData.timezone.split('/')[1] || 'UTC'
    : 'UTC';

  return (
    <Card className="w-full aspect-[2] relative overflow-hidden">
      <TVNoise opacity={0.3} intensity={0.2} speed={40} />
      <CardContent className="bg-accent/30 flex-1 flex flex-col justify-between text-sm font-medium uppercase relative z-20">
        <div className="flex justify-between items-center">
          <span className="opacity-50">{dateInfo.dayOfWeek}</span>
          <span>{dateInfo.restOfDate}</span>
        </div>
        <div className="text-center">
          <div className="text-5xl font-display" suppressHydrationWarning>
            {formatTime(currentTime)}
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="opacity-50">{displayTemperature}</span>
          <div className="flex flex-col items-center">
            <span>{displayLocation}</span>
            {location?.city && location?.country && (
              <span className="text-xs opacity-70 mt-1">
                {location.city.toUpperCase()}
              </span>
            )}
          </div>

          <Badge variant="secondary" className="bg-accent">
            {displayTimezone}
          </Badge>
        </div>

        <div className="absolute inset-0 -z-[1]">
          <Image
            src="/assets/pc_blueprint.gif"
            alt="logo"
            width={250}
            height={250}
            className="size-full object-contain"
          />
        </div>
      </CardContent>
    </Card>
  );
}
