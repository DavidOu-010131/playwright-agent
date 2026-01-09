import { useState } from 'react';
import { Plus, Trash2, ChevronLeft, Pencil, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { useUIMap, useUpdateUIMap, useAddElement, useDeleteElement } from '../hooks/useUIMap';
import type { ElementLocator } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UIMapEditorProps {
  uiMapId: string;
  onClose: () => void;
}

export default function UIMapEditor({ uiMapId, onClose }: UIMapEditorProps) {
  const { t } = useI18n();
  const { data: uiMap, isLoading } = useUIMap(uiMapId);
  const updateUIMap = useUpdateUIMap();
  const addElement = useAddElement();
  const deleteElement = useDeleteElement();

  const [showAddElement, setShowAddElement] = useState(false);
  const [newElementName, setNewElementName] = useState('');
  const [newPrimary, setNewPrimary] = useState('');
  const [newFallbacks, setNewFallbacks] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [editPrimary, setEditPrimary] = useState('');
  const [editFallbacks, setEditFallbacks] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // UI Map name and description editing (combined)
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-muted-foreground">{t.common.loading}</span>
      </div>
    );
  }

  if (!uiMap) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-muted-foreground">UI Map not found</span>
      </div>
    );
  }

  const handleAddElement = () => {
    if (!newElementName.trim() || !newPrimary.trim()) return;

    const element: ElementLocator = {
      primary: newPrimary.trim(),
      fallbacks: newFallbacks.split('\n').map(s => s.trim()).filter(Boolean),
      description: newDescription.trim() || undefined,
    };

    addElement.mutate(
      { uiMapId, elementName: newElementName.trim(), element },
      {
        onSuccess: () => {
          setShowAddElement(false);
          setNewElementName('');
          setNewPrimary('');
          setNewFallbacks('');
          setNewDescription('');
        },
      }
    );
  };

  const handleDeleteElement = (name: string) => {
    if (confirm(t.uiMap.elements.deleteConfirm.replace('{name}', name))) {
      deleteElement.mutate({ uiMapId, elementName: name });
    }
  };

  const startEditName = () => {
    setEditName(uiMap.name);
    setEditDesc(uiMap.description || '');
    setIsEditing(true);
  };

  const saveEdit = () => {
    const newName = editName.trim();
    const newDesc = editDesc.trim();
    if (!newName) {
      setIsEditing(false);
      return;
    }
    // Only update if something changed
    if (newName === uiMap.name && newDesc === (uiMap.description || '')) {
      setIsEditing(false);
      return;
    }
    updateUIMap.mutate(
      { id: uiMapId, data: { name: newName, description: newDesc || undefined } },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditName('');
    setEditDesc('');
  };

  const startEditElement = (name: string, element: ElementLocator) => {
    setEditingElement(name);
    setEditPrimary(element.primary);
    setEditFallbacks(element.fallbacks?.join('\n') || '');
    setEditDescription(element.description || '');
  };

  const saveEditElement = () => {
    if (!editingElement || !editPrimary.trim()) return;

    const newElements = { ...uiMap.elements };
    newElements[editingElement] = {
      primary: editPrimary.trim(),
      fallbacks: editFallbacks.split('\n').map(s => s.trim()).filter(Boolean),
      description: editDescription.trim() || undefined,
    };

    updateUIMap.mutate(
      { id: uiMapId, data: { elements: newElements } },
      {
        onSuccess: () => {
          setEditingElement(null);
        },
      }
    );
  };

  const elements = Object.entries(uiMap.elements || {});

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {isEditing ? (
          <div className="flex-1 flex items-center gap-4">
            <div className="flex-1 space-y-2 max-w-md">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-lg font-semibold"
                placeholder={t.uiMap.form.namePlaceholder}
                autoFocus
              />
              <Input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder={t.common.description}
              />
            </div>
            <Button size="sm" onClick={saveEdit}>
              {t.common.save}
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEdit}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">{uiMap.name}</h1>
              {uiMap.description && (
                <p className="text-sm text-muted-foreground mt-1">{uiMap.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {elements.length} {t.uiMap.elements.title.toLowerCase()}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={startEditName}>
              <Pencil className="h-4 w-4 mr-1" />
              {t.common.edit}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">{t.uiMap.elements.title}</h2>
          <Button size="sm" onClick={() => setShowAddElement(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t.uiMap.elements.add}
          </Button>
        </div>

        {elements.length > 0 ? (
          <div className="space-y-3">
            {elements.map(([name, element]) => (
              <Card key={name}>
                <CardHeader className="py-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{name}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditElement(name, element)}
                      >
                        {t.common.edit}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteElement(name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2 pt-0">
                  {editingElement === name ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{t.uiMap.elements.primarySelector}</Label>
                        <Input
                          value={editPrimary}
                          onChange={(e) => setEditPrimary(e.target.value)}
                          placeholder={t.uiMap.elements.primaryPlaceholder}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t.uiMap.elements.fallbackSelectors}</Label>
                        <textarea
                          className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={editFallbacks}
                          onChange={(e) => setEditFallbacks(e.target.value)}
                          placeholder="#fallback-id\n.fallback-class"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t.uiMap.elements.description}</Label>
                        <Input
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder={t.uiMap.elements.descriptionPlaceholder}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEditElement}>
                          {t.common.save}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingElement(null)}>
                          {t.common.cancel}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm space-y-1">
                      <div>
                        <span className="text-muted-foreground">Primary: </span>
                        <code className="bg-muted px-1 rounded">{element.primary}</code>
                      </div>
                      {element.fallbacks && element.fallbacks.length > 0 && (
                        <div>
                          <span className="text-muted-foreground">Fallbacks: </span>
                          {element.fallbacks.map((fb, i) => (
                            <code key={i} className="bg-muted px-1 rounded mr-1">{fb}</code>
                          ))}
                        </div>
                      )}
                      {element.description && (
                        <div className="text-muted-foreground">{element.description}</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground mb-4">{t.uiMap.elements.noElements}</p>
              <Button size="sm" onClick={() => setShowAddElement(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t.uiMap.elements.add}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Element Dialog */}
      <Dialog open={showAddElement} onOpenChange={setShowAddElement}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.uiMap.elements.add}</DialogTitle>
            <DialogDescription>Add a new element locator to this UI Map</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.uiMap.elements.name} *</Label>
              <Input
                placeholder={t.uiMap.elements.namePlaceholder}
                value={newElementName}
                onChange={(e) => setNewElementName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{t.uiMap.elements.primarySelector} *</Label>
              <Input
                placeholder={t.uiMap.elements.primaryPlaceholder}
                value={newPrimary}
                onChange={(e) => setNewPrimary(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.uiMap.elements.fallbackSelectors}</Label>
              <textarea
                className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="#fallback-id\n.fallback-class"
                value={newFallbacks}
                onChange={(e) => setNewFallbacks(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.uiMap.elements.description}</Label>
              <Input
                placeholder={t.uiMap.elements.descriptionPlaceholder}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddElement(false)}>
              {t.common.cancel}
            </Button>
            <Button
              onClick={handleAddElement}
              disabled={!newElementName.trim() || !newPrimary.trim()}
            >
              {t.common.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
