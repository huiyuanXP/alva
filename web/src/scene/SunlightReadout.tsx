import React from 'react';
import {evaluateSunlight, formatSolarDate, formatSolarTime, type SunlightSettings} from '../../../packages/contracts/alva/sunlight.js';
import './sunlight.css';

/** Readout of the same inputs used by the renderer; it never changes project data. */
export function SunlightReadout({settings, assumption}: {settings: SunlightSettings; assumption: string}) {
  const state = evaluateSunlight(settings);
  const latitude = `${settings.latitude < 0 ? '南纬' : '北纬'} ${Math.abs(settings.latitude).toFixed(1)}°`;
  return <div className="sunlight-readout" data-testid="sunlight-readout" aria-label="日照参数与估算假设">
    <strong>真太阳时 {formatSolarTime(settings.time)} · {formatSolarDate(settings.day)}</strong>
    <span>{state.daylight ? `太阳高度 ${state.altitudeDegrees.toFixed(1)}° · 方位 ${state.azimuthDegrees.toFixed(1)}°` : '夜间 · 太阳直射与日光阴影已关闭'}</span>
    <span>{latitude} · 北向 {settings.north.toFixed(1)}°（图上方为 0°，顺时针）</span>
    <small>非闰年 365 天 · 太阳时不是钟表时间 · 示意估算，非现场精确日照</small>
    <small>{assumption}</small>
  </div>;
}
