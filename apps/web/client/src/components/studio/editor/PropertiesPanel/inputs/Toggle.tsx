export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
    return (
        <button
            type="button"
            className={`relative inline-flex h-4 w-7 items-center rounded-full border border-transparent transition ${
                value ? 'bg-[var(--cs-accent)]' : 'bg-[var(--cs-feint-solid)]'
            }`}
            onClick={() => onChange(!value)}
        >
            <span
                className={`block h-3 w-3 rounded-full bg-white shadow-sm transition ${
                    value ? 'translate-x-[13px]' : 'translate-x-[2px]'
                }`}
            />
        </button>
    );
}
