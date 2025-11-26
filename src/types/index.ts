export interface User {
  id: number;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  firstAccess?: boolean;
  timezone?: string;
  permission?: Permission | null;
}

export interface Permission {
  id: number;
  admin: boolean;
  viceLeader: boolean;
  leader: boolean;
  discipulador: boolean;
  pastor: boolean;
  celulaIds: number[] | null;
}

export interface AuthResponse {
  token: string;
  user: User;
  permission?: Permission | null;
}


export interface Celula {
  id: number;
  name: string;
  leaderUserId?: number;
  // optional embedded leader user object when returned by API
  leader?: User | null;
  discipuladoId?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Discipulado {
  id: number;
  name: string;
  redeId: number;
  discipuladorUserId: number;
  rede: Rede;
  discipulador: User;
}

export interface Rede {
  id: number;
  name: string;
  pastorUserId: number;
}

export interface Member {
  id: number;
  celulaId: number;
  name: string;
  createdAt?: string;
  updatedAt?: string;
  status?: 'VISITOR' | 'MEMBER' | 'FA' | 'INACTIVE';
  maritalStatus?: 'SINGLE' | 'COHABITATING' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';
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
