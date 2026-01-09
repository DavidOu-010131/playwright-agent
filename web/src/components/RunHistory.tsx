import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Clock, ChevronRight, ChevronDown, ChevronUp, Image, RefreshCw, Loader2, Globe, Terminal } from 'lucide-react';
import { runnerApi } from '../api';
import { useI18n } from '../i18n';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface NetworkRequestInfo {
  url: string;
  method: string;
  status?: number;
  duration_ms: number;
  response_size?: number;
  error?: string;
}

interface StepDetail {
  index: number;
  action: string;
  status: string;
  selector?: string;
  error?: string;
  duration_ms?: number;
  screenshot?: string;
  network_requests?: NetworkRequestInfo[];
  logs?: string[];
}

interface RunSummary {
  run_id: string;
  status: string;
  goal: string;
  project_id?: string;
  scenario_id?: string;
  start_time?: string;
  end_time?: string;
  total_duration_ms: number;
  steps_count: number;
  artifact_dir?: string;
}

interface RunDetail {
  run_id: string;
  status: string;
  goal: string;
  steps: StepDetail[];
  total_duration_ms: number;
  video_path?: string;
}

interface RunHistoryProps {
  projectId?: string;
}

export default function RunHistory({ projectId }: RunHistoryProps) {
  const { t } = useI18n();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [expandedStepIndex, setExpandedStepIndex] = useState<number | null>(null);

  const { data: runs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['runs', projectId],
    queryFn: () => runnerApi.list(projectId) as Promise<RunSummary[]>,
    refetchInterval: 30000,
  });

  const { data: runDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['run', selectedRunId],
    queryFn: () => runnerApi.getResult(selectedRunId!) as Promise<RunDetail>,
    enabled: !!selectedRunId,
  });

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="outline" className="text-green-600 border-green-300">{t.runner.results.status.success}</Badge>;
      case 'failed':
        return <Badge variant="outline" className="text-red-600 border-red-300">{t.runner.results.status.failed}</Badge>;
      case 'running':
        return <Badge variant="outline" className="text-blue-600 border-blue-300">{t.runner.results.status.running}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  const handleDialogClose = () => {
    setSelectedRunId(null);
    setExpandedStepIndex(null);
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

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        {t.runner.history.loading}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">
          {t.runner.history.totalRecords.replace('{count}', String(runs?.length || 0))}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
          {t.runner.history.refresh}
        </Button>
      </div>

      {/* Runs List */}
      <div className="flex-1 overflow-auto border rounded-lg">
        {runs && runs.length > 0 ? (
          <div className="divide-y">
            {runs.map((run) => (
              <div
                key={run.run_id}
                className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => setSelectedRunId(run.run_id)}
              >
                {getStatusIcon(run.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={run.goal}>
                    {run.goal || run.run_id}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(run.start_time)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm">{run.steps_count} 步</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDuration(run.total_duration_ms)}
                  </p>
                </div>
                {getStatusBadge(run.status)}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            {t.runner.history.noHistory}
          </div>
        )}
      </div>

      {/* Run Detail Dialog */}
      <Dialog open={!!selectedRunId} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {runDetail && getStatusIcon(runDetail.status)}
              {t.runner.history.runDetails}
            </DialogTitle>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="flex-1 flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              {t.runner.history.loading}
            </div>
          ) : runDetail ? (
            <div className="flex-1 overflow-auto space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4 p-3 bg-muted/30 rounded-lg text-sm">
                <div>
                  <span className="text-muted-foreground">{t.runner.history.status}</span>
                  <div className="mt-1">{getStatusBadge(runDetail.status)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.runner.history.duration}</span>
                  <p className="mt-1 font-medium">{formatDuration(runDetail.total_duration_ms)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">{t.runner.history.stepsCount}</span>
                  <p className="mt-1 font-medium">{runDetail.steps?.length || 0}</p>
                </div>
              </div>

              {/* Goal */}
              <div className="text-sm">
                <span className="text-muted-foreground">{t.runner.history.goal}: </span>
                <span>{runDetail.goal || '-'}</span>
              </div>

              {/* Steps with expandable network requests */}
              <div className="border rounded-lg divide-y">
                {runDetail.steps?.map((step, index) => (
                  <div key={index}>
                    {/* Step Row */}
                    <div
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors ${
                        expandedStepIndex === index ? 'bg-muted/20' : ''
                      }`}
                      onClick={() => handleStepClick(index)}
                    >
                      {getStatusIcon(step.status)}
                      <span className="text-muted-foreground text-sm w-6">#{index + 1}</span>
                      <Badge variant="outline" className="font-mono">
                        {step.action}
                      </Badge>
                      <span className="flex-1 text-sm truncate text-muted-foreground">
                        {step.selector}
                      </span>
                      {step.network_requests && step.network_requests.length > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          <Globe className="h-3 w-3" />
                          {step.network_requests.length}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(step.duration_ms)}
                      </span>
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

              {/* Video Link */}
              {runDetail.video_path && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedVideo(runDetail.video_path!)}
                  >
                    {t.runner.history.viewVideo}
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

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
