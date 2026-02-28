"use client";

import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { FiTrash2 } from 'react-icons/fi';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/utils/getInitials';
import { Member } from '@/types';

interface MultiMemberSelectProps {
  /** All available members to pick from */
  options: Member[];
  /** Currently selected member IDs */
  selectedIds: number[];
  /** Callback when selection changes */
  onChange: (ids: number[]) => void;
  /** Label displayed above the component */
  label?: string;
  /** Placeholder for the search input */
  placeholder?: string;
  /** Helper text below the selected list */
  helperText?: string;
  /** Avatar fallback background color */
  avatarColor?: string;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** IDs to exclude from the available options */
  excludeIds?: number[];
  /** Optional callback to check if a member is disabled (e.g. already in another group) */
  isOptionDisabled?: (member: Member) => string | false;
  /** "No options" text */
  noOptionsText?: string;
}

/**
 * Reusable multi-member select with autocomplete search + chip list.
 * Inspired by the discípulas selector in discipulados page.
 */
export default function MultiMemberSelect({
  options,
  selectedIds,
  onChange,
  label,
  placeholder = 'Buscar membro para adicionar...',
  helperText,
  avatarColor = 'bg-blue-600',
  disabled = false,
  excludeIds = [],
  isOptionDisabled,
  noOptionsText = 'Nenhum membro disponível',
}: MultiMemberSelectProps) {
  const filteredOptions = options.filter(m => {
    if (selectedIds.includes(m.id)) return false;
    if (excludeIds.includes(m.id)) return false;
    return true;
  });

  const selectedMembers = selectedIds
    .map(id => options.find(m => m.id === id))
    .filter(Boolean) as Member[];

  return (
    <div className="w-full">
      {label && (
        <label className="text-sm text-gray-300 font-medium mb-1 block">{label}</label>
      )}

      <Autocomplete
        size="small"
        fullWidth
        disabled={disabled}
        options={filteredOptions}
        getOptionLabel={(option) => option.name}
        getOptionDisabled={(option) => !!isOptionDisabled?.(option)}
        value={null}
        onChange={(_, newValue) => {
          if (newValue) {
            onChange([...selectedIds, newValue.id]);
          }
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={placeholder}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgb(31 41 55)',
                borderRadius: '0.5rem',
                '& fieldset': { borderColor: 'rgb(75 85 99)' },
                '&:hover fieldset': { borderColor: 'rgb(107 114 128)' },
                '&.Mui-focused fieldset': { borderColor: 'rgb(59 130 246)' },
              },
              '& .MuiInputBase-input': { color: 'white' },
              '& .MuiInputBase-input::placeholder': { color: 'rgb(156 163 175)', opacity: 1 },
            }}
          />
        )}
        renderOption={(props, option) => {
          const disabledReason = isOptionDisabled?.(option);
          return (
            <li {...props} key={option.id}>
              <div className="flex items-center gap-2 w-full">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={option.photoUrl} alt={option.name} />
                  <AvatarFallback className={`${avatarColor} text-white text-[10px] font-semibold`}>
                    {getInitials(option.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${disabledReason ? 'text-gray-500' : ''}`}>
                    {option.name}
                  </div>
                  {disabledReason ? (
                    <div className="text-xs text-gray-500">{disabledReason}</div>
                  ) : option.email ? (
                    <div className="text-xs text-gray-400">{option.email}</div>
                  ) : null}
                </div>
              </div>
            </li>
          );
        }}
        ListboxProps={{ style: { maxHeight: 200 } }}
        noOptionsText={noOptionsText}
        blurOnSelect
        clearOnBlur
      />

      {selectedMembers.length > 0 && (
        <div className="mt-2 max-h-40 overflow-y-auto space-y-1 rounded-lg border border-gray-700 p-2">
          {selectedMembers.map(member => (
            <div
              key={member.id}
              className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={member.photoUrl} alt={member.name} />
                  <AvatarFallback className={`${avatarColor} text-white text-[10px] font-semibold`}>
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-white">{member.name}</span>
              </div>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(selectedIds.filter(id => id !== member.id))}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded p-1 transition-colors"
                  title="Remover"
                >
                  <FiTrash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {helperText && (
        <p className="text-xs text-gray-400 mt-1">
          {selectedMembers.length > 0
            ? `${selectedMembers.length} membro${selectedMembers.length > 1 ? 's' : ''} selecionado${selectedMembers.length > 1 ? 's' : ''}`
            : helperText}
        </p>
      )}
    </div>
  );
}
