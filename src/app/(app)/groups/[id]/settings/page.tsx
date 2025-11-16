'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { groupService } from '@/services/groupService';
import { Group, GroupMember, GroupRole, User } from '@/types';
import { 
  Users, 
  UserPlus, 
  Settings as SettingsIcon, 
  Trash2, 
  Shield,
  Search,
  X,
  Loader2,
  ChevronDown,
  LogOut,
  Plus
} from 'lucide-react';

export default function GroupSettingsPage() {
    const params = useParams();
  const router = useRouter();
  const groupId = parseInt(params?.id as string);
  const { groups, currentGroupPermissions, setGroups } = useAppStore();
  
  const currentGroup = groups.find(g => g.id === groupId);
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'roles'>('members');
  
  // Members state
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  
  // Roles state
  const [roles, setRoles] = useState<GroupRole[]>([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  
  // Invite member state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [emailSearch, setEmailSearch] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(0);
  const [inviting, setInviting] = useState(false);
  
  // Group update state
  const [groupName, setGroupName] = useState(currentGroup?.name || '');
  const [groupDescription, setGroupDescription] = useState(currentGroup?.description || '');
  const [updatingGroup, setUpdatingGroup] = useState(false);

  // Role creation/editing state
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<GroupRole | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [rolePermissions, setRolePermissions] = useState({
    canViewTransactions: false,
    canManageOwnTransactions: false,
    canManageGroupTransactions: false,
    canViewCategories: false,
    canManageCategories: false,
    canViewSubcategories: false,
    canManageSubcategories: false,
    canViewBudgets: false,
    canManageBudgets: false,
    canViewAccounts: false,
    canManageOwnAccounts: false,
    canManageGroupAccounts: false,
    canManageGroup: false,
  });
  const [savingRole, setSavingRole] = useState(false);

  // Load members and roles
  useEffect(() => {
    const loadData = async () => {
      if (!groupId) return;
      
      setLoadingMembers(true);
      setLoadingRoles(true);
      
      try {
        const [membersData, rolesData] = await Promise.all([
          groupService.getMembers(groupId),
          groupService.getRoles(groupId),
        ]);
        
        setMembers(membersData);
        setRoles(rolesData);
        
        // Set default role to Member
        const memberRole = rolesData.find(r => r.name === 'Member');
        if (memberRole) {
          setSelectedRoleId(memberRole.id);
        }
      } catch (error) {
        console.error('Failed to load group data:', error);
      } finally {
        setLoadingMembers(false);
        setLoadingRoles(false);
      }
    };
    
    loadData();
  }, [groupId]);

  // Search users for invite
  useEffect(() => {
    const searchUsers = async () => {
      if (emailSearch.length < 2) {
        setSearchResults([]);
        return;
      }
      
      setIsSearching(true);
      try {
        const results = await groupService.searchUsers(emailSearch);
        // Filter out users already in the group
        const filtered = results.filter(
          user => !members.some(member => member.userId === user.id)
        );
        setSearchResults(filtered);
      } catch (error) {
        console.error('Failed to search users:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };
    
    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [emailSearch, members]);

  const handleInviteMember = async () => {
    if (!selectedUser || !selectedRoleId) return;
    
    setInviting(true);
    try {
      await groupService.addMember(groupId, {
        userId: selectedUser.id,
        roleId: selectedRoleId,
      });
      
      // Refresh members list
      const updatedMembers = await groupService.getMembers(groupId);
      setMembers(updatedMembers);
      
      // Reset form
      setShowInviteModal(false);
      setEmailSearch('');
      setSelectedUser(null);
      setSearchResults([]);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('Tem certeza que deseja remover este membro?')) return;
    
    try {
      await groupService.removeMember(groupId, memberId);
      const updatedMembers = await groupService.getMembers(groupId);
      setMembers(updatedMembers);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao remover membro');
    }
  };

  const handleUpdateMemberRole = async (memberId: number, newRoleId: number) => {
    try {
      await groupService.updateMemberRole(groupId, memberId, newRoleId);
      const updatedMembers = await groupService.getMembers(groupId);
      setMembers(updatedMembers);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao atualizar função do membro');
    }
  };

  const handleUpdateGroup = async () => {
    setUpdatingGroup(true);
    try {
      await groupService.updateGroup(groupId, {
        name: groupName,
        description: groupDescription || undefined,
      });
      
      // Refresh groups list
      const updatedGroups = await groupService.getGroups();
      setGroups(updatedGroups);
      
      alert('Grupo atualizado com sucesso!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao atualizar grupo');
    } finally {
      setUpdatingGroup(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!confirm('Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.')) return;
    
    try {
      await groupService.deleteGroup(groupId);
      const updatedGroups = await groupService.getGroups();
      setGroups(updatedGroups);
      router.push('/transactions');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete group');
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm('Tem certeza que deseja sair deste grupo?')) return;
    
    try {
      await groupService.leaveGroup(groupId);
      const updatedGroups = await groupService.getGroups();
      setGroups(updatedGroups);
      router.push('/transactions');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to leave group');
    }
  };

  const handleOpenRoleModal = (role?: GroupRole) => {
    if (role) {
      setEditingRole(role);
      setRoleName(role.name);
      setRoleDescription(role.description || '');
      setRolePermissions({
        canViewTransactions: role.canViewTransactions,
        canManageOwnTransactions: role.canManageOwnTransactions,
        canManageGroupTransactions: role.canManageGroupTransactions,
        canViewCategories: role.canViewCategories,
        canManageCategories: role.canManageCategories,
        canViewSubcategories: role.canViewSubcategories,
        canManageSubcategories: role.canManageSubcategories,
        canViewBudgets: role.canViewBudgets,
        canManageBudgets: role.canManageBudgets,
        canViewAccounts: role.canViewAccounts,
        canManageOwnAccounts: role.canManageOwnAccounts,
        canManageGroupAccounts: role.canManageGroupAccounts,
        canManageGroup: role.canManageGroup,
      });
    } else {
      setEditingRole(null);
      setRoleName('');
      setRoleDescription('');
      setRolePermissions({
        canViewTransactions: false,
        canManageOwnTransactions: false,
        canManageGroupTransactions: false,
        canViewCategories: false,
        canManageCategories: false,
        canViewSubcategories: false,
        canManageSubcategories: false,
        canViewBudgets: false,
        canManageBudgets: false,
        canViewAccounts: false,
        canManageOwnAccounts: false,
        canManageGroupAccounts: false,
        canManageGroup: false,
      });
    }
    setShowRoleModal(true);
  };

  const handleCloseRoleModal = () => {
    setShowRoleModal(false);
    setEditingRole(null);
    setRoleName('');
    setRoleDescription('');
  };

  const handleSaveRole = async () => {
    if (!roleName.trim()) return;
    
    setSavingRole(true);
    try {
      if (editingRole) {
        // Update existing role
        await groupService.updateRole(groupId, editingRole.id, {
          name: roleName,
          description: roleDescription || undefined,
          ...rolePermissions,
        });
      } else {
        // Create new role
        await groupService.createRole(groupId, {
          name: roleName,
          description: roleDescription || undefined,
          ...rolePermissions,
        });
      }
      
      // Refresh roles list
      const updatedRoles = await groupService.getRoles(groupId);
      setRoles(updatedRoles);
      
      handleCloseRoleModal();
    } catch (error: any) {
      alert(error.response?.data?.message || (editingRole ? 'Erro ao atualizar função' : 'Erro ao criar função'));
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!confirm('Tem certeza que deseja excluir esta função?')) return;
    
    try {
      await groupService.deleteRole(groupId, roleId);
      const updatedRoles = await groupService.getRoles(groupId);
      setRoles(updatedRoles);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erro ao excluir função');
    }
  };

  if (!currentGroup) {
    return (
      <div>
        <p className="text-gray-600 dark:text-gray-400">Grupo não encontrado</p>
      </div>
    );
  }

  const canManageGroup = currentGroupPermissions?.canManageGroup || false;
  const isOwner = currentGroup.ownerId === (typeof window !== 'undefined' && JSON.parse(localStorage.getItem('user') || '{}').id);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 sm:text-2xl text-lg">
          Configurações do Grupo
        </h1>
  <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
          Gerencie as configurações, membros e funções de {currentGroup.name}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-2 py-2 font-small transition-colors text-[11px] sm:text-xs ${
            activeTab === 'general'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-1">
            <SettingsIcon size={18} />
            Geral
          </div>
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`px-2 py-2 font-small transition-colors text-[11px] sm:text-xs ${
            activeTab === 'members'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-1">
            <Users size={18} />
            Membros ({members.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-2 py-2 font-small transition-colors text-[11px] sm:text-xs ${
            activeTab === 'roles'
              ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          <div className="flex items-center gap-1">
            <Shield size={18} />
            Funções ({roles.length})
          </div>
        </button>
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-base sm:text-lg">
              Informações do Grupo
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 sm:text-sm">
                  Nome do Grupo
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  disabled={!canManageGroup}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 sm:text-sm">
                  Descrição do Grupo
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  disabled={!canManageGroup}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 resize-none"
                />
              </div>
              
              {canManageGroup && (
                <button
                  onClick={handleUpdateGroup}
                  disabled={updatingGroup}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {updatingGroup ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 border-red-200 dark:border-red-800">
            <h2 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 text-base sm:text-lg">
              Zona de Perigo
            </h2>
            
            {isOwner ? (
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 sm:text-sm">
                  Excluir este grupo permanentemente. Esta ação não pode ser desfeita.
                </p>
                <button
                  onClick={handleDeleteGroup}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 size={18} />
                  Excluir Grupo
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 sm:text-sm">
                  Sair deste grupo. Você precisará de um novo convite para voltar.
                </p>
                <button
                  onClick={handleLeaveGroup}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <LogOut size={18} />
                  Sair do Grupo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
              Membros do Grupo
            </h2>
            {canManageGroup && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-xs sm:text-sm"
              >
                <UserPlus size={14} />
                Convidar
              </button>
            )}
          </div>

          {loadingMembers ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm">
                      {member.user?.firstName} {member.user?.lastName}
                      {member.userId === currentGroup.ownerId && (
                        <span className="ml-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded">
                          Proprietário
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-gray-600 dark:text-gray-400 sm:text-xs">
                      {member.user?.email}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManageGroup && member.userId !== currentGroup.ownerId ? (
                      <>
                        <select
                          value={member.roleId}
                          onChange={(e) => handleUpdateMemberRole(member.id, parseInt(e.target.value))}
                          className="px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-[10px] sm:text-xs"
                        >
                          {roles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remover Membro"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <span className="px-1 py-0.5 text-[10px] text-gray-600 dark:text-gray-400 sm:text-xs">
                        {member.role?.name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white text-base sm:text-lg">
              Funções
            </h2>
            {canManageGroup && (
              <button
                onClick={() => handleOpenRoleModal()}
                className="px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-xs sm:text-sm"
              >
                <Plus size={14} />
                Nova Função
              </button>
            )}
          </div>

          {loadingRoles ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {roles.map((role) => {
                const isDefaultRole = ['Dono', 'Membro', 'Leitor'].includes(role.name);
                return (
                  <div key={role.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">
                          {role.name}
                        </div>
                        {role.description && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1 sm:text-sm">
                            {role.description}
                          </div>
                        )}
                      </div>
                      {canManageGroup && !isDefaultRole && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOpenRoleModal(role)}
                            className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          >
                            <SettingsIcon size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteRole(role.id)}
                            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={role.canViewTransactions} disabled className="rounded" />
                        <span className={role.canViewTransactions ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>Ver Transações</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={role.canManageOwnTransactions} disabled className="rounded" />
                        <span className={role.canManageOwnTransactions ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>Gerenciar Próprias Transações</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={role.canManageGroupTransactions} disabled className="rounded" />
                        <span className={role.canManageGroupTransactions ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>Gerenciar Transações do Grupo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={role.canViewCategories} disabled className="rounded" />
                        <span className={role.canViewCategories ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>Ver Categorias</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={role.canManageCategories} disabled className="rounded" />
                        <span className={role.canManageCategories ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>Gerenciar Categorias</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={role.canViewSubcategories} disabled className="rounded" />
                        <span className={role.canViewSubcategories ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>Ver Subcategorias</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={role.canManageSubcategories} disabled className="rounded" />
                        <span className={role.canManageSubcategories ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>Gerenciar Subcategorias</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={role.canViewBudgets} disabled className="rounded" />
                        <span className={role.canViewBudgets ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>Ver Orçamentos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={role.canManageBudgets} disabled className="rounded" />
                        <span className={role.canManageBudgets ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>Gerenciar Orçamentos</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={role.canViewAccounts} disabled className="rounded" />
                        <span className={role.canViewAccounts ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>Ver Contas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={role.canManageOwnAccounts} disabled className="rounded" />
                        <span className={role.canManageOwnAccounts ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>Gerenciar Próprias Contas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={role.canManageGroupAccounts} disabled className="rounded" />
                        <span className={role.canManageGroupAccounts ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>Gerenciar Contas do Grupo</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={role.canManageGroup} disabled className="rounded" />
                        <span className={role.canManageGroup ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-gray-700 dark:text-gray-300'}>Gerenciar Grupo</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Convidar Membro
                </h3>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setEmailSearch('');
                    setSelectedUser(null);
                    setSearchResults([]);
                  }}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Email Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Buscar por E-mail
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={emailSearch}
                      onChange={(e) => setEmailSearch(e.target.value)}
                      placeholder="Digite o e-mail"
                      className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {isSearching ? (
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      ) : (
                        <Search className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => {
                            setSelectedUser(user);
                            setEmailSearch('');
                            setSearchResults([]);
                          }}
                          className="w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-200 dark:border-gray-700 last:border-0"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {user.email}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {emailSearch.length >= 2 && searchResults.length === 0 && !isSearching && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      Nenhum usuário encontrado
                    </p>
                  )}
                </div>

                {/* Selected User */}
                {selectedUser && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Selecionado: {selectedUser.firstName} {selectedUser.lastName}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedUser.email}
                    </div>
                  </div>
                )}

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Atribuir Função
                  </label>
                  <select
                    value={selectedRoleId}
                    onChange={(e) => setSelectedRoleId(parseInt(e.target.value))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={0}>Selecione uma função</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setEmailSearch('');
                      setSelectedUser(null);
                      setSearchResults([]);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleInviteMember}
                    disabled={!selectedUser || !selectedRoleId || inviting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {inviting ? 'Convidando...' : 'Convidar Membro'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Creation/Edit Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingRole ? 'Editar Função' : 'Criar Função'}
                </h3>
                <button
                  onClick={handleCloseRoleModal}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Role Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome da Função
                  </label>
                  <input
                    type="text"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Accountant, Manager"
                  />
                </div>

                {/* Role Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descrição da Função
                  </label>
                  <textarea
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    placeholder="Optional description..."
                  />
                </div>

                {/* Permissions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Permissões
                  </label>
                  <div className="space-y-3 bg-gray-50 dark:bg-gray-700 p-4 rounded-lg max-h-96 overflow-y-auto">
                    {/* Transações */}
                    <div className="border-b border-gray-300 dark:border-gray-600 pb-2 mb-2">
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Transações</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="canViewTransactions"
                            checked={rolePermissions.canViewTransactions}
                            onChange={(e) => setRolePermissions({ ...rolePermissions, canViewTransactions: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="canViewTransactions" className="text-sm text-gray-900 dark:text-white cursor-pointer">
                            Ver Transações
                          </label>
                        </div>
                        <div className="flex items-center gap-3 ml-6">
                          <input
                            type="checkbox"
                            id="canManageOwnTransactions"
                            checked={rolePermissions.canManageOwnTransactions}
                            onChange={(e) => setRolePermissions({ ...rolePermissions, canManageOwnTransactions: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="canManageOwnTransactions" className="text-sm text-gray-900 dark:text-white cursor-pointer">
                            Gerenciar Próprias Transações
                          </label>
                        </div>
                        <div className="flex items-center gap-3 ml-6">
                          <input
                            type="checkbox"
                            id="canManageGroupTransactions"
                            checked={rolePermissions.canManageGroupTransactions}
                            onChange={(e) => setRolePermissions({ ...rolePermissions, canManageGroupTransactions: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="canManageGroupTransactions" className="text-sm text-gray-900 dark:text-white cursor-pointer">
                            Gerenciar Transações do Grupo
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Categorias */}
                    <div className="border-b border-gray-300 dark:border-gray-600 pb-2 mb-2">
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Categorias</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="canViewCategories"
                            checked={rolePermissions.canViewCategories}
                            onChange={(e) => setRolePermissions({ ...rolePermissions, canViewCategories: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="canViewCategories" className="text-sm text-gray-900 dark:text-white cursor-pointer">
                            Ver Categorias
                          </label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="canManageCategories"
                            checked={rolePermissions.canManageCategories}
                            onChange={(e) => setRolePermissions({ ...rolePermissions, canManageCategories: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="canManageCategories" className="text-sm text-gray-900 dark:text-white cursor-pointer">
                            Gerenciar Categorias
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Subcategorias */}
                    <div className="border-b border-gray-300 dark:border-gray-600 pb-2 mb-2">
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Subcategorias</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="canViewSubcategories"
                            checked={rolePermissions.canViewSubcategories}
                            onChange={(e) => setRolePermissions({ ...rolePermissions, canViewSubcategories: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="canViewSubcategories" className="text-sm text-gray-900 dark:text-white cursor-pointer">
                            Ver Subcategorias
                          </label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="canManageSubcategories"
                            checked={rolePermissions.canManageSubcategories}
                            onChange={(e) => setRolePermissions({ ...rolePermissions, canManageSubcategories: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="canManageSubcategories" className="text-sm text-gray-900 dark:text-white cursor-pointer">
                            Gerenciar Subcategorias
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Orçamentos */}
                    <div className="border-b border-gray-300 dark:border-gray-600 pb-2 mb-2">
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Orçamentos</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="canViewBudgets"
                            checked={rolePermissions.canViewBudgets}
                            onChange={(e) => setRolePermissions({ ...rolePermissions, canViewBudgets: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="canViewBudgets" className="text-sm text-gray-900 dark:text-white cursor-pointer">
                            Ver Orçamentos
                          </label>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="canManageBudgets"
                            checked={rolePermissions.canManageBudgets}
                            onChange={(e) => setRolePermissions({ ...rolePermissions, canManageBudgets: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="canManageBudgets" className="text-sm text-gray-900 dark:text-white cursor-pointer">
                            Gerenciar Orçamentos
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Contas */}
                    <div className="border-b border-gray-300 dark:border-gray-600 pb-2 mb-2">
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Contas</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="canViewAccounts"
                            checked={rolePermissions.canViewAccounts}
                            onChange={(e) => setRolePermissions({ ...rolePermissions, canViewAccounts: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="canViewAccounts" className="text-sm text-gray-900 dark:text-white cursor-pointer">
                            Ver Contas
                          </label>
                        </div>
                        <div className="flex items-center gap-3 ml-6">
                          <input
                            type="checkbox"
                            id="canManageOwnAccounts"
                            checked={rolePermissions.canManageOwnAccounts}
                            onChange={(e) => setRolePermissions({ ...rolePermissions, canManageOwnAccounts: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="canManageOwnAccounts" className="text-sm text-gray-900 dark:text-white cursor-pointer">
                            Gerenciar Próprias Contas
                          </label>
                        </div>
                        <div className="flex items-center gap-3 ml-6">
                          <input
                            type="checkbox"
                            id="canManageGroupAccounts"
                            checked={rolePermissions.canManageGroupAccounts}
                            onChange={(e) => setRolePermissions({ ...rolePermissions, canManageGroupAccounts: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="canManageGroupAccounts" className="text-sm text-gray-900 dark:text-white cursor-pointer">
                            Gerenciar Contas do Grupo
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Grupo */}
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Grupo</h4>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="canManageGroup"
                          checked={rolePermissions.canManageGroup}
                          onChange={(e) => setRolePermissions({ ...rolePermissions, canManageGroup: e.target.checked })}
                          className="rounded"
                        />
                        <label htmlFor="canManageGroup" className="text-sm text-gray-900 dark:text-white cursor-pointer">
                          Gerenciar Grupo
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCloseRoleModal}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveRole}
                    disabled={!roleName.trim() || savingRole}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {savingRole ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
