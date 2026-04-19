import { motion } from 'motion/react';

const SIZE = 16;
const STROKE_PROPS = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
};

export function ApplyIcon() {
    return (
        <svg width={SIZE} height={SIZE} viewBox="0 0 24 24" {...STROKE_PROPS}>
            <circle cx="12" cy="12" r="10" />
            <path d="m16 12-4-4-4 4" />
            <path d="M12 16V8" />
        </svg>
    );
}

export function ApplySpinnerIcon() {
    return (
        <svg width={SIZE} height={SIZE} viewBox="0 0 24 24" {...STROKE_PROPS}>
            <motion.g
                style={{ transformOrigin: '12px 12px' }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
                <path d="M12 2a10 10 0 0 1 7.38 16.75" />
                <path d="M2.5 8.875a10 10 0 0 0-.5 3" />
                <path d="M2.83 16a10 10 0 0 0 2.43 3.4" />
                <path d="M4.636 5.235a10 10 0 0 1 .891-.857" />
                <path d="M8.644 21.42a10 10 0 0 0 7.631-.38" />
            </motion.g>
            <path d="m16 12-4-4-4 4" />
            <path d="M12 16V8" />
        </svg>
    );
}
