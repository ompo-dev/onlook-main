'use client';

import { useEffect, useRef } from 'react';

const BRAILLE_FRAMES = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
const BRAILLE_FRAME_MS = 80;

export function createBrailleSpinnerEl(size = 12) {
    const el = document.createElement('span');
    el.style.fontFamily = 'var(--cs-font-mono, ui-monospace, monospace)';
    el.style.fontSize = `${size}px`;
    el.style.width = '1ch';
    el.style.display = 'inline-block';
    el.style.textAlign = 'center';
    el.style.fontVariantNumeric = 'tabular-nums';
    el.style.lineHeight = '1';
    el.textContent = BRAILLE_FRAMES[0] ?? '⠋';

    let index = 0;
    const timer = window.setInterval(() => {
        index = (index + 1) % BRAILLE_FRAMES.length;
        el.innerText = BRAILLE_FRAMES[index] ?? BRAILLE_FRAMES[0] ?? '⠋';
    }, BRAILLE_FRAME_MS);

    return {
        el,
        destroy: () => window.clearInterval(timer),
    };
}

export function BrailleSpinner({
    size = 12,
    active = true,
    className,
}: {
    size?: number;
    active?: boolean;
    className?: string;
}) {
    const ref = useRef<HTMLSpanElement | null>(null);

    useEffect(() => {
        if (!active) {
            return;
        }
        const el = ref.current;
        if (!el) {
            return;
        }

        let index = 0;
        const timer = window.setInterval(() => {
            index = (index + 1) % BRAILLE_FRAMES.length;
            el.innerText = BRAILLE_FRAMES[index] ?? BRAILLE_FRAMES[0] ?? '⠋';
        }, BRAILLE_FRAME_MS);

        return () => window.clearInterval(timer);
    }, [active]);

    return (
        <span
            ref={ref}
            className={className}
            style={{
                fontFamily: 'var(--cs-font-mono, ui-monospace, monospace)',
                fontSize: size,
                width: '1ch',
                display: 'inline-block',
                textAlign: 'center',
                fontVariantNumeric: 'tabular-nums',
                lineHeight: 1,
            }}
        >
            {BRAILLE_FRAMES[0] ?? '⠋'}
        </span>
    );
}
