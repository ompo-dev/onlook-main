import { spring } from 'framer-motion';

export interface SpringConfig {
  duration?: number;
  bounce?: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
  type?: 'time' | 'physics';
}

export interface SpringCssResult {
  duration: string;
  timingFunction: string;
  comment: string;
}

export const defaultSpring: Required<SpringConfig> = {
  duration: 0.3,
  bounce: 0.2,
  stiffness: 1000,
  damping: 100,
  mass: 1,
  type: 'time',
};

export function makeSpring(config: SpringConfig) {
  const resolved = { ...defaultSpring, ...config };
  let options: Record<string, unknown> = { keyframes: [0, 1] };
  if (resolved.type === 'physics') {
    options = {
      ...options,
      stiffness: resolved.stiffness,
      damping: resolved.damping,
      mass: resolved.mass,
    };
  } else {
    options = {
      ...options,
      bounce: resolved.bounce,
      duration: resolved.duration * 1000,
    };
  }
  return spring(options as Parameters<typeof spring>[0]);
}

export function toSpringComment(config: SpringConfig): string {
  const resolved = { ...defaultSpring, ...config };
  const parts: string[] = [];
  if (resolved.type === 'physics') {
    parts.push(`stiffness=${resolved.stiffness}`);
    parts.push(`damping=${resolved.damping}`);
    parts.push(`mass=${resolved.mass}`);
  } else {
    parts.push(`bounce=${resolved.bounce}`);
    parts.push(`duration=${resolved.duration}`);
  }
  return `/* motion-spring: ${parts.join(' ')} */`;
}

export function springToCss(config: SpringConfig): SpringCssResult {
  const springEasing = makeSpring(config);
  const comment = toSpringComment(config);
  let springStr = springEasing.toString();
  const msMatch = springStr.match(/^(\d+)ms\s+/);
  if (msMatch) {
    const seconds = parseInt(msMatch[1]) / 1000;
    const timingFunction = springStr.replace(/^\d+ms\s+/, '');
    return {
      duration: `${seconds}s`,
      timingFunction,
      comment,
    };
  }
  return {
    duration: '0.3s',
    timingFunction: springStr,
    comment,
  };
}
