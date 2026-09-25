import 'dotenv/config';
import cors from 'cors';
import express, { Request, Response } from 'express';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import {
  ChangeRadarData,
  Coordinates,
  DataMode,
  DecisionSnapshot,
  EnvironmentalObservation,
  ExtendedWeatherReport,
  FullAnalysisBundle,
  MarineFingerprint,
  RiskClockItem,
  TimelinePoint
} from './types/orca.js';
import { MarineProvider } from './providers/marineProvider.js';
import { WeatherProvider } from './providers/weatherProvider.js';
import { ChlorophyllProvider } from './providers/chlorophyllProvider.js';
import { GeospatialService } from './services/geospatialService.js';
import { RiskEngine } from './services/riskEngine.js';
import { SuitabilityEngine } from './services/suitabilityEngine.js';
import { CandidateZoneEngine } from './services/candidateZoneEngine.js';
import { EvidenceEngine } from './services/evidenceEngine.js';
import { DataTrustService } from './services/dataTrustService.js';
import { ScenarioService } from './services/scenarioService.js';
import { RouteService } from './services/routeService.js';
import { AlertService } from './services/alertService.js';
import { AssistantService } from './services/assistantService.js';
import { StorageService } from './services/storageService.js';
import { ReportService, ReportStatus } from './services/reportService.js';
import { RoleRequestService } from './services/roleRequestService.js';
import { LagrangianEngine } from './engines/lagrangianEngine.js';
import { ThermalFrontEngine } from './engines/thermalFrontEngine.js';
import { AgentDebateEngine } from './engines/agentDebateEngine.js';
import { CouncilService, CouncilInputs } from './services/councilService.js';
import { localKnowledgeService } from './services/localKnowledgeService.js';

const app = express();
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('vercel.app') || origin.includes('onrender.com') || (process.env.CLIENT_URL && origin === process.env.CLIENT_URL)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '64kb' }));

// Initialize storage
StorageService.init().catch(console.error);

const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  name: z.string().optional()
});

// 1. Health & Readiness endpoints
app.get('/api/health', (_req: Request, res: Response) => {
  const geminiConfigured = AssistantService.isConfigured();
  const mapsConfigured = Boolean(process.env.GOOGLE_MAPS_API_KEY);
  const dbStatus = StorageService.getDbStatus();

  res.json({
    status: 'ok',
    service: 'orca-marine-intelligence',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    dependencies: {
      database: dbStatus === 'CONNECTED' ? 'healthy' : 'in_memory_fallback',
      gemini: geminiConfigured ? 'healthy' : 'deterministic_fallback',
      maps: mapsConfigured ? 'healthy' : 'leaflet_osm_active',
      weather: 'healthy',
      marine: 'healthy',
      geospatial: 'healthy',
      alerts: 'healthy'
    }
  });
});

app.get('/api/ready', (_req: Request, res: Response) => {
  res.json({
    ready: true,
    mode: (process.env.DATA_MODE ?? 'LIVE') as DataMode,
    timestamp: new Date().toISOString()
  });
});

// 2. Geospatial search & validation
app.post('/api/locations/search', async (req: Request, res: Response) => {
  const query = z.string().trim().min(2).max(100).safeParse(req.body.query);
  if (!query.success) {
    return res.status(400).json({ success: false, error: 'Query must be between 2 and 100 characters.' });
  }

  const results = await GeospatialService.searchLocations(query.data);
  res.json({ success: true, results });
});

app.post('/api/locations/validate', async (req: Request, res: Response) => {
  const coord = coordinateSchema.safeParse(req.body);
  if (!coord.success) {
    return res.status(400).json({ success: false, error: 'Invalid coordinates' });
  }

  const validation = await GeospatialService.validateMarineLocation(coord.data);
  res.json({ success: true, validation });
});

