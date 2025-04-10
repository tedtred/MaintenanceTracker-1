import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";

/**
 * Custom hook to check if the current user has admin rights
 * 
 * @returns Object with isAdmin boolean
 */
export function usePermissions() {
  const { user } = useAuth();
  
  // Check if user is admin
  const isAdmin = user?.role === UserRole.ADMIN;
  
  return {
    isAdmin,
    user
  };
}