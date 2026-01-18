/**
 * Tipos de ministério/posições na hierarquia da igreja
 * Ordem hierárquica (do mais alto ao mais baixo):
 * - PRESIDENT_PASTOR: Pastor Presidente
 * - PASTOR: Pastor (líder de Rede)
 * - DISCIPULADOR: Discipulador (líder de Discipulado)
 * - LEADER: Líder (líder de Célula)
 * - LEADER_IN_TRAINING: Líder em Treinamento
 * - MEMBER: Membro
 * - REGULAR_ATTENDEE: Frequentador Assíduo
 * - VISITOR: Visitante
 */
export type MinistryType = 
  | 'PRESIDENT_PASTOR' 
  | 'PASTOR' 
  | 'DISCIPULADOR' 
  | 'LEADER' 
  | 'LEADER_IN_TRAINING' 
  | 'MEMBER' 
  | 'REGULAR_ATTENDEE' 
  | 'VISITOR';

/**
 * Permissões do usuário autenticado
 * Retornado pelo backend após login (SimplifiedPermission)
 */
export interface Permission {
  id: number;
  isAdmin: boolean;
  viceLeader: boolean;
  leader: boolean;
  discipulador: boolean;
  pastor: boolean;
  ministryType: MinistryType | null;
  celulaIds: number[] | null;
}

export interface AuthResponse {
  token: string;
  user: Member;
  permission?: Permission | null;
}

export interface SetPasswordResponse {
  token: string;
  member: Member;
  permission: null;
  setPasswordUrl: string;
}

export type LoginResponse = AuthResponse | SetPasswordResponse;

export interface Celula {
  id: number;
  name: string;
  leaderMemberId?: number;
  // optional embedded leader member object when returned by API
  leader?: Member | null;
  discipuladoId?: number;
  weekday?: number | null; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  time?: string | null; // Formato HH:mm (ex: "19:30")
  createdAt?: string;
  updatedAt?: string;
}

export interface Discipulado {
  id: number;
  name: string;
  redeId: number;
  discipuladorMemberId?: number | null;
  rede: Rede;
  discipulador?: Member | null;
}

export interface Rede {
  id: number;
  name: string;
  pastorMemberId?: number | null;
  pastor?: Member | null;
}

export interface Role {
  id: number;
  name: string;
  isAdmin?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Ministry {
  id: number;
  name: string;
  type?: MinistryType;
  priority?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface WinnerPath {
  id: number;
  name: string;
  priority?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Member {
  id: number;
  celulaId?: number | null;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  maritalStatus?: 'SINGLE' | 'COHABITATING' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
  celula?: Celula | null;
  isActive?: boolean;
  
  // Personal info
  photoUrl?: string;
  phone?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  isBaptized?: boolean;
  baptismDate?: string;
  birthDate?: string;
  registerDate?: string;
  spouseId?: number | null;
  spouse?: Member | null;
  
  // Church info
  ministryPositionId?: number | null;
  ministryPosition?: {
    id: number;
    name: string;
    type: 'PRESIDENT_PASTOR' | 'PASTOR' | 'DISCIPULADOR' | 'LEADER' | 'LEADER_IN_TRAINING' | 'MEMBER' | 'REGULAR_ATTENDEE' | 'VISITOR';
    priority: number;
  } | null;
  winnerPathId?: number | null;
  canBeHost?: boolean;
  
  // Address
  country?: string;
  zipCode?: string;
  street?: string;
  streetNumber?: string;
  neighborhood?: string;
  city?: string;
  complement?: string;
  state?: string;
  
  // Access
  email?: string;
  hasSystemAccess?: boolean;
  
  // Roles
  roles?: Array<{ id: number; role: Role }>;
  
  // Permission (populated after login)
  permission?: Permission | null;
}

export interface ReportCreateInput {
  memberIds: number[];
  /** Optional date for the report in yyyy-mm-dd format (defaults to today) */
  date?: string;
}

export interface PermissionUpsertInput {
  email: string;
  celulaIds: string[];
  hasGlobalCelulaAccess: boolean;
  canManageCelulas: boolean;
  canManagePermissions: boolean;
}

export interface PresenceData {
  date: string;
  members: Member[];
}

export interface MemberFilters {
  celulaId?: number;
  discipuladoId?: number;
  redeId?: number;
}

// Type for MUI Select events
export type SelectChangeEvent<T = string> = React.ChangeEvent<{ value: T }>;

// Helper type for HTML elements  
export type HTMLElementRef = HTMLElement | null;