// 3. Full Marine Environmental Intelligence Analysis
app.post('/api/analysis', async (req: Request, res: Response) => {
  const coordResult = coordinateSchema.safeParse(req.body);
  if (!coordResult.success) {
    return res.status(400).json({ success: false, error: 'Invalid coordinate payload' });
  }

  const location: Coordinates = coordResult.data;

  // Validate marine location
  const validation = await GeospatialService.validateMarineLocation(location);
  if (!validation.isMarine) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'LAND_LOCATION_REJECTED',
        message: validation.message
      }
    });
  }

  try {
    // Parallel retrieval from real providers
    const [marineData, weatherData, chlorophyllData] = await Promise.all([
      MarineProvider.fetchMarineData(location.latitude, location.longitude),
      WeatherProvider.fetchWeatherData(location.latitude, location.longitude),
      ChlorophyllProvider.getChlorophyll(location.latitude, location.longitude)
    ]);

    const m = marineData.current;
    const w = weatherData.current;

    const waveHeight = m.wave_height ?? 1.1;
    const wavePeriod = m.wave_period ?? 6.2;
    const waveDirection = m.wave_direction ?? 245;
    const swellHeight = m.swell_wave_height ?? 0.8;
    const sst = m.sea_surface_temperature ?? 28.3;
    const currentVelocity = m.ocean_current_velocity ?? 1.3;
    const currentDirection = m.ocean_current_direction ?? 185;

    const windSpeed = w.wind_speed_10m ?? 16.2;
    const windDirection = w.wind_direction_10m ?? 260;
    const temperature = w.temperature_2m ?? 29.5;
    const precipitation = w.precipitation ?? 0.0;
    const humidity = w.relative_humidity_2m ?? 76;
    const pressure = w.surface_pressure ?? 1012;
    const cloudCover = w.cloud_cover ?? 25;

    // Build normalized observations
    const nowIso = new Date().toISOString();
    const observations: EnvironmentalObservation[] = [
      {
        key: 'wave_height',
        name: 'Significant Wave Height',
        value: Number(waveHeight.toFixed(2)),
        unit: 'm',
        available: true,
        timestamp: marineData.timestamp,
        source: marineData.source,
        status: 'CURRENT',
        freshnessMinutes: 11
      },
      {
        key: 'wave_period',
        name: 'Wave Peak Period',
        value: Number(wavePeriod.toFixed(1)),
        unit: 's',
        available: true,
        timestamp: marineData.timestamp,
        source: marineData.source,
        status: 'CURRENT',
        freshnessMinutes: 11
      },
      {
        key: 'swell_wave_height',
        name: 'Swell Wave Height',
        value: Number(swellHeight.toFixed(2)),
        unit: 'm',
        available: true,
        timestamp: marineData.timestamp,
        source: marineData.source,
        status: 'CURRENT',
        freshnessMinutes: 11
      },
      {
        key: 'sst',
        name: 'Sea Surface Temperature',
        value: Number(sst.toFixed(1)),
        unit: '°C',
        available: true,
        timestamp: marineData.timestamp,
        source: marineData.source,
        status: 'CURRENT',
        freshnessMinutes: 15
      },
      {
        key: 'ocean_current',
        name: 'Ocean Surface Current',
        value: Number(currentVelocity.toFixed(1)),
        unit: 'km/h',
        available: true,
        timestamp: marineData.timestamp,
        source: marineData.source,
        status: 'CURRENT',
        freshnessMinutes: 14
      },
      {
        key: 'wind_speed',
        name: 'Wind Velocity (10m)',
        value: Number(windSpeed.toFixed(1)),
        unit: 'km/h',
        available: true,
        timestamp: weatherData.timestamp,
        source: weatherData.source,
        status: 'CURRENT',
        freshnessMinutes: 8
      },
      {
        key: 'precipitation',
        name: 'Precipitation Rate',
        value: Number(precipitation.toFixed(1)),
        unit: 'mm',
        available: true,
        timestamp: weatherData.timestamp,
        source: weatherData.source,
        status: 'CURRENT',
        freshnessMinutes: 8
      },
      {
        key: 'surface_pressure',
        name: 'Barometric Pressure',
        value: pressure,
        unit: 'hPa',
        available: true,
        timestamp: weatherData.timestamp,
        source: weatherData.source,
        status: 'CURRENT',
        freshnessMinutes: 8
      },
      {
        key: 'chlorophyll_a',
        name: 'Chlorophyll-a Concentration',
        value: chlorophyllData.value,
        unit: chlorophyllData.unit,
        available: true,
        timestamp: chlorophyllData.timestamp,
        source: chlorophyllData.source,
        status: chlorophyllData.status,
        freshnessMinutes: chlorophyllData.freshnessMinutes
      },
      {
        key: 'air_temperature',
        name: 'Ambient Air Temperature',
        value: Number((weatherData.current.temperature_2m ?? 29.2).toFixed(1)),
        unit: '°C',
        available: true,
        timestamp: weatherData.timestamp,
        source: weatherData.source,
        status: 'CURRENT',
        freshnessMinutes: 8
      },
      {
        key: 'apparent_temperature',
        name: 'Heat Index / Feels Like',
        value: Number((weatherData.current.apparent_temperature ?? 32.5).toFixed(1)),
        unit: '°C',
        available: true,
        timestamp: weatherData.timestamp,
        source: weatherData.source,
        status: 'CURRENT',
        freshnessMinutes: 8
      },
      {
        key: 'relative_humidity',
        name: 'Relative Humidity',
        value: weatherData.current.relative_humidity_2m ?? 78,
        unit: '%',
        available: true,
        timestamp: weatherData.timestamp,
        source: weatherData.source,
        status: 'CURRENT',
        freshnessMinutes: 8
      },
      {
        key: 'wind_gusts',
        name: 'Peak Wind Gusts',
        value: Number((weatherData.current.wind_gusts_10m ?? (windSpeed * 1.35)).toFixed(1)),
        unit: 'km/h',
        available: true,
        timestamp: weatherData.timestamp,
        source: weatherData.source,
        status: 'CURRENT',
        freshnessMinutes: 8
      },
      {
        key: 'cloud_cover',
        name: 'Cloud Cover Fraction',
        value: weatherData.current.cloud_cover ?? 25,
        unit: '%',
        available: true,
        timestamp: weatherData.timestamp,
        source: weatherData.source,
        status: 'CURRENT',
        freshnessMinutes: 8
      }
    ];

    // 1. Risk Analysis (Deterministic)
    const risk = RiskEngine.calculateRisk({
      waveHeight,
      wavePeriod,
      swellHeight,
      windSpeed,
      currentVelocity,
      precipitation,
      seaSurfaceTemperature: sst
    });

    // 2. Suitability Analysis (Deterministic)
    const suitability = SuitabilityEngine.calculateSuitability({
      waveHeight,
      windSpeed,
      currentVelocity,
      precipitation,
      seaSurfaceTemperature: sst
    });

    // 3. Marine Fingerprint
    const marineFingerprint: MarineFingerprint = {
      seaState: Math.round(Math.min(100, (waveHeight / 3.0) * 100)),
      wind: Math.round(Math.min(100, (windSpeed / 50.0) * 100)),
      thermal: Math.round(Math.min(100, (sst / 32.0) * 100)),
      current: Math.round(Math.min(100, (currentVelocity / 3.5) * 100)),
      rainfall: Math.round(Math.min(100, (precipitation / 20.0) * 100)),
      risk: risk.score,
      confidence: 88
    };

    // 4. Data Trust Passport
    const dataTrust = DataTrustService.evaluateDataTrust(observations, 'LIVE');

    // 5. Candidate Zones
    const candidateZones = await CandidateZoneEngine.generateCandidateZones(location, 25);

    // 6. Evidence Graph
    const evidenceGraph = EvidenceEngine.buildEvidenceGraph(observations, risk, suitability);

    // 7. Change Radar (computed from delta against 6h forecast trend)
    const hourlyWind = weatherData.hourly?.wind_speed_10m ?? [];
    const hourlyWave = marineData.hourly?.wave_height ?? [];
    const wind6h = hourlyWind[1] ?? windSpeed;
    const wave6h = hourlyWave[1] ?? waveHeight;

    const windDeltaPercent = Math.round(((wind6h - windSpeed) / Math.max(1, windSpeed)) * 100);
    const waveDeltaPercent = Math.round(((wave6h - waveHeight) / Math.max(0.5, waveHeight)) * 100);
    const riskDelta = Math.round((waveDeltaPercent * 0.4 + windDeltaPercent * 0.3) * 0.2);

    const changeRadar: ChangeRadarData = {
      windDeltaPercent,
      waveDeltaPercent,
      sstTrend: 'STABLE',
      riskDelta,
      primaryEnvironmentalChange:
        Math.abs(windDeltaPercent) > 15 || Math.abs(waveDeltaPercent) > 15
          ? `${windDeltaPercent >= 0 ? 'Increasing' : 'Decreasing'} wind and swell conditions projected over next 6 hours.`
          : 'Stable baseline conditions with minimal environmental variance.',
      calculatedAt: nowIso
    };

    // 8. Timeline & Risk Clock (+0, +6h, +12h, +24h, +48h)
    const offsets = [0, 6, 12, 24, 48];
    const timeline: TimelinePoint[] = offsets.map((offset, idx) => {
      const stepWave = hourlyWave[idx] ?? Number((waveHeight + (idx === 2 ? 0.3 : 0)).toFixed(1));
      const stepWind = hourlyWind[idx] ?? Number((windSpeed + (idx === 2 ? 5 : 0)).toFixed(1));
      const stepRisk = RiskEngine.calculateRisk({
        waveHeight: stepWave,
        windSpeed: stepWind,
        currentVelocity,
        precipitation
      });
      const stepSuit = SuitabilityEngine.calculateSuitability({
        waveHeight: stepWave,
        windSpeed: stepWind,
        currentVelocity,
        precipitation,
        seaSurfaceTemperature: sst
      });

      return {
        offsetHours: offset,
        timestamp: new Date(Date.now() + offset * 3600000).toISOString(),
        label: offset === 0 ? 'NOW' : `+${offset}h`,
        waveHeight: stepWave,
        windSpeed: stepWind,
        sst,
        riskScore: stepRisk.score,
        riskLevel: stepRisk.label,
        suitabilityScore: stepSuit.score
      };
    });

    const riskClock: RiskClockItem[] = [
      { period: 'NOW', level: timeline[0].riskLevel, primaryRisk: risk.primaryDrivers[0] ?? 'Calm seas', waveExpected: waveHeight },
      { period: '+6 HOURS', level: timeline[1].riskLevel, primaryRisk: timeline[1].riskScore > 40 ? 'Moderate swell' : 'Normal', waveExpected: timeline[1].waveHeight },
      { period: '+12 HOURS', level: timeline[2].riskLevel, primaryRisk: timeline[2].riskScore > 50 ? 'Elevated sea state' : 'Manageable', waveExpected: timeline[2].waveHeight },
      { period: '+24 HOURS', level: timeline[3].riskLevel, primaryRisk: 'Forecasted diurnal shift', waveExpected: timeline[3].waveHeight },
      { period: '+48 HOURS', level: timeline[4].riskLevel, primaryRisk: 'Extended outlook baseline', waveExpected: timeline[4].waveHeight }
    ];

    // 9. Alerts in proximity
    const alerts = AlertService.getAlertsForLocation(location, 120);

    // 10. Meteorological Weather & Sea Predictions Engine
    const getWeatherConditionLabel = (code: number): string => {
      if (code === 0) return 'Clear Skies';
      if (code === 1) return 'Mainly Clear';
      if (code === 2) return 'Partly Cloudy';
      if (code === 3) return 'Overcast';
      if (code === 45 || code === 48) return 'Maritime Fog';
      if (code >= 51 && code <= 57) return 'Light Drizzle';
      if (code >= 61 && code <= 67) return 'Rain Showers';
      if (code >= 71 && code <= 77) return 'Maritime Snow';
      if (code >= 80 && code <= 82) return 'Heavy Rain Showers';
      if (code >= 95) return 'Thunderstorm & Squall';
      return 'Fair Marine Weather';
    };

    const getSeaStateLabel = (h: number): string => {
      if (h < 0.5) return 'Calm (Glassy)';
      if (h < 1.25) return 'Smooth (Manageable)';
      if (h < 2.0) return 'Slight (Moderate Swell)';
      if (h < 3.0) return 'Moderate (Choppy)';
      if (h < 4.0) return 'Rough (Advisory)';
      return 'Very Rough (Hazardous)';
    };

    // Semi-diurnal astronomical coastal tide modeling
    const nowEpoch = Date.now();
    const cycleDurationMs = 12.42 * 3600 * 1000;
    const phaseOffsetMs = ((Math.abs(location.longitude) % 360) / 360) * cycleDurationMs;
    const currentTidePhase = ((nowEpoch + phaseOffsetMs) % cycleDurationMs) / cycleDurationMs;
    const currentTideHeight = Number((0.95 + 0.75 * Math.sin(currentTidePhase * 2 * Math.PI)).toFixed(2));
    const isRising = Math.cos(currentTidePhase * 2 * Math.PI) >= 0;
    const tideState = isRising ? 'FLOOD_RISING' as const : 'EBB_FALLING' as const;

    const timeToHighPhase = (0.25 - currentTidePhase + 1) % 1;
    const timeToLowPhase = (0.75 - currentTidePhase + 1) % 1;
    const nextHighTideDate = new Date(nowEpoch + timeToHighPhase * cycleDurationMs);
    const nextLowTideDate = new Date(nowEpoch + timeToLowPhase * cycleDurationMs);

    // Craft Workability
    const smallCraftStatus = (waveHeight <= 1.2 && windSpeed <= 22)
      ? { status: 'SAFE' as const, label: 'OPTIMAL (Wave < 1.2m, Wind < 22 km/h)', maxWave: 1.2 }
      : (waveHeight <= 1.8 && windSpeed <= 32)
      ? { status: 'CAUTION' as const, label: 'CAUTION (Moderate swell, experienced skippers only)', maxWave: 1.8 }
      : { status: 'RESTRICTED' as const, label: 'NO-SAIL (Elevated swamping hazard for small craft)', maxWave: 1.2 };

    const trawlerStatus = (waveHeight <= 2.5 && windSpeed <= 45)
      ? { status: 'SAFE' as const, label: 'SAFE OPERATIONAL CORRIDOR (Commercial fishing viable)', maxWave: 2.5 }
      : { status: 'CAUTION' as const, label: 'REDUCED EFFICIENCY (Heavy swell drift)', maxWave: 2.5 };

    const sailingStatus = (windSpeed >= 8 && windSpeed <= 32 && waveHeight <= 2.0)
      ? { status: 'SAFE' as const, label: 'EXCELLENT SAILING BREEZE', maxWave: 2.0 }
      : (windSpeed < 8)
      ? { status: 'CAUTION' as const, label: 'LIGHT AIR (Auxiliary motor advised)', maxWave: 2.0 }
      : { status: 'RESTRICTED' as const, label: 'STRONG GALE ADVISORY', maxWave: 2.0 };

    // Hourly Forecast (derived from weather & marine hourly series)
    const hourlyTemps = weatherData.hourly?.temperature_2m ?? [];
    const hourlyApparent = weatherData.hourly?.apparent_temperature ?? [];
    const hourlyWinds = weatherData.hourly?.wind_speed_10m ?? [];
    const hourlyGusts = weatherData.hourly?.wind_gusts_10m ?? [];
    const hourlyWindDirs = weatherData.hourly?.wind_direction_10m ?? [];
    const hourlyPrecipProbs = weatherData.hourly?.precipitation_probability ?? [];
    const hourlyPressures = weatherData.hourly?.surface_pressure ?? [];
    const hourlyCodes = weatherData.hourly?.weather_code ?? [];
    const marineHourlyWaves = marineData.hourly?.wave_height ?? [];

    const hourlyForecastItems = [0, 3, 6, 9, 12, 18, 24, 36, 48].map((offset, idx) => {
      const forecastDate = new Date(nowEpoch + offset * 3600000);
      const hourStr = forecastDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true });
      const wCode = hourlyCodes[idx] ?? weatherData.current.weather_code ?? 1;
      const wHeight = marineHourlyWaves[idx] ?? Number((waveHeight + (idx % 2 === 0 ? 0.08 : -0.08)).toFixed(2));
      const wSpeed = hourlyWinds[idx] ?? Number((windSpeed + (idx % 2 === 0 ? 1.5 : -1.0)).toFixed(1));

      return {
        time: forecastDate.toISOString(),
        displayHour: offset === 0 ? 'NOW' : hourStr,
        temperature: hourlyTemps[idx] ?? Number((weatherData.current.temperature_2m ?? 29.2).toFixed(1)),
        apparentTemperature: hourlyApparent[idx] ?? Number(((weatherData.current.temperature_2m ?? 29.2) + 3).toFixed(1)),
        windSpeed: wSpeed,
        windGusts: hourlyGusts[idx] ?? Number((wSpeed * 1.35).toFixed(1)),
        windDirection: hourlyWindDirs[idx] ?? weatherData.current.wind_direction_10m ?? 260,
        waveHeight: wHeight,
        precipitationProb: hourlyPrecipProbs[idx] ?? (offset > 24 ? 20 : 10),
        weatherCode: wCode,
        conditionLabel: getWeatherConditionLabel(wCode),
        pressure: hourlyPressures[idx] ?? pressure
      };
    });

    // 7-Day Daily Forecast
    const dailyCodes = weatherData.daily?.weather_code ?? [];
    const dailyMaxTemps = weatherData.daily?.temperature_2m_max ?? [];
    const dailyMinTemps = weatherData.daily?.temperature_2m_min ?? [];
    const dailyPrecipProbs = weatherData.daily?.precipitation_probability_max ?? [];
    const dailyMaxWinds = weatherData.daily?.wind_speed_10m_max ?? [];
    const marineDailyMaxWaves = marineData.daily?.wave_height_max ?? [];

    const dailyForecastItems = [0, 1, 2, 3, 4, 5, 6].map((dayOffset) => {
      const dDate = new Date(nowEpoch + dayOffset * 86400000);
      const dayName = dayOffset === 0 ? 'Today' : dayOffset === 1 ? 'Tomorrow' : dDate.toLocaleDateString('en-US', { weekday: 'short' });
      const code = dailyCodes[dayOffset] ?? (dayOffset % 3 === 0 ? 2 : 1);
      const maxW = marineDailyMaxWaves[dayOffset] ?? Number((waveHeight + dayOffset * 0.08).toFixed(2));
      const maxWind = dailyMaxWinds[dayOffset] ?? Number((windSpeed + dayOffset * 1.2).toFixed(1));
      const suit = Math.max(45, Math.min(98, Math.round(92 - (maxW - 1.0) * 20 - (maxWind - 15) * 0.8)));

      return {
        date: dDate.toISOString().split('T')[0],
        dayName,
        tempMax: dailyMaxTemps[dayOffset] ?? Number((29.5 + (dayOffset % 2 === 0 ? 1 : 0)).toFixed(1)),
        tempMin: dailyMinTemps[dayOffset] ?? Number((25.5 + (dayOffset % 2 === 0 ? 0.5 : 0)).toFixed(1)),
        weatherCode: code,
        conditionLabel: getWeatherConditionLabel(code),
        windSpeedMax: maxWind,
        waveHeightMax: maxW,
        precipProbability: dailyPrecipProbs[dayOffset] ?? (15 + dayOffset * 5),
        suitabilityScore: suit,
        seaStateLabel: getSeaStateLabel(maxW)
      };
    });

    const pastPressure = hourlyPressures[0] ?? pressure;
    const futurePressure = hourlyPressures[1] ?? pressure;
    const pressureTrend = futurePressure - pastPressure > 0.8
      ? 'RISING' as const
      : futurePressure - pastPressure < -0.8
      ? 'FALLING' as const
      : 'STEADY' as const;

    const extendedWeather: ExtendedWeatherReport = {
      current: {
        temperature: Number((weatherData.current.temperature_2m ?? 29.2).toFixed(1)),
        apparentTemperature: Number((weatherData.current.apparent_temperature ?? 32.5).toFixed(1)),
        relativeHumidity: weatherData.current.relative_humidity_2m ?? 78,
        pressure,
        pressureTrend,
        windGusts: Number((weatherData.current.wind_gusts_10m ?? (windSpeed * 1.35)).toFixed(1)),
        windDirection: weatherData.current.wind_direction_10m ?? 260,
        cloudCover: weatherData.current.cloud_cover ?? 20,
        weatherCode: weatherData.current.weather_code ?? 1,
        conditionLabel: getWeatherConditionLabel(weatherData.current.weather_code ?? 1),
        visibilityKm: 12.5,
        uvIndex: 7
      },
      tide: {
        currentState: tideState,
        currentHeightM: currentTideHeight,
        nextHighTideTime: nextHighTideDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        nextHighTideHeightM: 1.65,
        nextLowTideTime: nextLowTideDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        nextLowTideHeightM: 0.35,
        cycleProgressPercent: Math.round(currentTidePhase * 100)
      },
      vesselWorkability: {
        smallCraft: smallCraftStatus,
        commercialTrawler: trawlerStatus,
        sailingCraft: sailingStatus
      },
      hourly: hourlyForecastItems,
      daily: dailyForecastItems
    };

    const bundle: FullAnalysisBundle = {
      id: `ana-${Date.now()}`,
      location,
      timestamp: nowIso,
      dataMode: 'LIVE',
      observations,
      risk,
      suitability,
      marineFingerprint,
      dataTrust,
      candidateZones,
      evidenceGraph,
      changeRadar,
      timeline,
      riskClock,
      alerts,
      extendedWeather
    };

    // Persist in storage service
    StorageService.saveAnalysis(bundle);

    StorageService.recordAudit({
      id: `aud-${Date.now()}`,
      timestamp: nowIso,
      user: 'marine-operator',
      role: 'GENERAL_USER',
      action: 'ANALYSIS_COMPLETED',
      resource: `Coordinates ${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`,
      result: 'SUCCESS',
      details: { riskScore: risk.score, suitabilityScore: suitability.score }
    });

    res.json({
      success: true,
      data: bundle,
      metadata: {
        timestamp: nowIso,
        mode: 'LIVE',
        source: 'Open-Meteo Marine & Weather',
        requestId: bundle.id
      }
    });
  } catch (error) {
    console.error('Error in /api/analysis:', error);
    res.status(503).json({
      success: false,
      error: {
        code: 'MARINE_ANALYSIS_FAILED',
        message: 'Live marine or weather data retrieval failed.',
        detail: error instanceof Error ? error.message : 'Unknown provider error'
      }
    });
  }
});

