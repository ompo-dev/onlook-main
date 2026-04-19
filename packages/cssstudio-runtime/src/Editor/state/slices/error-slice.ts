import type { StateCreator } from 'zustand';

export interface PanicInfo {
    reason: string;
    element?: string;
}

export interface QuestionInfo {
    question: string;
    options: string[];
}

export interface ErrorSlice {
    panic: PanicInfo | null;
    question: QuestionInfo | null;
    setPanic: (panic: PanicInfo | null) => void;
    setQuestion: (question: QuestionInfo | null) => void;
}

export const createErrorSlice: StateCreator<any, [['zustand/immer', never]], [], ErrorSlice> = (set) => ({
    panic: null,
    question: null,
    setPanic: (panic) => set((s: any) => { s.panic = panic; }),
    setQuestion: (question) => set((s: any) => { s.question = question; }),
});
