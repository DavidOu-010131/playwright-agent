import { useState, useRef, useEffect } from 'react';
import {
  Settings,
  Globe,
  Chrome,
  Clock,
  Plus,
  Trash2,
  Save,
  Upload,
  File,
  FolderCog,
} from 'lucide-react';
import { toast } from 'sonner';
import { useI18n } from '../i18n';
import { useUpdateProject, useAddEnvironment, useDeleteEnvironment } from '../hooks/useProject';
import { resourceApi } from '../api';
import type { Project, Environment, Resource } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Common browser arguments that can be toggled
const COMMON_BROWSER_ARGS = {
  startMaximized: '--start-maximized',
  disableAutomation: '--disable-blink-features=AutomationControlled',
  disableInfobars: '--disable-infobars',
} as const;

interface SettingsPanelProps {
  project: Project;
  projectId: string;
}

export default function SettingsPanel({ project, projectId }: SettingsPanelProps) {
  const { t } = useI18n();
  const updateProject = useUpdateProject();
  const addEnvironment = useAddEnvironment();
  const deleteEnvironment = useDeleteEnvironment();

  // Form states
  const [editTimeout, setEditTimeout] = useState(project.default_timeout || 5000);
  const [editBrowserChannel, setEditBrowserChannel] = useState(project.browser_channel || '');
  const [editBrowserArgs, setEditBrowserArgs] = useState('');
  const [browserArgOptions, setBrowserArgOptions] = useState({
    startMaximized: false,
    disableAutomation: false,
    disableInfobars: false,
  });

  // Environment modal
  const [showAddEnvModal, setShowAddEnvModal] = useState(false);
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvBaseUrl, setNewEnvBaseUrl] = useState('');
  const [newEnvDescription, setNewEnvDescription] = useState('');

  // Resources
  const [resources, setResources] = useState<Resource[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load resources
  useEffect(() => {
    if (projectId) {
      resourceApi.list(projectId).then(setResources).catch(() => setResources([]));
    }
  }, [projectId]);

  // Sync form with project data
  useEffect(() => {
    if (project) {
      setEditTimeout(project.default_timeout || 5000);
      setEditBrowserChannel(project.browser_channel || '');

      const args = project.browser_args || [];
      setBrowserArgOptions({
        startMaximized: args.includes(COMMON_BROWSER_ARGS.startMaximized),
        disableAutomation: args.includes(COMMON_BROWSER_ARGS.disableAutomation),
        disableInfobars: args.includes(COMMON_BROWSER_ARGS.disableInfobars),
      });
      const commonArgsValues = Object.values(COMMON_BROWSER_ARGS);
      const customArgs = args.filter((arg: string) => !commonArgsValues.includes(arg as typeof commonArgsValues[number]));
      setEditBrowserArgs(customArgs.join('\n'));
    }
  }, [project]);

  // Save handlers with toast
  const handleSaveTimeout = () => {
    updateProject.mutate(
      { id: projectId, data: { default_timeout: editTimeout } },
      {
        onSuccess: () => toast.success(t.common.save + ' ' + (t as any).settings?.success || 'Settings saved'),
        onError: () => toast.error((t as any).settings?.error || 'Failed to save'),
      }
    );
  };

  const handleSaveBrowserChannel = () => {
    updateProject.mutate(
      { id: projectId, data: { browser_channel: editBrowserChannel } },
      {
        onSuccess: () => toast.success(t.common.save + ' ' + (t as any).settings?.success || 'Settings saved'),
        onError: () => toast.error((t as any).settings?.error || 'Failed to save'),
      }
    );
  };

  const handleSaveBrowserArgs = () => {
    const args: string[] = [];
    if (browserArgOptions.startMaximized) args.push(COMMON_BROWSER_ARGS.startMaximized);
    if (browserArgOptions.disableAutomation) args.push(COMMON_BROWSER_ARGS.disableAutomation);
    if (browserArgOptions.disableInfobars) args.push(COMMON_BROWSER_ARGS.disableInfobars);
    const customArgs = editBrowserArgs.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    args.push(...customArgs);

    updateProject.mutate(
      { id: projectId, data: { browser_args: args } },
      {
        onSuccess: () => toast.success(t.common.save + ' ' + (t as any).settings?.success || 'Settings saved'),
        onError: () => toast.error((t as any).settings?.error || 'Failed to save'),
      }
    );
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
          toast.success((t as any).settings?.envAdded || 'Environment added');
        },
        onError: () => toast.error((t as any).settings?.error || 'Failed to add environment'),
      }
    );
  };

  const handleDeleteEnvironment = (envName: string) => {
    if (confirm(t.common.deleteConfirm)) {
      deleteEnvironment.mutate(
        { projectId, envName },
        {
          onSuccess: () => toast.success((t as any).settings?.envDeleted || 'Environment deleted'),
          onError: () => toast.error((t as any).settings?.error || 'Failed to delete'),
        }
      );
    }
  };

  const handleUploadResource = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const newResource = await resourceApi.upload(projectId, file);
      setResources(prev => [...prev, newResource]);
      toast.success((t as any).resource?.uploaded || 'File uploaded');
    } catch {
      toast.error((t as any).resource?.uploadError || 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteResource = async (resourceId: string) => {
    if (!confirm(t.common.deleteConfirm)) return;
    try {
      await resourceApi.delete(projectId, resourceId);
      setResources(prev => prev.filter(r => r.id !== resourceId));
      toast.success((t as any).resource?.deleted || 'Resource deleted');
    } catch {
      toast.error((t as any).resource?.deleteError || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">{t.project.settings.title}</h2>
        <p className="text-sm text-muted-foreground">{t.project.settings.description}</p>
      </div>

      {/* Settings Cards with Accordion */}
      <Accordion type="multiple" defaultValue={['general', 'browser', 'environments']} className="space-y-4">
        {/* General Settings */}
        <AccordionItem value="general" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <Settings className="h-4 w-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-medium">{(t as any).settings?.general || 'General'}</p>
                <p className="text-xs text-muted-foreground">{(t as any).settings?.generalDesc || 'Basic project configuration'}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 pt-2">
              {/* Default Timeout */}
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{t.project.form.defaultTimeout}</p>
                    <p className="text-xs text-muted-foreground">Default timeout for all actions</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={editTimeout}
                    onChange={(e) => setEditTimeout(Number(e.target.value))}
                    className="w-28 text-right"
                  />
                  <span className="text-sm text-muted-foreground">ms</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveTimeout}
                    disabled={editTimeout === project.default_timeout}
                  >
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Browser Settings */}
        <AccordionItem value="browser" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <Chrome className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">{(t as any).settings?.browser || 'Browser'}</p>
                <p className="text-xs text-muted-foreground">{(t as any).settings?.browserDesc || 'Browser type and launch options'}</p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-4 pt-2">
              {/* Browser Channel */}
              <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{t.project.form.browserChannel}</p>
                    <p className="text-xs text-muted-foreground">{t.project.form.browserChannelDesc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={editBrowserChannel || 'chromium'}
                    onValueChange={(value) => setEditBrowserChannel(value === 'chromium' ? '' : value)}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chromium">{t.project.form.browserOptions.chromium}</SelectItem>
                      <SelectItem value="chrome">{t.project.form.browserOptions.chrome}</SelectItem>
                      <SelectItem value="msedge">{t.project.form.browserOptions.msedge}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveBrowserChannel}
                    disabled={editBrowserChannel === (project.browser_channel || '')}
                  >
                    <Save className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Browser Arguments */}
              <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
                <div>
                  <p className="text-sm font-medium">{t.project.form.browserArgs}</p>
                  <p className="text-xs text-muted-foreground">{t.project.form.browserArgsDesc}</p>
                </div>

                {/* Quick Options */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="flex items-center gap-2 p-3 rounded-lg border bg-background cursor-pointer hover:border-primary transition-colors">
                    <Checkbox
                      checked={browserArgOptions.startMaximized}
                      onCheckedChange={(checked) =>
                        setBrowserArgOptions(prev => ({ ...prev, startMaximized: !!checked }))
                      }
                    />
                    <span className="text-sm">Maximized</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-lg border bg-background cursor-pointer hover:border-primary transition-colors">
                    <Checkbox
                      checked={browserArgOptions.disableAutomation}
                      onCheckedChange={(checked) =>
                        setBrowserArgOptions(prev => ({ ...prev, disableAutomation: !!checked }))
                      }
                    />
                    <span className="text-sm">Hide Automation</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-lg border bg-background cursor-pointer hover:border-primary transition-colors">
                    <Checkbox
                      checked={browserArgOptions.disableInfobars}
                      onCheckedChange={(checked) =>
                        setBrowserArgOptions(prev => ({ ...prev, disableInfobars: !!checked }))
                      }
                    />
                    <span className="text-sm">No Infobars</span>
                  </label>
                </div>

                {/* Custom Args */}
                <div className="space-y-2">
                  <Label className="text-xs">{(t.project.form as any).browserArgsOptions?.customArgs || 'Custom Arguments'}</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder={t.project.form.browserArgsPlaceholder}
                    value={editBrowserArgs}
                    onChange={(e) => setEditBrowserArgs(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button size="sm" onClick={handleSaveBrowserArgs}>
                  <Save className="h-3.5 w-3.5 mr-1" />
                  {t.common.save}
                </Button>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Environments */}
        <AccordionItem value="environments" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500/10">
                <Globe className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">{t.project.environments.title}</p>
                <p className="text-xs text-muted-foreground">
                  {project.environments?.length || 0} {(t as any).settings?.configured || 'configured'}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="ml-auto mr-2">
              {project.environments?.length || 0}
            </Badge>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 pt-2">
              {project.environments && project.environments.length > 0 ? (
                <div className="space-y-2">
                  {project.environments.map((env, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 group hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                          <Globe className="h-4 w-4 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{env.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{env.base_url}</p>
                        </div>
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
                <div className="text-center py-6 text-muted-foreground text-sm">
                  {t.project.environments.noEnvs}
                </div>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowAddEnvModal(true)}>
                <Plus className="h-4 w-4 mr-1" />
                {t.project.environments.add}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Resources */}
        <AccordionItem value="resources" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
                <FolderCog className="h-4 w-4 text-orange-500" />
              </div>
              <div className="text-left">
                <p className="font-medium">{(t as any).resource?.title || 'Resources'}</p>
                <p className="text-xs text-muted-foreground">
                  {(t as any).resource?.description || 'Files for test scenarios'}
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="ml-auto mr-2">
              {resources.length}
            </Badge>
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="space-y-3 pt-2">
              {resources.length > 0 ? (
                <div className="space-y-2">
                  {resources.map((res) => (
                    <div
                      key={res.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 group hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <File className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{res.original_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(res.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteResource(res.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  {(t as any).resource?.noResources || 'No resources uploaded'}
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadResource}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4 mr-1" />
                {isUploading
                  ? (t as any).resource?.uploading || 'Uploading...'
                  : (t as any).resource?.upload || 'Upload File'}
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

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