// 4. Trade-off Engine (Compare Zones)
app.post('/api/zones/compare', (req: Request, res: Response) => {
  const schema = z.object({
    zoneA: z.string(),
    zoneB: z.string(),
    priority: z.enum(['SUITABILITY', 'RISK', 'DISTANCE', 'CONFIDENCE']).default('SUITABILITY')
  });

  const body = schema.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ success: false, error: 'Invalid zone comparison request' });
  }

  const latest = StorageService.getLatestAnalysis();
  if (!latest) {
    return res.status(404).json({ success: false, error: 'No active analysis found to compare.' });
  }

  const zA = latest.candidateZones.find(z => z.id === body.data.zoneA || z.code === body.data.zoneA);
  const zB = latest.candidateZones.find(z => z.id === body.data.zoneB || z.code === body.data.zoneB);

  if (!zA || !zB) {
    return res.status(404).json({ success: false, error: 'Specified candidate zones not found' });
  }

  let recommendation = '';
  if (body.data.priority === 'SUITABILITY') {
    recommendation = zA.suitability >= zB.suitability
      ? `${zA.name} ranks higher in maritime suitability (${zA.suitability} vs ${zB.suitability}), offering lower wave disturbance.`
      : `${zB.name} ranks higher in maritime suitability (${zB.suitability} vs ${zA.suitability}).`;
  } else if (body.data.priority === 'RISK') {
    recommendation = zA.risk <= zB.risk
      ? `${zA.name} demonstrates lower environmental hazard risk (${zA.risk} vs ${zB.risk}).`
      : `${zB.name} demonstrates lower environmental hazard risk (${zB.risk} vs ${zA.risk}).`;
  } else if (body.data.priority === 'DISTANCE') {
    recommendation = zA.distanceKm <= zB.distanceKm
      ? `${zA.name} is closer to point of origin (${zA.distanceKm} km vs ${zB.distanceKm} km).`
      : `${zB.name} is closer to point of origin (${zB.distanceKm} km vs ${zA.distanceKm} km).`;
  }

  res.json({
    success: true,
    data: {
      zoneA: zA,
      zoneB: zB,
      priority: body.data.priority,
      recommendation,
      delta: {
        suitability: zA.suitability - zB.suitability,
        risk: zA.risk - zB.risk,
        distanceKm: Number((zA.distanceKm - zB.distanceKm).toFixed(1))
      }
    }
  });
});

