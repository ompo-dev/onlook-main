// src/Editor/state/use-undo.ts
var useUndoStore = create()((set2, get) => ({
  past: [],
  future: [],
  push: (op) => {
    const { past } = get();
    const last = past[past.length - 1];
    if (last && last.type !== "batch" && last.type === op.type && last.nodeId === op.nodeId && last.property === op.property) {
      const merged = { ...last, newValue: op.newValue };
      if (op.newAnimSnapshot) merged.newAnimSnapshot = op.newAnimSnapshot;
      set2({
        past: [...past.slice(0, -1), merged],
        future: []
      });
    } else {
      set2({
        past: [...past, op],
        future: []
      });
    }
  },
  pushDom: (op) => {
    const { past } = get();
    set2({
      past: [...past, op],
      future: []
    });
  },
  pushBatch: (ops) => {
    if (ops.length === 0) return;
    if (ops.length === 1) {
      get().push(ops[0]);
      return;
    }
    const { past } = get();
    set2({
      past: [...past, { type: "batch", operations: ops }],
      future: []
    });
  },
  undo: () => {
    const { past, future } = get();
    if (past.length === 0) return void 0;
    const entry = past[past.length - 1];
    set2({
      past: past.slice(0, -1),
      future: [entry, ...future]
    });
    return entry;
  },
  redo: () => {
    const { past, future } = get();
    if (future.length === 0) return void 0;
    const entry = future[0];
    set2({
      past: [...past, entry],
      future: future.slice(1)
    });
    return entry;
  },
  clear: () => set2({ past: [], future: [] })
}));

