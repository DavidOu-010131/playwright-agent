import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Project & Environment types
export interface Environment {
  name: string;
  base_url: string;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  default_timeout: number;
  environments: Environment[];
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  default_timeout?: number;
  environments?: Environment[];
}

// UI Map types
export interface ElementLocator {
  primary: string;
  fallbacks: string[];
  description?: string;
}

export interface UIMap {
  id: string;
  name: string;
  project_id?: string;
  elements: Record<string, ElementLocator>;
  created_at: string;
  updated_at: string;
}

export interface UIMapCreate {
  name: string;
  project_id?: string;
  elements?: Record<string, ElementLocator>;
}

// Runner types
export interface StepResult {
  index: number;
  action: string;
  status: 'success' | 'failed' | 'skipped';
  selector?: string;
  error?: string;
  duration_ms: number;
  screenshot?: string;
}

export interface RunResult {
  run_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  goal: string;
  steps: StepResult[];
  artifact_dir: string;
  total_duration_ms: number;
  start_time?: string;
  end_time?: string;
  video_path?: string;
}

export interface RunRequest {
  ui_map_id: string;
  steps: Array<{ action: string; target?: string; url?: string; value?: string }>;
  goal?: string;
  timeout?: number;
  headed?: boolean;
}

export interface QuickRunRequest {
  url: string;
  ui_map_id?: string;
  steps?: Array<{ action: string; target?: string; value?: string }>;
  timeout?: number;
  headed?: boolean;
}

// Scenario types
export interface Step {
  action: string;
  target?: string;
  url?: string;
  value?: string;
  timeout?: number;
  // Step options
  continue_on_error?: boolean;  // Continue executing remaining steps if this step fails
  optional?: boolean;           // If fails, don't mark the whole run as failed
}

export interface Scenario {
  id: string;
  name: string;
  project_id: string;
  description?: string;
  ui_map_id?: string;
  steps: Step[];
  created_at: string;
  updated_at: string;
}

export interface ScenarioCreate {
  name: string;
  project_id: string;
  description?: string;
  ui_map_id?: string;
  steps?: Step[];
}

// Project API
export const projectApi = {
  list: () => api.get<Project[]>('/projects').then((res) => res.data),

  get: (id: string) => api.get<Project>(`/projects/${id}`).then((res) => res.data),

  create: (data: ProjectCreate) =>
    api.post<Project>('/projects', data).then((res) => res.data),

  update: (id: string, data: Partial<ProjectCreate>) =>
    api.put<Project>(`/projects/${id}`, data).then((res) => res.data),

  delete: (id: string) => api.delete(`/projects/${id}`).then((res) => res.data),

  addEnvironment: (projectId: string, env: Environment) =>
    api.post<Project>(`/projects/${projectId}/environments`, env).then((res) => res.data),

  deleteEnvironment: (projectId: string, envName: string) =>
    api.delete<Project>(`/projects/${projectId}/environments/${envName}`).then((res) => res.data),
};

// UI Map API
export const uiMapApi = {
  list: (projectId?: string) =>
    api.get<UIMap[]>('/ui-map', { params: projectId ? { project_id: projectId } : {} }).then((res) => res.data),

  get: (id: string) => api.get<UIMap>(`/ui-map/${id}`).then((res) => res.data),

  create: (data: UIMapCreate) =>
    api.post<UIMap>('/ui-map', data).then((res) => res.data),

  update: (id: string, data: Partial<UIMapCreate>) =>
    api.put<UIMap>(`/ui-map/${id}`, data).then((res) => res.data),

  delete: (id: string) => api.delete(`/ui-map/${id}`).then((res) => res.data),

  addElement: (uiMapId: string, elementName: string, element: ElementLocator) =>
    api
      .post<UIMap>(`/ui-map/${uiMapId}/elements/${elementName}`, element)
      .then((res) => res.data),

  deleteElement: (uiMapId: string, elementName: string) =>
    api
      .delete<UIMap>(`/ui-map/${uiMapId}/elements/${elementName}`)
      .then((res) => res.data),
};

// Runner API
export const runnerApi = {
  start: (data: RunRequest) =>
    api.post<RunResult>('/runner/start', data).then((res) => res.data),

  quickRun: (data: QuickRunRequest) =>
    api.post<RunResult>('/runner/quick', data).then((res) => res.data),

  getStatus: (runId: string) =>
    api.get(`/runner/status/${runId}`).then((res) => res.data),

  getResult: (runId: string) =>
    api.get<RunResult>(`/runner/result/${runId}`).then((res) => res.data),

  list: (projectId?: string) =>
    api.get<Array<{ run_id: string; status: string; goal: string; project_id?: string; scenario_id?: string; start_time: string; total_duration_ms: number }>>('/runner/list', { params: projectId ? { project_id: projectId } : {} }).then((res) => res.data),

  cancel: (runId: string) =>
    api.post(`/runner/cancel/${runId}`).then((res) => res.data),
};

// Scenario API
export const scenarioApi = {
  list: (projectId?: string) =>
    api.get<Scenario[]>('/scenarios', { params: projectId ? { project_id: projectId } : {} }).then((res) => res.data),

  get: (id: string) => api.get<Scenario>(`/scenarios/${id}`).then((res) => res.data),

  create: (data: ScenarioCreate) =>
    api.post<Scenario>('/scenarios', data).then((res) => res.data),

  update: (id: string, data: Partial<ScenarioCreate>) =>
    api.put<Scenario>(`/scenarios/${id}`, data).then((res) => res.data),

  delete: (id: string) => api.delete(`/scenarios/${id}`).then((res) => res.data),

  addStep: (scenarioId: string, step: Step) =>
    api.post<Scenario>(`/scenarios/${scenarioId}/steps`, step).then((res) => res.data),

  updateStep: (scenarioId: string, stepIndex: number, step: Step) =>
    api.put<Scenario>(`/scenarios/${scenarioId}/steps/${stepIndex}`, step).then((res) => res.data),

  deleteStep: (scenarioId: string, stepIndex: number) =>
    api.delete<Scenario>(`/scenarios/${scenarioId}/steps/${stepIndex}`).then((res) => res.data),
};

export default api;

// Documentation types
export interface DocFile {
  name: string;
  title: string;
}

export interface DocContent {
  name: string;
  title: string;
  content: string;
}

// Documentation API
export const docsApi = {
  list: () => api.get<DocFile[]>('/docs').then((res) => res.data),

  get: (name: string) => api.get<DocContent>(`/docs/${name}`).then((res) => res.data),
};