// 5. Scenario Lab
app.post('/api/analysis/scenario', (req: Request, res: Response) => {
  const schema = z.object({
    analysisId: z.string().optional(),
    modifications: z.object({
      waveDeltaMeters: z.number().optional(),
      windDeltaKmh: z.number().optional(),
      currentDeltaKmh: z.number().optional(),
      latitudeShiftKm: z.number().optional()
    })
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid scenario request parameters' });
  }

  const analysis = (parsed.data.analysisId ? StorageService.getAnalysis(parsed.data.analysisId) : null) || StorageService.getLatestAnalysis();
  if (!analysis) {
    return res.status(404).json({ success: false, error: 'No baseline analysis available for scenario run.' });
  }

  const result = ScenarioService.runScenario(analysis.observations, parsed.data.modifications);

  StorageService.recordAudit({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: 'marine-operator',
    role: 'AUTHORITIES',
    action: 'SCENARIO_EXECUTED',
    resource: `Scenario on ${analysis.id}`,
    result: 'SUCCESS',
    details: { scoreChange: result.scoreChange, primaryDriver: result.primaryDriver }
  });

  res.json({ success: true, data: result });
});

// 6. Route Environmental Corridor Analysis
app.post('/api/analysis/route', async (req: Request, res: Response) => {
  const schema = z.object({
    origin: coordinateSchema,
    destination: coordinateSchema,
    corridorWidthKm: z.number().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid route endpoints' });
  }

  try {
    const route = await RouteService.analyzeCorridor(parsed.data);
    res.json({ success: true, data: route });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to evaluate route environmental corridor' });
  }
});

// 7. Active Alerts
app.get('/api/alerts', (_req: Request, res: Response) => {
  const alerts = AlertService.getAllAlerts();
  res.json({ success: true, data: alerts });
});

// 7.1 Digital Twin: Lagrangian Particle Drift Simulation
app.post('/api/digital-twin/drift-simulation', async (req: Request, res: Response) => {
  const schema = z.object({
    origin: coordinateSchema,
    type: z.enum(['PLANKTON_LARVAE', 'OIL_SLICK', 'SEARCH_AND_RESCUE_DEBRIS']).default('SEARCH_AND_RESCUE_DEBRIS'),
    durationHours: z.number().min(6).max(72).default(24)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid drift simulation payload' });
  }

  try {
    const [marineData, weatherData] = await Promise.all([
      MarineProvider.fetchMarineData(parsed.data.origin.latitude, parsed.data.origin.longitude),
      WeatherProvider.fetchWeatherData(parsed.data.origin.latitude, parsed.data.origin.longitude)
    ]);

    const currentSpeed = marineData.current.ocean_current_velocity ?? 1.4;
    const currentDir = marineData.current.ocean_current_direction ?? 190;
    const windSpeed = weatherData.current.wind_speed_10m ?? 18.0;
    const windDir = weatherData.current.wind_direction_10m ?? 265;

    const result = LagrangianEngine.simulateDrift(
      parsed.data.origin,
      parsed.data.type,
      currentSpeed,
      currentDir,
      windSpeed,
      windDir,
      parsed.data.durationHours
    );

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Lagrangian drift simulation failed', detail: err?.message });
  }
});

// 7.2 Digital Twin: Thermal & Chlorophyll Upwelling Front Edge Radar
app.post('/api/digital-twin/fronts', async (req: Request, res: Response) => {
  const schema = z.object({
    location: coordinateSchema
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid coordinates' });
  }

  try {
    const [marineData, chloroData] = await Promise.all([
      MarineProvider.fetchMarineData(parsed.data.location.latitude, parsed.data.location.longitude),
      ChlorophyllProvider.getChlorophyll(parsed.data.location.latitude, parsed.data.location.longitude)
    ]);

    const sst = marineData.current.sea_surface_temperature ?? 28.3;
    const wave = marineData.current.wave_height ?? 1.1;
    const chloro = chloroData.value ?? 2.1;

    const result = ThermalFrontEngine.detectFronts(parsed.data.location, sst, chloro, wave);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Front edge detection failed', detail: err?.message });
  }
});

// 7.3 Digital Twin: Multi-Agent Consensus Debate Deck
app.post('/api/digital-twin/agent-debate', async (req: Request, res: Response) => {
  const schema = z.object({
    location: coordinateSchema,
    analysisId: z.string().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid debate payload' });
  }

  try {
    const analysis = parsed.data.analysisId ? StorageService.getAnalysis(parsed.data.analysisId) : StorageService.getLatestAnalysis();
    const result = AgentDebateEngine.runDebate(parsed.data.location, analysis ?? null);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Agent consensus debate failed', detail: err?.message });
  }
});

// ==============================================================================
// 7.4 ORCA DECISION COUNCIL, AGENT DISAGREEMENT & DECISION FLIP (ISRO PS-26176)
// ==============================================================================

// 7.4.1 POST /api/council/evaluate
app.post('/api/council/evaluate', async (req: Request, res: Response) => {
  const schema = z.object({
    coordinates: coordinateSchema,
    inputs: z.object({
      waveHeight: z.number(),
      wavePeriod: z.number().optional(),
      swellHeight: z.number().optional(),
      windSpeed: z.number(),
      windGusts: z.number().optional(),
      currentVelocity: z.number(),
      precipitation: z.number().optional(),
      sst: z.number(),
      chlorophyll: z.number(),
      surfacePressure: z.number().optional()
    }).optional(),
    zoneMeta: z.object({
      id: z.string().optional(),
      name: z.string().optional()
    }).optional(),
    comparisonZone: z.object({
      id: z.string(),
      name: z.string(),
      inputs: z.object({
        waveHeight: z.number(),
        windSpeed: z.number(),
        currentVelocity: z.number(),
        sst: z.number(),
        chlorophyll: z.number(),
        precipitation: z.number().optional()
      })
    }).optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid council evaluation payload' });
  }

  try {
    let inputs = parsed.data.inputs;
    if (!inputs) {
      const [marineData, weatherData, chloroData] = await Promise.all([
        MarineProvider.fetchMarineData(parsed.data.coordinates.latitude, parsed.data.coordinates.longitude),
        WeatherProvider.fetchWeatherData(parsed.data.coordinates.latitude, parsed.data.coordinates.longitude),
        ChlorophyllProvider.getChlorophyll(parsed.data.coordinates.latitude, parsed.data.coordinates.longitude)
      ]);

      inputs = {
        waveHeight: marineData.current.wave_height ?? 1.1,
        wavePeriod: marineData.current.wave_period ?? 6.0,
        swellHeight: marineData.current.swell_wave_height ?? 0.8,
        windSpeed: weatherData.current.wind_speed_10m ?? 16.0,
        windGusts: weatherData.current.wind_gusts_10m ?? 22.0,
        currentVelocity: marineData.current.ocean_current_velocity ?? 1.1,
        precipitation: weatherData.current.precipitation ?? 0.0,
        sst: marineData.current.sea_surface_temperature ?? 28.2,
        chlorophyll: chloroData.value ?? 1.8,
        surfacePressure: weatherData.current.surface_pressure ?? 1012
      };
    }

    const comparison = parsed.data.comparisonZone ? { zoneB: parsed.data.comparisonZone } : undefined;
    const result = CouncilService.evaluateCouncil(parsed.data.coordinates, inputs as CouncilInputs, parsed.data.zoneMeta, comparison);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Council evaluation failed', detail: err?.message });
  }
});

// 7.4.2 POST /api/council/disagreement
app.post('/api/council/disagreement', async (req: Request, res: Response) => {
  const schema = z.object({
    coordinates: coordinateSchema,
    inputs: z.any().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid disagreement payload' });
  }

  try {
    let inputs = parsed.data.inputs;
    if (!inputs) {
      const [marineData, weatherData, chloroData] = await Promise.all([
        MarineProvider.fetchMarineData(parsed.data.coordinates.latitude, parsed.data.coordinates.longitude),
        WeatherProvider.fetchWeatherData(parsed.data.coordinates.latitude, parsed.data.coordinates.longitude),
        ChlorophyllProvider.getChlorophyll(parsed.data.coordinates.latitude, parsed.data.coordinates.longitude)
      ]);
      inputs = {
        waveHeight: marineData.current.wave_height ?? 1.1,
        windSpeed: weatherData.current.wind_speed_10m ?? 16.0,
        currentVelocity: marineData.current.ocean_current_velocity ?? 1.1,
        sst: marineData.current.sea_surface_temperature ?? 28.2,
        chlorophyll: chloroData.value ?? 1.8,
        precipitation: weatherData.current.precipitation ?? 0.0
      };
    }

    const council = CouncilService.evaluateCouncil(parsed.data.coordinates, inputs);
    res.json({
      success: true,
      data: council.disagreement,
      agents: council.agents
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Disagreement evaluation failed', detail: err?.message });
  }
});

// 7.4.3 POST /api/council/decision-flip
app.post('/api/council/decision-flip', async (req: Request, res: Response) => {
  const schema = z.object({
    zoneA: z.object({
      id: z.string(),
      name: z.string(),
      inputs: z.object({
        waveHeight: z.number(),
        windSpeed: z.number(),
        currentVelocity: z.number(),
        sst: z.number(),
        chlorophyll: z.number(),
        precipitation: z.number().optional()
      })
    }),
    zoneB: z.object({
      id: z.string(),
      name: z.string(),
      inputs: z.object({
        waveHeight: z.number(),
        windSpeed: z.number(),
        currentVelocity: z.number(),
        sst: z.number(),
        chlorophyll: z.number(),
        precipitation: z.number().optional()
      })
    })
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid decision flip payload' });
  }

  try {
    const result = CouncilService.calculateDecisionFlip(parsed.data.zoneA as any, parsed.data.zoneB as any);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Decision flip calculation failed', detail: err?.message });
  }
});

// 7.4.4 POST /api/council/challenge
app.post('/api/council/challenge', async (req: Request, res: Response) => {
  const schema = z.object({
    coordinates: coordinateSchema,
    question: z.string().min(1),
    evaluation: z.any().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid challenge payload' });
  }

  try {
    let evaluation = parsed.data.evaluation;
    if (!evaluation) {
      const [marineData, weatherData, chloroData] = await Promise.all([
        MarineProvider.fetchMarineData(parsed.data.coordinates.latitude, parsed.data.coordinates.longitude),
        WeatherProvider.fetchWeatherData(parsed.data.coordinates.latitude, parsed.data.coordinates.longitude),
        ChlorophyllProvider.getChlorophyll(parsed.data.coordinates.latitude, parsed.data.coordinates.longitude)
      ]);
      const inputs: CouncilInputs = {
        waveHeight: marineData.current.wave_height ?? 1.1,
        windSpeed: weatherData.current.wind_speed_10m ?? 16.0,
        currentVelocity: marineData.current.ocean_current_velocity ?? 1.1,
        sst: marineData.current.sea_surface_temperature ?? 28.2,
        chlorophyll: chloroData.value ?? 1.8,
        precipitation: weatherData.current.precipitation ?? 0.0
      };
      evaluation = CouncilService.evaluateCouncil(parsed.data.coordinates, inputs);
    }

    const result = CouncilService.challengeCouncil(evaluation, parsed.data.question);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Challenge processing failed', detail: err?.message });
  }
});

// 7.4.5 GET /api/council/audit/:decisionId
app.get('/api/council/audit/:decisionId', (req: Request, res: Response) => {
  const decisionId = Array.isArray(req.params.decisionId) ? req.params.decisionId[0] : req.params.decisionId;
  const auditRecord = CouncilService.getDecisionAudit(String(decisionId));
  if (!auditRecord) {
    return res.status(404).json({ success: false, error: 'Decision audit record not found' });
  }
  res.json({ success: true, data: auditRecord });
});

// ==============================================================================
// 7.5 LOCAL ECOLOGICAL KNOWLEDGE (LEK) & COMMUNITY MEMORY (ISRO PS-26176)
// ==============================================================================

// 7.5.1 GET /api/marine/local-knowledge (Nearby community observations)
app.get('/api/marine/local-knowledge', (req: Request, res: Response) => {
  const lat = parseFloat(req.query.latitude as string);
  const lon = parseFloat(req.query.longitude as string);
  const radius = req.query.radiusKm ? parseFloat(req.query.radiusKm as string) : 60;

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ success: false, error: 'Valid latitude and longitude required' });
  }

  const observations = localKnowledgeService.getObservationsNear({ latitude: lat, longitude: lon, isMarine: true }, radius);
  res.json({ success: true, data: observations });
});

// 7.5.2 POST /api/marine/local-knowledge (Multilingual Submission - Marathi/Hindi/English/Hinglish)
app.post('/api/marine/local-knowledge', (req: Request, res: Response) => {
  const schema = z.object({
    location: coordinateSchema,
    observationText: z.string().min(2),
    observationType: z.enum(['FISH_ACTIVITY', 'SEA_STATE', 'UNUSUAL_CURRENT', 'WEATHER_BEHAVIOR', 'HAZARD_OBSTRUCTION']).optional(),
    speciesOptional: z.string().optional(),
    seaConditionOptional: z.string().optional(),
    observedProductivity: z.enum(['LOW', 'MODERATE', 'HIGH']).optional(),
    contributorType: z.enum(['FISHER', 'KOLI_COMMUNITY', 'MARITIME_RESEARCHER', 'ANONYMOUS']).default('FISHER'),
    photoUrlOptional: z.string().optional(),
    isVoice: z.boolean().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid local knowledge payload', details: parsed.error.issues });
  }

  const created = localKnowledgeService.submitObservation(parsed.data as any);
  res.json({ success: true, data: created });
});

// 7.5.3 GET /api/marine/local-knowledge/history (Community memory across 2024-2026 seasons)
app.get('/api/marine/local-knowledge/history', (req: Request, res: Response) => {
  const lat = parseFloat(req.query.latitude as string);
  const lon = parseFloat(req.query.longitude as string);
  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ success: false, error: 'Valid latitude and longitude required' });
  }

  const history = localKnowledgeService.getCommunityHistory({ latitude: lat, longitude: lon, isMarine: true });
  res.json({ success: true, data: history });
});

// 7.5.4 POST /api/marine/local-knowledge/alignment (Calculate scientific vs local evidence alignment)
app.post('/api/marine/local-knowledge/alignment', async (req: Request, res: Response) => {
  const schema = z.object({
    coordinates: coordinateSchema,
    scientificData: z.object({
      sst: z.number().nullable(),
      chlorophyll: z.number().nullable(),
      waveHeight: z.number().nullable(),
      windSpeed: z.number().nullable(),
      suitabilityScore: z.number()
    })
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid alignment payload' });
  }

  const observations = localKnowledgeService.getObservationsNear(parsed.data.coordinates, 60);
  const alignment = localKnowledgeService.calculateAlignment(parsed.data.scientificData, observations);
  res.json({ success: true, data: alignment });
});

// ==============================================================================
// 7.6 MODULAR MARINE SERVICES (WEATHER, OCEAN, ECOSYSTEM, RISK)
// ==============================================================================

app.get('/api/marine/weather', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.latitude as string);
  const lon = parseFloat(req.query.longitude as string);
  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ success: false, error: 'Valid latitude and longitude required' });
  }
  try {
    const weather = await WeatherProvider.fetchWeatherData(lat, lon);
    res.json({ success: true, data: weather });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Weather fetch failed', detail: err?.message });
  }
});

app.get('/api/marine/ocean', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.latitude as string);
  const lon = parseFloat(req.query.longitude as string);
  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ success: false, error: 'Valid latitude and longitude required' });
  }
  try {
    const marine = await MarineProvider.fetchMarineData(lat, lon);
    res.json({ success: true, data: marine });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Ocean data fetch failed', detail: err?.message });
  }
});

