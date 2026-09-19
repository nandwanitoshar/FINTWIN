/**
 * Normalizes the API base URL across environments.
 * - In production (e.g. Vercel deployment), ensures requests target https://fintwin-7bta.onrender.com/api
 *   even if VITE_API_URL has a trailing slash, lacks '/api', or is omitted.
 * - In local development (Vite dev server), defaults to '/api' so requests are forwarded by Vite proxy to http://localhost:5000/api.
 */
export const getApiBase = (rawEnvUrl?: string, isProd?: boolean): string => {
  const envUrl =
    typeof rawEnvUrl === 'string'
      ? rawEnvUrl.trim()
      : (import.meta as any).env?.VITE_API_URL?.trim();

  if (envUrl) {
    // Strip trailing slashes
    const sanitized = envUrl.replace(/\/+$/, '');
    if (!sanitized) {
      return '/api';
    }
    // Ensure base ends with /api
    return sanitized.endsWith('/api') ? sanitized : `${sanitized}/api`;
  }

  const prod =
    typeof isProd === 'boolean'
      ? isProd
      : Boolean((import.meta as any).env?.PROD);

  if (prod) {
    return 'https://fintwin-7bta.onrender.com/api';
  }

  return '/api';
};

export const API_BASE = getApiBase();

/**
 * Constructs a fully normalized API URL without double slashes or duplicate /api prefix.
 */
export const buildApiUrl = (endpoint: string, base: string = API_BASE): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const route = cleanEndpoint.startsWith('/api/')
    ? cleanEndpoint.slice(4)
    : cleanEndpoint;
  return `${base}${route}`;
};

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  user?: T;
  token?: string;
  data?: T;
  accounts?: any[];
  entities?: any[];
  transactions?: any[];
  total?: number;
  normalizedCount?: number;
  duplicatesSkipped?: number;
  entitiesDiscovered?: number;
  errors?: string[];
  [key: string]: any;
}

export const getAuthToken = (): string | null => {
  return localStorage.getItem('fintwin_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('fintwin_token', token);
};

export const clearAuthToken = (): void => {
  localStorage.removeItem('fintwin_token');
};

export async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = buildApiUrl(endpoint);

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({
      success: false,
      message: `HTTP Error ${res.status}: ${res.statusText}`,
    }));

    if (!res.ok) {
      throw new Error(data.message || `Request failed with status ${res.status}`);
    }

    return data;
  } catch (error: any) {
    throw error;
  }
}

