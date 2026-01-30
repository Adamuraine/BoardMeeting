interface SpitcastSpot {
  _id: number;
  spot_id_char: string;
  spot_name: string;
  county_id: number;
  coordinates: [number, number];
  street_address?: string;
}

interface SpitcastForecast {
  hour: string;
  date: string;
  day: string;
  size: number;
  size_ft: number;
  shape: string;
  shape_full: string;
}

let cachedSpots: SpitcastSpot[] | null = null;
let spotsCacheTime: number = 0;
const SPOTS_CACHE_DURATION = 24 * 60 * 60 * 1000;

export async function getSpitcastSpots(): Promise<SpitcastSpot[]> {
  if (cachedSpots && Date.now() - spotsCacheTime < SPOTS_CACHE_DURATION) {
    return cachedSpots;
  }

  try {
    const response = await fetch('https://api.spitcast.com/api/spot');
    if (!response.ok) {
      throw new Error(`Spitcast API error: ${response.status}`);
    }
    cachedSpots = await response.json();
    spotsCacheTime = Date.now();
    return cachedSpots!;
  } catch (error) {
    console.error('Error fetching Spitcast spots:', error);
    return [];
  }
}

export async function findSpitcastSpotByCoords(lat: number, lng: number): Promise<SpitcastSpot | null> {
  const spots = await getSpitcastSpots();
  
  let closestSpot: SpitcastSpot | null = null;
  let minDistance = Infinity;

  for (const spot of spots) {
    const spotLng = spot.coordinates[0];
    const spotLat = spot.coordinates[1];
    const latDiff = Math.abs(spotLat - lat);
    const lngDiff = Math.abs(spotLng - lng);
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);

    if (distance < 0.1 && distance < minDistance) {
      minDistance = distance;
      closestSpot = spot;
    }
  }

  return closestSpot;
}

export async function findSpitcastSpotByName(name: string): Promise<SpitcastSpot | null> {
  const spots = await getSpitcastSpots();
  const normalizedName = name.toLowerCase().trim();
  
  for (const spot of spots) {
    const spotName = spot.spot_name.toLowerCase();
    
    if (spotName === normalizedName) {
      return spot;
    }
  }

  for (const spot of spots) {
    const spotName = spot.spot_name.toLowerCase();
    
    if (spotName.startsWith(normalizedName) || spotName.includes(normalizedName + ' ')) {
      return spot;
    }
  }

  const keyWords = normalizedName.split(/[\s,]+/).filter(w => w.length > 2);
  
  for (const spot of spots) {
    const spotName = spot.spot_name.toLowerCase();
    
    for (const word of keyWords) {
      if (word.length >= 4 && spotName.startsWith(word)) {
        return spot;
      }
    }
  }

  let bestMatch: SpitcastSpot | null = null;
  let bestScore = 0;

  for (const spot of spots) {
    const spotName = spot.spot_name.toLowerCase();
    
    for (const word of keyWords) {
      if (word.length >= 5 && spotName.includes(word)) {
        const score = word.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = spot;
        }
      }
    }
  }

  return bestScore >= 5 ? bestMatch : null;
}

export async function getSpitcastForecast(spotId: number, days: number = 7): Promise<{
  date: string;
  waveHeightMin: number;
  waveHeightMax: number;
  rating: string;
  shape: string;
}[]> {
  const forecasts: { 
    date: string; 
    waveHeightMin: number; 
    waveHeightMax: number; 
    rating: string;
    shape: string;
  }[] = [];

  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    try {
      const response = await fetch(
        `https://api.spitcast.com/api/spot_forecast/${spotId}/${year}/${month}/${day}`
      );
      
      if (!response.ok) {
        console.log(`Spitcast forecast failed for spot ${spotId} on ${dateStr}: ${response.status}`);
        continue;
      }

      const hourlyData: any[] = await response.json();
      
      if (!hourlyData || !Array.isArray(hourlyData) || hourlyData.length === 0) {
        continue;
      }

      const sizes = hourlyData.map(h => h.size_ft || 0).filter(s => s > 0);
      if (sizes.length === 0) continue;
      
      const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
      const maxSize = Math.max(...sizes);
      const minSize = Math.min(...sizes);

      const shapes = hourlyData.map(h => h.shape).filter(s => s !== undefined && s !== null);
      const avgShapeValue = shapes.length > 0 
        ? shapes.reduce((sum, s) => {
            const val = typeof s === 'number' ? s : parseFloat(s);
            return sum + (isNaN(val) ? 0.5 : val);
          }, 0) / shapes.length
        : 0.5;

      let rating = 'poor';
      if (avgSize >= 5 && avgShapeValue >= 1.0) rating = 'epic';
      else if (avgSize >= 4 && avgShapeValue >= 0.8) rating = 'good';
      else if (avgSize >= 2 || avgShapeValue >= 0.5) rating = 'fair';

      let shapeDesc = 'Poor';
      if (avgShapeValue >= 1.2) shapeDesc = 'Epic';
      else if (avgShapeValue >= 0.8) shapeDesc = 'Good';
      else if (avgShapeValue >= 0.5) shapeDesc = 'Fair';

      forecasts.push({
        date: dateStr,
        waveHeightMin: Math.round(Math.max(1, minSize)),
        waveHeightMax: Math.round(Math.max(1, maxSize)),
        rating,
        shape: shapeDesc,
      });
    } catch (error) {
      console.error(`Error fetching Spitcast forecast for day ${i}:`, error);
    }
  }

  return forecasts;
}

export async function getSpitcastForecastByCoords(
  lat: number, 
  lng: number
): Promise<{
  date: string;
  waveHeightMin: number;
  waveHeightMax: number;
  rating: string;
  shape: string;
  spotName?: string;
}[] | null> {
  const spot = await findSpitcastSpotByCoords(lat, lng);
  
  if (!spot) {
    return null;
  }

  const forecasts = await getSpitcastForecast(spot._id);
  return forecasts.map(f => ({ ...f, spotName: spot.spot_name }));
}

export async function getSpitcastForecastByName(
  name: string
): Promise<{
  date: string;
  waveHeightMin: number;
  waveHeightMax: number;
  rating: string;
  shape: string;
  spotId?: number;
  spotName?: string;
}[] | null> {
  const spot = await findSpitcastSpotByName(name);
  
  if (!spot) {
    console.log(`No Spitcast spot found for name: ${name}`);
    return null;
  }

  console.log(`Found Spitcast spot for "${name}": ${spot.spot_name} (ID: ${spot._id})`);
  const forecasts = await getSpitcastForecast(spot._id);
  return forecasts.map(f => ({ 
    ...f, 
    spotId: spot._id, 
    spotName: spot.spot_name 
  }));
}
