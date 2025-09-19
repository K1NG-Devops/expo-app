# EduDashPro Documentation

Welcome to the comprehensive documentation for EduDashPro, the leading educational dashboard platform for South African education.

## 📁 Documentation Structure

### 🏛️ [Governance](./governance/) - Project Rules & Policies
Core rules, policies, and governance documents that guide the entire project.

- **[WARP.md](./governance/WARP.md)** - Master Rules Document (highest authority)
- **[rules.md](./governance/rules.md)** - Development Rules & Principles
- **[development-workflow.md](./governance/development-workflow.md)** - Standard Development Process
- **[git-workflow.md](./governance/git-workflow.md)** - Git Branching & Merge Strategy

### 🏗️ [Architecture](./architecture/) - System Design & Structure
High-level architecture documents and system design principles.

- **[ai-flow.md](./architecture/ai-flow.md)** - AI Integration Architecture

### 🔒 [Security](./security/) - Authentication, Authorization & RLS
Security policies, authentication systems, and access control documentation.

- **[complete-action-plan.md](./security/complete-action-plan.md)** - Comprehensive security implementation plan
- **[fixes-readme.md](./security/fixes-readme.md)** - Security-related fixes and patches
- **[desired_access_matrix.md](./security/desired_access_matrix.md)** - Role-based access control matrix
- **[jwt_claims.md](./security/jwt_claims.md)** - JWT token structure and claims
- **[manifest-development-guide.md](./security/manifest-development-guide.md)** - Security manifest development
- **[policy_templates.md](./security/policy_templates.md)** - Row-level security policy templates
- **[progress_summary.md](./security/progress_summary.md)** - Security implementation progress
- **[quick-start-manifest.md](./security/quick-start-manifest.md)** - Quick start security setup
- **[rbac_audit.md](./security/rbac_audit.md)** - Role-based access control audit
- **[rls_gap_analysis.md](./security/rls_gap_analysis.md)** - Row-level security gap analysis
- **[tenant_model.md](./security/tenant_model.md)** - Multi-tenant security model

### 🚀 [Deployment](./deployment/) - Release & Infrastructure
Deployment guides, checklists, and infrastructure documentation.

- **[checklist.md](./deployment/checklist.md)** - Pre-deployment verification checklist
- **[guide-fix-auth.md](./deployment/guide-fix-auth.md)** - Authentication fix deployment guide
- **[install-local-build.md](./deployment/install-local-build.md)** - Local development setup
- **[manual-function-deployment.md](./deployment/manual-function-deployment.md)** - Manual function deployment procedures

### 🔧 [Fixes](./fixes/) - Bug Fixes & Issue Resolutions
Documentation of specific bug fixes and their solutions.

- **[summary.md](./fixes/summary.md)** - Summary of applied fixes
- **[push-notifications-400-error.md](./fixes/push-notifications-400-error.md)** - Push notification error resolution
- **[urgent-action-plan.md](./fixes/urgent-action-plan.md)** - Critical issue response plan
- **[immediate-fix.md](./fixes/immediate-fix.md)** - Emergency fix procedures
- **[data-not-defined-fix.md](./fixes/data-not-defined-fix.md)** - Data definition error fixes
- **[superadmin-loading-state-fix.md](./fixes/superadmin-loading-state-fix.md)** - Superadmin dashboard loading fixes

### ✨ [Features](./features/) - Feature Documentation & Specs
Feature specifications, implementation guides, and functionality documentation.

- **[summary.md](./features/summary.md)** - Overview of implemented features
- **[avatar-storage-setup.md](./features/avatar-storage-setup.md)** - Avatar storage configuration

### 📊 [Analysis](./analysis/) - Progress & Analysis Reports
Progress reports, implementation summaries, and analytical documents.

