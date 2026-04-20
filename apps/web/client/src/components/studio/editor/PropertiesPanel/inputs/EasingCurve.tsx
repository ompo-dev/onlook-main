import { useMemo } from 'react';
import { cubicBezier, mix } from 'framer-motion';

interface EasingCurveProps {
  curve: [number, number, number, number];
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

export function EasingCurve({
  curve,
  color = '#fff',
  width,
  height,
  left = 0,
  top = 0,
  right = width,
  bottom = height,
  axisWidth = 1,
  axisColor,
  pathWidth = 3,
}: EasingCurveProps) {
  const drawableWidth = right - left;
  const drawableHeight = bottom - top;

  const d = useMemo(() => {
    const easingFunction = cubicBezier(...curve);
    let output = `M ${left},${bottom} `;
    for (let i = 0; i <= drawableWidth; i++) {
      const x = left + i;
      const y = top + mix(drawableHeight, 0, easingFunction(i / drawableWidth));
      output += `L ${x},${y.toFixed(3)} `;
    }
    return output;
  }, [curve, drawableWidth, drawableHeight, left, top, bottom]);

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
