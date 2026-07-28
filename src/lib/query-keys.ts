/**
 * Centralized query-key factory. Every TanStack Query key in the app is
 * defined here — no feature declares keys inline. Keys are `as const` so
 * they infer as readonly tuples for stable cache identity.
 */
export const queryKeys = {
  profile: {
    all: ['profile'] as const,
    me: () => [...queryKeys.profile.all, 'me'] as const,
  },
  company: {
    all: ['company'] as const,
    list: () => [...queryKeys.company.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.company.all, 'detail', id] as const,
  },
  branch: {
    all: ['branch'] as const,
    list: () => [...queryKeys.branch.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.branch.all, 'detail', id] as const,
  },
  department: {
    all: ['department'] as const,
    list: () => [...queryKeys.department.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.department.all, 'detail', id] as const,
  },
  pfRate: {
    all: ['pf-rate'] as const,
    list: () => [...queryKeys.pfRate.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.pfRate.all, 'detail', id] as const,
  },
  esicRate: {
    all: ['esic-rate'] as const,
    list: () => [...queryKeys.esicRate.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.esicRate.all, 'detail', id] as const,
  },
  ptRate: {
    all: ['pt-rate'] as const,
    list: () => [...queryKeys.ptRate.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.ptRate.all, 'detail', id] as const,
  },
  lwfRate: {
    all: ['lwf-rate'] as const,
    list: () => [...queryKeys.lwfRate.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.lwfRate.all, 'detail', id] as const,
  },
  pfOfficeAddress: {
    all: ['pf-office-address'] as const,
    list: () => [...queryKeys.pfOfficeAddress.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.pfOfficeAddress.all, 'detail', id] as const,
  },
  esicOfficeAddress: {
    all: ['esic-office-address'] as const,
    list: () => [...queryKeys.esicOfficeAddress.all, 'list'] as const,
    detail: (id: number) =>
      [...queryKeys.esicOfficeAddress.all, 'detail', id] as const,
  },
  lwfOfficeAddress: {
    all: ['lwf-office-address'] as const,
    list: () => [...queryKeys.lwfOfficeAddress.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.lwfOfficeAddress.all, 'detail', id] as const,
  },
  factoryOfficeAddress: {
    all: ['factory-office-address'] as const,
    list: () => [...queryKeys.factoryOfficeAddress.all, 'list'] as const,
    detail: (id: number) =>
      [...queryKeys.factoryOfficeAddress.all, 'detail', id] as const,
  },
  employmentExchangeOfficeAddress: {
    all: ['employment-exchange-office-address'] as const,
    list: () => [...queryKeys.employmentExchangeOfficeAddress.all, 'list'] as const,
    detail: (id: number) =>
      [...queryKeys.employmentExchangeOfficeAddress.all, 'detail', id] as const,
  },
  state: {
    all: ['state'] as const,
    list: () => [...queryKeys.state.all, 'list'] as const,
  },
  district: {
    all: ['district'] as const,
    list: () => [...queryKeys.district.all, 'list'] as const,
  },
  asset: {
    all: ['asset'] as const,
    list: () => [...queryKeys.asset.all, 'list'] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    kpis: () => [...queryKeys.dashboard.all, 'kpis'] as const,
    dailySales: (date?: string) =>
      [...queryKeys.dashboard.all, 'daily-sales', date ?? 'today'] as const,
    teamPerformance: () => [...queryKeys.dashboard.all, 'team-performance'] as const,
    targetVsAchievement: () =>
      [...queryKeys.dashboard.all, 'target-vs-achievement'] as const,
    attendanceSummary: () => [...queryKeys.dashboard.all, 'attendance-summary'] as const,
    aiAnalytics: () => [...queryKeys.dashboard.all, 'ai-analytics'] as const,
  },
} as const