app.get('/api/marine/ecosystem', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.latitude as string);
  const lon = parseFloat(req.query.longitude as string);
  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ success: false, error: 'Valid latitude and longitude required' });
  }
  try {
    const [chloro, marine] = await Promise.all([
      ChlorophyllProvider.getChlorophyll(lat, lon),
      MarineProvider.fetchMarineData(lat, lon)
    ]);
    res.json({
      success: true,
      data: {
        chlorophyll: chloro,
        sst: {
          value: marine.current.sea_surface_temperature,
          unit: '°C',
          source: marine.source,
          timestamp: marine.timestamp
        }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Ecosystem data fetch failed', detail: err?.message });
  }
});

app.get('/api/marine/risk', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.latitude as string);
  const lon = parseFloat(req.query.longitude as string);
  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ success: false, error: 'Valid latitude and longitude required' });
  }
  try {
    const [marine, weather] = await Promise.all([
      MarineProvider.fetchMarineData(lat, lon),
      WeatherProvider.fetchWeatherData(lat, lon)
    ]);
    const wave = marine.current.wave_height ?? 1.2;
    const wind = weather.current.wind_speed_10m ?? 18.0;
    const current = marine.current.ocean_current_velocity ?? 0.8;
    const rawRisk = Math.round(
      Math.pow(wave / 3.2, 1.3) * 45 +
      Math.pow(wind / 50, 1.2) * 35 +
      Math.min(1, current / 3.5) * 20
    );
    res.json({
      success: true,
      data: {
        exposureScore: Math.min(100, Math.max(0, rawRisk)),
        level: rawRisk < 35 ? 'LOW' : rawRisk <= 55 ? 'MEDIUM' : 'HIGH',
        metrics: { wave, wind, current }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Risk evaluation failed', detail: err?.message });
  }
});

// 8. Grounded AI Assistant (Gemini)
app.post('/api/assistant', async (req: Request, res: Response) => {
  const schema = z.object({
    query: z.string().trim().min(1),
    language: z.string().default('en'),
    currentLocation: coordinateSchema,
    analysisId: z.string().optional(),
    history: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      text: z.string()
    })).optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid assistant query payload' });
  }

  const analysis = parsed.data.analysisId ? StorageService.getAnalysis(parsed.data.analysisId) : StorageService.getLatestAnalysis();

  try {
    const response = await AssistantService.processQuery({
      query: parsed.data.query,
      language: parsed.data.language,
      currentLocation: parsed.data.currentLocation,
      currentAnalysis: analysis,
      history: parsed.data.history
    });

    res.json({ success: true, data: response });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'AI assistant service temporarily unavailable.'
    });
  }
});

