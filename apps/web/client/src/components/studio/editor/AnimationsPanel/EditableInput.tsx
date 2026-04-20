import { useState, useEffect, useRef } from 'react';
import styles from './AnimationsPanel.module.css';

interface EditableInputProps {
    initialValue?: string;
    placeholder?: string;
    className?: string;
    validate?: (v: string) => string;
    onCommit: (value: string) => void;
    onCancel?: () => void;
}

export function EditableInput({ initialValue = '', placeholder, className, validate, onCommit, onCancel }: EditableInputProps) {
    const [value, setValue] = useState(initialValue);
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => {
        ref.current?.focus();
        if (initialValue) ref.current?.select();
    }, []);

    return (
        <input
            ref={ref}
            className={className ?? styles.nameInput}
            value={value}
            onChange={(e) => setValue(validate ? validate(e.target.value) : e.target.value)}
            onBlur={() => {
                if (value && value !== initialValue) onCommit(value);
                else onCancel ? onCancel() : onCommit(initialValue);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter') onCommit(value);
                if (e.key === 'Escape') onCancel ? onCancel() : onCommit(initialValue);
            }}
            onClick={(e) => e.stopPropagation()}
            placeholder={placeholder}
        />
    );
}
