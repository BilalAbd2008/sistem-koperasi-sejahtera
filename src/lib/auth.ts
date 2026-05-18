/**
 * Auth utility functions for multi-user/multi-role session management.
 * Stores multiple users by role and tracks the current active role.
 */

export interface User {
  id: number;
  username: string;
  nama_lengkap: string;
  email: string;
  role: string;
  anggota_id?: number;
}

/**
 * Get the current active user based on currentRole.
 */
export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;

  const users = JSON.parse(localStorage.getItem("users") || "[]") as User[];
  const currentRole = localStorage.getItem("currentRole");

  if (!currentRole) return null;

  return users.find((u) => u.role === currentRole) || null;
}

/**
 * Get all logged-in users across roles.
 */
export function getAllUsers(): User[] {
  if (typeof window === "undefined") return [];

  return JSON.parse(localStorage.getItem("users") || "[]") as User[];
}

/**
 * Switch to a different role if already logged in.
 */
export function switchRole(role: string): boolean {
  if (typeof window === "undefined") return false;

  const users = JSON.parse(localStorage.getItem("users") || "[]") as User[];
  const user = users.find((u) => u.role === role);

  if (user) {
    localStorage.setItem("currentRole", role);
    return true;
  }

  return false;
}

/**
 * Logout from a specific role or completely.
 * @param role - If provided, logout only from that role. If not, logout from all.
 */
export function logout(role?: string): void {
  if (typeof window === "undefined") return;

  if (role) {
    const users = JSON.parse(localStorage.getItem("users") || "[]") as User[];
    const filtered = users.filter((u) => u.role !== role);
    localStorage.setItem("users", JSON.stringify(filtered));

    const currentRole = localStorage.getItem("currentRole");
    if (currentRole === role) {
      if (filtered.length > 0) {
        localStorage.setItem("currentRole", filtered[0].role);
      } else {
        localStorage.removeItem("currentRole");
      }
    }
  } else {
    // Full logout
    localStorage.removeItem("users");
    localStorage.removeItem("currentRole");
  }
}