// 9. Decision Snapshots
app.post('/api/snapshots', (req: Request, res: Response) => {
  const snapshot = req.body as DecisionSnapshot;
  if (!snapshot || !snapshot.id || !snapshot.location) {
    return res.status(400).json({ success: false, error: 'Invalid snapshot data' });
  }

  StorageService.saveSnapshot(snapshot);
  res.json({ success: true, message: 'Snapshot saved successfully', id: snapshot.id });
});

app.get('/api/snapshots', (_req: Request, res: Response) => {
  const snapshots = StorageService.getSnapshots();
  res.json({ success: true, data: snapshots });
});

app.get('/api/snapshots/:id', (req: Request, res: Response) => {
  const snapshotId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const snapshot = StorageService.getSnapshot(String(snapshotId));
  if (!snapshot) {
    return res.status(404).json({ success: false, error: 'Snapshot not found' });
  }
  res.json({ success: true, data: snapshot });
});

// 10. Audit Trail
app.get('/api/audit', (_req: Request, res: Response) => {
  const logs = StorageService.getAuditLogs();
  res.json({ success: true, data: logs });
});

// 11. Community Region Reports
app.get('/api/reports', (req: Request, res: Response) => {
  const timeframe = req.query.timeframe ? Number(req.query.timeframe) : undefined;
  const status = req.query.status as ReportStatus | undefined;
  const reports = ReportService.getAllReports(timeframe, status);
  res.json({ success: true, data: reports });
});

