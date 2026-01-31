import TextField from '@mui/material/TextField';
import { useMemo, useState } from 'react';

function isJsonLike(v: unknown) {
  return (typeof v === 'object' && v !== null) || Array.isArray(v);
}
function pretty(v: unknown) {
  if (typeof v === 'undefined') return '';
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v, null, 2); } catch { return String(v); }
}
function tryParseJson(s: string) {
  try {
    if (s.trim() === '') return { ok: true as const, value: '' };
    return { ok: true as const, value: JSON.parse(s) };
  } catch (e: any) {
    return { ok: false as const, error: e };
  }
}

type JsonAwareTextFieldProps = {
  label?: string;
  value: unknown;                      // kommt aus updatedObject[x.column_name]
  onCommit: (next: unknown) => void;   // schreibt in updatedObject
  placeholder?: string;
  disabled?: boolean;
  minRows?: number;
};

export function JsonAwareTextField({
  label,
  value,
  onCommit,
  placeholder,
  disabled,
  minRows = 3,
}: JsonAwareTextFieldProps) {
  const displayValue = useMemo(() => (isJsonLike(value) ? pretty(value) : (value as any) ?? ''), [value]);

  // nur im Editiermodus pflegen wir eigenen Raw-Text
  const [isEditing, setIsEditing] = useState(false);
  const [raw, setRaw] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const startEdit = () => {
    setIsEditing(true);
    setRaw(displayValue);     // initial befüllen – kein Effect nötig
    setError(null);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setError(null);
  };

  const commit = () => {
    const text = raw;
    const looksJson = text.trim().startsWith('{') || text.trim().startsWith('[');
    if (looksJson) {
      const res = tryParseJson(text);
      if (!res.ok) {
        setError('Ungültiges JSON');
        return;
      }
      onCommit(res.value);
    } else {
      onCommit(text);
    }
    setIsEditing(false);
    setError(null);
  };

  return (
    <TextField
      label={label}
      fullWidth
      multiline
      minRows={minRows}
      value={isEditing ? raw : displayValue}
      onFocus={startEdit}
      onChange={(e) => {
        const next = e.target.value;
        setRaw(next);
        // optional: live validieren, aber nicht committen
        if (next.trim().startsWith('{') || next.trim().startsWith('[')) {
          const res = tryParseJson(next);
          setError(res.ok ? null : 'Ungültiges JSON');
        } else {
          setError(null);
        }
      }}
      onBlur={commit}
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelEdit();
        }
      }}
      variant="standard"
      margin="normal"
      error={!!error}
      helperText={error ?? (isJsonLike(value) ? 'JSON erkannt • formatiert' : 'Text')}
      inputProps={{
        spellCheck: 'false',
        style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', whiteSpace: 'pre' },
      }}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
}
