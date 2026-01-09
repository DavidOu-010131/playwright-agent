import { FolderKanban } from 'lucide-react';
import { useI18n } from '../i18n';

export default function EmptyState() {
  const { t } = useI18n();

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-6">
        <FolderKanban className="h-8 w-8 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">{t.project.selectProject || 'Select a Project'}</h2>
      <p className="text-muted-foreground max-w-sm">
        {t.project.selectProjectDescription || 'Select a project from the sidebar to view its UI Maps, Scenarios, and run tests.'}
      </p>
    </div>
  );
}
