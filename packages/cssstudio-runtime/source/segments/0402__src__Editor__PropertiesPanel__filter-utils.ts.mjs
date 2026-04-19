// src/Editor/PropertiesPanel/filter-utils.ts
import { createContext as createContext7, useContext as useContext9 } from "react";
var FilterContext = createContext7("");
function useFilter() {
  return useContext9(FilterContext);
}
function matchesFilter(displayName, filter2) {
  if (!filter2) return true;
  return displayName.toLowerCase().includes(filter2.toLowerCase());
}

