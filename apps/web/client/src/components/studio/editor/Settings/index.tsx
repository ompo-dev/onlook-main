import { useCallback, useEffect, useRef, useState } from 'react';
import { IconButton } from '../Toolbar/IconButton';
import { Dropdown } from '../Dropdown';
import { Toggle } from '../PropertiesPanel/inputs/Toggle';
import { useStore } from '../state/use-store';
import { syncThemeToPage } from '../state/dom-bridge';
import styles from './Settings.module.css';

interface SchemeColors {
    layer: string;
    black: string;
    feintSolid: string;
    feintText: string;
    border?: string;
}

interface Scheme {
    name: string;
    color: string;
    accent: string;
    layer: string;
    black: string;
    feintSolid: string;
    feintText: string;
    hc: SchemeColors & { border: string };
    light: SchemeColors & { accent: string };
}

const SCHEMES: Scheme[] = [
    { name: 'indigo', color: '#7c6af6', accent: '#8df0cc', layer: '#1a1a28', black: '#141422', feintSolid: '#222236', feintText: '#8888a8', hc: { layer: '#12101e', black: '#100e1c', feintSolid: '#1c1a30', border: 'rgba(255,255,255,0.12)', feintText: '#8888a0' }, light: { layer: '#f4f4f8', black: '#ffffff', feintSolid: '#e4e4ec', feintText: '#707088', accent: '#7c6af6' } },
    { name: 'emerald', color: '#10b981', accent: '#f0a08d', layer: '#142420', black: '#101e1a', feintSolid: '#1c302a', feintText: '#6a9a88', hc: { layer: '#0c1812', black: '#0a1410', feintSolid: '#142420', border: 'rgba(255,255,255,0.12)', feintText: '#7a9a8c' }, light: { layer: '#f2f8f6', black: '#ffffff', feintSolid: '#dceee8', feintText: '#4a7a68', accent: '#10b981' } },
    { name: 'rose', color: '#fb7185', accent: '#5eead4', layer: '#241420', black: '#1e101a', feintSolid: '#301c28', feintText: '#9a6a78', hc: { layer: '#160c10', black: '#140a0e', feintSolid: '#261820', border: 'rgba(255,255,255,0.12)', feintText: '#9a7a88' }, light: { layer: '#f8f2f6', black: '#ffffff', feintSolid: '#eedce8', feintText: '#8a5a72', accent: '#fb7185' } },
    { name: 'amber', color: '#f59e0b', accent: '#a78bfa', layer: '#242014', black: '#1e1a10', feintSolid: '#302a1c', feintText: '#9a8a60', hc: { layer: '#16120a', black: '#141008', feintSolid: '#242010', border: 'rgba(255,255,255,0.12)', feintText: '#9a9278' }, light: { layer: '#f8f6f0', black: '#ffffff', feintSolid: '#eee8d8', feintText: '#7a6a40', accent: '#f59e0b' } },
    { name: 'ocean', color: '#38bdf8', accent: '#f97066', layer: '#142030', black: '#101a28', feintSolid: '#1c2838', feintText: '#6a88a0', hc: { layer: '#0a1220', black: '#081018', feintSolid: '#102030', border: 'rgba(255,255,255,0.12)', feintText: '#6a8aa0' }, light: { layer: '#f0f4f8', black: '#ffffff', feintSolid: '#dce4ee', feintText: '#5a7088', accent: '#38bdf8' } },
];

const STORAGE_KEY = 'cssstudio-settings';

interface Settings {
    scheme: string;
    highContrast: boolean;
    autoApply: boolean;
    appearance: 'auto' | 'dark' | 'light';
}

let DEFAULT_SETTINGS: Settings = { scheme: 'indigo', highContrast: false, autoApply: false, appearance: 'auto' };

export function setDefaultSettings(overrides: Partial<Settings>) {
    DEFAULT_SETTINGS = { ...DEFAULT_SETTINGS, ...overrides };
}

