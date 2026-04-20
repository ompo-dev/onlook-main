import { motion } from 'motion/react';

export function TickIcon({ color = 'currentColor', delay = 0.1 }: { color?: string; delay?: number }) {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <motion.path
                d="M4 12l5 5L20 6"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, delay }}
            />
        </svg>
    );
}
