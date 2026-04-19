export interface Keyframe {
  offset: number;
  [key: string]: unknown;
}

export function sortKeyframesByOffset<T extends Keyframe>(keyframes: Record<string, T>): T[] {
  return Object.values(keyframes).sort((a, b) => a.offset - b.offset);
}
