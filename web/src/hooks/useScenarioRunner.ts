import { useState, useCallback, useRef } from 'react';

export interface NetworkRequestInfo {
  url: string;
  method: string;
  status?: number;
  duration_ms: number;
  response_size?: number;
  error?: string;
}

export interface StepProgress {
  index: number;
  action: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  selector?: string;
  error?: string;
  duration_ms?: number;
  screenshot?: string;
  network_requests?: NetworkRequestInfo[];
}

export interface RunConfig {
  headed: boolean;
  record_video: boolean;
  timeout: number;
  environment_base_url?: string;
}

export interface RunResult {
  run_id: string;
  status: string;
  total_duration_ms: number;
  artifact_dir: string;
  video_path?: string;
  steps: StepProgress[];
}

export type RunnerStatus = 'idle' | 'connecting' | 'running' | 'completed' | 'failed' | 'error';

export function useScenarioRunner() {
  const [status, setStatus] = useState<RunnerStatus>('idle');
  const [steps, setSteps] = useState<StepProgress[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const statusRef = useRef<RunnerStatus>('idle');

  // Keep statusRef in sync
  statusRef.current = status;

  const runScenario = useCallback((scenarioId: string, config: RunConfig) => {
    // Reset state
    setStatus('connecting');
    setSteps([]);
    setCurrentStepIndex(-1);
    setResult(null);
    setError(null);

    // Determine WebSocket URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/api/runner/ws/scenario/${scenarioId}`;

    console.log('[Runner] Connecting to:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[Runner] WebSocket connected, sending config');
      // Send configuration
      ws.send(JSON.stringify({
        headed: config.headed,
        record_video: config.record_video,
        timeout: config.timeout,
        environment_base_url: config.environment_base_url,
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('[Runner] Message received:', data.type, data);

      switch (data.type) {
        case 'start':
          setStatus('running');
          // Initialize steps as pending
          const initialSteps: StepProgress[] = data.steps.map((step: any, index: number) => ({
            index,
            action: step.action,
            status: 'pending' as const,
            selector: step.target || step.url,
          }));
          setSteps(initialSteps);
          break;

        case 'step_start':
          setCurrentStepIndex(data.index);
          setSteps(prev => prev.map((s, i) =>
            i === data.index ? { ...s, status: 'running' as const } : s
          ));
          break;

        case 'step_end':
          setSteps(prev => prev.map((s, i) =>
            i === data.step.index ? {
              ...s,
              status: data.step.status as 'success' | 'failed',
              selector: data.step.selector,
              error: data.step.error,
              duration_ms: data.step.duration_ms,
              screenshot: data.step.screenshot,
              network_requests: data.step.network_requests,
            } : s
          ));
          break;

        case 'complete':
          setStatus(data.result.status === 'completed' ? 'completed' : 'failed');
          setResult(data.result);
          setCurrentStepIndex(-1);
          break;

        case 'error':
          setStatus('error');
          setError(data.message);
          break;
      }
    };

    ws.onerror = (e) => {
      console.error('[Runner] WebSocket error:', e);
      setStatus('error');
      setError('WebSocket connection error');
    };

    ws.onclose = (e) => {
      console.log('[Runner] WebSocket closed:', e.code, e.reason);
      // Use ref to get current status
      const currentStatus = statusRef.current;
      if (currentStatus === 'running' || currentStatus === 'connecting') {
        setStatus('error');
        setError('Connection closed unexpectedly');
      }
    };
  }, []);

  const reset = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('idle');
    setSteps([]);
    setCurrentStepIndex(-1);
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    steps,
    currentStepIndex,
    result,
    error,
    runScenario,
    reset,
  };
}
