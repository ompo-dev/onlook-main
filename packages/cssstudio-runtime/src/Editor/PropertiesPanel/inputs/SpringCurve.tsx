import { useMemo } from 'react';
import { mix } from 'framer-motion';
import { defaultSpring, makeSpring, type SpringConfig } from '../../utils/spring';

interface SpringCurveProps {
  spring: SpringConfig;
  color?: string;
  width: number;
  height: number;
  left?: number;
  top?: number;
  right?: number;
  bottom?: number;
  axisWidth?: number;
  axisColor?: string;
  pathWidth?: number;
}

export function SpringCurve({
  spring,
  color = '#fff',
  width,
  height,
  left = 0,
  top = 0,
  right = width,
  bottom = height,
  axisWidth = 1,
  axisColor,
  pathWidth = 2,
}: SpringCurveProps) {
  const drawableWidth = right - left;
  const drawableHeight = bottom - top;

  const springConfig = useMemo(() => ({ ...defaultSpring, ...spring }), [spring]);

  const d = useMemo(() => {
    const springGenerator = makeSpring(springConfig);
    const totalDurationMs = (springGenerator as any).calculatedDuration || 1000;
    let output = `M ${left},${bottom} `;
    let minValue = 0;
    let maxValue = 1;
    const values: number[] = [];
    for (let i = 0; i <= drawableWidth; i++) {
      const progress = i / drawableWidth;
      const time = progress * totalDurationMs;
      const state = springGenerator.next(time);
      values.push(state.value);
      minValue = Math.min(minValue, state.value);
      maxValue = Math.max(maxValue, state.value);
    }
    const range = Math.max(maxValue - minValue, 1);
    for (let i = 0; i <= drawableWidth; i++) {
      const x = left + i;
      const normalizedValue = (values[i] - minValue) / range;
      const y = top + mix(drawableHeight, 0, normalizedValue);
      output += `L ${x},${y.toFixed(3)} `;
    }
    return output;
  }, [springConfig, drawableWidth, drawableHeight, left, top, bottom]);

  const borderPoints = `${left},${top} ${left},${bottom} ${right},${bottom}`;

  return (
    <>
      {axisColor && (
        <polyline fill="none" stroke={axisColor} strokeWidth={axisWidth} points={borderPoints} />
      )}
      <path d={d} fill="none" stroke={color} strokeWidth={pathWidth} strokeLinecap="round" />
    </>
  );
}
