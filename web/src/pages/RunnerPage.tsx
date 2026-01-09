import { useState, useMemo } from 'react';
import { Play, Clock, CheckCircle, XCircle, Loader2, Trash2, Plus, Zap } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { runnerApi, type StepResult } from '../api';
import { useUIMaps, useUIMap } from '../hooks/useUIMap';
import { useProjects } from '../hooks/useProject';
import { useI18n } from '../i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

type Step = { action: string; target?: string; url?: string; value?: string };

type RunHistoryItem = {
  run_id: string;
  status: string;
  goal: string;
  project_id?: string;
  scenario_id?: string;
  start_time: string;
  total_duration_ms: number;
};

export default function RunnerPage() {
  const { t } = useI18n();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedEnvName, setSelectedEnvName] = useState<string>('');
  const [url, setUrl] = useState('');
  const [selectedUIMapId, setSelectedUIMapId] = useState<string>('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [headed, setHeaded] = useState(false);
  const [result, setResult] = useState<{
    run_id: string;
    status: string;
    steps: StepResult[];
    total_duration_ms: number;
    artifact_dir: string;
  } | null>(null);

  const { data: projects } = useProjects();
  const { data: uiMaps } = useUIMaps(selectedProjectId || undefined);
  const { data: selectedUIMap } = useUIMap(selectedUIMapId || '');
  const { data: runHistory, refetch: refetchHistory } = useQuery<RunHistoryItem[]>({
    queryKey: ['run-history', selectedProjectId],
    queryFn: () => runnerApi.list(selectedProjectId || undefined),
  });

  const selectedProject = useMemo(
    () => projects?.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const selectedEnv = useMemo(
    () => selectedProject?.environments.find((e) => e.name === selectedEnvName),
    [selectedProject, selectedEnvName]
  );

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedEnvName('');
    setSelectedUIMapId('');
    const project = projects?.find((p) => p.id === projectId);
    if (project?.environments.length) {
      setSelectedEnvName(project.environments[0].name);
      setUrl(project.environments[0].base_url);
    } else {
      setUrl('');
    }
  };

  const handleEnvChange = (envName: string) => {
    setSelectedEnvName(envName);
    const env = selectedProject?.environments.find((e) => e.name === envName);
    if (env) {
      setUrl(env.base_url);
    }
  };

  const quickRunMutation = useMutation({
    mutationFn: runnerApi.quickRun,
    onSuccess: (data) => {
      setResult(data);
      refetchHistory();
    },
  });

  const handleQuickRun = () => {
    if (!url) return;
    quickRunMutation.mutate({
      url,
      ui_map_id: selectedUIMapId || undefined,
      steps,
      headed,
    });
  };

  const handleAddStep = () => {
    setSteps([...steps, { action: 'click', target: '' }]);
  };

  const handleUpdateStep = (index: number, field: keyof Step, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setSteps(newSteps);
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const isRunning = quickRunMutation.isPending;

  return (
    <div className="flex h-full min-h-0 gap-6">
      {/* Left: Configuration */}
      <Card className="w-1/2 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            {t.runner.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-auto space-y-6">
          {/* Project & Environment Selection */}
          <div className="p-4 rounded-lg border bg-muted/50">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
              {t.runner.selectProjectEnv}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.runner.project}</Label>
                <Select
                  value={selectedProjectId || 'none'}
                  onValueChange={(v) => handleProjectChange(v === 'none' ? '' : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.runner.noProject} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.runner.noProject}</SelectItem>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.runner.environment}</Label>
                <Select
                  value={selectedEnvName || 'none'}
                  onValueChange={(v) => handleEnvChange(v === 'none' ? '' : v)}
                  disabled={!selectedProject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.runner.selectEnv} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t.runner.selectEnv}</SelectItem>
                    {selectedProject?.environments.map((env) => (
                      <SelectItem key={env.name} value={env.name}>
                        {env.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedEnv && (
              <div className="mt-3 px-3 py-2 rounded-md bg-primary/10 text-sm">
                <span className="text-muted-foreground">Base URL:</span>
                <span className="ml-2 font-mono">{selectedEnv.base_url}</span>
              </div>
            )}
          </div>

          {/* Run Configuration */}
          <div className="space-y-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t.runner.runConfig}
            </h3>

            <div className="space-y-2">
              <Label>{t.runner.targetUrl}</Label>
              <Input
                placeholder={t.runner.targetUrlPlaceholder}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              {selectedEnv && url && !url.startsWith('http') && (
                <p className="text-xs text-muted-foreground">
                  {t.runner.fullUrl}: <span className="font-mono text-primary">{selectedEnv.base_url}{url.startsWith('/') ? '' : '/'}{url}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t.runner.selectUIMap}</Label>
              <Select
                value={selectedUIMapId || 'none'}
                onValueChange={(v) => setSelectedUIMapId(v === 'none' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.runner.noUIMap} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.runner.noUIMap}</SelectItem>
                  {uiMaps?.map((uiMap) => (
                    <SelectItem key={uiMap.id} value={uiMap.id}>
                      {uiMap.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                id="headed"
                checked={headed}
                onCheckedChange={(checked) => setHeaded(checked === true)}
              />
              <Label htmlFor="headed" className="cursor-pointer">
                {t.runner.headedMode}
              </Label>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t.runner.steps.title}
              </h3>
              <Button variant="ghost" size="sm" onClick={handleAddStep}>
                <Plus className="h-4 w-4 mr-1" />
                {t.runner.steps.add}
              </Button>
            </div>

            {steps.length === 0 ? (
              <div className="py-8 text-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">{t.runner.steps.noSteps}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {steps.map((step, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 rounded-lg border"
                  >
                    <span className="text-sm text-muted-foreground w-6 font-mono">{index + 1}</span>
                    <Select
                      value={step.action}
                      onValueChange={(v) => handleUpdateStep(index, 'action', v)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="click">{t.runner.actions.click}</SelectItem>
                        <SelectItem value="type">{t.runner.actions.type}</SelectItem>
                        <SelectItem value="fill">{t.runner.actions.fill}</SelectItem>
                        <SelectItem value="wait_for">{t.runner.actions.wait_for}</SelectItem>
                        <SelectItem value="assert_text">{t.runner.actions.assert_text}</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedUIMap && Object.keys(selectedUIMap.elements).length > 0 ? (
                      <Select
                        value={step.target || 'none'}
                        onValueChange={(v) => handleUpdateStep(index, 'target', v === 'none' ? '' : v)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder={t.runner.steps.selectElement} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t.runner.steps.selectElement}</SelectItem>
                          {Object.keys(selectedUIMap.elements).map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder={t.runner.steps.targetPlaceholder}
                        value={step.target || ''}
                        onChange={(e) => handleUpdateStep(index, 'target', e.target.value)}
                        className="flex-1"
                      />
                    )}
                    {(step.action === 'type' ||
                      step.action === 'fill' ||
                      step.action === 'assert_text') && (
                      <Input
                        placeholder={t.runner.steps.valuePlaceholder}
                        value={step.value || ''}
                        onChange={(e) => handleUpdateStep(index, 'value', e.target.value)}
                        className="w-28"
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleRemoveStep(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Run Button */}
          <Button
            onClick={handleQuickRun}
            disabled={!url || isRunning}
            className="w-full"
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t.runner.running}
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                {t.runner.run}
              </>
            )}
          </Button>

          {/* Run History */}
          <div className="pt-4 border-t">
            <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
              {t.runner.history.title}
            </h3>
            {runHistory && runHistory.length > 0 ? (
              <div className="space-y-2">
                {runHistory.slice(0, 3).map((run) => (
                  <div
                    key={run.run_id}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {run.status === 'completed' ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : run.status === 'failed' ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="text-sm font-mono">{run.run_id.slice(0, 8)}</span>
                    </div>
                    <span className="text-xs font-mono text-muted-foreground">{run.total_duration_ms}ms</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{t.runner.history.noHistory}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Right: Results */}
      <Card className="w-1/2">
        <CardHeader>
          <CardTitle className="text-sm font-medium uppercase tracking-wide">
            {t.runner.results.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          {result ? (
            <div className="space-y-4">
              {/* Status Header */}
              <div className={`p-4 rounded-lg border ${
                result.status === 'completed'
                  ? 'bg-green-500/10 border-green-500/20'
                  : result.status === 'failed'
                  ? 'bg-destructive/10 border-destructive/20'
                  : 'bg-primary/10 border-primary/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {result.status === 'completed' ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : result.status === 'failed' ? (
                      <XCircle className="h-6 w-6 text-destructive" />
                    ) : (
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    )}
                    <div>
                      <Badge variant={result.status === 'completed' ? 'default' : result.status === 'failed' ? 'destructive' : 'secondary'}>
                        {result.status.toUpperCase()}
                      </Badge>
                      <p className="text-sm text-muted-foreground font-mono mt-1">{result.run_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-semibold">{result.total_duration_ms}</span>
                    <span className="text-sm text-muted-foreground ml-1">ms</span>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-2">
                {result.steps.map((step) => (
                  <div
                    key={step.index}
                    className={`p-4 rounded-lg border ${
                      step.status === 'success'
                        ? 'bg-green-500/5 border-green-500/10'
                        : 'bg-destructive/5 border-destructive/10'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {step.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="font-medium">
                          {t.runner.results.step} {step.index + 1}
                        </span>
                        <Badge variant="secondary" className="font-mono text-xs">
                          {step.action}
                        </Badge>
                      </div>
                      <span className="text-sm font-mono text-muted-foreground">{step.duration_ms}ms</span>
                    </div>
                    {step.selector && (
                      <code className="text-xs font-mono bg-muted px-2 py-1 rounded block mt-2">
                        {step.selector}
                      </code>
                    )}
                    {step.error && (
                      <p className="text-sm text-destructive mt-2">{step.error}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* Artifact Path */}
              <div className="p-3 rounded-lg border">
                <span className="text-xs text-muted-foreground">{t.runner.results.screenshotDir}</span>
                <code className="block text-sm font-mono mt-1">{result.artifact_dir}</code>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted mb-4">
                <Play className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">{t.runner.results.waitingForRun}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
