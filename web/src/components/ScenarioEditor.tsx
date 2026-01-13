import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronUp, ChevronDown, AlertCircle, SkipForward, Pencil, X, Upload } from 'lucide-react';
import { useI18n } from '../i18n';
import { useScenario, useScenarios, useUpdateScenario } from '../hooks/useScenario';
import { useUIMaps } from '../hooks/useUIMap';
import type { Step, Resource } from '../api';
import { resourceApi } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const ACTIONS = [
  { value: 'goto', label: 'goto', needsUrl: true },
  { value: 'click', label: 'click', needsTarget: true },
  { value: 'dblclick', label: 'dblclick', needsTarget: true },
  { value: 'type', label: 'type', needsTarget: true, needsValue: true },
  { value: 'fill', label: 'fill', needsTarget: true, needsValue: true },
  { value: 'hover', label: 'hover', needsTarget: true },
  { value: 'focus', label: 'focus', needsTarget: true },
  { value: 'check', label: 'check', needsTarget: true },
  { value: 'uncheck', label: 'uncheck', needsTarget: true },
  { value: 'select', label: 'select', needsTarget: true, needsValue: true },
  { value: 'press', label: 'press', needsTarget: true, needsValue: true },
  { value: 'scroll', label: 'scroll', needsTarget: true },
  { value: 'wait_for', label: 'wait_for', needsTarget: true },
  { value: 'assert_text', label: 'assert_text', needsTarget: true, needsValue: true },
  { value: 'extract', label: 'extract', needsTarget: true, needsSaveAs: true },
  { value: 'run_scenario', label: 'run_scenario', needsScenarioId: true },
  { value: 'upload_file', label: 'upload_file', needsTarget: true, needsFilePath: true },
  { value: 'paste_image', label: 'paste_image', needsTarget: true, needsFilePath: true },
  { value: 'run_js', label: 'run_js', needsValue: true },
  { value: 'screenshot', label: 'screenshot' },
  { value: 'wait', label: 'wait', needsValue: true },
  { value: 'save_auth_state', label: 'save_auth_state', needsStateName: true },
  { value: 'load_auth_state', label: 'load_auth_state', needsStateName: true },
  { value: 'ensure_auth', label: 'ensure_auth', needsEnsureAuth: true },
];

interface ScenarioEditorProps {
  scenarioId: string;
  projectId: string;
  onClose: () => void;
}

