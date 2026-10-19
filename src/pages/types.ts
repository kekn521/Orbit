import type { DashboardData, Resource, Entry } from '../../shared/domain.ts';
import type { EditTarget } from '../components/Editor.tsx';
export type PageProps = {
  data: DashboardData;
  edit: (target: EditTarget) => void;
  remove: (resource: Resource, record: Entry<Resource>) => void;
  reload: () => Promise<void>;
  notify: (message: string, error?: boolean) => void;
  toggleTask: (task: Entry<'tasks'>) => void;
  navigate: (page: string) => void;
};
