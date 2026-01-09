import { useState } from 'react';
import { Plus, Trash2, Globe, FolderKanban } from 'lucide-react';
import {
  useProjects,
  useProject,
  useCreateProject,
  useDeleteProject,
  useAddEnvironment,
  useDeleteEnvironment,
} from '../hooks/useProject';
import { useI18n } from '../i18n';
import type { Environment } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function ProjectPage() {
  const { t } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEnvModal, setShowEnvModal] = useState(false);

  const { data: projects, isLoading } = useProjects();
  const { data: selectedProject } = useProject(selectedId || '');
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const addEnv = useAddEnvironment();
  const deleteEnv = useDeleteEnvironment();

  const handleCreate = (name: string, description: string) => {
    createProject.mutate(
      { name, description },
      { onSuccess: () => setShowCreateModal(false) }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm(t.projects.deleteConfirm)) {
      deleteProject.mutate(id);
      if (selectedId === id) setSelectedId(null);
    }
  };

  const handleAddEnv = (env: Environment) => {
    if (!selectedId) return;
    addEnv.mutate(
      { projectId: selectedId, env },
      { onSuccess: () => setShowEnvModal(false) }
    );
  };

  const handleDeleteEnv = (envName: string) => {
    if (!selectedId) return;
    if (confirm(t.projects.environments.deleteConfirm)) {
      deleteEnv.mutate({ projectId: selectedId, envName });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">{t.common.loading}</div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 gap-6">
      {/* Left: Project List */}
      <Card className="w-80 flex flex-col min-h-0">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{t.projects.title}</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowCreateModal(true)}
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto p-3 pt-0">
          {projects && projects.length > 0 ? (
            <div className="space-y-1">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group ${
                    selectedId === project.id
                      ? 'bg-accent'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedId(project.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      selectedId === project.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      <FolderKanban className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      {project.environments.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {project.environments.length} environments
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(project.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted mb-3">
                <FolderKanban className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t.projects.noProjects}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.projects.createFirst}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right: Project Detail */}
      <Card className="flex-1 min-h-0 overflow-auto">
        {selectedProject ? (
          <>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedProject.name}</CardTitle>
                  {selectedProject.description && (
                    <CardDescription>{selectedProject.description}</CardDescription>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Timeout</p>
                  <p className="text-sm font-mono">{selectedProject.default_timeout}ms</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Environments */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">{t.projects.environments.title}</h3>
                  <Button size="sm" onClick={() => setShowEnvModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t.projects.environments.add}
                  </Button>
                </div>

                {selectedProject.environments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedProject.environments.map((env) => (
                      <div
                        key={env.name}
                        className="flex items-center justify-between p-4 rounded-lg border group hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                            <Globe className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{env.name}</p>
                            <p className="text-sm text-muted-foreground font-mono">{env.base_url}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteEnv(env.name)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center rounded-lg border border-dashed">
                    <Globe className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground">{t.projects.environments.noEnvs}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted mb-4">
              <FolderKanban className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Select a project to view details</p>
          </div>
        )}
      </Card>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreate={handleCreate}
      />

      {/* Add Environment Dialog */}
      <AddEnvDialog
        open={showEnvModal}
        onOpenChange={setShowEnvModal}
        onAdd={handleAddEnv}
      />
    </div>
  );
}

function CreateProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description: string) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!name) return;
    onCreate(name, description);
    setName('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.projects.createProject}</DialogTitle>
          <DialogDescription>
            Create a new project to organize your tests and environments.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.projects.form.name} *</Label>
            <Input
              id="name"
              placeholder={t.projects.form.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t.projects.form.description}</Label>
            <Input
              id="description"
              placeholder={t.projects.form.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!name}>
            {t.common.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddEnvDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (env: Environment) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!name || !baseUrl) return;
    onAdd({
      name,
      base_url: baseUrl,
      description: description || undefined,
    });
    setName('');
    setBaseUrl('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.projects.environments.add}</DialogTitle>
          <DialogDescription>
            Add a new environment configuration for this project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="env-name">{t.projects.environments.name} *</Label>
            <Input
              id="env-name"
              placeholder={t.projects.environments.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="base-url">{t.projects.environments.baseUrl} *</Label>
            <Input
              id="base-url"
              placeholder={t.projects.environments.baseUrlPlaceholder}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="env-description">{t.common.description}</Label>
            <Input
              id="env-description"
              placeholder={t.projects.form.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !baseUrl}>
            {t.common.add}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
