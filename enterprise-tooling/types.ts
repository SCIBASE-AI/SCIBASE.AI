export type SSOProtocol = 'SAML_2_0' | 'OIDC' | 'OAUTH2';
export type AuditSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface SSOConfig {
  id: string;
  orgId: string;
  protocol: SSOProtocol;
  issuerUrl: string;
  ssoEndpoint: string;
  certificateFingerprint: string;
  isEnabled: boolean;
}

export interface AuditEvent {
  id: string;
  orgId: string;
  actorId: string;
  action: string;
  targetResource: string;
  severity: AuditSeverity;
  ipAddress: string;
  timestamp: string;
}

export interface ResourceQuota {
  orgId: string;
  maxStorageGb: number;
  currentStorageGb: number;
  maxGpuHoursPerMonth: number;
  usedGpuHours: number;
}
