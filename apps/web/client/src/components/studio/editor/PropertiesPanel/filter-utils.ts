import { createContext, useContext } from 'react';

export const FilterContext = createContext('');

export function useFilter(): string {
  return useContext(FilterContext);
}

export function matchesFilter(displayName: string, filter: string): boolean {
  if (!filter) return true;
  return displayName.toLowerCase().includes(filter.toLowerCase());
}
