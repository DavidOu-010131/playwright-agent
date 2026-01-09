import { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Trash2,
  Languages,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { useProjects, useCreateProject, useDeleteProject } from '../hooks/useProject';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

interface LayoutProps {
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  children: React.ReactNode;
}

export default function Layout({ selectedProjectId, onSelectProject, children }: LayoutProps) {
  const { t, locale, toggleLocale } = useI18n();
  const { theme, toggleMode } = useTheme();
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    createProject.mutate(
      { name: newProjectName.trim() },
      {
        onSuccess: (project) => {
          setShowCreateModal(false);
          setNewProjectName('');
          onSelectProject(project.id);
        },
      }
    );
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(t.project.deleteConfirm)) {
      deleteProject.mutate(id);
      if (selectedProjectId === id) {
        onSelectProject(null);
      }
    }
  };

  return (
    <div className="flex h-screen w-full">
      {/* Left Sidebar - Project List */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{t.app.title}</span>
              <span className="text-xs text-muted-foreground">{t.app.subtitle}</span>
            </div>
          </div>
        </div>

        {/* Project List */}
        <div className="flex-1 overflow-auto p-3">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t.nav.projects}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              {t.common.loading}
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="space-y-1">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors group ${
                    selectedProjectId === project.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => onSelectProject(project.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderKanban className="h-4 w-4 shrink-0" />
                    <span className="text-sm truncate">{project.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-6 w-6 opacity-0 group-hover:opacity-100 ${
                      selectedProjectId === project.id
                        ? 'hover:bg-primary-foreground/20 text-primary-foreground'
                        : 'hover:bg-destructive/10 text-destructive'
                    }`}
                    onClick={(e) => handleDelete(e, project.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              {t.project.noProjects}
            </div>
          )}
        </div>

        <Separator />

        {/* Footer - Settings */}
        <div className="p-3 space-y-1">
          <Button
            variant="ghost"
            className="w-full justify-start h-9"
            onClick={toggleMode}
          >
            {theme.mode === 'dark' ? (
              <Sun className="h-4 w-4 mr-2" />
            ) : (
              <Moon className="h-4 w-4 mr-2" />
            )}
            <span className="text-sm">
              {theme.mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start h-9"
            onClick={toggleLocale}
          >
            <Languages className="h-4 w-4 mr-2" />
            <span className="text-sm">{locale === 'en' ? 'English' : '中文'}</span>
          </Button>
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.project.createProject}</DialogTitle>
            <DialogDescription>
              {t.project.form.createDescription}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">{t.project.form.name} *</Label>
              <Input
                id="project-name"
                placeholder={t.project.form.namePlaceholder}
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleCreate} disabled={!newProjectName.trim()}>
              {t.common.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
