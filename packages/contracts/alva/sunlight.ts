/** Presentation-only solar estimate; no Scene schema, persistence or environment dependencies. */
export type SunlightSettings = Readonly<{
  /** True solar hours, not local civil/clock time. 24 is equivalent to 0. */
  time: number;
  /** Day of a generic non-leap year (1–365). */
  day: number;
  latitude: number;
  /** Clockwise from the top of the plan. Plan x = world x, plan y = world z. */
  north: number;
}>;

export type SunlightState = Readonly<{
  settings: SunlightSettings;
  direction: Readonly<{x: number; y: number; z: number}>;
  altitudeDegrees: number;
  /** Clockwise from geographic north, independent of plan orientation. */
  azimuthDegrees: number;
  declinationDegrees: number;
  daylight: boolean;
  directIntensity: number;
  skyBlend: number;
}>;

export class SunlightInputError extends Error {
  readonly code = 'INVALID_SUNLIGHT_PARAMETERS';
  constructor(readonly field: string, message: string) {
    super(message);
    this.name = 'SunlightInputError';
  }
}

const fields = ['time', 'day', 'latitude', 'north'] as const;
const rad = Math.PI / 180;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/** Reject rather than silently clamp malformed UI/MCP inputs. Bounds match current geography. */
export function parseSunlightSettings(value: unknown): SunlightSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SunlightInputError('settings', '日照参数必须包含太阳时、年内日期、纬度和北向。');
  }
  const object = value as Record<string, unknown>;
  for (const key of Object.keys(object)) {
    if (!(fields as readonly string[]).includes(key)) throw new SunlightInputError(key, `不支持的日照参数：${key}`);
  }
  for (const key of fields) {
    if (typeof object[key] !== 'number' || !Number.isFinite(object[key])) {
      throw new SunlightInputError(key, `${key} 必须是有限数值。`);
    }
  }
  const {time, day, latitude, north} = object as Record<typeof fields[number], number>;
  if (time < 0 || time > 24) throw new SunlightInputError('time', '太阳时必须在 0–24 小时之间。');
  if (!Number.isInteger(day) || day < 1 || day > 365) throw new SunlightInputError('day', '日期必须是非闰年的第 1–365 天。');
  if (latitude < -66 || latitude > 66) throw new SunlightInputError('latitude', '当前地理合同支持南纬 66° 至北纬 66°。');
  if (north < 0 || north > 360) throw new SunlightInputError('north', '图上北向必须在 0–360° 之间。');
  return Object.freeze({time, day, latitude, north});
}

/**
 * NOAA approximate declination series, evaluated at each day's noon.
 * Source: https://gml.noaa.gov/grad/solcalc/solareqns.PDF (page 1).
 * Solar hours are already supplied: do not silently apply a time zone/longitude offset.
 * Daily declination, 365-day year, geometric horizon; no atmospheric refraction,
 * weather, neighbouring obstructions or survey/solar-access compliance claim.
 */
export function evaluateSunlight(input: SunlightSettings): SunlightState {
  const settings = parseSunlightSettings(input);
  const gamma = 2 * Math.PI * (settings.day - 1) / 365;
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const latitude = settings.latitude * rad;
  const hourAngle = ((settings.time % 24) - 12) * 15 * rad;
  // East/north/up avoids the old mirrored morning/afternoon azimuth and zenith division.
  const east = -Math.cos(declination) * Math.sin(hourAngle);
  const north = Math.cos(latitude) * Math.sin(declination)
    - Math.sin(latitude) * Math.cos(declination) * Math.cos(hourAngle);
  const up = Math.sin(latitude) * Math.sin(declination)
    + Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
  const orientation = (settings.north % 360) * rad;
  const direction = Object.freeze({
    x: east * Math.cos(orientation) + north * Math.sin(orientation),
    y: up,
    z: east * Math.sin(orientation) - north * Math.cos(orientation),
  });
  const altitudeDegrees = Math.asin(clamp(up, -1, 1)) / rad;
  const azimuthDegrees = (Math.atan2(east, north) / rad + 360) % 360;
  const daylight = up > 1e-10;
  return Object.freeze({settings, direction, altitudeDegrees, azimuthDegrees,
    declinationDegrees: declination / rad, daylight,
    directIntensity: daylight ? up * 3.5 : 0,
    skyBlend: clamp((altitudeDegrees + 6) / 12, 0, 1),
  });
}

export function formatSolarTime(time: number): string {
  if (!Number.isFinite(time) || time < 0 || time > 24) throw new SunlightInputError('time', '太阳时必须在 0–24 小时之间。');
  const minutes = Math.round(time * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function formatSolarDate(day: number): string {
  if (!Number.isInteger(day) || day < 1 || day > 365) throw new SunlightInputError('day', '日期必须是非闰年的第 1–365 天。');
  const lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let month = 0, date = day;
  while (date > lengths[month]) date -= lengths[month++];
  return `${String(month + 1).padStart(2, '0')}月${String(date).padStart(2, '0')}日`;
}