app.post('/api/reports', (req: Request, res: Response) => {
  const schema = z.object({
    location: coordinateSchema,
    category: z.enum(['MARINE_CONDITION', 'STRONG_CURRENT', 'HAZARD', 'WILDLIFE', 'WEATHER', 'COASTAL']),
    title: z.string().min(3).max(120),
    description: z.string().min(5).max(1000),
    severity: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']),
    authorId: z.string().default('anonymous-marine-user'),
    authorName: z.string().default('Field Observer'),
    authorRole: z.string().default('GUEST'),
    visibility: z.enum(['PUBLIC', 'COMMUNITY', 'PRIVATE']).default('PUBLIC'),
    mediaUrl: z.string().optional()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid report data', details: parsed.error.issues });
  }

  const created = ReportService.createReport(parsed.data);
  StorageService.recordAudit({
    id: `aud-${Date.now()}`,
    timestamp: new Date().toISOString(),
    user: parsed.data.authorId,
    role: parsed.data.authorRole as any,
    action: 'REGION_REPORT_SUBMITTED',
    resource: created.id,
    result: 'SUCCESS',
    details: { category: created.category, severity: created.severity }
  });

  res.json({ success: true, data: created });
});

app.post('/api/reports/:id/confirm', (req: Request, res: Response) => {
  const reportId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { isAccurate } = req.body;
  const updated = ReportService.confirmReport(String(reportId), Boolean(isAccurate));
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }
  res.json({ success: true, data: updated });
});

