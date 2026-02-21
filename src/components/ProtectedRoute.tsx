'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { isPublicRoute, getRouteRequirement, skipPermissionCheck } from '@/lib/routeConfig';
import { hasPermission, getRequirementLabel } from '@/lib/permissions';

export default function ProtectedRoute({ 
  children
}: { 
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, currentMatrix, requireMatrixSelection, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      // Check if route is public
      if (isPublicRoute(pathname)) {
        setPermissionChecked(true);
        return;
      }

      // Check if user is not authenticated
      if (!isAuthenticated) {
        router.push('/auth/login');
        return;
      }

      // If authenticated but no matrix selected (and not in matrix selection flow)
      if (!currentMatrix && !pathname.includes('/auth/select-matrix')) {
        // If requires matrix selection, redirect to select-matrix
        if (requireMatrixSelection) {
          router.push('/auth/select-matrix');
        } else {
          // Otherwise redirect to login to get matrix info
          router.push('/auth/login');
        }
        return;
      }

      // Skip permission check for certain routes (access-denied, profile, etc)
      if (skipPermissionCheck(pathname)) {
        setPermissionChecked(true);
        return;
      }

      // Check permission for the current route
      if (isAuthenticated && currentMatrix && user?.permission) {
        const requirement = getRouteRequirement(pathname);
        const hasAccess = hasPermission(user.permission, requirement);

        if (!hasAccess) {
          // User doesn't have permission, redirect to access denied page
          console.warn(`Access denied to ${pathname}. Required: ${getRequirementLabel(requirement)}`);
          router.push('/access-denied');
          return;
        }
      }

      setPermissionChecked(true);
    }
  }, [isAuthenticated, isLoading, currentMatrix, requireMatrixSelection, router, pathname, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // Allow access to public/auth pages
  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  // For protected routes, require both authentication and matrix
  if (!currentMatrix) {
    return null;
  }

  // Wait for permission check to complete
  if (!permissionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
