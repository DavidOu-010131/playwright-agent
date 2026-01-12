import { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Trash2,
  MoreHorizontal,
  Globe,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useProjects, useCreateProject, useDeleteProject } from '../hooks/useProject';
import type { Project } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ProjectsHomePageProps {
  onSelectProject: (id: string) => void;
}

export default function ProjectsHomePage({ onSelectProject }: ProjectsHomePageProps) {
  const { t } = useI18n();
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');

  const handleCreate = () => {
    if (!newProjectName.trim()) return;
    createProject.mutate(
      { name: newProjectName.trim(), description: newProjectDesc.trim() || undefined },
      {
        onSuccess: (project) => {
          setShowCreateModal(false);
          setNewProjectName('');
          setNewProjectDesc('');
          onSelectProject(project.id);
        },
      }
    );
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm(t.project.deleteConfirm)) {
      deleteProject.mutate(id);
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
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t.nav.projects}</h1>
            <p className="text-muted-foreground mt-1">
              {t.project.selectProject || 'Select a project to manage tests and scenarios'}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t.project.createProject}
          </Button>
        </div>

        {/* Projects Grid */}
        {projects && projects.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={() => onSelectProject(project.id)}
                onDelete={(e) => handleDelete(e, project.id)}
                t={t}
              />
            ))}

            {/* Create New Project Card */}
            <Card
              className="border-dashed cursor-pointer hover:border-primary hover:bg-primary-subtle transition-all duration-200 group"
              onClick={() => setShowCreateModal(true)}
            >
              <CardContent className="flex flex-col items-center justify-center h-full min-h-[180px] py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted group-hover:bg-primary/10 transition-colors">
                  <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="mt-4 text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                  {t.project.createProject}
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Empty State */
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
                <FolderKanban className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t.project.noProjects}</h3>
              <p className="text-muted-foreground text-center max-w-sm mb-6">
                {t.project.createFirst || 'Create your first project to start building automated tests'}
              </p>
              <Button onClick={() => setShowCreateModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                {t.project.createProject}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Project Dialog */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.project.createProject}</DialogTitle>
            <DialogDescription>
              {t.project.form.createDescription || 'Create a new project to organize your tests'}
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
            <div className="space-y-2">
              <Label htmlFor="project-desc">{t.project.form.description}</Label>
              <Input
                id="project-desc"
                placeholder={t.project.form.descriptionPlaceholder || 'Optional description'}
                value={newProjectDesc}
                onChange={(e) => setNewProjectDesc(e.target.value)}
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

interface ProjectCardProps {
  project: Project;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
  t: ReturnType<typeof useI18n>['t'];
}

function ProjectCard({ project, onSelect, onDelete, t }: ProjectCardProps) {
  const envCount = project.environments?.length || 0;

  return (
    <Card
      className="cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200 group"
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{project.name}</CardTitle>
              {project.description && (
                <CardDescription className="truncate mt-0.5">
                  {project.description}
                </CardDescription>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive cursor-pointer"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t.common.delete}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5" />
            <span>{envCount} {envCount === 1 ? 'env' : 'envs'}</span>
          </div>
          {project.default_timeout && (
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>{project.default_timeout}ms</span>
            </div>
          )}
        </div>

        {/* Environments Preview */}
        {envCount > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {project.environments.slice(0, 3).map((env) => (
              <Badge key={env.name} variant="secondary" className="text-xs">
                {env.name}
              </Badge>
            ))}
            {envCount > 3 && (
              <Badge variant="outline" className="text-xs">
                +{envCount - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Enter button */}
        <div className="mt-4 pt-3 border-t flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t.project.clickToEnter || 'Click to enter'}
          </span>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </CardContent>
    </Card>
  );
}
