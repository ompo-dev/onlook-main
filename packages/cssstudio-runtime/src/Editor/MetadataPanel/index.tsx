import { useCallback, useEffect, useState } from 'react';
import styles from './MetadataPanel.module.css';

interface PageMetadata {
    title?: string;
    description?: string;
    charset?: string;
    viewport?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    favicon?: string;
    [key: string]: string | undefined;
}

interface FieldDef {
    field: string;
    label: string;
    multiline?: boolean;
}

const GENERAL_FIELDS: FieldDef[] = [
    { field: 'title', label: 'Title' },
    { field: 'description', label: 'Description', multiline: true },
    { field: 'charset', label: 'Charset' },
    { field: 'viewport', label: 'Viewport' },
];

const OG_FIELDS: FieldDef[] = [
    { field: 'ogTitle', label: 'Title' },
    { field: 'ogDescription', label: 'Description', multiline: true },
    { field: 'ogImage', label: 'Image' },
];

const LINK_FIELDS: FieldDef[] = [
    { field: 'favicon', label: 'Favicon' },
];

interface MetadataPanelProps {
    fetchMetadata: () => PageMetadata;
    onMetadataChange: (field: string, value: string) => void;
}

export function MetadataPanel({ fetchMetadata, onMetadataChange }: MetadataPanelProps) {
    const [metadata, setMetadata] = useState<PageMetadata>(() => fetchMetadata());

    useEffect(() => { setMetadata(fetchMetadata()); }, [fetchMetadata]);

    const handleChange = useCallback(
        (field: string, value: string) => {
            setMetadata((prev) => ({ ...prev, [field]: value }));
            onMetadataChange(field, value);
        },
        [onMetadataChange],
    );

    const renderFields = (fields: FieldDef[]) =>
        fields.map(({ field, label, multiline }) => (
            <MetaField
                key={field}
                label={label}
                value={metadata[field] ?? ''}
                multiline={multiline}
                onChange={(v) => handleChange(field, v)}
            />
        ));

    return (
        <div className={styles.panel}>
            <MetaSection title="General">{renderFields(GENERAL_FIELDS)}</MetaSection>
            <MetaSection title="Social">{renderFields(OG_FIELDS)}</MetaSection>
            <MetaSection title="Links">{renderFields(LINK_FIELDS)}</MetaSection>
        </div>
    );
}

function MetaSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 8 }}>
            <div style={{ padding: '6px 12px', fontSize: 11, fontWeight: 600, color: 'var(--cs-secondary-text)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</div>
            {children}
        </div>
    );
}

function MetaField({ label, value, multiline, onChange }: { label: string; value: string; multiline?: boolean; onChange: (v: string) => void }) {
    const inputStyle: React.CSSProperties = {
        flex: 1,
        background: 'var(--cs-input-bg)',
        border: '1px solid var(--cs-input-border)',
        borderRadius: 4,
        color: 'var(--cs-foreground)',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        outline: 'none',
        padding: '3px 6px',
        resize: multiline ? 'vertical' : 'none',
        minHeight: multiline ? 48 : 'auto',
    };
    return (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '3px 12px' }}>
            <span style={{ color: 'var(--cs-label-text)', fontSize: 11, minWidth: 80, flexShrink: 0 }}>{label}</span>
            {multiline ? (
                <textarea style={inputStyle} value={value} onChange={(e) => onChange(e.target.value)} rows={2} />
            ) : (
                <input style={inputStyle} type="text" value={value} onChange={(e) => onChange(e.target.value)} />
            )}
        </div>
    );
}
