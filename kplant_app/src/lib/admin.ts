export const ADMIN_EMAIL = "kplant.aiot@gmail.com";

export function isAdmin(email: string | undefined | null): boolean {
  return email === ADMIN_EMAIL;
}
