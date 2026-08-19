import { useAppStore } from '@/store/app';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { token } = useAppStore.getState();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(path, { ...options, headers });

  // Handle 401 — clear auth and redirect to login
  if (res.status === 401 && !path.includes('/api/auth/')) {
    useAppStore.getState().clearAuth();
    useAppStore.getState().navigate('login');
    throw new ApiError('Sessão expirada. Entre novamente.', 401);
  }

  if (!res.ok) {
    // Try to parse error message from JSON
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const data = await res.json();
      throw new ApiError(data.error || 'Erro na requisição', res.status);
    }
    throw new ApiError(`Erro ${res.status}: ${res.statusText}`, res.status);
  }

  // Parse successful response
  const contentType = res.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new ApiError('Resposta inválida do servidor.', 500);
  }

  const data = await res.json();
  return data as T;
}
