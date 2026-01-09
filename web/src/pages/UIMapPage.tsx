import { useState } from 'react';
import { Plus, Trash2, Map, Code } from 'lucide-react';
import {
  useUIMaps,
  useUIMap,
  useCreateUIMap,
  useDeleteUIMap,
  useAddElement,
  useDeleteElement,
} from '../hooks/useUIMap';
import { useProjects } from '../hooks/useProject';
import { useI18n } from '../i18n';
import type { ElementLocator } from '../api';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export default function UIMapPage() {
  const { t } = useI18n();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showElementModal, setShowElementModal] = useState(false);

  const { data: projects } = useProjects();
  const { data: uiMaps, isLoading } = useUIMaps(selectedProjectId || undefined);
  const { data: selectedUIMap } = useUIMap(selectedId || '');
  const createUIMap = useCreateUIMap();
  const deleteUIMap = useDeleteUIMap();
  const addElement = useAddElement();
  const deleteElement = useDeleteElement();

  const handleCreate = (name: string) => {
    createUIMap.mutate(
      { name, project_id: selectedProjectId || undefined },
      { onSuccess: () => setShowCreateModal(false) }
    );
  };

  const handleDelete = (id: string) => {
    if (confirm(t.uiMap.deleteConfirm)) {
      deleteUIMap.mutate(id);
      if (selectedId === id) setSelectedId(null);
    }
  };

  const handleAddElement = (elementName: string, element: ElementLocator) => {
    if (!selectedId) return;
    addElement.mutate(
      { uiMapId: selectedId, elementName, element },
      { onSuccess: () => setShowElementModal(false) }
    );
  };

  const handleDeleteElement = (elementName: string) => {
    if (!selectedId) return;
    if (confirm(t.uiMap.elements.deleteConfirm.replace('{name}', elementName))) {
      deleteElement.mutate({ uiMapId: selectedId, elementName });
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
      {/* Left: UI Map List */}
      <Card className="w-80 flex flex-col">
        <CardHeader className="pb-3">
          {/* Project Filter */}
          <div className="mb-3">
            <Label className="text-xs uppercase tracking-wide mb-2 block">
              {t.uiMap.filterByProject}
            </Label>
            <Select
              value={selectedProjectId || 'all'}
              onValueChange={(value) => {
                setSelectedProjectId(value === 'all' ? '' : value);
                setSelectedId(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.uiMap.allProjects} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.uiMap.allProjects}</SelectItem>
                {projects?.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{t.uiMap.title}</CardTitle>
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
          {uiMaps && uiMaps.length > 0 ? (
            <div className="space-y-1">
              {uiMaps.map((uiMap) => (
                <div
                  key={uiMap.id}
                  className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group ${
                    selectedId === uiMap.id
                      ? 'bg-accent'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => setSelectedId(uiMap.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                      selectedId === uiMap.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      <Map className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium truncate">{uiMap.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(uiMap.id);
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
                <Map className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t.uiMap.noUIMaps}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right: UI Map Detail */}
      <Card className="flex-1 overflow-auto">
        {selectedUIMap ? (
          <>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedUIMap.name}</CardTitle>
                  {selectedUIMap.project_id && (
                    <CardDescription>
                      {t.uiMap.belongsTo}: {projects?.find((p) => p.id === selectedUIMap.project_id)?.name}
                    </CardDescription>
                  )}
                </div>
                <Button size="sm" onClick={() => setShowElementModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t.uiMap.elements.add}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(selectedUIMap.elements).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(selectedUIMap.elements).map(([name, element]) => (
                    <div
                      key={name}
                      className="p-4 rounded-lg border group hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Code className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100"
                          onClick={() => handleDeleteElement(name)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                      {element.description && (
                        <p className="text-sm text-muted-foreground mb-3">{element.description}</p>
                      )}
                      <div className="space-y-2">
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-muted-foreground uppercase tracking-wide w-16 pt-1">Primary</span>
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {element.primary}
                          </code>
                        </div>
                        {element.fallbacks.length > 0 && (
                          <div className="flex items-start gap-3">
                            <span className="text-xs text-muted-foreground uppercase tracking-wide w-16 pt-1">Fallback</span>
                            <div className="flex flex-wrap gap-1">
                              {element.fallbacks.map((fb, i) => (
                                <Badge key={i} variant="secondary" className="font-mono text-xs">
                                  {fb}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center rounded-lg border border-dashed">
                  <Code className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">{t.uiMap.elements.noElements}</p>
                </div>
              )}
            </CardContent>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted mb-4">
              <Map className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Select a UI Map to view details</p>
          </div>
        )}
      </Card>

      {/* Create UI Map Dialog */}
      <CreateUIMapDialog
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreate={handleCreate}
        projectName={projects?.find((p) => p.id === selectedProjectId)?.name}
      />

      {/* Add Element Dialog */}
      <AddElementDialog
        open={showElementModal}
        onOpenChange={setShowElementModal}
        onAdd={handleAddElement}
      />
    </div>
  );
}

function CreateUIMapDialog({
  open,
  onOpenChange,
  onCreate,
  projectName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
  projectName?: string;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');

  const handleSubmit = () => {
    if (!name) return;
    onCreate(name);
    setName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.uiMap.createUIMap}</DialogTitle>
          <DialogDescription>
            {projectName
              ? `${t.uiMap.form.willCreateIn}: ${projectName}`
              : 'Create a new UI Map to organize element selectors.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="uimap-name">{t.uiMap.form.name} *</Label>
            <Input
              id="uimap-name"
              placeholder={t.uiMap.form.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
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

function AddElementDialog({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (name: string, element: ElementLocator) => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [primary, setPrimary] = useState('');
  const [fallbacks, setFallbacks] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (!name || !primary) return;
    onAdd(name, {
      primary,
      fallbacks: fallbacks
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      description: description || undefined,
    });
    setName('');
    setPrimary('');
    setFallbacks('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t.uiMap.elements.add}</DialogTitle>
          <DialogDescription>
            Add a new element locator with optional fallback selectors.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="element-name">{t.uiMap.elements.name} *</Label>
            <Input
              id="element-name"
              placeholder={t.uiMap.elements.namePlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="primary-selector">{t.uiMap.elements.primarySelector} *</Label>
            <Input
              id="primary-selector"
              placeholder={t.uiMap.elements.primaryPlaceholder}
              value={primary}
              onChange={(e) => setPrimary(e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fallback-selectors">{t.uiMap.elements.fallbackSelectors}</Label>
            <textarea
              id="fallback-selectors"
              placeholder={"#login-btn\n.btn-login"}
              value={fallbacks}
              onChange={(e) => setFallbacks(e.target.value)}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="element-description">{t.common.description}</Label>
            <Input
              id="element-description"
              placeholder={t.uiMap.elements.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.common.cancel}
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !primary}>
            {t.common.add}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
