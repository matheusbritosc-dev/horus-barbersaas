export type Role = "platform_admin" | "barbershop_owner" | "barber" | "client";

export interface TenantContext {
  organizationId: string;
  unitId?: string;
  role: Role;
}
