"use client";

import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, SelectChangeEvent, SxProps, Theme } from '@mui/material';

export interface StyledSelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface StyledSelectProps {
  /** Unique identifier for this select */
  id: string;
  /** Label text */
  label: string;
  /** Current value */
  value: string | number | '' | null;
  /** Callback when value changes */
  onChange: (value: string | number | '') => void;
  /** Available options */
  options: StyledSelectOption[];
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Whether the field is required */
  required?: boolean;
  /** Whether to show error state */
  error?: boolean;
  /** onBlur event handler */
  onBlur?: () => void;
  /** Whether to allow multiple selections */
  multiple?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Custom class */
  className?: string;
  /** Size variant */
  size?: 'small' | 'medium';
  /** Additional sx props */
  sx?: SxProps<Theme>;
}

const selectSx: SxProps<Theme> = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgb(31 41 55)',
    borderRadius: '0.5rem',
    '& fieldset': { borderColor: 'rgb(75 85 99)' },
    '&:hover fieldset': { borderColor: 'rgb(107 114 128)' },
    '&.Mui-focused fieldset': { borderColor: 'rgb(59 130 246)' },
  },
  '& .MuiSelect-select': { color: 'white' },
  '& .MuiInputLabel-root': { color: 'rgb(156 163 175)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'rgb(59 130 246)' },
  '& .MuiSvgIcon-root': { color: 'rgb(156 163 175)' },
};

const errorSelectSx: SxProps<Theme> = {
  ...selectSx,
  '& .MuiOutlinedInput-root': {
    ...(typeof selectSx === 'object' && !Array.isArray(selectSx) ? (selectSx as any)['& .MuiOutlinedInput-root'] : {}),
    '& fieldset': { borderColor: 'rgb(239 68 68)' },
    '&:hover fieldset': { borderColor: 'rgb(239 68 68)' },
    '&.Mui-focused fieldset': { borderColor: 'rgb(239 68 68)' },
  },
  '& .MuiInputLabel-root': { color: 'rgb(239 68 68)' },
};

/**
 * Styled Select component with consistent dark theme styling.
 * Wraps MUI Select with FormControl + InputLabel.
 */
export default function StyledSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  required = false,
  error = false,
  onBlur,
  fullWidth = true,
  size = 'small',
  sx: extraSx,
}: StyledSelectProps) {
  const handleChange = (e: SelectChangeEvent<string | number>) => {
    const val = e.target.value;
    onChange(val);
  };

  const displayLabel = `${label}${required ? ' *' : ''}`;
  const labelId = `${id}-label`;

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      error={error}
      disabled={disabled}
      sx={[error ? errorSelectSx : selectSx, ...(extraSx ? (Array.isArray(extraSx) ? extraSx : [extraSx]) : [])] as SxProps<Theme>}
    >
      <InputLabel id={labelId}>{displayLabel}</InputLabel>
      <Select
        labelId={labelId}
        value={value ?? ''}
        onChange={handleChange}
        onBlur={onBlur}
        label={displayLabel}
      >
        {placeholder && (
          <MenuItem value="">
            <span className="text-gray-400">{placeholder}</span>
          </MenuItem>
        )}
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
