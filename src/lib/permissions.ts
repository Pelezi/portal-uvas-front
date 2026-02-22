/**
 * Helper functions para verificar permissões baseadas no ministryType
 */

import { Permission, MinistryType } from '@/types';

/**
 * Níveis de permissão na hierarquia da igreja
 * Do mais alto ao mais baixo
 */
export const MINISTRY_HIERARCHY: MinistryType[] = [
  'PRESIDENT_PASTOR',
  'PASTOR',
  'DISCIPULADOR',
  'LEADER',
  'LEADER_IN_TRAINING',
  'MEMBER',
  'REGULAR_ATTENDEE',
  'VISITOR'
];

/**
 * Tipos de requisitos de permissão para páginas
 */
export type PageRequirement = 
  | 'admin'
  | 'pastorPresidente'
  | 'pastor'
  | 'discipulador'
  | 'leader'
  | 'leaderInTraining'
  | 'member'
  | 'visitor';

/**
 * Mapeia requisitos para os ministryTypes mínimos necessários
 */
const REQUIREMENT_TO_MINISTRY_TYPE: Record<PageRequirement, MinistryType[]> = {
  admin: [], // Admin é um campo separado, não ministryType
  pastorPresidente: ['PRESIDENT_PASTOR'],
  pastor: ['PRESIDENT_PASTOR', 'PASTOR'],
  discipulador: ['PRESIDENT_PASTOR', 'PASTOR', 'DISCIPULADOR'],
  leader: ['PRESIDENT_PASTOR', 'PASTOR', 'DISCIPULADOR', 'LEADER'],
  leaderInTraining: ['PRESIDENT_PASTOR', 'PASTOR', 'DISCIPULADOR', 'LEADER', 'LEADER_IN_TRAINING'],
  member: ['PRESIDENT_PASTOR', 'PASTOR', 'DISCIPULADOR', 'LEADER', 'LEADER_IN_TRAINING', 'MEMBER'],
  visitor: MINISTRY_HIERARCHY, // Todos podem acessar
};

/**
 * Verifica se o usuário tem permissão baseado no seu ministryType
 */
export function hasMinistryPermission(
  userMinistryType: MinistryType | null | undefined,
  requiredLevel: PageRequirement
): boolean {
  if (!userMinistryType) return false;
  
  const allowedTypes = REQUIREMENT_TO_MINISTRY_TYPE[requiredLevel];
  return allowedTypes.includes(userMinistryType);
}

/**
 * Verifica se o usuário tem permissão completa (considerando admin e ministryType)
 */
export function hasPermission(
  permission: Permission | null | undefined,
  requirement: PageRequirement
): boolean {
  if (!permission) return false;

  // Admin tem acesso a tudo
  if (permission.isAdmin) return true;

  // Verificação específica para cada tipo de requisito
  switch (requirement) {
    case 'admin':
      return permission.isAdmin;
    
    case 'pastorPresidente':
      return permission.pastorPresidente || hasMinistryPermission(permission.ministryType, 'pastorPresidente');
    
    case 'pastor':
      return permission.pastor || hasMinistryPermission(permission.ministryType, 'pastor');
    
    case 'discipulador':
      return permission.discipulador || hasMinistryPermission(permission.ministryType, 'discipulador');
    
    case 'leader':
      return permission.leader || hasMinistryPermission(permission.ministryType, 'leader');
    
    case 'leaderInTraining':
      return permission.leaderInTraining || hasMinistryPermission(permission.ministryType, 'leaderInTraining');
    
    case 'member':
      return hasMinistryPermission(permission.ministryType, 'member');
    
    case 'visitor':
      return true; // Todos autenticados podem acessar páginas de nível visitor
    
    default:
      return false;
  }
}

/**
 * Obtém o label amigável do ministryType
 */
export function getMinistryTypeLabel(type?: MinistryType | null): string {
  const labels: Record<MinistryType, string> = {
    PRESIDENT_PASTOR: 'Pastor Presidente',
    PASTOR: 'Pastor',
    DISCIPULADOR: 'Discipulador',
    LEADER: 'Líder',
    LEADER_IN_TRAINING: 'Líder em Treinamento',
    MEMBER: 'Membro',
    REGULAR_ATTENDEE: 'Frequentador Assíduo',
    VISITOR: 'Visitante',
  };
  return type ? labels[type] : 'Membro';
}

/**
 * Obtém o label amigável do requisito de página
 */
export function getRequirementLabel(requirement: PageRequirement): string {
  const labels: Record<PageRequirement, string> = {
    admin: 'Administrador',
    pastorPresidente: 'Pastor Presidente',
    pastor: 'Pastor',
    discipulador: 'Discipulador',
    leader: 'Líder',
    leaderInTraining: 'Líder em Treinamento',
    member: 'Membro',
    visitor: 'Visitante',
  };
  return labels[requirement];
}

/**
 * Compara dois ministryTypes e retorna qual é superior na hierarquia
 */
export function compareMinistryTypes(
  type1: MinistryType | null,
  type2: MinistryType | null
): number {
  if (!type1 && !type2) return 0;
  if (!type1) return 1; // type2 é superior
  if (!type2) return -1; // type1 é superior
  
  const index1 = MINISTRY_HIERARCHY.indexOf(type1);
  const index2 = MINISTRY_HIERARCHY.indexOf(type2);
  
  return index1 - index2; // Negativo se type1 é superior, positivo se type2 é superior
}

/**
 * Verifica se um ministryType é superior ou igual a outro
 */
export function isMinistryTypeEqualOrHigher(
  userType: MinistryType | null,
  requiredType: MinistryType
): boolean {
  if (!userType) return false;
  return compareMinistryTypes(userType, requiredType) <= 0;
}
