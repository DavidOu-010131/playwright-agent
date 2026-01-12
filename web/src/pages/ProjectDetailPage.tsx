import { useState } from 'react';
import { Map, PlayCircle, FileText, Settings, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { useProject, useUpdateProject } from '../hooks/useProject';
import { useUIMaps, useCreateUIMap, useDeleteUIMap } from '../hooks/useUIMap';
import { useScenarios, useCreateScenario, useDeleteScenario } from '../hooks/useScenario';
import UIMapEditor from '../components/UIMapEditor';
import ScenarioEditor from '../components/ScenarioEditor';
import RunnerPanel from '../components/RunnerPanel';
import SettingsPanel from '../components/SettingsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  const createUIMap = useCreateUIMap();
  const deleteUIMap = useDeleteUIMap();
  const createScenario = useCreateScenario();
  const deleteScenario = useDeleteScenario();

  const [activeTab, setActiveTab] = useState('uimaps');
  const [showCreateUIMapModal, setShowCreateUIMapModal] = useState(false);
  const [showCreateScenarioModal, setShowCreateScenarioModal] = useState(false);
  const [newUIMapName, setNewUIMapName] = useState('');
  const [newScenarioName, setNewScenarioName] = useState('');
  const [editingProject, setEditingProject] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Editor states
  const [editingUIMapId, setEditingUIMapId] = useState<string | null>(null);
  const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);

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
          <TabsList className="h-12 bg-transparent p-0 gap-1">
            <TabsTrigger
              value="uimaps"
              className="relative px-4 py-2 rounded-lg text-muted-foreground transition-all duration-200
                data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none
                hover:bg-muted hover:text-foreground
                data-[state=active]:hover:bg-primary/10
                [&_svg]:transition-colors [&_svg]:duration-200
                data-[state=active]:[&_svg]:text-primary"
            >
              <Map className="h-4 w-4 mr-2" />
              {t.nav.uiMap}
              {uiMaps && uiMaps.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 min-w-5 px-1.5 text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary"
                >
                  {uiMaps.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="scenarios"
              className="relative px-4 py-2 rounded-lg text-muted-foreground transition-all duration-200
                data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none
                hover:bg-muted hover:text-foreground
                data-[state=active]:hover:bg-primary/10
                [&_svg]:transition-colors [&_svg]:duration-200
                data-[state=active]:[&_svg]:text-primary"
            >
              <FileText className="h-4 w-4 mr-2" />
              {t.nav.scenarios || 'Scenarios'}
              {scenarios && scenarios.length > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-2 h-5 min-w-5 px-1.5 text-xs"
                >
                  {scenarios.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="runner"
              className="relative px-4 py-2 rounded-lg text-muted-foreground transition-all duration-200
                data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none
                hover:bg-muted hover:text-foreground
                data-[state=active]:hover:bg-primary/10
                [&_svg]:transition-colors [&_svg]:duration-200
                data-[state=active]:[&_svg]:text-primary"
            >
              <PlayCircle className="h-4 w-4 mr-2" />
              {t.nav.runner}
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="relative px-4 py-2 rounded-lg text-muted-foreground transition-all duration-200
                data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none
                hover:bg-muted hover:text-foreground
                data-[state=active]:hover:bg-primary/10
                [&_svg]:transition-colors [&_svg]:duration-200
                data-[state=active]:[&_svg]:text-primary"
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
            <SettingsPanel project={project} projectId={projectId} />
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
    </div>
  );
}
