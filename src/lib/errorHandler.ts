import { AxiosError } from 'axios';

/**
 * Extrai mensagem de erro detalhada de uma resposta de erro do backend
 * @param error - Erro capturado (pode ser AxiosError, Error ou unknown)
 * @param defaultMessage - Mensagem padrão caso não seja possível extrair do backend
 * @returns Mensagem de erro formatada para exibição ao usuário
 */
export function getErrorMessage(error: unknown, defaultMessage: string = 'Erro desconhecido'): string {
  // Se for um AxiosError (erro do axios)
  if (error && typeof error === 'object' && 'isAxiosError' in error) {
    const axiosError = error as AxiosError<{ message?: string; error?: string; statusCode?: number }>;
    
    // Tentar extrair a mensagem do backend
    const backendMessage = axiosError.response?.data?.message || axiosError.response?.data?.error;
    
    if (backendMessage) {
      return backendMessage;
    }
    
    // Mensagens baseadas no status HTTP
    const status = axiosError.response?.status;
    switch (status) {
      case 400:
        return 'Dados inválidos. Verifique os campos e tente novamente.';
      case 401:
        return 'Não autorizado. Faça login novamente.';
      case 403:
        return 'Você não tem permissão para realizar esta ação.';
      case 404:
        return 'Recurso não encontrado.';
      case 409:
        return 'Conflito: este item já existe ou está em uso.';
      case 422:
        return 'Dados não processáveis. Verifique os campos obrigatórios.';
      case 500:
        return 'Erro interno do servidor. Tente novamente mais tarde.';
      case 503:
        return 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.';
      default:
        if (status && status >= 500) {
          return 'Erro no servidor. Tente novamente mais tarde.';
        }
    }
  }
  
  // Se for um Error padrão
  if (error instanceof Error) {
    return error.message || defaultMessage;
  }
  
  // Fallback para mensagem padrão
  return defaultMessage;
}

/**
 * Formata mensagem de erro para operações CRUD específicas
 */
export const ErrorMessages = {
  // Redes
  createRede: (error: unknown) => getErrorMessage(error, 'Falha ao criar rede'),
  updateRede: (error: unknown) => getErrorMessage(error, 'Falha ao atualizar rede'),
  deleteRede: (error: unknown) => getErrorMessage(error, 'Falha ao remover rede'),
  loadRedes: (error: unknown) => getErrorMessage(error, 'Falha ao carregar redes'),
  
  // Discipulados
  createDiscipulado: (error: unknown) => getErrorMessage(error, 'Falha ao criar discipulado'),
  updateDiscipulado: (error: unknown) => getErrorMessage(error, 'Falha ao atualizar discipulado'),
  deleteDiscipulado: (error: unknown) => getErrorMessage(error, 'Falha ao remover discipulado'),
  loadDiscipulados: (error: unknown) => getErrorMessage(error, 'Falha ao carregar discipulados'),
  
  // Células
  createCelula: (error: unknown) => getErrorMessage(error, 'Falha ao criar célula'),
  updateCelula: (error: unknown) => getErrorMessage(error, 'Falha ao atualizar célula'),
  deleteCelula: (error: unknown) => getErrorMessage(error, 'Falha ao remover célula'),
  duplicateCelula: (error: unknown) => getErrorMessage(error, 'Falha ao duplicar célula'),
  multiplyCelula: (error: unknown) => getErrorMessage(error, 'Falha ao multiplicar célula'),
  loadCelulas: (error: unknown) => getErrorMessage(error, 'Falha ao carregar células'),
  
  // Membros
  createMember: (error: unknown) => getErrorMessage(error, 'Falha ao criar membro'),
  updateMember: (error: unknown) => getErrorMessage(error, 'Falha ao atualizar membro'),
  deleteMember: (error: unknown) => getErrorMessage(error, 'Falha ao remover membro'),
  loadMembers: (error: unknown) => getErrorMessage(error, 'Falha ao carregar membros'),
  inviteMember: (error: unknown) => getErrorMessage(error, 'Falha ao enviar convite'),
  
  // Relatórios
  createReport: (error: unknown) => getErrorMessage(error, 'Falha ao criar relatório'),
  loadReports: (error: unknown) => getErrorMessage(error, 'Falha ao carregar relatórios'),
  
  // Configurações
  createRole: (error: unknown) => getErrorMessage(error, 'Falha ao criar cargo'),
  updateRole: (error: unknown) => getErrorMessage(error, 'Falha ao atualizar cargo'),
  deleteRole: (error: unknown) => getErrorMessage(error, 'Falha ao remover cargo'),
  
  createMinistry: (error: unknown) => getErrorMessage(error, 'Falha ao criar ministério'),
  updateMinistry: (error: unknown) => getErrorMessage(error, 'Falha ao atualizar ministério'),
  deleteMinistry: (error: unknown) => getErrorMessage(error, 'Falha ao remover ministério'),
  
  createWinnerPath: (error: unknown) => getErrorMessage(error, 'Falha ao criar caminho vencedor'),
  updateWinnerPath: (error: unknown) => getErrorMessage(error, 'Falha ao atualizar caminho vencedor'),
  deleteWinnerPath: (error: unknown) => getErrorMessage(error, 'Falha ao remover caminho vencedor'),
  
  // Genéricos
  save: (error: unknown) => getErrorMessage(error, 'Falha ao salvar'),
  delete: (error: unknown) => getErrorMessage(error, 'Falha ao remover'),
  load: (error: unknown) => getErrorMessage(error, 'Falha ao carregar dados'),
  checkAssociations: (error: unknown) => getErrorMessage(error, 'Falha ao verificar associações'),
};