- **[implementation-progress.md](./analysis/implementation-progress.md)** - Overall implementation status
- **[phase2-progress.md](./analysis/phase2-progress.md)** - Phase 2 development progress
- **[principal-dashboard-actions.md](./analysis/principal-dashboard-actions.md)** - Principal dashboard analysis
- **[cleanup-summary.md](./analysis/cleanup-summary.md)** - Code cleanup and refactoring summary

### 💾 [Database](./database/) - Database Design & Operations
Database design, migration guides, and maintenance procedures.

- **[backup-guide.md](./database/backup-guide.md)** - Database backup and recovery procedures
- **[health-check-summary.md](./database/health-check-summary.md)** - Database health monitoring
- **[team-sql-rules-rollout.md](./database/team-sql-rules-rollout.md)** - Team SQL access rules implementation

### 📄 Additional Documents
Standalone documents that don't fit into other categories.

- **[AI_QUOTA_ALLOCATION_SYSTEM.md](./AI_QUOTA_ALLOCATION_SYSTEM.md)** - AI quota management system
- **[INVOICE_NOTIFICATIONS.md](./INVOICE_NOTIFICATIONS.md)** - Invoice notification system
- **[K12_ORGANIZATION_SUPPORT_PLAN.md](./K12_ORGANIZATION_SUPPORT_PLAN.md)** - K-12 support implementation
- **[PHASE1_COMPLETION_REPORT.md](./PHASE1_COMPLETION_REPORT.md)** - Phase 1 completion summary
- **[SUPERADMIN_DASHBOARD_UPGRADE_PLAN.md](./SUPERADMIN_DASHBOARD_UPGRADE_PLAN.md)** - Superadmin dashboard upgrade plan
- **[SUPERADMIN_PHASE1_IMPLEMENTATION_SUMMARY.md](./SUPERADMIN_PHASE1_IMPLEMENTATION_SUMMARY.md)** - Phase 1 superadmin implementation

---

## 📋 Quick Navigation

### For Developers
- Start with [Governance](./governance/) to understand core rules
- Review [Security](./security/) for RLS and authentication patterns
- Use [Fixes](./fixes/) for troubleshooting common issues
- Check [Architecture](./architecture/) for system design

### For Administrators
- Review [Deployment](./deployment/) for release procedures
- Check [Analysis](./analysis/) for project status
- Use [Database](./database/) for operational procedures

### For Product Team
- Review [Features](./features/) for functionality specifications
- Check [Analysis](./analysis/) for implementation progress
- Use [Architecture](./architecture/) for system understanding

---

## 🎯 Documentation Standards

### File Naming Convention
- Use lowercase with hyphens: `feature-name.md`
- Include version dates when relevant: `report-2025-01-13.md`
- Use descriptive names that indicate content clearly

### Content Structure
All documentation should follow this structure:
1. **Clear title and purpose**
2. **Prerequisites or context**  
3. **Step-by-step procedures**
4. **Examples and code snippets**
5. **Troubleshooting section**
6. **Success criteria or verification**

### Cross-References
- Link to related documents within the same category
- Reference the governance documents when applicable
- Include links to external resources when helpful

---

## 🔄 Maintenance

This documentation structure is maintained by the development team and updated with each major release. For questions or suggestions about the documentation organization, please refer to the [WARP.md](./governance/WARP.md) governance document.

## 🔗 Quick Links

- [Main Project README](../README.md)
- [Contributing Guidelines](./governance/development-workflow.md)
- [Security Policies](./security/)
- [Deployment Procedures](./deployment/)

## 🎆 Getting Started

1. **New developers**: Start with [Governance](./governance/) to understand project standards
2. **Security review**: Check [Security](./security/) for access control and compliance
3. **Deployment**: Follow [Deployment](./deployment/) guides for environment setup
4. **Feature development**: Reference [Features](./features/) and [Architecture](./architecture/)
5. **Issue resolution**: Consult [Fixes](./fixes/) for known issues and solutions

**Last Updated**: 2025-01-15  
**Next Review**: 2025-02-15
