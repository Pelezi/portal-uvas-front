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
  pastorCongregacao: boolean;
  pastorPresidente: boolean;
  ministryType: MinistryType | null;
  celulaIds: number[] | null;
}

export interface AuthResponse {
  token: string;
  refreshToken?: string;
  member: Member;  // Changed from 'user' to 'member' to match backend
  user?: Member;   // Keep 'user' for backward compatibility
  permission?: Permission | null;
}

export interface SetPasswordResponse {
  token: string;
  member: Member;
  permission: null;
  setPasswordUrl: string;
}

export type LoginResponse = AuthResponse | SetPasswordResponse;

export interface Matrix {
  id: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  domains?: MatrixDomain[];
}

export interface MatrixDomain {
  id: number;
  domain: string;
  matrixId: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MatrixAuthResponse extends AuthResponse {
  matrices?: Matrix[];
  currentMatrix?: { id: number; name: string };
  requireMatrixSelection?: boolean;
}

export interface Celula {
  id: number;
  name: string;
  leaderMemberId?: number;
  viceLeaderMemberId?: number;
  // optional embedded leader member object when returned by API
  leader?: Member | null;
  viceLeader?: Member | null;
  leadersInTraining?: { id: number; member: Member }[];
  discipuladoId?: number;
  weekday?: number | null; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  time?: string | null; // Formato HH:mm (ex: "19:30")
  
  // Address fields
  country?: string | null;
  zipCode?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  complement?: string | null;
  state?: string | null;
  
  createdAt?: string;
  updatedAt?: string;
  discipulado?: Discipulado | null;
}

export interface Discipulado {
  id: number;
  redeId: number;
  discipuladorMemberId: number;
  rede: Rede;
  discipulador: Member;
}

export interface Rede {
  id: number;
  name: string;
  congregacaoId: number;
  congregacao?: Congregacao | null;
  pastorMemberId?: number | null;
  pastor?: Member | null;
}

export interface Congregacao {
  id: number;
  name: string;
  pastorGovernoMemberId: number;
  vicePresidenteMemberId?: number | null;
  isPrincipal: boolean;
  pastorGoverno?: Member | null;
  vicePresidente?: Member | null;
  redes?: Rede[];
  
  // Address fields
  country?: string | null;
  zipCode?: string | null;
  street?: string | null;
  streetNumber?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  complement?: string | null;
  state?: string | null;
  
  createdAt?: string;
  updatedAt?: string;
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

export interface ApiKey {
  id: number;
  name: string;
  keyPreview: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  createdBy: {
    id: number;
    name: string;
  };
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
  hasDefaultPassword?: boolean | null;
  inviteSent?: boolean;
  hasLoggedIn?: boolean;
  isOwner?: boolean;
  
  // Roles
  roles?: Array<{ id: number; role: Role }>;
  
  // Permission (populated after login)
  permission?: Permission | null;
}

export interface ReportCreateInput {
  memberIds: number[];
  /** Optional date for the report in yyyy-mm-dd format (defaults to today) */
  date?: string;
  /** Report type: CELULA or CULTO */
  type?: 'CELULA' | 'CULTO';
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
