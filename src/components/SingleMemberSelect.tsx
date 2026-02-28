"use client";

import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/utils/getInitials';
import { Member } from '@/types';

interface SingleMemberSelectProps {
  /** All available members to pick from */
  options: Member[];
  /** Currently selected member ID */
  value: number | null;
  /** Callback when selection changes */
  onChange: (id: number | null) => void;
  /** Label for the input */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** IDs to exclude from the available options */
  excludeIds?: number[];
  /** "No options" text */
  noOptionsText?: string;
  /** Avatar fallback background color */
  avatarColor?: string;
  /** Error state */
  error?: boolean;
  /** Size variant */
  size?: 'small' | 'medium';
  /** Whether the field is required (adds * to label) */
  required?: boolean;
}

/**
 * Reusable single member select with autocomplete search and avatar.
 * Visually consistent with MultiMemberSelect.
 */
export default function SingleMemberSelect({
  options,
  value,
  onChange,
  label,
  placeholder = 'Buscar membro...',
  disabled = false,
  excludeIds = [],
  noOptionsText = 'Nenhum membro encontrado',
  avatarColor = 'bg-blue-600',
  error = false,
  size = 'small',
  required = false,
}: SingleMemberSelectProps) {
  const filteredOptions = options.filter(m => !excludeIds.includes(m.id));
  const selectedMember = options.find(m => m.id === value) || null;

  return (
    <Autocomplete
      size={size}
      fullWidth
      disabled={disabled}
      options={filteredOptions}
      getOptionLabel={(option) => option.name}
      value={selectedMember}
      onChange={(_, newValue) => {
        onChange(newValue ? newValue.id : null);
      }}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label ? `${label}${required ? ' *' : ''}` : undefined}
          placeholder={placeholder}
          error={error}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'rgb(31 41 55)',
              borderRadius: '0.5rem',
              '& fieldset': { borderColor: error ? 'rgb(239 68 68)' : 'rgb(75 85 99)' },
              '&:hover fieldset': { borderColor: error ? 'rgb(239 68 68)' : 'rgb(107 114 128)' },
              '&.Mui-focused fieldset': { borderColor: error ? 'rgb(239 68 68)' : 'rgb(59 130 246)' },
            },
            '& .MuiInputBase-input': { color: 'white' },
            '& .MuiInputBase-input::placeholder': { color: 'rgb(156 163 175)', opacity: 1 },
            '& .MuiInputLabel-root': { color: 'rgb(156 163 175)' },
            '& .MuiInputLabel-root.Mui-focused': { color: error ? 'rgb(239 68 68)' : 'rgb(59 130 246)' },
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          <div className="flex items-center gap-2">
            <Avatar className="w-7 h-7">
              <AvatarImage src={option.photoUrl} alt={option.name} />
              <AvatarFallback className={`${avatarColor} text-white text-[10px] font-semibold`}>
                {getInitials(option.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium">{option.name}</div>
              {option.email && (
                <div className="text-xs text-gray-400">{option.email}</div>
              )}
            </div>
          </div>
        </li>
      )}
      ListboxProps={{ style: { maxHeight: 200 } }}
      noOptionsText={noOptionsText}
      clearText="Limpar"
      openText="Abrir"
      closeText="Fechar"
    />
  );
}
