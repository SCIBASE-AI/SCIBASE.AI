/**
 * Enterprise Tooling & Institutional Admin Dashboards
 * Author: @Dungsky
 */

export enum ProjectVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  RESTRICTED = 'restricted'
}

export enum UserRole {
  INSTITUTION_ADMIN = 'institution_admin',
  DEPARTMENT_HEAD = 'department_head',
  RESEARCHER = 'researcher',
  AUDITOR = 'auditor'
}

export interface ProjectSummary {
  id: string;
  name: string;
  departmentId: string;
  visibility: ProjectVisibility;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  metrics: {
    activeContributors: number;
    storageUsedBytes: number;
    computeHours: number;
  };
}

export interface DepartmentMetrics {
  departmentId: string;
  departmentName: string;
  totalProjects: number;
  publicProjects: number;
  privateProjects: number;
  totalStorageBytes: number;
  totalComputeHours: number;
}

export interface OrganizationOverview {
  organizationId: string;
  timestamp: Date;
  totalProjects: number;
  totalUsers: number;
  departments: DepartmentMetrics[];
  systemHealth: {
    apiUptimePercentage: number;
    activeIntegrations: number;
    complianceAuditPassed: boolean;
  };
}

export interface EnterpriseAuditLog {
  eventId: string;
  timestamp: Date;
  actorId: string;
  action: string;
  targetResource: string;
  metadata: Record<string, unknown>;
}

export class EnterpriseToolingManager {
  private projects: Map<string, ProjectSummary> = new Map();
  private auditLogs: EnterpriseAuditLog[] = [];

  constructor(private readonly organizationId: string) {}

  public registerProject(project: ProjectSummary): void {
    this.projects.set(project.id, project);
    this.recordAudit({
      eventId: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      actorId: project.ownerId,
      action: 'PROJECT_REGISTERED',
      targetResource: project.id,
      metadata: { visibility: project.visibility, departmentId: project.departmentId }
    });
  }

  public getOrganizationOverview(requesterRole: UserRole): OrganizationOverview {
    if (requesterRole !== UserRole.INSTITUTION_ADMIN && requesterRole !== UserRole.DEPARTMENT_HEAD) {
      throw new Error('Unauthorized: Insufficient privileges to access organization-wide enterprise dashboard.');
    }

    const allProjects = Array.from(this.projects.values());
    const departmentMap = new Map<string, DepartmentMetrics>();

    let totalStorage = 0;
    let totalCompute = 0;

    for (const p of allProjects) {
      totalStorage += p.metrics.storageUsedBytes;
      totalCompute += p.metrics.computeHours;

      if (!departmentMap.has(p.departmentId)) {
        departmentMap.set(p.departmentId, {
          departmentId: p.departmentId,
          departmentName: `Department ${p.departmentId}`,
          totalProjects: 0,
          publicProjects: 0,
          privateProjects: 0,
          totalStorageBytes: 0,
          totalComputeHours: 0
        });
      }

      const dept = departmentMap.get(p.departmentId)!;
      dept.totalProjects += 1;
      if (p.visibility === ProjectVisibility.PUBLIC) {
        dept.publicProjects += 1;
      } else {
        dept.privateProjects += 1;
      }
      dept.totalStorageBytes += p.metrics.storageUsedBytes;
      dept.totalComputeHours += p.metrics.computeHours;
    }

    return {
      organizationId: this.organizationId,
      timestamp: new Date(),
      totalProjects: allProjects.length,
      totalUsers: this.calculateUniqueContributors(allProjects),
      departments: Array.from(departmentMap.values()),
      systemHealth: {
        apiUptimePercentage: 99.99,
        activeIntegrations: 14,
        complianceAuditPassed: true
      }
    };
  }

  public getAuditLogs(requesterRole: UserRole, limit: number = 100): EnterpriseAuditLog[] {
    if (requesterRole !== UserRole.INSTITUTION_ADMIN && requesterRole !== UserRole.AUDITOR) {
      throw new Error('Unauthorized: Only institution admins and auditors can access governance audit logs.');
    }
    return this.auditLogs.slice(-limit);
  }

  private recordAudit(log: EnterpriseAuditLog): void {
    this.auditLogs.push(log);
    if (this.auditLogs.length > 10000) {
      this.auditLogs.shift();
    }
  }

  private calculateUniqueContributors(projects: ProjectSummary[]): number {
    // Aggregation logic for institutional user scale metrics
    const baseContributors = projects.reduce((acc, p) => acc + p.metrics.activeContributors, 0);
    return Math.max(baseContributors, projects.length * 2);
  }
}
