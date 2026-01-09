import { useState, useEffect } from 'react';
import { Map, PlayCircle, FileText, Settings, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { useProject, useUpdateProject, useAddEnvironment, useDeleteEnvironment } from '../hooks/useProject';
import type { Environment } from '../api';
import { useUIMaps, useCreateUIMap, useDeleteUIMap } from '../hooks/useUIMap';
import { useScenarios, useCreateScenario, useDeleteScenario } from '../hooks/useScenario';
import UIMapEditor from '../components/UIMapEditor';
import ScenarioEditor from '../components/ScenarioEditor';
import RunnerPanel from '../components/RunnerPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProjectDetailPageProps {
  projectId: string;
}

export default function ProjectDetailPage({ projectId }: ProjectDetailPageProps) {
  const { t } = useI18n();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: uiMaps, isLoading: uiMapsLoading } = useUIMaps(projectId);
  const { data: scenarios, isLoading: scenariosLoading } = useScenarios(projectId);

  const updateProject = useUpdateProject();
  const addEnvironment = useAddEnvironment();
  const deleteEnvironment = useDeleteEnvironment();
  const createUIMap = useCreateUIMap();
  const deleteUIMap = useDeleteUIMap();
  const createScenario = useCreateScenario();
  const deleteScenario = useDeleteScenario();

  const [activeTab, setActiveTab] = useState('uimaps');
  const [showCreateUIMapModal, setShowCreateUIMapModal] = useState(false);
  const [showCreateScenarioModal, setShowCreateScenarioModal] = useState(false);
  const [showAddEnvModal, setShowAddEnvModal] = useState(false);
  const [newUIMapName, setNewUIMapName] = useState('');
  const [newScenarioName, setNewScenarioName] = useState('');
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvBaseUrl, setNewEnvBaseUrl] = useState('');
  const [newEnvDescription, setNewEnvDescription] = useState('');
  const [editingProject, setEditingProject] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTimeout, setEditTimeout] = useState<number>(5000);
  const [editBrowserChannel, setEditBrowserChannel] = useState<string>('');

  // Editor states
  const [editingUIMapId, setEditingUIMapId] = useState<string | null>(null);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);

  // Sync edit states with project data
  useEffect(() => {
    if (project?.default_timeout !== undefined) {
      setEditTimeout(project.default_timeout);
    }
    if (project?.browser_channel !== undefined) {
      setEditBrowserChannel(project.browser_channel || '');
    }
  }, [project?.default_timeout, project?.browser_channel]);

  if (projectLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-muted-foreground">{t.common.loading}</span>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-muted-foreground">Project not found</span>
      </div>
    );
  }

  const handleCreateUIMap = () => {
    if (!newUIMapName.trim()) return;
    createUIMap.mutate(
      { name: newUIMapName.trim(), project_id: projectId },
      {
        onSuccess: () => {
          setShowCreateUIMapModal(false);
          setNewUIMapName('');
        },
      }
    );
  };

  const handleCreateScenario = () => {
    if (!newScenarioName.trim()) return;
    createScenario.mutate(
      { name: newScenarioName.trim(), project_id: projectId },
      {
        onSuccess: () => {
          setShowCreateScenarioModal(false);
          setNewScenarioName('');
        },
      }
    );
  };

  const handleDeleteUIMap = (id: string) => {
    if (confirm(t.common.deleteConfirm)) {
      deleteUIMap.mutate(id);
    }
  };

  const handleDeleteScenario = (id: string) => {
    if (confirm(t.common.deleteConfirm)) {
      deleteScenario.mutate(id);
    }
  };

  const handleAddEnvironment = () => {
    if (!newEnvName.trim() || !newEnvBaseUrl.trim()) return;
    const env: Environment = {
      name: newEnvName.trim(),
      base_url: newEnvBaseUrl.trim(),
      description: newEnvDescription.trim() || undefined,
    };
    addEnvironment.mutate(
      { projectId, env },
      {
        onSuccess: () => {
          setShowAddEnvModal(false);
          setNewEnvName('');
          setNewEnvBaseUrl('');
          setNewEnvDescription('');
        },
      }
    );
  };

  const handleDeleteEnvironment = (envName: string) => {
    if (confirm(t.common.deleteConfirm)) {
      deleteEnvironment.mutate({ projectId, envName });
    }
  };

  const startEditProject = () => {
    setEditName(project.name);
    setEditDescription(project.description || '');
    setEditingProject(true);
  };

  const saveEditProject = () => {
    updateProject.mutate(
      { id: projectId, data: { name: editName, description: editDescription } },
      {
        onSuccess: () => setEditingProject(false),
      }
    );
  };

  // If editing a UI Map, show the editor
  if (editingUIMapId) {
    return <UIMapEditor uiMapId={editingUIMapId} onClose={() => setEditingUIMapId(null)} />;
  }

  // If editing a Scenario, show the editor
  if (editingScenarioId) {
    return <ScenarioEditor scenarioId={editingScenarioId} projectId={projectId} onClose={() => setEditingScenarioId(null)} />;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Project Header */}
      <div className="border-b px-6 py-4">
        {editingProject ? (
          <div className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Project name"
                className="text-lg font-semibold"
              />
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
              />
            </div>
            <Button size="sm" onClick={saveEditProject}>
              <Save className="h-4 w-4 mr-1" />
              {t.common.save}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingProject(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={startEditProject}>
              <Edit2 className="h-4 w-4 mr-1" />
              {t.common.edit}
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div className="border-b px-6">
          <TabsList className="h-12 bg-transparent p-0 gap-4">
            <TabsTrigger
              value="uimaps"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1"
            >
              <Map className="h-4 w-4 mr-2" />
              {t.nav.uiMap}
              {uiMaps && <Badge variant="secondary" className="ml-2">{uiMaps.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger
              value="scenarios"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              {t.nav.scenarios || 'Scenarios'}
              {scenarios && <Badge variant="secondary" className="ml-2">{scenarios.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger
              value="runner"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {t.nav.runner}
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none h-full px-1"
            >
              <Settings className="h-4 w-4 mr-2" />
              {t.nav.settings}
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* UI Maps Tab */}
          <TabsContent value="uimaps" className="mt-0 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">{t.nav.uiMap}</h2>
              <Button size="sm" onClick={() => setShowCreateUIMapModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t.uiMap.createUIMap}
              </Button>
            </div>

            {uiMapsLoading ? (
              <div className="text-muted-foreground">{t.common.loading}</div>
            ) : uiMaps && uiMaps.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {uiMaps.map((uiMap) => (
                  <Card
                    key={uiMap.id}
                    className="group cursor-pointer hover:border-primary transition-colors"
                    onClick={() => setEditingUIMapId(uiMap.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{uiMap.name}</CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteUIMap(uiMap.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardDescription>
                        {Object.keys(uiMap.elements || {}).length} elements
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {Object.keys(uiMap.elements || {}).slice(0, 5).map((name) => (
                          <Badge key={name} variant="outline" className="text-xs">
                            {name}
                          </Badge>
                        ))}
                        {Object.keys(uiMap.elements || {}).length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{Object.keys(uiMap.elements).length - 5}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <Map className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">{t.uiMap.noUIMaps}</p>
                  <Button size="sm" onClick={() => setShowCreateUIMapModal(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t.uiMap.createUIMap}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Scenarios Tab */}
          <TabsContent value="scenarios" className="mt-0 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">{t.scenario.title}</h2>
              <Button size="sm" onClick={() => setShowCreateScenarioModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t.scenario.createScenario}
              </Button>
            </div>

            {scenariosLoading ? (
              <div className="text-muted-foreground">{t.common.loading}</div>
            ) : scenarios && scenarios.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {scenarios.map((scenario) => (
                  <Card
                    key={scenario.id}
                    className="group cursor-pointer hover:border-primary transition-colors"
                    onClick={() => setEditingScenarioId(scenario.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{scenario.name}</CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScenario(scenario.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardDescription>
                        {scenario.steps?.length || 0} {t.scenario.steps}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {scenario.description && (
                        <p className="text-sm text-muted-foreground">{scenario.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10">
                  <FileText className="h-10 w-10 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">{t.scenario.noScenarios}</p>
                  <Button size="sm" onClick={() => setShowCreateScenarioModal(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t.scenario.createScenario}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Runner Tab */}
          <TabsContent value="runner" className="mt-0 h-full">
            <RunnerPanel project={project} scenarios={scenarios || []} />
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-0 h-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">{t.nav.settings}</h2>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>{t.project.settings.title}</CardTitle>
                <CardDescription>{t.project.settings.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Default Timeout */}
                <div className="space-y-2">
                  <Label>{t.project.form.defaultTimeout}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={editTimeout}
                      onChange={(e) => setEditTimeout(Number(e.target.value))}
                      className="max-w-[200px]"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        updateProject.mutate({
                          id: projectId,
                          data: { default_timeout: editTimeout }
                        });
                      }}
                      disabled={editTimeout === project.default_timeout}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {t.common.save}
                    </Button>
                  </div>
                </div>

                {/* Browser Channel */}
                <div className="space-y-2">
                  <Label>{t.project.form.browserChannel}</Label>
                  <p className="text-sm text-muted-foreground">{t.project.form.browserChannelDesc}</p>
                  <div className="flex items-center gap-2">
                    <Select
                      value={editBrowserChannel || 'chromium'}
                      onValueChange={(value) => setEditBrowserChannel(value === 'chromium' ? '' : value)}
                    >
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder={t.project.form.browserOptions.chromium} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chromium">{t.project.form.browserOptions.chromium}</SelectItem>
                        <SelectItem value="chrome">{t.project.form.browserOptions.chrome}</SelectItem>
                        <SelectItem value="msedge">{t.project.form.browserOptions.msedge}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => {
                        updateProject.mutate({
                          id: projectId,
                          data: { browser_channel: editBrowserChannel }
                        });
                      }}
                      disabled={editBrowserChannel === (project.browser_channel || '')}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {t.common.save}
                    </Button>
                  </div>
                </div>

                {/* Environments */}
                <div className="space-y-2">
                  <Label>{t.project.environments.title}</Label>
                  {project.environments && project.environments.length > 0 ? (
                    <div className="space-y-2">
                      {project.environments.map((env, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 p-3 border rounded group">
                          <div>
                            <span className="font-medium">{env.name}</span>
                            <span className="text-muted-foreground text-sm ml-2">{env.base_url}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteEnvironment(env.name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t.project.environments.noEnvs}</p>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setShowAddEnvModal(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t.project.environments.add}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Create UI Map Dialog */}
      <Dialog open={showCreateUIMapModal} onOpenChange={setShowCreateUIMapModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.uiMap.createUIMap}</DialogTitle>
            <DialogDescription>{t.uiMap.createDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.common.name} *</Label>
              <Input
                placeholder={t.uiMap.form.namePlaceholder}
                value={newUIMapName}
                onChange={(e) => setNewUIMapName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateUIMap()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateUIMapModal(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleCreateUIMap} disabled={!newUIMapName.trim()}>
              {t.common.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Scenario Dialog */}
      <Dialog open={showCreateScenarioModal} onOpenChange={setShowCreateScenarioModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.scenario.createScenario}</DialogTitle>
            <DialogDescription>{t.scenario.createDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.common.name} *</Label>
              <Input
                placeholder={t.scenario.form.namePlaceholder}
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateScenario()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateScenarioModal(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleCreateScenario} disabled={!newScenarioName.trim()}>
              {t.common.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Environment Dialog */}
      <Dialog open={showAddEnvModal} onOpenChange={setShowAddEnvModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.project.environments.add}</DialogTitle>
            <DialogDescription>{t.project.settings.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.project.environments.name} *</Label>
              <Input
                placeholder={t.project.environments.namePlaceholder}
                value={newEnvName}
                onChange={(e) => setNewEnvName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{t.project.environments.baseUrl} *</Label>
              <Input
                placeholder={t.project.environments.baseUrlPlaceholder}
                value={newEnvBaseUrl}
                onChange={(e) => setNewEnvBaseUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.common.description}</Label>
              <Input
                placeholder={t.project.form.descriptionPlaceholder}
                value={newEnvDescription}
                onChange={(e) => setNewEnvDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEnvModal(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleAddEnvironment} disabled={!newEnvName.trim() || !newEnvBaseUrl.trim()}>
              {t.common.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