export const api = {
  auth: {
    register: (payload: { name: string; email: string; password: string; currency?: string }) =>
      request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    login: (payload: { email: string; password: string }) =>
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getMe: () => request('/auth/me', { method: 'GET' }),
    updateProfile: (payload: { name?: string; currency?: string }) =>
      request('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    changePassword: (payload: { currentPassword: string; newPassword: string }) =>
      request('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    deleteAccount: () =>
      request('/auth/account', {
        method: 'DELETE',
      }),
    exportData: () =>
      request('/auth/export', {
        method: 'GET',
      }),
  },
  goals: {
    list: () => request('/goals', { method: 'GET' }),
    getById: (id: string) => request(`/goals/${id}`, { method: 'GET' }),
    create: (payload: {
      name: string;
      category?: string;
      targetAmount: number;
      currentAmount?: number;
      targetDate: string;
      monthlyContribution?: number;
      status?: string;
      notes?: string;
      color?: string;
    }) =>
      request('/goals', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: any) =>
      request(`/goals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    contribute: (id: string, amount: number) =>
      request(`/goals/${id}/contribute`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    delete: (id: string) =>
      request(`/goals/${id}`, {
        method: 'DELETE',
      }),
    getImpact: (payload: {
      goalId?: string;
      scenarioType?: string;
      amount?: number;
      principal?: number;
      annualRate?: number;
      tenureMonths?: number;
      paymentMode?: 'OUTRIGHT' | 'EMI';
      targetAccountId?: string;
      description?: string;
    }) =>
      request('/goals/impact', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getAffordability: (payload: {
      purchaseAmount: number;
      paymentMode?: 'OUTRIGHT' | 'EMI';
      tenureMonths?: number;
      annualRate?: number;
      goalId?: string;
      targetAccountId?: string;
      description?: string;
    }) =>
      request('/goals/affordability', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  loans: {
    list: () => request('/loans', { method: 'GET' }),
    getById: (id: string) => request(`/loans/${id}`, { method: 'GET' }),
    create: (payload: {
      name: string;
      lender: string;
      principal: number;
      outstandingAmount?: number;
      interestRateApr: number;
      tenureMonths: number;
      emiAmount?: number;
      startDate?: string;
      endDate?: string;
      status?: string;
      targetAccountId?: string;
      notes?: string;
    }) =>
      request('/loans', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: any) =>
      request(`/loans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request(`/loans/${id}`, {
        method: 'DELETE',
      }),
  },
  accounts: {
    list: () => request('/accounts', { method: 'GET' }),
    getById: (id: string) => request(`/accounts/${id}`, { method: 'GET' }),
    create: (payload: {
      name: string;
      type: string;
      institution: string;
      currency?: string;
      currentBalance?: number;
      balance?: number;
      initialBalance?: number;
      creditLimit?: number;
      interestRateApr?: number;
      accountNumberMask?: string;
    }) =>
      request('/accounts', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: any) =>
      request(`/accounts/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request(`/accounts/${id}`, {
        method: 'DELETE',
      }),
  },
  entities: {
    list: () => request('/entities', { method: 'GET' }),
    getById: (id: string) => request(`/entities/${id}`, { method: 'GET' }),
    create: (payload: {
      name: string;
      type: string;
      category?: string;
      cadenceScore?: number;
      riskRating?: string;
    }) =>
      request('/entities', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: any) =>
      request(`/entities/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request(`/entities/${id}`, {
        method: 'DELETE',
      }),
  },
  transactions: {
    list: (params: {
      category?: string;
      type?: string;
      direction?: string;
      accountId?: string;
      entityId?: string;
      currency?: string;
      startDate?: string;
      endDate?: string;
      search?: string;
      page?: number;
      limit?: number;
      skip?: number;
    } = {}) => {
      const query = new URLSearchParams();
      if (params.category) query.set('category', params.category);
      if (params.type) query.set('type', params.type);
      if (params.direction) query.set('direction', params.direction);
      if (params.accountId) query.set('accountId', params.accountId);
      if (params.entityId) query.set('entityId', params.entityId);
      if (params.currency) query.set('currency', params.currency);
      if (params.startDate) query.set('startDate', params.startDate);
      if (params.endDate) query.set('endDate', params.endDate);
      if (params.search) query.set('search', params.search);
      if (params.page) query.set('page', params.page.toString());
      if (params.limit) query.set('limit', params.limit.toString());
      if (params.skip) query.set('skip', params.skip.toString());
      const qs = query.toString();
      return request(`/transactions${qs ? `?${qs}` : ''}`, { method: 'GET' });
    },
    getById: (id: string) => request(`/transactions/${id}`, { method: 'GET' }),
    create: (payload: {
      date?: string | Date;
      amount: number;
      sourceAccountId?: string;
      accountId?: string;
      destinationAccountId?: string;
      destinationEntityId?: string;
      entityId?: string;
      category?: string;
      type?: string;
      direction?: string;
      currency?: string;
      description: string;
      reference?: string;
    }) =>
      request('/transactions', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: any) =>
      request(`/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request(`/transactions/${id}`, {
        method: 'DELETE',
      }),
  },
  ingest: {
    csv: (csv: string, accountId?: string) =>
      request('/ingest/csv', {
        method: 'POST',
        body: JSON.stringify({ csv, accountId }),
      }),
    json: (data: any[], accountId?: string) =>
      request('/ingest/json', {
        method: 'POST',
        body: JSON.stringify({ data, accountId }),
      }),
  },
  pipeline: {
    ingest: (payload: { format: 'json' | 'csv'; data: any; accountId?: string }) =>
      request('/pipeline/ingest', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  twin: {
    get: () => request('/twin', { method: 'GET' }),
    getNetwork: () => request('/twin/network', { method: 'GET' }),
  },
  network: {
    get: (params: { timeRange?: string; startDate?: string; endDate?: string; filterType?: string } = {}) => {
      const qs = new URLSearchParams();
      if (params.timeRange) qs.set('timeRange', params.timeRange);
      if (params.startDate) qs.set('startDate', params.startDate);
      if (params.endDate) qs.set('endDate', params.endDate);
      if (params.filterType) qs.set('filterType', params.filterType);
      const q = qs.toString();
      return request(`/network${q ? `?${q}` : ''}`, { method: 'GET' });
    },
    summary: (params: { timeRange?: string } = {}) => {
      const qs = new URLSearchParams();
      if (params.timeRange) qs.set('timeRange', params.timeRange);
      const q = qs.toString();
      return request(`/network/summary${q ? `?${q}` : ''}`, { method: 'GET' });
    },
    getEntity: (id: string) => request(`/network/entity/${id}`, { method: 'GET' }),
    getAccount: (id: string) => request(`/network/account/${id}`, { method: 'GET' }),
    getEdge: (id: string) => request(`/network/edge/${id}`, { method: 'GET' }),
    getPath: (from: string, to: string, maxDepth?: number) =>
      request(
        `/network/path?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}${maxDepth ? `&maxDepth=${maxDepth}` : ''}`,
        {
          method: 'GET',
        }
      ),
    simulate: (payload: {
      scenarioType?: string;
      scenarioName?: string;
      amount?: number;
      direction?: string;
      targetAccountId?: string;
      description?: string;
    }) =>
      request('/network/simulate', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  riskSignals: {
    list: (params: { severity?: string; type?: string } = {}) => {
      const qs = new URLSearchParams();
      if (params.severity) qs.set('severity', params.severity);
      if (params.type) qs.set('type', params.type);
      const q = qs.toString();
      return request(`/risk-signals${q ? `?${q}` : ''}`, { method: 'GET' });
    },
    getById: (id: string) => request(`/risk-signals/${id}`, { method: 'GET' }),
    updateStatus: (id: string, status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED') =>
      request(`/risk-signals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },
  simulation: {
    run: (payload: {
      scenarioType?: string;
      scenarioName?: string;
      amount?: number;
      amountPaise?: number;
      currency?: string;
      targetAccountId?: string;
      category?: string;
      description?: string;
      principal?: number;
      annualRate?: number;
      tenureMonths?: number;
      processingFee?: number;
      startMonth?: number;
      frequency?: string;
      durationMonths?: number;
      direction?: string;
      emergencyFundMonths?: number;
      baseIncome?: number;
      baseBurn?: number;
      incomeDelta?: number;
      expenseDelta?: number;
      lumpSumEvents?: Array<{ month: number; amount: number; description: string; accountId?: string }>;
      newEmiEvents?: Array<{ principal: number; annualRate: number; tenureMonths: number; startMonth?: number; description: string }>;
      horizonMonths?: number;
    }) =>
      request('/simulation/run', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    compare: (payload: {
      purchaseAmount: number;
      currency?: string;
      targetAccountId?: string;
      delayMonths?: number;
      cheaperAmount?: number;
      description?: string;
      emergencyFundMonths?: number;
    }) =>
      request('/simulation/compare', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    getHistory: () => request('/simulation/history', { method: 'GET' }),
    getById: (id: string) => request(`/simulation/${id}`, { method: 'GET' }),
    delete: (id: string) => request(`/simulation/${id}`, { method: 'DELETE' }),
  },
  analysis: {
    // GET /api/analysis/health-score — detailed 6-component health score
    getHealthScore: () => request('/analysis/health-score', { method: 'GET' }),
    // GET /api/analysis/spending-breakdown — category & merchant spending breakdown
    getSpendingBreakdown: () => request('/analysis/spending-breakdown', { method: 'GET' }),
    // GET & POST /api/analysis/projection — 12-month baseline and simulated projection
    getProjection: (params?: any) => {
      if (params && Object.keys(params).length > 0) {
        return request('/analysis/projection', {
          method: 'POST',
          body: JSON.stringify(params),
        });
      }
      return request('/analysis/projection', { method: 'GET' });
    },
    // GET /api/analysis — full deterministic analysis with signals
    getFull: () => request('/analysis', { method: 'GET' }),
    // GET /api/analysis/summary — summary metrics only
    getSummary: () => request('/analysis/summary', { method: 'GET' }),
    // GET /api/analysis/:id — single signal detail
    getSignalById: (id: string) => request(`/analysis/${id}`, { method: 'GET' }),
    // POST /api/analysis/affordability — decision affordability evidence and threshold rating
    getAffordability: (payload: {
      purchaseAmount: number;
      paymentMode?: 'OUTRIGHT' | 'EMI';
      tenureMonths?: number;
      annualRate?: number;
      goalId?: string;
      targetAccountId?: string;
      description?: string;
    }) =>
      request('/analysis/affordability', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    // POST /api/analysis/explain — explainable intelligence report
    explain: (payload: { context?: 'current' | 'simulation'; scenarioId?: string } = {}) =>
      request('/analysis/explain', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    // GET /api/analysis/recurring-expenses — Phase D recurring expense detection
    getRecurringExpenses: () => request('/analysis/recurring-expenses', { method: 'GET' }),
    // GET /api/analysis/calendar-upcoming — Phase D upcoming events
    getCalendarUpcoming: () => request('/analysis/calendar-upcoming', { method: 'GET' }),
  },
  report: {
    // GET /api/report — consolidated financial intelligence report
    get: () => request('/report', { method: 'GET' }),
  },
  recurring: {
    list: () => request('/recurring', { method: 'GET' }),
    create: (payload: any) =>
      request('/recurring', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: any) =>
      request(`/recurring/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    delete: (id: string) =>
      request(`/recurring/${id}`, {
        method: 'DELETE',
      }),
  },
  calendar: {
    get: (params: { year?: number; month?: number; startDate?: string; endDate?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.year) q.set('year', params.year.toString());
      if (params.month) q.set('month', params.month.toString());
      if (params.startDate) q.set('startDate', params.startDate);
      if (params.endDate) q.set('endDate', params.endDate);
      const qs = q.toString();
      return request(`/calendar${qs ? `?${qs}` : ''}`, { method: 'GET' });
    },
    createEvent: (payload: any) =>
      request('/calendar/events', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    deleteEvent: (id: string) =>
      request(`/calendar/events/${id}`, {
        method: 'DELETE',
      }),
  },
  ask: {
    query: (query: string) =>
      request('/ask', {
        method: 'POST',
        body: JSON.stringify({ query }),
      }),
  },
  search: {
    query: (q: string) => request(`/search?q=${encodeURIComponent(q)}`, { method: 'GET' }),
  },
  dataQuality: {
    get: () => request('/data-quality', { method: 'GET' }),
  },
  notifications: {
    list: () => request('/notifications', { method: 'GET' }),
    markRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllRead: () => request('/notifications/read-all', { method: 'POST' }),
  },
  health: {
    check: () => request('/health', { method: 'GET' }),
  },
};

