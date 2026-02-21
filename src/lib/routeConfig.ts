/**
 * Configuração de requisitos de permissão para cada rota
 */

import { PageRequirement } from './permissions';

/**
 * Interface para definir requisitos de uma rota
 */
export interface RouteConfig {
  path: string;
  requirement: PageRequirement;
  matchType?: 'exact' | 'prefix'; // exact = caminho exato, prefix = todos os caminhos que começam com
}

/**
 * Mapa de todas as rotas protegidas e seus requisitos
 * IMPORTANTE: Rotas mais específicas devem vir ANTES das mais genéricas
 */
export const PROTECTED_ROUTES: RouteConfig[] = [
  // Páginas de configuração (admin apenas)
  { path: '/settings', requirement: 'admin', matchType: 'prefix' },
  
  // Páginas de relatórios
  { path: '/report/fill', requirement: 'leaderInTraining', matchType: 'exact' },
  { path: '/report/view', requirement: 'leaderInTraining', matchType: 'exact' },
  
  // Páginas específicas de células
  { path: '/celulas/[id]/members', requirement: 'leaderInTraining', matchType: 'prefix' },
  { path: '/celulas/[id]/presence', requirement: 'leaderInTraining', matchType: 'prefix' },
  
  // Páginas principais
  { path: '/', requirement: 'leaderInTraining', matchType: 'exact' },
  { path: '/members', requirement: 'leaderInTraining', matchType: 'prefix' },
  { path: '/celulas', requirement: 'leaderInTraining', matchType: 'prefix' },
  { path: '/discipulados', requirement: 'leaderInTraining', matchType: 'prefix' },
  { path: '/redes', requirement: 'leaderInTraining', matchType: 'prefix' },
  { path: '/congregacoes', requirement: 'leaderInTraining', matchType: 'prefix' },
  
  // Perfil (todos autenticados podem acessar)
  { path: '/profile', requirement: 'visitor', matchType: 'exact' },
];

/**
 * Rotas públicas que não requerem autenticação
 */
export const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/set-password',
  '/auth/select-matrix',
];

/**
 * Rotas que não requerem verificação de permissão (além de autenticação)
 */
export const NO_PERMISSION_CHECK_ROUTES = [
  '/access-denied',
  '/profile',
];

/**
 * Verifica se uma rota é pública
 */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Verifica se uma rota não requer verificação de permissão
 */
export function skipPermissionCheck(pathname: string): boolean {
  return NO_PERMISSION_CHECK_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Encontra a configuração de rota que corresponde ao pathname fornecido
 * Retorna a primeira rota que corresponde (por isso rotas específicas devem vir primeiro)
 */
export function findRouteConfig(pathname: string): RouteConfig | null {
  for (const route of PROTECTED_ROUTES) {
    // Substituir [id] por regex pattern
    const pattern = route.path.replace(/\[id\]/g, '[^/]+');
    
    if (route.matchType === 'exact') {
      const regex = new RegExp(`^${pattern}$`);
      if (regex.test(pathname)) {
        return route;
      }
    } else {
      // matchType === 'prefix' (padrão)
      const regex = new RegExp(`^${pattern}`);
      if (regex.test(pathname)) {
        return route;
      }
    }
  }
  
  // Se nenhuma rota específica foi encontrada, retornar null
  // Isso significa que a rota não tem requisitos específicos definidos
  return null;
}

/**
 * Obtém o requisito de permissão para um pathname específico
 * Se não encontrar configuração específica, retorna 'visitor' como padrão
 */
export function getRouteRequirement(pathname: string): PageRequirement {
  const config = findRouteConfig(pathname);
  return config?.requirement ?? 'visitor';
}
