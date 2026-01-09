import { useState } from 'react';
import { PlayCircle, CheckCircle, XCircle, Clock, Loader2, Image, History, Zap, Globe, ChevronDown, ChevronUp, Video, Terminal } from 'lucide-react';
import { useScenarioRunner, type StepProgress, type NetworkRequestInfo } from '../hooks/useScenarioRunner';
import { useI18n } from '../i18n';
import type { Scenario, Project } from '../api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import RunHistory from './RunHistory';

interface RunnerPanelProps {
  project: Project;
  scenarios: Scenario[];
}

export default function RunnerPanel({ project, scenarios }: RunnerPanelProps) {
  const { t } = useI18n();
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('');
  const [selectedEnvName, setSelectedEnvName] = useState<string>('');
  const [headedMode, setHeadedMode] = useState(false);
  const [recordVideo, setRecordVideo] = useState(false);
  const [activeTab, setActiveTab] = useState<'realtime' | 'history'>('realtime');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [expandedStepIndex, setExpandedStepIndex] = useState<number | null>(null);

  const {
    status,
    steps,
    currentStepIndex,
    result,
    error,
    runScenario,
    reset,
  } = useScenarioRunner();

  const selectedScenario = scenarios.find(s => s.id === selectedScenarioId);
  const selectedEnv = project.environments?.find(e => e.name === selectedEnvName);

  const handleRun = () => {
    if (!selectedScenarioId) return;
    runScenario(selectedScenarioId, {
      headed: headedMode,
      record_video: recordVideo,
      timeout: project.default_timeout || 5000,
      environment_base_url: selectedEnv?.base_url,
    });
    setActiveTab('realtime');
    setExpandedStepIndex(null);
  };

  const isRunning = status === 'running' || status === 'connecting';

  const getStepIcon = (step: StepProgress) => {
    switch (step.status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getStatusColor = (status?: number) => {
    if (!status) return 'text-muted-foreground';
    if (status >= 200 && status < 300) return 'text-green-600';
    if (status >= 300 && status < 400) return 'text-yellow-600';
    if (status >= 400 && status < 500) return 'text-orange-600';
    if (status >= 500) return 'text-red-600';
    return 'text-muted-foreground';
  };

  const getMethodColor = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'POST': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'PUT': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'DELETE': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  // Convert screenshot path to URL
  const getScreenshotUrl = (path: string) => {
    const match = path.match(/artifacts[\/\\](.+)/);
    if (match) {
      return `/artifacts/${match[1]}`;
    }
    return path;
  };

  const handleStepClick = (index: number) => {
    if (expandedStepIndex === index) {
      setExpandedStepIndex(null);
    } else {
      setExpandedStepIndex(index);
    }
  };

  const renderNetworkRequests = (requests?: NetworkRequestInfo[]) => {
    if (!requests || requests.length === 0) {
      return (
        <div className="text-sm text-muted-foreground py-2 text-center">
          {t.runner.noNetworkRequests}
        </div>
      );
    }

    return (
      <div className="divide-y border rounded-md bg-muted/20">
        {requests.map((req, idx) => (
          <div key={idx} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted/30">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${getMethodColor(req.method)}`}>
              {req.method}
            </span>
            <span className={`font-mono font-medium w-10 text-center ${getStatusColor(req.status)}`}>
              {req.status || '-'}
            </span>
            <span className="flex-1 truncate font-mono text-muted-foreground" title={req.url}>
              {req.url}
            </span>
            <span className="text-muted-foreground w-14 text-right">
              {formatDuration(req.duration_ms)}
            </span>
            <span className="text-muted-foreground w-14 text-right">
              {formatSize(req.response_size)}
            </span>
            {req.error && (
              <span className="text-red-500 truncate max-w-[100px]" title={req.error}>
                {req.error}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderLogs = (logs?: string[]) => {
    if (!logs || logs.length === 0) {
      return (
        <div className="text-sm text-muted-foreground py-2 text-center">
          {t.runner.noLogs}
        </div>
      );
    }

    return (
      <div className="border rounded-md bg-muted/20 font-mono text-xs">
        {logs.map((log, idx) => (
          <div key={idx} className="px-3 py-1.5 border-b last:border-b-0 text-muted-foreground hover:bg-muted/30">
            <span className="text-muted-foreground/60 mr-2">[{idx + 1}]</span>
            {log}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-3 gap-6 h-full">
      {/* Left Column: Configuration */}
      <div className="col-span-1 space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t.runner.runConfig}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Scenario *</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                disabled={isRunning}
              >
                <option value="">{t.runner.selectScenario}</option>
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Environment</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedEnvName}
                onChange={(e) => setSelectedEnvName(e.target.value)}
                disabled={isRunning}
              >
                <option value="">{t.runner.noEnv}</option>
                {project.environments?.map((env) => (
                  <option key={env.name} value={env.name}>
                    {env.name}
                  </option>
                ))}
              </select>
              {selectedEnvName && selectedEnv && (
                <p className="text-xs text-muted-foreground truncate" title={selectedEnv.base_url}>
                  {selectedEnv.base_url}
                </p>
              )}
            </div>

            <div className="space-y-3 pt-2">
              <Label>{t.runner.runOptions}</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="headed-runner"
                  checked={headedMode}
                  onChange={(e) => setHeadedMode(e.target.checked)}
                  disabled={isRunning}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="headed-runner" className="text-sm">{t.runner.headedMode}</label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="record-runner"
                  checked={recordVideo}
                  onChange={(e) => setRecordVideo(e.target.checked)}
                  disabled={isRunning}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <label htmlFor="record-runner" className="text-sm">{t.runner.recordVideo}</label>
              </div>
            </div>

            {selectedScenario && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t.runner.stepCount}</span>
                  <span>{selectedScenario.steps?.length || 0}{selectedEnvName ? ' +1' : ''}</span>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              disabled={!selectedScenarioId || isRunning}
              onClick={handleRun}
            >
              {isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.runner.running}
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {t.runner.runTest}
                </>
              )}
            </Button>

            {(status === 'completed' || status === 'failed' || status === 'error') && (
              <Button variant="outline" className="w-full" onClick={reset}>
                {t.runner.reset}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Quick Status */}
        {status !== 'idle' && (
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                {status === 'running' && <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />}
                {status === 'completed' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {status === 'failed' && <XCircle className="h-5 w-5 text-red-500" />}
                {status === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
                <div>
                  <p className="font-medium">
                    {status === 'connecting' && t.runner.connecting}
                    {status === 'running' && t.runner.running}
                    {status === 'completed' && t.runner.runCompleted}
                    {status === 'failed' && t.runner.runFailed}
                    {status === 'error' && t.runner.errorOccurred}
                  </p>
                  {result && (
                    <p className="text-sm text-muted-foreground">
                      {formatDuration(result.total_duration_ms)}
                    </p>
                  )}
                  {error && (
                    <p className="text-sm text-red-500">{error}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right Column: Execution / History */}
      <div className="col-span-2">
        <Card className="h-full flex flex-col">
          <CardHeader className="pb-0">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'realtime' | 'history')}>
              <TabsList>
                <TabsTrigger value="realtime" className="gap-2">
                  <Zap className="h-4 w-4" />
                  {t.runner.realtimeExec}
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  {t.runner.historyTab}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden pt-4">
            {activeTab === 'realtime' ? (
              <div className="h-full flex flex-col gap-4">
                {/* Steps List */}
                <div className="flex-1 overflow-auto border rounded-lg">
                  {steps.length > 0 ? (
                    <div className="divide-y">
                      {steps.map((step, index) => (
                        <div key={index}>
                          {/* Step Row */}
                          <div
                            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                              currentStepIndex === index ? 'bg-blue-50 dark:bg-blue-950/30' : ''
                            } ${expandedStepIndex === index ? 'bg-muted/30' : ''}`}
                            onClick={() => handleStepClick(index)}
                          >
                            {getStepIcon(step)}
                            <span className="text-muted-foreground text-sm w-8">#{index + 1}</span>
                            <Badge variant="outline" className="font-mono">
                              {step.action}
                            </Badge>
                            {step.name && (
                              <span className="font-medium text-sm">{step.name}</span>
                            )}
                            <span className="flex-1 text-sm truncate text-muted-foreground">
                              {step.selector}
                            </span>
                            {step.network_requests && step.network_requests.length > 0 && (
                              <Badge variant="secondary" className="gap-1">
                                <Globe className="h-3 w-3" />
                                {step.network_requests.length}
                              </Badge>
                            )}
                            {step.duration_ms !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {formatDuration(step.duration_ms)}
                              </span>
                            )}
                            {step.screenshot && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedScreenshot(step.screenshot!);
                                }}
                              >
                                <Image className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            )}
                            {step.error && (
                              <span className="text-xs text-red-500 truncate max-w-[150px]" title={step.error}>
                                {step.error}
                              </span>
                            )}
                            {expandedStepIndex === index ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>

                          {/* Step Details Panel (Expanded) */}
                          {expandedStepIndex === index && (
                            <div className="px-4 pb-3 bg-muted/10 space-y-3">
                              {/* Logs */}
                              <div>
                                <div className="flex items-center gap-2 py-2 text-sm font-medium">
                                  <Terminal className="h-4 w-4" />
                                  {t.runner.logs} ({step.logs?.length || 0})
                                </div>
                                {renderLogs(step.logs)}
                              </div>

                              {/* Network Requests */}
                              <div>
                                <div className="flex items-center gap-2 py-2 text-sm font-medium">
                                  <Globe className="h-4 w-4" />
                                  {t.runner.networkRequests} ({step.network_requests?.length || 0})
                                </div>
                                {renderNetworkRequests(step.network_requests)}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      {status === 'idle' ? t.runner.selectScenarioToRun : t.runner.waitingForSteps}
                    </div>
                  )}
                </div>

                {/* Video Preview Button */}
                {result?.video_path && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedVideo(result.video_path!)}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      {t.runner.history.viewVideo}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <RunHistory projectId={project.id} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Screenshot Preview Dialog */}
      <Dialog open={!!selectedScreenshot} onOpenChange={() => setSelectedScreenshot(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t.runner.screenshotPreview}</DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <div className="max-h-[80vh] overflow-auto">
              <img
                src={getScreenshotUrl(selectedScreenshot)}
                alt="Step screenshot"
                className="max-w-full h-auto"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t.runner.history.video}</DialogTitle>
          </DialogHeader>
          {selectedVideo && (
            <div className="max-h-[80vh] overflow-auto">
              <video
                src={getScreenshotUrl(selectedVideo)}
                controls
                autoPlay
                className="w-full h-auto"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
