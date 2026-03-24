import { Role } from "@/lib/types";

const PERMISSIONS: Record<Role, string[]> = {
  platform_admin: ["platform:*", "tenant:read", "tenant:write"],
  barbershop_owner: ["tenant:read", "tenant:write", "billing:manage"],
  barber: ["appointments:read", "appointments:write", "orders:write", "clients:read"],
  client: ["appointments:self", "subscriptions:self"]
};

export function hasPermission(role: Role, permission: string) {
  const available = PERMISSIONS[role];
  return available.includes(permission) || available.includes("platform:*");
}
