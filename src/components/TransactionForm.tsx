"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Dayjs } from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import dayjs from 'dayjs';
import { createInUserTimezone, toUserTimezone } from '@/lib/timezone';

import { EntityType } from '@/types';

type Account = any;
type Category = any;
type Subcategory = any;
type GroupMember = any;

type InitialValues = {
    categoryId?: number;
    subcategoryId?: number;
    accountId?: number;
    toAccountId?: number;
    title?: string;
    amount?: string; // formatted like '0,00'
    description?: string;
    dateTime?: Dayjs;
    type?: EntityType;
    userId?: number | undefined;
};

type Props = {
    groupId?: number | null;
    accounts?: Account[];
    categories?: Category[];
    subcategories?: Subcategory[];
    groupMembers?: GroupMember[];
    initialValues?: InitialValues;
    onCancel?: () => void;
    onSave: (preparedData: any) => void; // prepared payload (with date/time formatted and amount number)
    submitting?: boolean;
    showActions?: boolean;
};

export default function TransactionForm({
    groupId,
    accounts = [],
    categories = [],
    subcategories = [],
    groupMembers = [],
    initialValues = {},
    onCancel,
    onSave,
    submitting = false,
    showActions = true,
}: Props) {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [formData, setFormData] = useState<InitialValues>({
        categoryId: initialValues.categoryId ?? 0,
        subcategoryId: initialValues.subcategoryId ?? 0,
        accountId: initialValues.accountId ?? 0,
        toAccountId: initialValues.toAccountId ?? 0,
        title: initialValues.title ?? '',
        amount: initialValues.amount ?? '0,00',
        description: initialValues.description ?? '',
        dateTime: initialValues.dateTime ?? createInUserTimezone(),
        type: initialValues.type ?? 'EXPENSE',
        userId: initialValues.userId,
    });

    useEffect(() => {
        const updateDarkMode = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
        updateDarkMode();
        const observer = new MutationObserver(updateDarkMode);
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        setFormData((f) => ({
            ...f,
            categoryId: initialValues.categoryId ?? f.categoryId,
            subcategoryId: initialValues.subcategoryId ?? f.subcategoryId,
            accountId: initialValues.accountId ?? f.accountId,
            toAccountId: initialValues.toAccountId ?? f.toAccountId,
            title: initialValues.title ?? f.title,
            amount: initialValues.amount ?? f.amount,
            description: initialValues.description ?? f.description,
            dateTime: initialValues.dateTime ?? f.dateTime,
            type: initialValues.type ?? f.type,
            userId: initialValues.userId ?? f.userId,
        }));
    }, [initialValues]);

    useEffect(() => {
        if (!groupId) return;
        if (formData.userId) return;

        let defaultUserId: number | undefined = undefined;
        if (typeof window !== 'undefined') {
            try {
                const userStr = localStorage.getItem('user');
                if (userStr) {
                    const currentUser = JSON.parse(userStr);
                    if (currentUser?.id) defaultUserId = Number(currentUser.id);
                }
            } catch { }
        }

        if (!defaultUserId && groupMembers && groupMembers.length > 0) {
            defaultUserId = groupMembers[0]?.user?.id;
        }

        if (defaultUserId !== undefined) {
            setFormData(f => ({ ...f, userId: defaultUserId }));
        }
    }, [groupId, groupMembers, formData.userId]);

    const formatBRLfromCents = (cents: number) =>
        (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const normalizeToBRL = (value: string) => {
        const digits = value.replace(/\D/g, '');
        const cents = Number(digits || '0');
        return formatBRLfromCents(cents);
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = normalizeToBRL(e.target.value);
        setFormData((f) => ({ ...f, amount: formatted }));
    };

    const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
        if (allowed.includes(e.key)) return;
        if (!/^\d$/.test(e.key)) e.preventDefault();
    };

    const availableSubcategories = (subcategories || []).filter((s: any) => s.categoryId === formData.categoryId);

    const ACCENTS = {
        EXPENSE: { muiColor: '#ef4444' },
        INCOME: { muiColor: '#22c55e' },
        TRANSFER: { muiColor: '#6b7280' },
    } as const;

    const accent = (ACCENTS as any)[formData.type || 'EXPENSE'];

    const muiTheme = createTheme({
        palette: {
            mode: isDarkMode ? 'dark' : 'light',
            primary: {
                main: accent.muiColor,
            },
        },
    });

    const getAccountTypeLabel = (type: string) => {
        switch (type) {
            case 'CREDIT':
                return 'Crédito';
            case 'CASH':
                return 'Dinheiro';
            case 'PREPAID':
                return 'Pré-pago';
            default:
                return type;
        }
    };

    const formRef = useRef<HTMLFormElement>(null);

    const submit = (e?: React.FormEvent) => {
        e?.preventDefault();

        // Prepare payload similar to TransactionManager.handleSubmit
        const dateInUtc = (formData.dateTime as any).utc();
        const dateStr = dateInUtc.format('YYYY-MM-DD');
        const timeStr = dateInUtc.format('HH:mm:ss');
        const amountNumber = Number((formData.amount || '0,00').replace(/\./g, '').replace(',', '.'));

        const data: any = {
            subcategoryId: formData.subcategoryId,
            accountId: formData.accountId,
            toAccountId: formData.toAccountId,
            title: formData.title,
            amount: amountNumber,
            description: formData.description,
            date: dateStr,
            time: timeStr,
            type: formData.type,
            ...(groupId && { groupId }),
            ...(groupId && formData.userId && { userId: formData.userId }),
        };

        // Validate transfer: require destination account and remove category/subcategory
        if (formData.type === 'TRANSFER') {
            if (!formData.toAccountId || formData.toAccountId === 0) {
                alert('Selecione a conta de destino para a transferência');
                return;
            }
            // Remove category/subcategory from payload for transfers
            delete data.subcategoryId;
            delete data.categoryId;
        }

        onSave(data);
    };

    return (
        <form
            ref={formRef}
            onSubmit={submit}
            className="space-y-4"
        >
            <ThemeProvider theme={muiTheme}>
                {/* Type selector (Despesa / Renda / Transferência) */}
                <div className="grid grid-cols-3 gap-2">
                    <button
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, type: 'EXPENSE', categoryId: 0, subcategoryId: 0 }))}
                        className={`py-2 rounded-lg border text-sm font-medium transition-colors ${formData.type === 'EXPENSE' ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`}
                        style={{ borderWidth: 1 }}
                    >
                        Despesa
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, type: 'INCOME', categoryId: 0, subcategoryId: 0 }))}
                        className={`py-2 rounded-lg border text-sm font-medium transition-colors ${formData.type === 'INCOME' ? 'bg-green-600 text-white border-green-600' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`}
                        style={{ borderWidth: 1 }}
                    >
                        Renda
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, type: 'TRANSFER', categoryId: 0, subcategoryId: 0, toAccountId: 0 }))}
                        className={`py-2 rounded-lg border text-sm font-medium transition-colors ${formData.type === 'TRANSFER' ? 'bg-gray-600 text-white border-gray-600' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`}
                        style={{ borderWidth: 1 }}
                    >
                        Transferência
                    </button>
                </div>

                <div>
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="pt-br">
                        <DateTimePicker
                            label="Data e horário"
                            value={formData.dateTime as any}
                            onChange={(newValue: Dayjs | null) => {
                                if (newValue) setFormData({ ...formData, dateTime: newValue });
                            }}
                            format="DD/MM/YYYY HH:mm"
                            ampm={false}
                            slotProps={{
                                textField: {
                                    required: true,
                                    focused: true,
                                    fullWidth: true,
                                },
                            }}
                        />
                    </LocalizationProvider>
                </div>

                {/* Accounts: when TRANSFER show source + destination on the same line */}
                {formData.type === 'TRANSFER' ? (
                    <div className="grid grid-cols-2 gap-2">
                        <FormControl focused fullWidth required margin="normal">
                            <InputLabel id="account-label">Conta origem</InputLabel>
                            <Select
                                labelId="account-label"
                                value={formData.accountId}
                                label="Conta origem"
                                onChange={(e) => setFormData({ ...formData, accountId: Number(e.target.value) })}
                            >
                                <MenuItem value={0}>Selecione</MenuItem>
                                {accounts.map((acc: any) => (
                                    <MenuItem key={acc.id} value={acc.id}>
                                        {acc.name} - {getAccountTypeLabel(acc.type)}{acc.user?.firstName ? ` (${acc.user.firstName})` : ''}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl focused fullWidth required margin="normal">
                            <InputLabel id="to-account-label-inline">Conta destino</InputLabel>
                            <Select
                                labelId="to-account-label-inline"
                                value={formData.toAccountId}
                                label="Conta destino"
                                onChange={(e) => setFormData({ ...formData, toAccountId: Number(e.target.value) })}
                            >
                                <MenuItem value={0}>Selecione</MenuItem>
                                {accounts
                                    .filter((acc: any) => acc.id !== formData.accountId)
                                    .map((acc: any) => (
                                        <MenuItem key={acc.id} value={acc.id}>
                                            {acc.name} - {getAccountTypeLabel(acc.type)}{acc.user?.firstName ? ` (${acc.user.firstName})` : ''}
                                        </MenuItem>
                                    ))}
                            </Select>
                        </FormControl>
                    </div>
                ) : (
                    <div>
                        <FormControl focused fullWidth required margin="normal">
                            <InputLabel id="account-label">Conta</InputLabel>
                            <Select
                                labelId="account-label"
                                value={formData.accountId}
                                label="Conta"
                                onChange={(e) => setFormData({ ...formData, accountId: Number(e.target.value) })}
                            >
                                <MenuItem value={0}>Selecione</MenuItem>
                                {accounts.map((acc: any) => (
                                    <MenuItem key={acc.id} value={acc.id}>
                                        {acc.name} - {getAccountTypeLabel(acc.type)}{acc.user?.firstName ? ` (${acc.user.firstName})` : ''}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </div>
                )}

                {/* Category / Subcategory (hidden for TRANSFER) */}
                {formData.type !== 'TRANSFER' ? (
                    <div className="grid grid-cols-2 gap-2">
                        <FormControl focused fullWidth required margin="normal">
                            <InputLabel id="category-label">Categoria</InputLabel>
                            <Select
                                labelId="category-label"
                                value={formData.categoryId}
                                label="Categoria"
                                onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value), subcategoryId: 0 })}
                            >
                                <MenuItem value={0}>Selecione</MenuItem>
                                {categories.filter((cat: any) => cat.type === formData.type).map((cat: any) => (
                                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl focused fullWidth required margin="normal" disabled={!formData.categoryId}>
                            <InputLabel id="subcategory-label">Subcategoria</InputLabel>
                            <Select
                                labelId="subcategory-label"
                                value={formData.subcategoryId}
                                label="Subcategoria"
                                onChange={(e) => setFormData({ ...formData, subcategoryId: Number(e.target.value) })}
                            >
                                <MenuItem value={0}>Selecione</MenuItem>
                                {availableSubcategories.map((sub: any) => (
                                    <MenuItem key={sub.id} value={sub.id}>{sub.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </div>
                ) : null}

                <TextField
                    focused
                    label="Valor"
                    type="text"
                    inputMode="numeric"
                    value={formData.amount}
                    onChange={handleAmountChange}
                    onKeyDown={handleAmountKeyDown}
                    required
                    fullWidth
                    margin="normal"
                    placeholder="0,00"
                />

                <TextField
                    focused
                    label="Título"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    fullWidth
                    margin="normal"
                    placeholder="Opcional…"
                />

                <TextField
                    focused
                    label="Descrição"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    fullWidth
                    margin="normal"
                    multiline
                    rows={3}
                    placeholder="Opcional…"
                />

                {groupId && (
                    <FormControl focused fullWidth margin="normal">
                        <InputLabel id="group-member-label">Membro do Grupo</InputLabel>
                        <Select
                            labelId="group-member-label"
                            value={formData.userId ?? ''}
                            label="Membro do Grupo"
                            onChange={(e) => setFormData({ ...formData, userId: e.target.value ? Number(e.target.value) : undefined })}
                        >
                            {groupMembers.map((m: any) => (
                                <MenuItem key={m.id} value={m.user?.id}>{m.user?.firstName} {m.user?.lastName}</MenuItem>
                            ))}
                        </Select>
                        <FormHelperText>Selecione qual membro do grupo fez esta transação</FormHelperText>
                    </FormControl>
                )}

                {showActions && (
                    <div
                        className="sticky bottom-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur"
                        style={{
                            paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.5rem)'
                        }}
                    >
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => onCancel && onCancel()}
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                style={{ borderColor: accent.muiColor, color: accent.muiColor, borderWidth: 1 }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={() => { if (!formRef.current?.reportValidity()) return; formRef.current?.requestSubmit(); }}
                                disabled={submitting}
                                className="flex-1 px-4 py-2 rounded-lg text-white disabled:opacity-50"
                                style={{ background: accent.muiColor }}
                            >
                                {submitting ? 'Salvando…' : 'Salvar'}
                            </button>
                        </div>
                    </div>
                )}
            </ThemeProvider>
        </form>
    );
}
