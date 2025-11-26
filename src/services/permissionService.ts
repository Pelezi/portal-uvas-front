import api from '@/lib/apiClient';

export const permissionService = {
  upsertPermission: async (data: {
    email: string;
    celulaIds: Array<string | number>;
    hasGlobalCelulaAccess: boolean;
    canManageCelulas: boolean;
    canManagePermissions: boolean;
  }) => {
    const response = await api.post('/permissions', data);
    return response.data;
  },
};
