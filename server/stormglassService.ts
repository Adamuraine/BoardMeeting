import type { InsertSurfReport, Location } from "@shared/schema";

const STORMGLASS_API_KEY = process.env.STORMGLASS_API_KEY;
const STORMGLASS_BASE_URL = "https://api.stormglass.io/v2";

interface StormglassWaveData {
  time: string;
  waveHeight?: { [source: string]: number };
  wavePeriod?: { [source: string]: number };
  waveDirection?: { [source: string]: number };
  windSpeed?: { [source: string]: number };
  windDirection?: { [source: string]: number };
  swellHeight?: { [source: string]: number };
  swellPeriod?: { [source: string]: number };
  swellDirection?: { [source: string]: number };
}

interface StormglassResponse {
  hours: StormglassWaveData[];
  meta: {
    cost: number;
    dailyQuota: number;
    requestCount: number;
  };
}

function getWindDirection(degrees: number): string {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

function getBestSourceValue(data: { [source: string]: number } | undefined): number | null {
  if (!data) return null;
  const sources = ["noaa", "sg", "icon", "meteo"];
  for (const source of sources) {
    if (data[source] !== undefined) return data[source];
  }
  const values = Object.values(data);
  return values.length > 0 ? values[0] : null;
}

function metersToFeet(meters: number): number {
  return Math.round(meters * 3.28);
}

function calculateRating(waveHeightFeet: number, swellPeriod: number): string {
  if (waveHeightFeet >= 6 && swellPeriod >= 12) return "epic";
  if (waveHeightFeet >= 4 && swellPeriod >= 10) return "good";
  if (waveHeightFeet >= 2 && swellPeriod >= 7) return "fair";
  return "poor";
}

export async function fetchStormglassForecast(
  lat: number,
  lng: number,
  days: number = 14
): Promise<Partial<InsertSurfReport>[]> {
  if (!STORMGLASS_API_KEY) {
    throw new Error("STORMGLASS_API_KEY not configured");
  }

  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);

  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    params: "waveHeight,wavePeriod,waveDirection,windSpeed,windDirection,swellHeight,swellPeriod,swellDirection",
    start: start.toISOString(),
    end: end.toISOString(),
  });

  const response = await fetch(`${STORMGLASS_BASE_URL}/weather/point?${params}`, {
    headers: {
      Authorization: STORMGLASS_API_KEY,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Stormglass API error: ${response.status} - ${errorText}`);
  }

  const data: StormglassResponse = await response.json();

  const dailyData = new Map<string, {
    waveHeights: number[];
    swellPeriods: number[];
    swellDirections: number[];
    windSpeeds: number[];
    windDirections: number[];
  }>();

  for (const hour of data.hours) {
    const date = hour.time.split("T")[0];
    
    if (!dailyData.has(date)) {
      dailyData.set(date, {
        waveHeights: [],
        swellPeriods: [],
        swellDirections: [],
        windSpeeds: [],
        windDirections: [],
      });
    }

    const day = dailyData.get(date)!;
    
    const waveHeight = getBestSourceValue(hour.swellHeight) ?? getBestSourceValue(hour.waveHeight);
    const swellPeriod = getBestSourceValue(hour.swellPeriod) ?? getBestSourceValue(hour.wavePeriod);
    const swellDirection = getBestSourceValue(hour.swellDirection) ?? getBestSourceValue(hour.waveDirection);
    const windSpeed = getBestSourceValue(hour.windSpeed);
    const windDirection = getBestSourceValue(hour.windDirection);

    if (waveHeight !== null) day.waveHeights.push(waveHeight);
    if (swellPeriod !== null) day.swellPeriods.push(swellPeriod);
    if (swellDirection !== null) day.swellDirections.push(swellDirection);
    if (windSpeed !== null) day.windSpeeds.push(windSpeed);
    if (windDirection !== null) day.windDirections.push(windDirection);
  }

  const reports: Partial<InsertSurfReport>[] = [];

  const entries = Array.from(dailyData.entries());
  for (const [date, day] of entries) {
    const avgWaveHeight = day.waveHeights.length > 0 
      ? day.waveHeights.reduce((a: number, b: number) => a + b, 0) / day.waveHeights.length 
      : 0;
    const maxWaveHeight = day.waveHeights.length > 0 
      ? Math.max(...day.waveHeights) 
      : 0;
    const avgSwellPeriod = day.swellPeriods.length > 0 
      ? day.swellPeriods.reduce((a: number, b: number) => a + b, 0) / day.swellPeriods.length 
      : 0;
    const avgSwellDirection = day.swellDirections.length > 0 
      ? day.swellDirections.reduce((a: number, b: number) => a + b, 0) / day.swellDirections.length 
      : 0;
    const avgWindSpeed = day.windSpeeds.length > 0 
      ? day.windSpeeds.reduce((a: number, b: number) => a + b, 0) / day.windSpeeds.length 
      : 0;
    const avgWindDirection = day.windDirections.length > 0 
      ? day.windDirections.reduce((a: number, b: number) => a + b, 0) / day.windDirections.length 
      : 0;

    const waveHeightMinFt = metersToFeet(avgWaveHeight);
    const waveHeightMaxFt = metersToFeet(maxWaveHeight);

    reports.push({
      date,
      waveHeightMin: Math.max(1, waveHeightMinFt),
      waveHeightMax: Math.max(1, waveHeightMaxFt),
      rating: calculateRating(waveHeightMaxFt, avgSwellPeriod),
      windDirection: getWindDirection(avgWindDirection),
      windSpeed: Math.round(avgWindSpeed * 1.944), // m/s to knots
      swellPeriodSec: Math.round(avgSwellPeriod),
      swellDirection: getWindDirection(avgSwellDirection),
      source: "stormglass",
    });
  }

  return reports;
}

export async function getApiUsage(): Promise<{ requestCount: number; dailyQuota: number } | null> {
  if (!STORMGLASS_API_KEY) return null;
  
  try {
    const response = await fetch(`${STORMGLASS_BASE_URL}/weather/point?lat=0&lng=0&params=waveHeight&start=${new Date().toISOString()}&end=${new Date().toISOString()}`, {
      headers: { Authorization: STORMGLASS_API_KEY },
    });
    const data: StormglassResponse = await response.json();
    return {
      requestCount: data.meta?.requestCount || 0,
      dailyQuota: data.meta?.dailyQuota || 50,
    };
  } catch {
    return null;
  }
}
