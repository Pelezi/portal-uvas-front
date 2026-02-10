"use client";

import React, { useState, useEffect } from 'react';
import { configService } from '@/services/configService';
import { Role, Ministry, WinnerPath, ApiKey } from '@/types';
import toast from 'react-hot-toast';
import { ErrorMessages } from '@/lib/errorHandler';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { FiEdit2, FiTrash2, FiPlus, FiCopy, FiEye, FiEyeOff } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';

type TabType = 'ministries' | 'winnerPaths' | 'roles' | 'apiKeys';

const getMinistryTypeLabel = (type?: string) => {
  const labels: Record<string, string> = {
    PRESIDENT_PASTOR: 'Pastor Presidente',
    PASTOR: 'Pastor',
    DISCIPULADOR: 'Discipulador',
    LEADER: 'Líder',
    LEADER_IN_TRAINING: 'Líder em Treinamento',
    MEMBER: 'Membro',
    REGULAR_ATTENDEE: 'Frequentador Assíduo',
    VISITOR: 'Visitante',
  };
  return labels[type || 'MEMBER'] || 'Membro';
};

interface RoleModalProps {
  isOpen: boolean;
  role: Role | null;
  onClose: () => void;
  onSave: (name: string, isAdmin: boolean) => void;
}

function RoleModal({ isOpen, role, onClose, onSave }: RoleModalProps) {
  const [name, setName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setIsAdmin(role.isAdmin || false);
    } else {
      setName('');
      setIsAdmin(false);
    }
  }, [role, isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    onSave(name, isAdmin);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-gray-900 rounded w-11/12 max-w-md flex flex-col">
        <div className="p-6 flex items-center justify-between border-b border-gray-700">
          <h3 className="text-xl font-semibold">{role ? 'Editar Função' : 'Nova Função'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>

        <div className="flex-1 p-6 space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Nome da Função *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full border p-2 rounded bg-gray-800 border-gray-600"
              placeholder="Ex: Líder de Célula"
              autoFocus
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="w-4 h-4"
              />
              Tem permissão de administrador do sistema
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded hover:bg-gray-800">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {role ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface MinistryModalProps {
  isOpen: boolean;
  ministry: Ministry | null;
  onClose: () => void;
  onSave: (name: string, type: string) => void;
}

function MinistryModal({ isOpen, ministry, onClose, onSave }: MinistryModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('MEMBER');

  useEffect(() => {
    if (ministry) {
      setName(ministry.name);
      setType(ministry.type || 'MEMBER');
    } else {
      setName('');
      setType('MEMBER');
    }
  }, [ministry, isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    onSave(name, type);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  const ministryTypes = [
    { value: 'PRESIDENT_PASTOR', label: 'Pastor Presidente' },
    { value: 'PASTOR', label: 'Pastor' },
    { value: 'DISCIPULADOR', label: 'Discipulador' },
    { value: 'LEADER', label: 'Líder' },
    { value: 'LEADER_IN_TRAINING', label: 'Líder em Treinamento' },
    { value: 'MEMBER', label: 'Membro' },
    { value: 'REGULAR_ATTENDEE', label: 'Frequentador Assíduo' },
    { value: 'VISITOR', label: 'Visitante' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-gray-900 rounded w-11/12 max-w-md flex flex-col">
        <div className="p-6 flex items-center justify-between border-b border-gray-700">
          <h3 className="text-xl font-semibold">{ministry ? 'Editar Cargo Ministerial' : 'Novo Cargo Ministerial'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>

        <div className="flex-1 p-6 space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Nome do Cargo Ministerial *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full border p-2 rounded bg-gray-800 border-gray-600"
              placeholder="Ex: Pastor"
              autoFocus
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium">Tipo de Cargo *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full border p-2 rounded bg-gray-800 border-gray-600"
            >
              {ministryTypes.map((mt) => (
                <option key={mt.value} value={mt.value}>
                  {mt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded hover:bg-gray-800">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {ministry ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface WinnerPathModalProps {
  isOpen: boolean;
  winnerPath: WinnerPath | null;
  onClose: () => void;
  onSave: (name: string) => void;
}

function WinnerPathModal({ isOpen, winnerPath, onClose, onSave }: WinnerPathModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (winnerPath) {
      setName(winnerPath.name);
    } else {
      setName('');
    }
  }, [winnerPath, isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    onSave(name);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-gray-900 rounded w-11/12 max-w-md flex flex-col">
        <div className="p-6 flex items-center justify-between border-b border-gray-700">
          <h3 className="text-xl font-semibold">{winnerPath ? 'Editar Trilho do Vencedor' : 'Novo Trilho do Vencedor'}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>

        <div className="flex-1 p-6">
          <div>
            <label className="block mb-2 text-sm font-medium">Nome do Trilho do Vencedor *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full border p-2 rounded bg-gray-800 border-gray-600"
              placeholder="Ex: Encontro com Deus"
              autoFocus
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded hover:bg-gray-800">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {winnerPath ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

function ApiKeyModal({ isOpen, onClose, onSave }: ApiKeyModalProps) {
  const [name, setName] = useState('');

  useEffect(() => {
    setName('');
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handleSubmit = () => {
    if (!name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    onSave(name);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-gray-900 rounded w-11/12 max-w-md flex flex-col">
        <div className="p-6 flex items-center justify-between border-b border-gray-700">
          <h3 className="text-xl font-semibold">Nova API Key</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>

        <div className="flex-1 p-6 space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium">Nome da API Key *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              className="w-full border p-2 rounded bg-gray-800 border-gray-600"
              placeholder="Ex: Integração Sistema XYZ"
              autoFocus
            />
          </div>
          <div className="text-sm text-yellow-400 bg-yellow-900/20 p-3 rounded">
            ⚠️ A chave completa será exibida apenas uma vez após a criação. Certifique-se de salvá-la em um local seguro.
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 border rounded hover:bg-gray-700 border-gray-600">
            Cancelar
          </button>
          <button onClick={handleSubmit} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Criar API Key
          </button>
        </div>
      </div>
    </div>
  );
}

interface ApiKeyDisplayModalProps {
  isOpen: boolean;
  apiKey: string;
  onClose: () => void;
}

function ApiKeyDisplayModal({ isOpen, apiKey, onClose }: ApiKeyDisplayModalProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(apiKey);
        setCopied(true);
        toast.success('API Key copiada para a área de transferência!');
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = apiKey;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          toast.success('API Key copiada para a área de transferência!');
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          toast.error('Erro ao copiar API Key');
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      toast.error('Erro ao copiar API Key');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-gray-900 rounded w-11/12 max-w-2xl flex flex-col">
        <div className="p-6 flex items-center justify-between border-b border-gray-700">
          <h3 className="text-xl font-semibold">API Key Criada com Sucesso!</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>

        <div className="flex-1 p-6 space-y-4">
          <div className="text-sm text-red-400 bg-red-900/20 p-4 rounded font-medium">
            ⚠️ IMPORTANTE: Esta é a única vez que a chave completa será exibida. Certifique-se de copiá-la e armazená-la em um local seguro!
          </div>
          
          <div>
            <label className="block mb-2 text-sm font-medium">Sua API Key:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={apiKey}
                readOnly
                className="flex-1 border p-2 rounded bg-gray-800 border-gray-600 font-mono text-sm"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
              >
                <FiCopy className="h-4 w-4" />
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-400 space-y-2">
            <p><strong>Como usar:</strong></p>
            <p>Inclua esta chave no header <code className="bg-gray-800 px-2 py-1 rounded">X-API-KEY</code> em suas requisições HTTP.</p>
            <p className="font-mono text-xs bg-gray-800 p-2 rounded break-all">
              curl -H &quot;X-API-KEY: {apiKey.substring(0, 20)}...&quot; https://api.example.com/external/check-phone?phone=123456789
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-gray-700">
          <button onClick={onClose} className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Entendi, fechar
          </button>
        </div>
      </div>
    </div>
  );
}


interface SortableItemProps {
  id: number;
  name: string;
  onEdit: () => void;
  onDelete: () => void;
  showAdmin?: boolean;
  isAdmin?: boolean;
  type?: string;
}

function SortableItem({ id, name, onEdit, onDelete, showAdmin, isAdmin, type }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-center justify-between p-3 border rounded bg-gray-800 border-gray-600">
      <div className="flex items-center gap-2 flex-1">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-200">
          <GripVertical size={20} />
        </button>
        <div className="flex flex-col">
          <span className="text-gray-100">{name}</span>
          {type && (
            <span className="text-xs text-gray-400">
              {getMinistryTypeLabel(type)}
            </span>
          )}
        </div>
        {showAdmin && isAdmin && (
          <span className="ml-2 px-2 py-1 text-xs bg-purple-900 text-purple-200 rounded">
            Admin
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={onEdit} 
          aria-label="Editar" 
          className="p-1 rounded hover:bg-gray-700"
        >
          <FiEdit2 className="h-4 w-4 text-yellow-500" />
        </button>
        <button 
          onClick={onDelete} 
          aria-label="Excluir" 
          className="p-1 rounded hover:bg-gray-700"
        >
          <FiTrash2 className="h-4 w-4 text-red-600" />
        </button>
      </div>
    </li>
  );
}

function SimpleListItem({ name, onEdit, onDelete, showAdmin, isAdmin }: { name: string; onEdit: () => void; onDelete: () => void; showAdmin?: boolean; isAdmin?: boolean }) {
  return (
    <li className="flex items-center justify-between p-3 border rounded bg-gray-800 border-gray-600">
      <div className="flex-1">
        <span className="text-gray-100">{name}</span>
        {showAdmin && isAdmin && (
          <span className="ml-2 px-2 py-1 text-xs bg-purple-900 text-purple-200 rounded">
            Admin
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={onEdit} 
          aria-label="Editar" 
          className="p-1 rounded hover:bg-gray-700"
        >
          <FiEdit2 className="h-4 w-4 text-yellow-500" />
        </button>
        <button 
          onClick={onDelete} 
          aria-label="Excluir" 
          className="p-1 rounded hover:bg-gray-700"
        >
          <FiTrash2 className="h-4 w-4 text-red-600" />
        </button>
      </div>
    </li>
  );
}

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDanger?: boolean;
}

function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  isDanger = false
}: ConfirmationModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onCancel]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-gray-900 rounded w-11/12 max-w-md flex flex-col">
        <div className="p-6 flex items-center justify-between border-b border-gray-700">
          <h3 className="text-xl font-semibold">{title}</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>

        <div className="flex-1 p-6">
          <p className="text-gray-300">{message}</p>
        </div>

        <div className="p-6 border-t border-gray-700 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-600 rounded hover:bg-gray-800"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded text-white ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('ministries');
  
  // Roles
  const [roles, setRoles] = useState<Role[]>([]);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  // Ministries
  const [ministries, setMinistries] = useState<Ministry[]>([]);
  const [isMinistryModalOpen, setIsMinistryModalOpen] = useState(false);
  const [editingMinistry, setEditingMinistry] = useState<Ministry | null>(null);
  
  // Winner Paths
  const [winnerPaths, setWinnerPaths] = useState<WinnerPath[]>([]);
  const [isWinnerPathModalOpen, setIsWinnerPathModalOpen] = useState(false);
  const [editingWinnerPath, setEditingWinnerPath] = useState<WinnerPath | null>(null);
  
  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isApiKeyDisplayModalOpen, setIsApiKeyDisplayModalOpen] = useState(false);

  // Confirmation Modal
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (authLoading) return;
    loadRoles();
    loadMinistries();
    loadWinnerPaths();
    if (user?.isOwner) {
      loadApiKeys();
    }
  }, [user, authLoading]);

  // Roles functions
  const loadRoles = async () => {
    try {
      const data = await configService.getRoles();
      setRoles(data);
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.load(err));
    }
  };

  const openCreateRoleModal = () => {
    setEditingRole(null);
    setIsRoleModalOpen(true);
  };

  const openEditRoleModal = (role: Role) => {
    setEditingRole(role);
    setIsRoleModalOpen(true);
  };

  const handleRoleSave = async (name: string, isAdmin: boolean) => {
    try {
      if (editingRole) {
        await configService.updateRole(editingRole.id, name, isAdmin);
        toast.success('Função atualizada com sucesso!');
      } else {
        await configService.createRole(name, isAdmin);
        toast.success('Função criada com sucesso!');
      }
      setIsRoleModalOpen(false);
      setEditingRole(null);
      loadRoles();
    } catch (err) {
      console.error(err);
      toast.error(editingRole ? ErrorMessages.updateRole(err) : ErrorMessages.createRole(err));
    }
  };

  const deleteRole = async (id: number) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Excluir Função',
      message: 'Tem certeza que deseja excluir esta função?',
      onConfirm: async () => {
        setConfirmationModal({ ...confirmationModal, isOpen: false });
        try {
          await configService.deleteRole(id);
          toast.success('Função excluída com sucesso!');
          loadRoles();
        } catch (err) {
          console.error(err);
          toast.error(ErrorMessages.deleteRole(err));
        }
      }
    });
  };

  // Ministries functions
  const loadMinistries = async () => {
    try {
      const data = await configService.getMinistries();
      setMinistries(data);
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.load(err));
    }
  };

  const openCreateMinistryModal = () => {
    setEditingMinistry(null);
    setIsMinistryModalOpen(true);
  };

  const openEditMinistryModal = (ministry: Ministry) => {
    setEditingMinistry(ministry);
    setIsMinistryModalOpen(true);
  };

  const handleMinistrySave = async (name: string, type: string) => {
    try {
      if (editingMinistry) {
        await configService.updateMinistry(editingMinistry.id, name, type);
        toast.success('Cargo ministerial atualizado com sucesso!');
      } else {
        await configService.createMinistry(name, type);
        toast.success('Cargo ministerial criado com sucesso!');
      }
      setIsMinistryModalOpen(false);
      setEditingMinistry(null);
      loadMinistries();
    } catch (err) {
      console.error(err);
      toast.error(editingMinistry ? ErrorMessages.updateMinistry(err) : ErrorMessages.createMinistry(err));
    }
  };

  const deleteMinistry = async (id: number) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Excluir Cargo Ministerial',
      message: 'Tem certeza que deseja excluir este cargo ministerial?',
      onConfirm: async () => {
        setConfirmationModal({ ...confirmationModal, isOpen: false });
        try {
          await configService.deleteMinistry(id);
          toast.success('Cargo ministerial excluído com sucesso!');
          loadMinistries();
        } catch (err) {
          console.error(err);
          toast.error(ErrorMessages.deleteMinistry(err));
        }
      }
    });
  };

  const handleMinistryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ministries.findIndex(m => m.id === active.id);
    const newIndex = ministries.findIndex(m => m.id === over.id);
    const newOrder = arrayMove(ministries, oldIndex, newIndex);
    
    setMinistries(newOrder);

    try {
      await Promise.all(
        newOrder.map((ministry, index) =>
          configService.updateMinistryPriority(ministry.id, index)
        )
      );
      toast.success('Ordem atualizada com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.save(err));
      loadMinistries();
    }
  };

  // Winner Paths functions
  const loadWinnerPaths = async () => {
    try {
      const data = await configService.getWinnerPaths();
      setWinnerPaths(data);
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.load(err));
    }
  };

  const openCreateWinnerPathModal = () => {
    setEditingWinnerPath(null);
    setIsWinnerPathModalOpen(true);
  };

  const openEditWinnerPathModal = (path: WinnerPath) => {
    setEditingWinnerPath(path);
    setIsWinnerPathModalOpen(true);
  };

  const handleWinnerPathSave = async (name: string) => {
    try {
      if (editingWinnerPath) {
        await configService.updateWinnerPath(editingWinnerPath.id, name);
        toast.success('Trilho do vencedor atualizado com sucesso!');
      } else {
        await configService.createWinnerPath(name);
        toast.success('Trilho do vencedor criado com sucesso!');
      }
      setIsWinnerPathModalOpen(false);
      setEditingWinnerPath(null);
      loadWinnerPaths();
    } catch (err) {
      console.error(err);
      toast.error(editingWinnerPath ? ErrorMessages.updateWinnerPath(err) : ErrorMessages.createWinnerPath(err));
    }
  };

  const deleteWinnerPath = async (id: number) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Excluir Trilho do Vencedor',
      message: 'Tem certeza que deseja excluir este trilho do vencedor?',
      onConfirm: async () => {
        setConfirmationModal({ ...confirmationModal, isOpen: false });
        try {
          await configService.deleteWinnerPath(id);
          toast.success('Trilho do vencedor excluído com sucesso!');
          loadWinnerPaths();
        } catch (err) {
          console.error(err);
          toast.error(ErrorMessages.deleteWinnerPath(err));
        }
      }
    });
  };

  const handleWinnerPathDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = winnerPaths.findIndex(w => w.id === active.id);
    const newIndex = winnerPaths.findIndex(w => w.id === over.id);
    const newOrder = arrayMove(winnerPaths, oldIndex, newIndex);
    
    setWinnerPaths(newOrder);

    try {
      await Promise.all(
        newOrder.map((path, index) =>
          configService.updateWinnerPathPriority(path.id, index)
        )
      );
      toast.success('Ordem atualizada com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.save(err));
      loadWinnerPaths();
    }
  };

  // API Keys functions
  const loadApiKeys = async () => {
    try {
      const data = await configService.getApiKeys();
      setApiKeys(data);
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.load(err));
    }
  };

  const openCreateApiKeyModal = () => {
    setIsApiKeyModalOpen(true);
  };

  const handleApiKeySave = async (name: string) => {
    try {
      const result = await configService.createApiKey(name);
      setNewApiKey(result.key);
      setIsApiKeyModalOpen(false);
      setIsApiKeyDisplayModalOpen(true);
      loadApiKeys();
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.createApiKey?.(err) || 'Erro ao criar API key');
    }
  };

  const toggleApiKey = async (id: number) => {
    try {
      await configService.toggleApiKey(id);
      toast.success('Status da API key alterado com sucesso!');
      loadApiKeys();
    } catch (err) {
      console.error(err);
      toast.error(ErrorMessages.save(err));
    }
  };

  const deleteApiKey = async (id: number) => {
    setConfirmationModal({
      isOpen: true,
      title: 'Excluir API Key',
      message: 'Tem certeza que deseja excluir esta API key? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        setConfirmationModal({ ...confirmationModal, isOpen: false });
        try {
          await configService.deleteApiKey(id);
          toast.success('API key excluída com sucesso!');
          loadApiKeys();
        } catch (err) {
          console.error(err);
          toast.error(ErrorMessages.deleteApiKey?.(err) || 'Erro ao excluir API key');
        }
      }
    });
  };

  const isAdmin = user?.permission?.isAdmin || false;
  const isOwner = user?.isOwner || false;

  return (
    <div className="p-6 relative pb-20">
      <h1 className="text-3xl font-bold mb-6">Configurações</h1>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('ministries')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'ministries'
              ? 'border-b-2 border-blue-600 text-blue-400'
              : 'text-gray-400 hover:text-gray-100'
          }`}
        >
          Cargos Ministeriais
        </button>
        <button
          onClick={() => setActiveTab('winnerPaths')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'winnerPaths'
              ? 'border-b-2 border-blue-600 text-blue-400'
              : 'text-gray-400 hover:text-gray-100'
          }`}
        >
          Trilho do Vencedor
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'roles'
              ? 'border-b-2 border-blue-600 text-blue-400'
              : 'text-gray-400 hover:text-gray-100'
          }`}
        >
          Funções
        </button>
        {isOwner && (
          <button
            onClick={() => setActiveTab('apiKeys')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === 'apiKeys'
                ? 'border-b-2 border-blue-600 text-blue-400'
                : 'text-gray-400 hover:text-gray-100'
            }`}
          >
            API Keys
          </button>
        )}
      </div>

      {/* Ministries Tab */}
      {activeTab === 'ministries' && (
        <div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleMinistryDragEnd}>
            <SortableContext items={ministries.map(m => m.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {ministries.map((ministry) => (
                  <SortableItem
                    key={ministry.id}
                    id={ministry.id}
                    name={ministry.name}
                    type={ministry.type}
                    onEdit={() => openEditMinistryModal(ministry)}
                    onDelete={() => deleteMinistry(ministry.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Winner Paths Tab */}
      {activeTab === 'winnerPaths' && (
        <div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleWinnerPathDragEnd}>
            <SortableContext items={winnerPaths.map(w => w.id)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-2">
                {winnerPaths.map((path) => (
                  <SortableItem
                    key={path.id}
                    id={path.id}
                    name={path.name}
                    onEdit={() => openEditWinnerPathModal(path)}
                    onDelete={() => deleteWinnerPath(path.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div>
          <ul className="space-y-2">
            {roles.map((role) => (
              <SimpleListItem
                key={role.id}
                name={role.name}
                showAdmin
                isAdmin={role.isAdmin}
                onEdit={() => openEditRoleModal(role)}
                onDelete={() => deleteRole(role.id)}
              />
            ))}
          </ul>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'apiKeys' && isOwner && (
        <div>
          <ul className="space-y-2">
            {apiKeys.map((apiKey) => (
              <li key={apiKey.id} className="flex items-center justify-between p-3 border rounded bg-gray-800 border-gray-600">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-100">{apiKey.name}</span>
                    <span className={`px-2 py-1 text-xs rounded ${apiKey.isActive ? 'bg-green-900 text-green-200' : 'bg-gray-700 text-gray-200'}`}>
                      {apiKey.isActive ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    <span className="font-mono">{apiKey.keyPreview}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Criada por {apiKey.createdBy.name} em {new Date(apiKey.createdAt).toLocaleDateString('pt-BR')}
                    {apiKey.lastUsedAt && ` • Último uso: ${new Date(apiKey.lastUsedAt).toLocaleDateString('pt-BR')}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleApiKey(apiKey.id)} 
                    aria-label={apiKey.isActive ? 'Desativar' : 'Ativar'}
                    className="p-1 rounded hover:bg-gray-700"
                    title={apiKey.isActive ? 'Desativar API key' : 'Ativar API key'}
                  >
                    {apiKey.isActive ? <FiEyeOff className="h-4 w-4 text-gray-600" /> : <FiEye className="h-4 w-4 text-green-600" />}
                  </button>
                  <button 
                    onClick={() => deleteApiKey(apiKey.id)} 
                    aria-label="Excluir" 
                    className="p-1 rounded hover:bg-gray-700"
                  >
                    <FiTrash2 className="h-4 w-4 text-red-600" />
                  </button>
                </div>
              </li>
            ))}
            {apiKeys.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                Nenhuma API key criada ainda. Clique no botão + para criar uma.
              </div>
            )}
          </ul>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        onClick={() => {
          if (activeTab === 'ministries') openCreateMinistryModal();
          else if (activeTab === 'winnerPaths') openCreateWinnerPathModal();
          else if (activeTab === 'roles') openCreateRoleModal();
          else if (activeTab === 'apiKeys') openCreateApiKeyModal();
        }}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 z-40"
        aria-label="Adicionar"
      >
        <FiPlus className="h-6 w-6" />
      </button>

      {/* Role Modal */}
      <RoleModal
        isOpen={isRoleModalOpen}
        role={editingRole}
        onClose={() => {
          setIsRoleModalOpen(false);
          setEditingRole(null);
        }}
        onSave={handleRoleSave}
      />

      {/* Ministry Modal */}
      <MinistryModal
        isOpen={isMinistryModalOpen}
        ministry={editingMinistry}
        onClose={() => {
          setIsMinistryModalOpen(false);
          setEditingMinistry(null);
        }}
        onSave={handleMinistrySave}
      />

      {/* WinnerPath Modal */}
      <WinnerPathModal
        isOpen={isWinnerPathModalOpen}
        winnerPath={editingWinnerPath}
        onClose={() => {
          setIsWinnerPathModalOpen(false);
          setEditingWinnerPath(null);
        }}
        onSave={handleWinnerPathSave}
      />

      {/* API Key Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onSave={handleApiKeySave}
      />

      {/* API Key Display Modal */}
      <ApiKeyDisplayModal
        isOpen={isApiKeyDisplayModalOpen}
        apiKey={newApiKey || ''}
        onClose={() => {
          setIsApiKeyDisplayModalOpen(false);
          setNewApiKey(null);
        }}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText="Excluir"
        cancelText="Cancelar"
        onConfirm={confirmationModal.onConfirm}
        onCancel={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
        isDanger={true}
      />
    </div>
  );
}
