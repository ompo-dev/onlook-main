// src/Editor/state/slices/ui-slice.ts
var createUiSlice = (set2, _get) => ({
  splitAxis: {},
  splitCorners: {},
  showMinMax: {},
  toggleSplitAxis: (prop) => set2((state2) => {
    state2.splitAxis[prop] = !state2.splitAxis[prop];
  }),
  toggleSplitCorners: (prop) => set2((state2) => {
    state2.splitCorners[prop] = !state2.splitCorners[prop];
  }),
  toggleMinMax: (prop, which) => set2((state2) => {
    const current3 = state2.showMinMax[prop];
    if (current3 === which) {
      state2.showMinMax[prop] = null;
    } else if (current3 === null || current3 === void 0) {
      state2.showMinMax[prop] = which;
    } else if (current3 !== which) {
      state2.showMinMax[prop] = "both";
    } else {
      state2.showMinMax[prop] = null;
    }
  })
});

