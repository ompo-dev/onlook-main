import { classifyTokenValue } from './classify-token-value';

export function isColorValue(v: string): boolean {
  return classifyTokenValue(v) === 'color';
}