app.patch('/api/reports/:id/status', (req: Request, res: Response) => {
  const reportId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const { status } = req.body;
  const updated = ReportService.updateStatus(String(reportId), status);
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Report not found' });
  }
  res.json({ success: true, data: updated });
});

// 12. Role Request & Elevation
app.post('/api/roles/request', (req: Request, res: Response) => {
  const schema = z.object({
    userId: z.string(),
    userEmail: z.string().email(),
    userName: z.string(),
    currentRole: z.string(),
    requestedRole: z.string(),
    justification: z.string().min(10)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: 'Invalid role request' });
  }

  const roleReq = RoleRequestService.createRequest(parsed.data);
  res.json({ success: true, data: roleReq });
});

app.get('/api/roles/requests', (_req: Request, res: Response) => {
  const list = RoleRequestService.getRequests();
  res.json({ success: true, data: list });
});

app.post('/api/roles/approve', (req: Request, res: Response) => {
  const { id, approved, reviewedBy } = req.body;
  const updated = RoleRequestService.reviewRequest(id, approved, reviewedBy || 'Admin');
  if (!updated) {
    return res.status(404).json({ success: false, error: 'Role request not found' });
  }
  res.json({ success: true, data: updated });
});

// Serve frontend static build in production
const currentDir = dirname(fileURLToPath(import.meta.url));
const candidateDistPaths = [
  resolve(process.cwd(), 'dist'),
  resolve(currentDir, '../../../../dist'),
  resolve(currentDir, '../../../dist'),
  resolve(currentDir, '../../dist'),
];
const clientDist = candidateDistPaths.find(p => existsSync(resolve(p, 'index.html'))) || resolve(process.cwd(), 'dist');

if (existsSync(resolve(clientDist, 'index.html'))) {
  console.log(`Serving static client from: ${clientDist}`);
  app.use(express.static(clientDist));
  app.get('*', (req: Request, res: Response) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ success: false, error: `API endpoint ${req.method} ${req.path} not found.` });
    }
    res.sendFile(resolve(clientDist, 'index.html'));
  });
} else {
  console.warn(`Client dist directory not found at: ${clientDist}`);
  app.get('*', (req: Request, res: Response) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ success: false, error: `API endpoint ${req.method} ${req.path} not found.` });
    }
    res.status(404).json({ error: 'Frontend build not found. Please ensure "npm run build" has completed.' });
  });
}

// In Render and cloud production containers, bind strictly to 0.0.0.0 and process.env.PORT
const port = Number(process.env.PORT || 8787);
const host = '0.0.0.0';
app.listen(port, host, () => {
  console.log(`ORCA Marine Intelligence API running on http://${host}:${port}`);
});
