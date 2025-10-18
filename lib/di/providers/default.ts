// Default providers for DI (non-invasive scaffolding)

import { TOKENS, type OrganizationService, type FeatureFlagService } from '../types';
import { container } from '../container';
import { getOrganizationDisplayName, mapTerm as mapOrgTerm, getDynamicGreeting, getRoleCapabilities } from '../../organization';

class OrganizationServiceImpl implements OrganizationService {
  getDisplayName(type: string): string {
    return getOrganizationDisplayName(type as any);
  }
  mapTerm(term: string, type: string): string {
    return mapOrgTerm(term as any, type as any);
  }
  getGreeting(type: string, role: string, userName?: string): string {
    return getDynamicGreeting(type as any, role, userName);
  }
  getCapabilities(type: string, role: string): string[] {
    return getRoleCapabilities(type as any, role);
  }
}

class FeatureFlagServiceImpl implements FeatureFlagService {
  isEnabled(flag: string): boolean {
    // Minimal default: read boolean-like env, fallback to false
    const val = (process.env?.[flag] ?? process.env?.[`EXPO_PUBLIC_${flag}`]) as string | undefined;
    if (val === undefined) return false;
    return ['1', 'true', 'yes', 'on'].includes(String(val).toLowerCase());
  }
}

// Register defaults (safe: no side effects until resolved)
import { StorageAdapter } from '../adapters/storage';
import { AuthAdapter } from '../adapters/auth';
import { AIProxyAdapter } from '../adapters/ai';

container
  .registerFactory(TOKENS.organization, () => new OrganizationServiceImpl(), { singleton: true })
  .registerFactory(TOKENS.features, () => new FeatureFlagServiceImpl(), { singleton: true })
  .registerFactory(TOKENS.storage, () => new StorageAdapter(), { singleton: true })
  .registerFactory(TOKENS.auth, () => new AuthAdapter(), { singleton: true })
  .registerFactory(TOKENS.ai, () => new AIProxyAdapter(), { singleton: true });

export { container, TOKENS };