function resolveMode(appearance: string): 'dark' | 'light' {
    if (appearance !== 'auto') return appearance as 'dark' | 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyToDOM(settings: Settings) {
    const host = document.querySelector('css-studio-panel') as HTMLElement | null;
    if (!host) return;
    const scheme = SCHEMES.find((s) => s.name === settings.scheme) ?? SCHEMES[0];
    const hc = settings.highContrast;
    const mode = resolveMode(settings.appearance);
    const isLight = mode === 'light';

    if (isLight) {
        host.style.setProperty('--cs-accent', scheme.light.accent);
        host.style.setProperty('--cs-layer', scheme.light.layer);
        host.style.setProperty('--cs-black', scheme.light.black);
        host.style.setProperty('--cs-feint-solid', scheme.light.feintSolid);
        host.style.setProperty('--cs-feint-text', scheme.light.feintText);
    } else {
        host.style.setProperty('--cs-accent', scheme.accent);
        host.style.setProperty('--cs-layer', hc ? scheme.hc.layer : scheme.layer);
        host.style.setProperty('--cs-black', hc ? scheme.hc.black : scheme.black);
        host.style.setProperty('--cs-feint-solid', hc ? scheme.hc.feintSolid : scheme.feintSolid);
        host.style.setProperty('--cs-feint-text', hc ? scheme.hc.feintText : scheme.feintText);
    }

    const fg = isLight ? '#1a1a2e' : '#fff';
    host.style.setProperty('--cs-foreground', fg);
    host.style.setProperty('--cs-white', fg);
    host.style.setProperty('--cs-on-accent', isLight ? '#fff' : '#000');
    host.style.setProperty('--cs-red', isLight ? '#dc2626' : '#ff1231');
    host.style.setProperty('--cs-feint', isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)');
    host.style.setProperty('--cs-border', isLight ? (hc ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.10)') : (hc ? scheme.hc.border : 'rgba(255,255,255,0.10)'));
    host.style.setProperty('--cs-label-text', isLight ? (hc ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)') : (hc ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.6)'));
    host.style.setProperty('--cs-input-bg', isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)');
    host.style.setProperty('--cs-input-bg-hover', isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.12)');
    host.style.setProperty('--cs-input-border', isLight ? (hc ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.12)') : 'rgba(255,255,255,0.08)');
    host.style.setProperty('--cs-input-border-strong', isLight ? (hc ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.18)') : 'rgba(255,255,255,0.15)');
    host.style.setProperty('--cs-icon-muted', isLight ? (hc ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)') : (hc ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.3)'));
    host.style.setProperty('--cs-icon-muted-hover', isLight ? (hc ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.65)') : 'rgba(255,255,255,0.8)');
    host.style.setProperty('--cs-secondary-text', isLight ? (hc ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.45)') : 'rgba(255,255,255,0.5)');
    host.style.setProperty('--cs-secondary-text-hover', isLight ? (hc ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)') : 'rgba(255,255,255,0.7)');
    host.style.setProperty('--cs-checker', isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)');
    host.style.setProperty('color-scheme', mode);
    const feintText = isLight ? scheme.light.feintText : (hc ? scheme.hc.feintText : scheme.feintText);
    const accent = isLight ? scheme.light.accent : scheme.accent;
    host.style.setProperty('--cs-dark-text', `color-mix(in srgb, ${fg} 70%, ${feintText})`);
    host.style.setProperty('--cs-selected-tree-bg', `color-mix(in srgb, ${accent} 8%, transparent)`);
}

function pushThemeToPage(settings: Settings) {
    const scheme = SCHEMES.find((s) => s.name === settings.scheme) ?? SCHEMES[0];
    const hc = settings.highContrast;
    const mode = resolveMode(settings.appearance);
    const isLight = mode === 'light';
    syncThemeToPage({
        layer: isLight ? scheme.light.layer : (hc ? scheme.hc.layer : scheme.layer),
        black: isLight ? scheme.light.black : (hc ? scheme.hc.black : scheme.black),
        accent: isLight ? scheme.light.accent : scheme.accent,
        border: isLight ? (hc ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.10)') : (hc ? scheme.hc.border : 'rgba(255,255,255,0.10)'),
        white: isLight ? '#1a1a2e' : '#fff',
        feintText: isLight ? scheme.light.feintText : (hc ? scheme.hc.feintText : scheme.feintText),
        foreground: isLight ? '#1a1a2e' : '#fff',
        feint: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
    });
}

function persist(settings: Settings) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

const APPEARANCES = ['auto', 'dark', 'light'] as const;

export function Settings() {
    const [open, setOpen] = useState(false);
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const buttonRef = useRef<HTMLSpanElement>(null);
    const mcpStatus = useStore((s) => s.mcpStatus);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const saved = raw ? JSON.parse(raw) : null;
            const s: Settings = saved ? { ...DEFAULT_SETTINGS, ...saved } : DEFAULT_SETTINGS;
            setSettings(s);
            applyToDOM(s);
            pushThemeToPage(s);
            useStore.getState().setAutoApply(s.autoApply);
        } catch {
            applyToDOM(DEFAULT_SETTINGS);
        }
    }, []);

    useEffect(() => {
        if (settings.appearance !== 'auto') return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => { applyToDOM(settings); pushThemeToPage(settings); };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [settings]);

    const update = useCallback((partial: Partial<Settings>) => {
        setSettings((prev) => {
            const next = { ...prev, ...partial };
            persist(next);
            applyToDOM(next);
            if ('scheme' in partial || 'highContrast' in partial || 'appearance' in partial) {
                pushThemeToPage(next);
            }
            if ('autoApply' in partial) {
                useStore.getState().setAutoApply(next.autoApply);
            }
            return next;
        });
    }, []);

    return (
        <span ref={buttonRef} className={styles.container}>
            <IconButton active={open} onClick={() => setOpen((v) => !v)} title="Settings">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                    <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
                    <circle cx="12" cy="12" r="3" />
                </svg>
            </IconButton>
            <Dropdown open={open} onClose={() => setOpen(false)} anchorRef={buttonRef}>
                <div className={styles.row}>
                    <span className={styles.label}>Theme</span>
                    <div className={styles.swatches}>
                        {SCHEMES.map((s) => (
                            <button
                                key={s.name}
                                className={`${styles.swatch} ${settings.scheme === s.name ? styles.activeSwatch : ''}`}
                                style={{ background: s.color }}
                                onClick={() => update({ scheme: s.name })}
                                title={s.name}
                            />
                        ))}
                    </div>
                </div>
                <div className={styles.row}>
                    <span className={styles.label}>Appearance</span>
                    <div className={styles.modeButtons}>
                        {APPEARANCES.map((mode) => (
                            <button
                                key={mode}
                                className={`${styles.modeButton} ${settings.appearance === mode ? styles.modeButtonActive : ''}`}
                                onClick={() => update({ appearance: mode })}
                            >
                                {mode[0].toUpperCase() + mode.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
                <div className={styles.row}>
                    <span className={styles.label}>High contrast</span>
                    <Toggle value={settings.highContrast} onChange={(v) => update({ highContrast: v })} />
                </div>
                {mcpStatus === 'connected' && (
                    <div className={styles.row}>
                        <span className={styles.label}>Auto apply</span>
                        <Toggle value={settings.autoApply} onChange={(v) => update({ autoApply: v })} />
                    </div>
                )}
            </Dropdown>
        </span>
    );
}