export default function ScenarioEditor({ scenarioId, projectId, onClose }: ScenarioEditorProps) {
  const { t } = useI18n();
  const { data: scenario, isLoading } = useScenario(scenarioId);
  const { data: uiMaps } = useUIMaps(projectId);
  const { data: scenarios } = useScenarios(projectId);
  const updateScenario = useUpdateScenario();

  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepName, setNewStepName] = useState('');
  const [newAction, setNewAction] = useState('click');
  const [newTarget, setNewTarget] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newContinueOnError, setNewContinueOnError] = useState(false);
  const [newOptional, setNewOptional] = useState(false);
  const [newTimeout, setNewTimeout] = useState('');
  const [showNewOptions, setShowNewOptions] = useState(false);
  const [newSaveAs, setNewSaveAs] = useState('');
  const [newScenarioId, setNewScenarioId] = useState('');
  const [newFilePath, setNewFilePath] = useState('');
  const [newStateName, setNewStateName] = useState('');
  // ensure_auth fields
  const [newCheckUrl, setNewCheckUrl] = useState('');
  const [newLoginScenarioId, setNewLoginScenarioId] = useState('');
  const [newLoggedInSelector, setNewLoggedInSelector] = useState('');
  const [newLoginUrlPattern, setNewLoginUrlPattern] = useState('');

  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [editStepName, setEditStepName] = useState('');
  const [editAction, setEditAction] = useState('');
  const [editTarget, setEditTarget] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editContinueOnError, setEditContinueOnError] = useState(false);
  const [editOptional, setEditOptional] = useState(false);
  const [editTimeout, setEditTimeout] = useState('');
  const [showEditOptions, setShowEditOptions] = useState(false);
  const [editSaveAs, setEditSaveAs] = useState('');
  const [editScenarioId, setEditScenarioId] = useState('');
  const [editFilePath, setEditFilePath] = useState('');
  const [editStateName, setEditStateName] = useState('');
  // ensure_auth fields for edit
  const [editCheckUrl, setEditCheckUrl] = useState('');
  const [editLoginScenarioId, setEditLoginScenarioId] = useState('');
  const [editLoggedInSelector, setEditLoggedInSelector] = useState('');
  const [editLoginUrlPattern, setEditLoginUrlPattern] = useState('');

  // Scenario name and description editing (combined)
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Resources for file upload/paste actions
  const [resources, setResources] = useState<Resource[]>([]);

  // Load resources for the project
  useEffect(() => {
    resourceApi.list(projectId).then(setResources).catch(() => setResources([]));
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-muted-foreground">{t.common.loading}</span>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="text-muted-foreground">Scenario not found</span>
      </div>
    );
  }

  // Group elements by UI Map name for the select dropdown
  const groupedElements = (uiMaps || []).reduce((acc, uiMap) => {
    const elements = Object.keys(uiMap.elements || {});
    if (elements.length > 0) {
      acc[uiMap.name] = elements;
    }
    return acc;
  }, {} as Record<string, string[]>);

  const getActionConfig = (action: string) => ACTIONS.find(a => a.value === action);

  const handleAddStep = () => {
    const actionConfig = getActionConfig(newAction);
    if (!actionConfig) return;

    const step: Step = { action: newAction };
    if (newStepName.trim()) step.name = newStepName.trim();
    if (actionConfig.needsTarget && newTarget) step.target = newTarget;
    if (actionConfig.needsUrl && newUrl) step.url = newUrl;
    if (actionConfig.needsValue && newValue) step.value = newValue;
    if ((actionConfig as any).needsSaveAs && newSaveAs) step.save_as = newSaveAs;
    if ((actionConfig as any).needsScenarioId && newScenarioId) step.scenario_id = newScenarioId;
    if ((actionConfig as any).needsFilePath && newFilePath) step.file_path = newFilePath;
    if ((actionConfig as any).needsStateName && newStateName) step.state_name = newStateName;
    if ((actionConfig as any).needsEnsureAuth) {
      if (newStateName) step.state_name = newStateName;
      if (newCheckUrl) step.check_url = newCheckUrl;
      if (newLoginScenarioId) step.login_scenario_id = newLoginScenarioId;
      if (newLoggedInSelector) step.logged_in_selector = newLoggedInSelector;
      if (newLoginUrlPattern) step.login_url_pattern = newLoginUrlPattern;
    }
    if (newContinueOnError) step.continue_on_error = true;
    if (newOptional) step.optional = true;
    if (newTimeout) step.timeout = parseInt(newTimeout, 10);

    const newSteps = [...(scenario.steps || []), step];
    updateScenario.mutate(
      { id: scenarioId, data: { steps: newSteps } },
      {
        onSuccess: () => {
          setShowAddStep(false);
          setNewStepName('');
          setNewAction('click');
          setNewTarget('');
          setNewUrl('');
          setNewValue('');
          setNewSaveAs('');
          setNewScenarioId('');
          setNewFilePath('');
          setNewStateName('');
          setNewCheckUrl('');
          setNewLoginScenarioId('');
          setNewLoggedInSelector('');
          setNewLoginUrlPattern('');
          setNewContinueOnError(false);
          setNewOptional(false);
          setNewTimeout('');
          setShowNewOptions(false);
        },
      }
    );
  };

  const handleDeleteStep = (index: number) => {
    if (!confirm(t.common.deleteConfirm)) return;
    const newSteps = scenario.steps.filter((_, i) => i !== index);
    updateScenario.mutate({ id: scenarioId, data: { steps: newSteps } });
  };

  const startEdit = () => {
    setEditName(scenario.name);
    setEditDesc(scenario.description || '');
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
    if (newName === scenario.name && newDesc === (scenario.description || '')) {
      setIsEditing(false);
      return;
    }
    updateScenario.mutate(
      { id: scenarioId, data: { name: newName, description: newDesc || undefined } },
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

  const startEditStep = (index: number, step: Step) => {
    setEditingStep(index);
    setEditStepName(step.name || '');
    setEditAction(step.action);
    setEditTarget(step.target || '');
    setEditUrl(step.url || '');
    setEditValue(step.value || '');
    setEditSaveAs(step.save_as || '');
    setEditScenarioId(step.scenario_id || '');
    setEditFilePath(step.file_path || '');
    setEditStateName(step.state_name || '');
    setEditCheckUrl(step.check_url || '');
    setEditLoginScenarioId(step.login_scenario_id || '');
    setEditLoggedInSelector(step.logged_in_selector || '');
    setEditLoginUrlPattern(step.login_url_pattern || '');
    setEditContinueOnError(step.continue_on_error || false);
    setEditOptional(step.optional || false);
    setEditTimeout(step.timeout?.toString() || '');
    setShowEditOptions(step.continue_on_error || step.optional || !!step.timeout);
  };

  const saveEditStep = () => {
    if (editingStep === null) return;
    const actionConfig = getActionConfig(editAction);
    if (!actionConfig) return;

    const step: Step = { action: editAction };
    if (editStepName.trim()) step.name = editStepName.trim();
    if (actionConfig.needsTarget && editTarget) step.target = editTarget;
    if (actionConfig.needsUrl && editUrl) step.url = editUrl;
    if (actionConfig.needsValue && editValue) step.value = editValue;
    if ((actionConfig as any).needsSaveAs && editSaveAs) step.save_as = editSaveAs;
    if ((actionConfig as any).needsScenarioId && editScenarioId) step.scenario_id = editScenarioId;
    if ((actionConfig as any).needsFilePath && editFilePath) step.file_path = editFilePath;
    if ((actionConfig as any).needsStateName && editStateName) step.state_name = editStateName;
    if ((actionConfig as any).needsEnsureAuth) {
      if (editStateName) step.state_name = editStateName;
      if (editCheckUrl) step.check_url = editCheckUrl;
      if (editLoginScenarioId) step.login_scenario_id = editLoginScenarioId;
      if (editLoggedInSelector) step.logged_in_selector = editLoggedInSelector;
      if (editLoginUrlPattern) step.login_url_pattern = editLoginUrlPattern;
    }
    if (editContinueOnError) step.continue_on_error = true;
    if (editOptional) step.optional = true;
    if (editTimeout) step.timeout = parseInt(editTimeout, 10);

    const newSteps = [...scenario.steps];
    newSteps[editingStep] = step;
    updateScenario.mutate(
      { id: scenarioId, data: { steps: newSteps } },
      { onSuccess: () => setEditingStep(null) }
    );
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= scenario.steps.length) return;

    const newSteps = [...scenario.steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    updateScenario.mutate({ id: scenarioId, data: { steps: newSteps } });
  };

  // Render target selector with grouped elements
  const renderTargetSelect = (value: string, onChange: (v: string) => void, allowCustom = true) => {
    const hasElements = Object.keys(groupedElements).length > 0;

    if (!hasElements && allowCustom) {
      return (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="CSS selector"
        />
      );
    }

    return (
      <Select value={value || '__custom__'} onValueChange={(v) => onChange(v === '__custom__' ? '' : v)}>
        <SelectTrigger>
          <SelectValue placeholder="选择元素..." />
        </SelectTrigger>
        <SelectContent>
          {allowCustom && <SelectItem value="__custom__">自定义选择器...</SelectItem>}
          {Object.entries(groupedElements).map(([uiMapName, elements]) => (
            <SelectGroup key={uiMapName}>
              <SelectLabel>{uiMapName}</SelectLabel>
              {elements.map((elementName) => (
                <SelectItem key={`${uiMapName}.${elementName}`} value={`${uiMapName}.${elementName}`}>
                  {elementName}
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
    );
  };

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
                placeholder={t.scenario.form.namePlaceholder}
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
              <h1 className="text-xl font-semibold">{scenario.name}</h1>
              {scenario.description && (
                <p className="text-sm text-muted-foreground mt-1">{scenario.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                {scenario.steps?.length || 0} steps
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={startEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              {t.common.edit}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Steps */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">{t.scenario.executionSteps}</h2>
          <Button size="sm" onClick={() => setShowAddStep(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t.scenario.addStep}
          </Button>
        </div>

        {scenario.steps && scenario.steps.length > 0 ? (
          <div className="space-y-2">
            {scenario.steps.map((step, index) => (
              <Card key={index}>
                <CardContent className="py-3 px-4">
                  {editingStep === index ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs">{t.scenario.step.name}</Label>
                        <Input
                          value={editStepName}
                          onChange={(e) => setEditStepName(e.target.value)}
                          placeholder={t.scenario.step.namePlaceholder}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Action</Label>
                          <Select value={editAction} onValueChange={setEditAction}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ACTIONS.map((a) => (
                                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {getActionConfig(editAction)?.needsTarget && (
                          <div className="space-y-1">
                            <Label className="text-xs">Target</Label>
                            {renderTargetSelect(editTarget, setEditTarget)}
                          </div>
                        )}
                        {getActionConfig(editAction)?.needsUrl && (
                          <div className="space-y-1">
                            <Label className="text-xs">URL</Label>
                            <Input
                              value={editUrl}
                              onChange={(e) => setEditUrl(e.target.value)}
                              placeholder="https://..."
                            />
                          </div>
                        )}
                        {getActionConfig(editAction)?.needsValue && (
                          <div className="space-y-1">
                            <Label className="text-xs">Value</Label>
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              placeholder="value"
                            />
                          </div>
                        )}
                        {(getActionConfig(editAction) as any)?.needsSaveAs && (
                          <div className="space-y-1">
                            <Label className="text-xs">Save As</Label>
                            <Input
                              value={editSaveAs}
                              onChange={(e) => setEditSaveAs(e.target.value)}
                              placeholder="variable_name"
                            />
                          </div>
                        )}
                        {(getActionConfig(editAction) as any)?.needsScenarioId && (
                          <div className="space-y-1">
                            <Label className="text-xs">Scenario ID</Label>
                            <Input
                              value={editScenarioId}
                              onChange={(e) => setEditScenarioId(e.target.value)}
                              placeholder="scenario_id"
                            />
                          </div>
                        )}
                        {(getActionConfig(editAction) as any)?.needsFilePath && (
                          <div className="space-y-1">
                            <Label className="text-xs">{(t as any).resource?.filePath || 'File Path'}</Label>
                            <Select value={editFilePath || '__none__'} onValueChange={(v) => setEditFilePath(v === '__none__' ? '' : v)}>
                              <SelectTrigger>
                                <SelectValue placeholder={(t as any).resource?.selectResource || 'Select from resources...'} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">{(t as any).resource?.noFileSelected || 'No file selected'}</SelectItem>
                                {resources.map((res) => (
                                  <SelectItem key={res.id} value={`resource:${res.id}`}>
                                    <div className="flex items-center gap-2">
                                      <Upload className="h-3 w-3" />
                                      {res.original_name}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {(getActionConfig(editAction) as any)?.needsStateName && (
                          <div className="space-y-1">
                            <Label className="text-xs">{(t as any).scenario?.stateName || 'State Name'}</Label>
                            <Input
                              placeholder={(t as any).scenario?.stateNamePlaceholder || 'default'}
                              value={editStateName}
                              onChange={(e) => setEditStateName(e.target.value)}
                            />
                          </div>
                        )}
                        {(getActionConfig(editAction) as any)?.needsEnsureAuth && (
                          <div className="col-span-2 space-y-3 p-3 border rounded-lg bg-muted/30">
                            <p className="text-sm font-medium">{(t as any).scenario?.ensureAuthTitle || 'Smart Auth Configuration'}</p>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">{(t as any).scenario?.checkUrl || 'Check URL'} *</Label>
                                <Input
                                  placeholder={(t as any).scenario?.checkUrlPlaceholder || '/dashboard'}
                                  value={editCheckUrl}
                                  onChange={(e) => setEditCheckUrl(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{(t as any).scenario?.loginScenario || 'Login Scenario'} *</Label>
                                <Select value={editLoginScenarioId || '__none__'} onValueChange={(v) => setEditLoginScenarioId(v === '__none__' ? '' : v)}>
                                  <SelectTrigger>
                                    <SelectValue placeholder={(t as any).scenario?.selectLoginScenario || 'Select login scenario...'} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">{(t as any).scenario?.noScenarioSelected || 'No scenario selected'}</SelectItem>
                                    {scenarios?.filter(s => s.id !== scenarioId).map((s) => (
                                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{(t as any).scenario?.stateName || 'State Name'}</Label>
                                <Input
                                  placeholder={(t as any).scenario?.stateNamePlaceholder || 'default'}
                                  value={editStateName}
                                  onChange={(e) => setEditStateName(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">{(t as any).scenario?.loggedInSelector || 'Logged-in Selector'}</Label>
                                <Input
                                  placeholder={(t as any).scenario?.loggedInSelectorPlaceholder || '.user-menu, .avatar'}
                                  value={editLoggedInSelector}
                                  onChange={(e) => setEditLoggedInSelector(e.target.value)}
                                />
                              </div>
                              <div className="col-span-2 space-y-1">
                                <Label className="text-xs">{(t as any).scenario?.loginUrlPattern || 'Login URL Pattern'}</Label>
                                <Input
                                  placeholder="/login"
                                  value={editLoginUrlPattern}
                                  onChange={(e) => setEditLoginUrlPattern(e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Step Options */}
                      <Collapsible open={showEditOptions} onOpenChange={setShowEditOptions}>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-muted-foreground">
                            <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${showEditOptions ? 'rotate-180' : ''}`} />
                            {t.scenario.stepOptions.title}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 space-y-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-continue-${index}`}
                              checked={editContinueOnError}
                              onCheckedChange={(checked) => setEditContinueOnError(checked as boolean)}
                            />
                            <div className="grid gap-0.5">
                              <label htmlFor={`edit-continue-${index}`} className="text-sm font-medium">
                                {t.scenario.stepOptions.continueOnError}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {t.scenario.stepOptions.continueOnErrorDesc}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`edit-optional-${index}`}
                              checked={editOptional}
                              onCheckedChange={(checked) => setEditOptional(checked as boolean)}
                            />
                            <div className="grid gap-0.5">
                              <label htmlFor={`edit-optional-${index}`} className="text-sm font-medium">
                                {t.scenario.stepOptions.optional}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {t.scenario.stepOptions.optionalDesc}
                              </p>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">{t.scenario.stepOptions.timeout}</Label>
                            <Input
                              type="number"
                              value={editTimeout}
                              onChange={(e) => setEditTimeout(e.target.value)}
                              placeholder="5000"
                              className="w-32"
                            />
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEditStep}>
                          {t.common.save}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingStep(null)}>
                          {t.common.cancel}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          disabled={index === 0}
                          onClick={() => moveStep(index, 'up')}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          disabled={index === scenario.steps.length - 1}
                          onClick={() => moveStep(index, 'down')}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-muted-foreground text-sm w-6">{index + 1}.</span>
                      <Badge variant="outline">{step.action}</Badge>
                      {step.name && <span className="font-medium text-sm">{step.name}</span>}
                      <div className="flex-1 text-sm flex items-center gap-2">
                        {step.url && <span className="text-muted-foreground">{step.url}</span>}
                        {step.target && <code className="bg-muted px-1 rounded">{step.target}</code>}
                        {step.value && <span className="text-muted-foreground">= "{step.value}"</span>}
                        {step.file_path && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Upload className="h-3 w-3" />
                            {step.file_path.startsWith('resource:')
                              ? resources.find(r => r.id === step.file_path?.replace('resource:', ''))?.original_name || step.file_path
                              : step.file_path}
                          </Badge>
                        )}
                        {step.continue_on_error && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <AlertCircle className="h-3 w-3" />
                            {t.scenario.stepOptions.continueOnError}
                          </Badge>
                        )}
                        {step.optional && (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <SkipForward className="h-3 w-3" />
                            {t.scenario.stepOptions.optional}
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditStep(index, step)}
                      >
                        {t.common.edit}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteStep(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground mb-4">{t.scenario.noSteps}</p>
              <Button size="sm" onClick={() => setShowAddStep(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t.scenario.addStep}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Step Dialog */}
      <Dialog open={showAddStep} onOpenChange={setShowAddStep}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.scenario.addStep}</DialogTitle>
            <DialogDescription>{t.scenario.addStepDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t.scenario.step.name}</Label>
              <Input
                value={newStepName}
                onChange={(e) => setNewStepName(e.target.value)}
                placeholder={t.scenario.step.namePlaceholder}
              />
            </div>
            <div className="space-y-2">
              <Label>Action *</Label>
              <Select value={newAction} onValueChange={setNewAction}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {getActionConfig(newAction)?.needsTarget && (
              <div className="space-y-2">
                <Label>Target *</Label>
                {renderTargetSelect(newTarget, setNewTarget)}
              </div>
            )}
            {getActionConfig(newAction)?.needsUrl && (
              <div className="space-y-2">
                <Label>URL *</Label>
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            )}
            {getActionConfig(newAction)?.needsValue && (
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="value"
                />
              </div>
            )}
            {(getActionConfig(newAction) as any)?.needsSaveAs && (
              <div className="space-y-2">
                <Label>Save As (variable name) *</Label>
                <Input
                  value={newSaveAs}
                  onChange={(e) => setNewSaveAs(e.target.value)}
                  placeholder="e.g., order_id"
                />
                <p className="text-xs text-muted-foreground">Use {"{{variable_name}}"} in later steps</p>
              </div>
            )}
            {(getActionConfig(newAction) as any)?.needsScenarioId && (
              <div className="space-y-2">
                <Label>Scenario ID *</Label>
                <Input
                  value={newScenarioId}
                  onChange={(e) => setNewScenarioId(e.target.value)}
                  placeholder="e.g., abc12345"
                />
                <p className="text-xs text-muted-foreground">Run another scenario as a sub-routine</p>
              </div>
            )}
            {(getActionConfig(newAction) as any)?.needsFilePath && (
              <div className="space-y-2">
                <Label>{(t as any).resource?.filePath || 'File Path'} *</Label>
                <Select value={newFilePath || '__none__'} onValueChange={(v) => setNewFilePath(v === '__none__' ? '' : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder={(t as any).resource?.selectResource || 'Select from resources...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{(t as any).resource?.noFileSelected || 'No file selected'}</SelectItem>
                    {resources.map((res) => (
                      <SelectItem key={res.id} value={`resource:${res.id}`}>
                        <div className="flex items-center gap-2">
                          <Upload className="h-3 w-3" />
                          {res.original_name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {resources.length === 0
                    ? 'No resources uploaded. Go to Project Settings to upload files.'
                    : 'Select a file from project resources'}
                </p>
              </div>
            )}
            {(getActionConfig(newAction) as any)?.needsStateName && (
              <div className="space-y-2">
                <Label>{(t as any).scenario?.stateName || 'State Name'}</Label>
                <Input
                  placeholder={(t as any).scenario?.stateNamePlaceholder || 'default'}
                  value={newStateName}
                  onChange={(e) => setNewStateName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {(t as any).scenario?.stateNameDesc || 'Name of the auth state to save/load. Leave empty for "default".'}
                </p>
              </div>
            )}
            {(getActionConfig(newAction) as any)?.needsEnsureAuth && (
              <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                <p className="text-sm font-medium">{(t as any).scenario?.ensureAuthTitle || 'Smart Auth Configuration'}</p>
                <div className="space-y-2">
                  <Label>{(t as any).scenario?.checkUrl || 'Check URL'} *</Label>
                  <Input
                    placeholder={(t as any).scenario?.checkUrlPlaceholder || '/dashboard'}
                    value={newCheckUrl}
                    onChange={(e) => setNewCheckUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {(t as any).scenario?.checkUrlDesc || 'URL that requires login to access'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{(t as any).scenario?.loginScenario || 'Login Scenario'} *</Label>
                  <Select value={newLoginScenarioId || '__none__'} onValueChange={(v) => setNewLoginScenarioId(v === '__none__' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={(t as any).scenario?.selectLoginScenario || 'Select login scenario...'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{(t as any).scenario?.noScenarioSelected || 'No scenario selected'}</SelectItem>
                      {scenarios?.filter(s => s.id !== scenarioId).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{(t as any).scenario?.stateName || 'State Name'}</Label>
                  <Input
                    placeholder={(t as any).scenario?.stateNamePlaceholder || 'default'}
                    value={newStateName}
                    onChange={(e) => setNewStateName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{(t as any).scenario?.loggedInSelector || 'Logged-in Selector'}</Label>
                  <Input
                    placeholder={(t as any).scenario?.loggedInSelectorPlaceholder || '.user-menu, .avatar'}
                    value={newLoggedInSelector}
                    onChange={(e) => setNewLoggedInSelector(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {(t as any).scenario?.loggedInSelectorDesc || 'Element visible only when logged in (optional)'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>{(t as any).scenario?.loginUrlPattern || 'Login URL Pattern'}</Label>
                  <Input
                    placeholder="/login"
                    value={newLoginUrlPattern}
                    onChange={(e) => setNewLoginUrlPattern(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {(t as any).scenario?.loginUrlPatternDesc || 'URL pattern indicating login page (default: /login)'}
                  </p>
                </div>
              </div>
            )}
            {/* Step Options */}
            <Collapsible open={showNewOptions} onOpenChange={setShowNewOptions}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-muted-foreground p-0">
                  <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${showNewOptions ? 'rotate-180' : ''}`} />
                  {t.scenario.stepOptions.title}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="new-continue"
                    checked={newContinueOnError}
                    onCheckedChange={(checked) => setNewContinueOnError(checked as boolean)}
                  />
                  <div className="grid gap-0.5">
                    <label htmlFor="new-continue" className="text-sm font-medium">
                      {t.scenario.stepOptions.continueOnError}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {t.scenario.stepOptions.continueOnErrorDesc}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="new-optional"
                    checked={newOptional}
                    onCheckedChange={(checked) => setNewOptional(checked as boolean)}
                  />
                  <div className="grid gap-0.5">
                    <label htmlFor="new-optional" className="text-sm font-medium">
                      {t.scenario.stepOptions.optional}
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {t.scenario.stepOptions.optionalDesc}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t.scenario.stepOptions.timeout}</Label>
                  <Input
                    type="number"
                    value={newTimeout}
                    onChange={(e) => setNewTimeout(e.target.value)}
                    placeholder="5000"
                    className="w-32"
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStep(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleAddStep}>
              {t.common.add}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
