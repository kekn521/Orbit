// Future integrations must normalize external IDs and upsert by (provider, externalId).
// No credentials are accepted or persisted until encrypted storage + auth exist.
export type ConnectionState = 'disconnected' | 'connected' | 'error' | 'not-implemented';
export interface ProviderStatus {
  id: string;
  state: ConnectionState;
  lastSync: string | null;
  error: string | null;
}
export interface CalendarProvider {
  status(): Promise<ProviderStatus>;
  readEvents(from: string, to: string): Promise<unknown[]>;
}
export interface EmailProvider {
  status(): Promise<ProviderStatus>;
  readImportantMessages(): Promise<unknown[]>;
}
export interface RepositoryProvider {
  status(): Promise<ProviderStatus>;
  readActivity(
    repository: string,
  ): Promise<{ verified: true; sourceUrl: string; events: unknown[] }>;
}
export interface FinanceProvider {
  status(): Promise<ProviderStatus>;
  readTransactions(): Promise<{ externalId: string; amountMinor: number; currency: string }[]>;
}
export interface AIProvider {
  summarize(context: unknown, prompt: string): Promise<{ text: string; provider: string }>;
}
export const integrations = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'Calendar',
    detail: 'Read-only OAuth planned. Local calendar is fully available.',
  },
  {
    id: 'gmail',
    name: 'Gmail',
    category: 'Communication',
    detail: 'Read-only OAuth planned. No messages have been imported.',
  },
  {
    id: 'github',
    name: 'GitHub',
    category: 'Development',
    detail: 'Repository activity adapter planned. Add links to projects today.',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    category: 'Development',
    detail: 'Private server URL and scoped token support planned.',
  },
  {
    id: 'local-git',
    name: 'Local Git',
    category: 'Development',
    detail: 'Explicit directory allowlist required. No filesystem repositories are read.',
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    category: 'Finance',
    detail: 'Idempotent synchronization planned. CSV export is available now.',
  },
  {
    id: 'openai-compatible',
    name: 'OpenAI / compatible endpoint',
    category: 'Intelligence',
    detail: 'Optional provider planned. Current briefings are deterministic and stay local.',
  },
].map((p) => ({ ...p, state: 'not-implemented' as const, lastSync: null, enabled: false }));
