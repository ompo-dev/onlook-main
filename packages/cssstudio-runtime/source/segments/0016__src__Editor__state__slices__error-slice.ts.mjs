// src/Editor/state/slices/error-slice.ts
var createErrorSlice = (set2, _get) => ({
  panic: null,
  question: null,
  setPanic: (panic) => set2((state2) => {
    state2.panic = panic;
  }),
  setQuestion: (question) => set2((state2) => {
    state2.question = question;
  })
});

