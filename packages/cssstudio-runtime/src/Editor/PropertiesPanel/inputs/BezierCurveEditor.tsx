import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { resize } from 'framer-motion';
import { EasingCurve } from './EasingCurve';

function progress(from: number, to: number, value: number): number {
  const toFromDifference = to - from;
  return toFromDifference === 0 ? 1 : (value - from) / toFromDifference;
}

interface BezierCurveEditorProps {
  color?: string;
  axisColor?: string;
  axisWidth?: number;
  pathWidth?: number;
  controlRadius?: number;
  hitRadius?: number;
  tetherWidth?: number;
  tetherDashArray?: string;
  curve: [number, number, number, number];
  onChange: (curve: [number, number, number, number]) => void;
}

const hitStyle: React.CSSProperties = { touchAction: 'none', cursor: 'grab', outline: 'none' };

export function BezierCurveEditor({
  color = '#fff',
  axisColor = '#fff',
  axisWidth = 2,
  pathWidth = 2,
  controlRadius = 5,
  hitRadius = 25,
  tetherWidth = 1,
  tetherDashArray = '4, 2',
  curve,
  onChange,
}: BezierCurveEditorProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [focusedPoint, setFocusedPoint] = useState<0 | 1 | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const point1 = useRef<SVGCircleElement>(null);
  const point2 = useRef<SVGCircleElement>(null);

  useEffect(() => {
    const preventDefault = (e: Event) => e.preventDefault();
    point1.current?.addEventListener('touchstart', preventDefault);
    point2.current?.addEventListener('touchstart', preventDefault);
    return () => {
      point1.current?.removeEventListener('touchstart', preventDefault);
      point2.current?.removeEventListener('touchstart', preventDefault);
    };
  }, []);

  const [x1, y1, x2, y2] = curve;
  const x1Pos = x1 * size.width;
  const y1Pos = size.height - y1 * size.height;
  const x2Pos = x2 * size.width;
  const y2Pos = size.height - y2 * size.height;
  const dx = x2Pos - x1Pos;
  const dy = y2Pos - y1Pos;
  const distance = Math.sqrt(dx * dx + dy * dy);

  let hit1X = x1Pos, hit1Y = y1Pos;
  let hit2X = x2Pos, hit2Y = y2Pos;
  const overlapDistance = hitRadius * 2;
  if (distance < overlapDistance && distance > 0) {
    const unitX = dx / distance, unitY = dy / distance;
    const separationNeeded = (overlapDistance - distance) / 2;
    const maxSeparation = hitRadius - controlRadius;
    const separation = Math.min(separationNeeded, maxSeparation);
    hit1X = x1Pos - unitX * separation;
    hit1Y = y1Pos - unitY * separation;
    hit2X = x2Pos + unitX * separation;
    hit2Y = y2Pos + unitY * separation;
  }

  useLayoutEffect(() => {
    if (!svg.current) return;
    const updateSize = () => {
      if (!svg.current) return;
      setSize({ width: svg.current.clientWidth, height: svg.current.clientHeight });
    };
    return resize(svg.current as any, updateSize);
  }, []);

  const drag = (pointIndex: 0 | 1, snapToCursor = false) => (startEvent: React.PointerEvent) => {
    const xi = pointIndex * 2;
    const yi = xi + 1;
    const { currentTarget, pointerId, clientX: startX, clientY: startY } = startEvent;
    let hasMoved = false;
    startEvent.preventDefault();
    startEvent.stopPropagation();
    const element = pointIndex === 0 ? point1.current : point2.current;
    if (!element) return;
    element.style.cursor = 'grabbing';
    element.setPointerCapture(pointerId);
    const svgElement = svg.current;
    if (!svgElement) return;
    const rect = svgElement.getBoundingClientRect();
    const centerX = pointIndex === 0 ? x1Pos : x2Pos;
    const centerY = pointIndex === 0 ? y1Pos : y2Pos;
    const centerXScreen = rect.left + (centerX / size.width) * rect.width;
    const centerYScreen = rect.top + (centerY / size.height) * rect.height;
    const offsetX = snapToCursor ? 0 : startX - centerXScreen;
    const offsetY = snapToCursor ? 0 : startY - centerYScreen;

    const onMove = (x: number, y: number) => {
      const newBezier = [...curve] as [number, number, number, number];
      newBezier[xi] = Math.max(0, Math.min(1, x));
      newBezier[yi] = y;
      onChange(newBezier);
    };

    function moveHandler(moveEvent: PointerEvent) {
      const { clientX, clientY } = moveEvent;
      moveEvent.stopPropagation();
      moveEvent.preventDefault();
      hasMoved = true;
      const adjustedX = clientX - offsetX;
      const adjustedY = clientY - offsetY;
      const x = progress(rect.left, rect.right, adjustedX);
      const y = progress(rect.bottom, rect.top, adjustedY);
      const xFixed = Math.round(x * 1000) / 1000;
      const yFixed = Math.round(y * 1000) / 1000;
      onMove(xFixed, yFixed);
    }

    function upHandler(upEvent: PointerEvent) {
      upEvent.stopPropagation();
      upEvent.preventDefault();
      if (!hasMoved && (currentTarget as HTMLElement).classList.contains('reset-control-point')) {
        if (pointIndex === 0) onMove(0, 0);
        else onMove(1, 1);
      }
      try { element.releasePointerCapture(pointerId); } catch {}
      element.style.cursor = 'grab';
      document.removeEventListener('pointermove', moveHandler);
      document.removeEventListener('pointerup', upHandler);
      document.removeEventListener('pointercancel', upHandler);
    }

    document.addEventListener('pointermove', moveHandler);
    document.addEventListener('pointerup', upHandler);
    document.addEventListener('pointercancel', upHandler);
  };

  const movePoint = (pointIndex: 0 | 1, deltaX: number, deltaY: number) => {
    const xi = pointIndex * 2;
    const yi = xi + 1;
    const newBezier = [...curve] as [number, number, number, number];
    newBezier[xi] = Math.round(Math.max(0, Math.min(1, curve[xi] + deltaX)) * 1000) / 1000;
    newBezier[yi] = Math.round((curve[yi] + deltaY) * 1000) / 1000;
    onChange(newBezier);
  };

  const handleKeyDown = (pointIndex: 0 | 1) => (e: React.KeyboardEvent) => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
    const increment = e.shiftKey ? 0.01 : 0.1;
    let deltaX = 0, deltaY = 0;
    if (e.key === 'ArrowUp') deltaY = increment;
    else if (e.key === 'ArrowDown') deltaY = -increment;
    else if (e.key === 'ArrowLeft') deltaX = -increment;
    else if (e.key === 'ArrowRight') deltaX = increment;
    movePoint(pointIndex, deltaX, deltaY);
  };

  return (
    <svg
      ref={svg}
      style={{ width: '100%', aspectRatio: 1, display: 'block', overflow: 'visible', position: 'relative', zIndex: 1 }}
      viewBox={`0 0 ${size.width} ${size.height}`}
    >
      <EasingCurve curve={curve} width={size.width} height={size.height} color={color} pathWidth={pathWidth} axisColor={axisColor} axisWidth={axisWidth} />
      <polyline fill="none" stroke={axisColor} strokeWidth={tetherWidth} strokeDasharray={tetherDashArray} points={`0,${size.height} ${x1Pos},${y1Pos}`} />
      <polyline fill="none" stroke={axisColor} strokeWidth={tetherWidth} strokeDasharray={tetherDashArray} points={`${size.width},0 ${x2Pos},${y2Pos}`} />
      <circle className="reset-control-point" r={controlRadius} cx={0} cy={size.height} fill={color} onPointerDown={drag(0, true)} style={{ opacity: 0.3, touchAction: 'none' }} />
      <circle className="reset-control-point" cx={size.width} cy={0} r={controlRadius} fill={color} onPointerDown={drag(1, true)} style={{ opacity: 0.3, touchAction: 'none' }} />
      <circle r={controlRadius} fill={color} cx={x1Pos} cy={y1Pos} style={{ touchAction: 'none' }} />
      <circle r={controlRadius} fill={color} cx={x2Pos} cy={y2Pos} style={{ touchAction: 'none' }} />
      {focusedPoint === 0 && <circle r={controlRadius + 3} cx={x1Pos} cy={y1Pos} fill="none" stroke={color} strokeWidth={2} style={{ pointerEvents: 'none' }} />}
      {focusedPoint === 1 && <circle r={controlRadius + 3} cx={x2Pos} cy={y2Pos} fill="none" stroke={color} strokeWidth={2} style={{ pointerEvents: 'none' }} />}
      <circle ref={point1} r={hitRadius} fill="transparent" cx={hit1X} cy={hit1Y} tabIndex={0} onPointerDown={drag(0)} onFocus={() => setFocusedPoint(0)} onBlur={() => setFocusedPoint(null)} onKeyDown={handleKeyDown(0)} style={hitStyle} />
      <circle ref={point2} r={hitRadius} fill="transparent" cx={hit2X} cy={hit2Y} tabIndex={0} onPointerDown={drag(1)} onFocus={() => setFocusedPoint(1)} onBlur={() => setFocusedPoint(null)} onKeyDown={handleKeyDown(1)} style={hitStyle} />
    </svg>
  );
}
