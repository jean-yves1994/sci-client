const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

/**
 * An error the API returned deliberately, carrying its machine-readable code.
 *
 * A failure that never reached the server is a NetworkError instead. Keeping
 * the two apart is what stops "the API is down" being reported as "your
 * password is wrong".
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly requestId?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
  if (typeof window !== 'undefined') {
    if (token) window.sessionStorage.setItem('sci_token', token);
    else window.sessionStorage.removeItem('sci_token');
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== 'undefined') accessToken = window.sessionStorage.getItem('sci_token');
  return accessToken;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  skipRefresh?: boolean;
  formData?: FormData;
  signal?: AbortSignal;
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Refreshes the access token, coalescing concurrent attempts.
 *
 * The dashboard fires several requests at once. Without this shared promise
 * each would trigger its own refresh; because refresh tokens rotate, all but
 * the first would present a spent token and trip reuse detection, signing the
 * user out for doing nothing wrong.
 */
async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!response.ok) return false;
      const data = (await response.json()) as { accessToken: string };
      setAccessToken(data.accessToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipRefresh = false, formData, signal } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined && !formData) headers['Content-Type'] = 'application/json';

  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      signal,
      body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
    });
  } catch (error) {
    // An aborted request is a normal part of cleanup, not a failure to report.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new NetworkError(
      'Cannot reach the server. Check that the API is running and that NEXT_PUBLIC_API_URL is correct.',
    );
  }

  // An expired access token is normal and recoverable: refresh once and retry.
  if (response.status === 401 && !skipRefresh && token) {
    if (await refreshAccessToken()) {
      return apiRequest<T>(path, { ...options, skipRefresh: true });
    }
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const err = (payload as { error?: Record<string, unknown> } | null)?.error;
    throw new ApiError(
      response.status,
      typeof err?.code === 'string' ? err.code : 'UNKNOWN',
      typeof err?.message === 'string' ? err.message : `Request failed (${response.status}).`,
      typeof err?.requestId === 'string' ? err.requestId : undefined,
      err?.details,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiRequest<T>(path, { signal }),
  post: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) =>
    apiRequest<T>(path, { method: 'POST', formData, body: {} }),
};

/**
 * Turns any thrown value into a message safe to show a user.
 *
 * Raw API errors are never rendered directly: a stack trace or an internal code
 * tells an end user nothing and tells an attacker something.
 */
export function readableError(error: unknown): string {
  if (error instanceof NetworkError) return error.message;
  if (error instanceof ApiError) {
    if (error.status >= 500) {
      return error.requestId
        ? `A server error occurred. Quote reference ${error.requestId} when reporting this.`
        : 'A server error occurred. Please try again shortly.';
    }
    return error.message;
  }
  return 'Something went wrong. Please try again.';
}

// ---------------------------------------------------------------------------
// Response shapes (mirror the backend DTOs exactly)
// ---------------------------------------------------------------------------

export interface Paginated<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface CurrentUser {
  id: string; email: string; firstName: string; lastName: string;
  organizationId: string; branchId: string | null; branchScope: string;
  mustChangePassword: boolean; roles: string[]; permissions: string[];
}

export interface Person { id: string; firstName: string; lastName: string; email?: string }
export interface BranchRef { id: string; code: string; name: string }

export interface InspectionListItem {
  id: string; inspectionNumber: string; loanReference: string; clientName: string | null;
  status: string; priority: string; dueDate: string | null; submittedAt: string | null;
  reviewedAt: string | null; createdAt: string; version: number;
  property: { id: string; reference: string; propertyType: string; addressLine: string };
  branch: BranchRef; inspector: Person | null; reviewer: Person | null;
  _count: { photos: number };
}

export interface CompletenessIssue {
  code: string; sectionCode?: string; fieldCode?: string; message: string; blocking: boolean;
}
export interface Completeness {
  complete: boolean; percentage: number;
  issues: CompletenessIssue[]; blockingIssues: CompletenessIssue[];
}
export interface Proximity {
  verdict: 'AT_PROPERTY' | 'NEARBY' | 'DISTANT' | 'UNVERIFIABLE';
  distanceM: number | null; explanation: string;
}

export interface InspectionDetail extends InspectionListItem {
  assignmentNotes: string | null; submissionCount: number;
  startedAt: string | null; approvedAt: string | null;
  completeness: Completeness; proximity: Proximity | null;
  property: {
    id: string; reference: string; propertyType: string; addressLine: string;
    plotNumber: string | null; titleNumber: string | null;
    latitude: string | null; longitude: string | null;
    division: { id: string; name: string } | null;
  };
  createdBy: Person;
  owner: {
    fullName: string; phone: string | null; email: string | null;
    occupancyStatus: string | null; ownershipType: string | null;
  } | null;
  valuation: {
    currency: string; marketValue: string | null; forcedSaleValue: string | null;
    replacementCost: string | null; rentalEstimate: string | null; comments: string | null;
  } | null;
  assessments: Array<{
    id: string; categoryCode: string; categoryName: string;
    rating: number | null; condition: string | null; notes: string | null;
  }>;
  values: Array<{
    id: string; valueText: string | null; valueNumber: string | null;
    valueDate: string | null; valueBool: boolean | null;
    field: { code: string; label: string; type: string; section: { code: string; name: string } };
  }>;
  locations: Array<{
    id: string; latitude: string; longitude: string; accuracyM: number | null;
    isMocked: boolean; capturedAt: string; distanceFromPropertyM: number | null; source: string;
  }>;
  photos: Array<{
    id: string; category: string; storageKey: string; caption: string | null;
    capturedAt: string | null; latitude: string | null; longitude: string | null;
    capturedBy: Person;
  }>;
  comments: Array<{ id: string; body: string; type: string; createdAt: string; author: Person }>;
  statusEvents: Array<{
    id: string; fromStatus: string | null; toStatus: string; comment: string | null;
    createdAt: string; submissionRound: number | null; actor: Person | null;
  }>;
  corrections: Array<{
    id: string; reason: string; createdAt: string; resolvedAt: string | null;
    submissionRound: number; requestedBy: Person;
  }>;
  reports: Array<{
    id: string; reportNumber: string; version: number; generatedAt: string; sizeBytes: number;
  }>;
}

export interface Dashboard {
  totals: {
    inspections: number; pendingReview: number; approved: number; rejected: number;
    correctionRequested: number; inProgress: number;
    properties: number; branches: number; activeUsers: number;
  };
  averageProcessingHours: number | null;
  byStatus: Array<{ status: string; count: number }>;
  myWork: { assigned: number; inProgress: number; correctionRequested: number; submitted: number };
}

export interface MonthlyPoint { month: string; total: number; approved: number; rejected: number }
export interface BranchPerformance {
  branchId: string; code: string; name: string;
  total: number; approved: number; rejected: number; approvalRate: number | null;
}
export interface InspectorWorkload {
  inspectorId: string; name: string; branch: string | null;
  total: number; approved: number; open: number;
}
