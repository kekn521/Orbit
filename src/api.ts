import type { DashboardData, Resource, Entry, Values } from '../shared/domain.ts';
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch('/api/' + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body as T;
}
export const api = {
  dashboard: () => request<DashboardData>('dashboard'),
  save: <K extends Resource>(resource: K, values: Values<K>, id?: string) =>
    request<Entry<K>>(`${resource}${id ? '/' + id : ''}`, {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(values),
    }),
  remove: (resource: Resource, id: string) =>
    request<{ deleted: boolean }>(`${resource}/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ confirm: true }),
    }),
};
