// ApiClient for Seagnal REST APIs

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class ApiClientError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

class ApiClient {
  private getBaseUrl(): string {
    return '/api'; // Relative route proxying to Express server
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    // Append mock headers to inform the backend about the role selected in the UI dev widget
    const mockUid = localStorage.getItem('seagnal_mock_uid');
    if (mockUid) {
      headers['x-mock-uid'] = mockUid;
    }

    return headers;
  }

  private async execute<T>(
    url: string, 
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', 
    body?: unknown, 
    options?: RequestInit
  ): Promise<T> {
    const baseUrl = this.getBaseUrl();
    const endpoint = url.startsWith('/') ? `${baseUrl}${url}` : `${baseUrl}/${url}`;
    
    const headers = await this.getHeaders();
    const fetchOptions: RequestInit = {
      credentials: 'include',
      ...options,
      method,
      headers: {
        ...headers,
        ...(options?.headers as Record<string, string>)
      }
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(endpoint, fetchOptions);
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errMessage = json?.error?.message || `HTTP Request failed with status ${response.status}`;
        const errCode = json?.error?.code || 'FETCH_FAILURE';
        throw new ApiClientError(errMessage, errCode, response.status, json?.error?.details);
      }

      return json.data as T;
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        throw err;
      }
      throw new ApiClientError(
        err.message || 'Alternative transaction error', 
        'NETWORK_ERROR', 
        0
      );
    }
  }

  async get<T>(url: string, options?: RequestInit): Promise<T> {
    return this.execute<T>(url, 'GET', undefined, options);
  }

  async post<T>(url: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.execute<T>(url, 'POST', body, options);
  }

  async put<T>(url: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.execute<T>(url, 'PUT', body, options);
  }

  async patch<T>(url: string, body?: unknown, options?: RequestInit): Promise<T> {
    return this.execute<T>(url, 'PATCH', body, options);
  }

  async delete<T>(url: string, options?: RequestInit): Promise<T> {
    return this.execute<T>(url, 'DELETE', undefined, options);
  }
}

export const apiClient = new ApiClient();
export default apiClient;
