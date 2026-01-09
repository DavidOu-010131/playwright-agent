import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scenarioApi, type ScenarioCreate, type Step } from '../api';

export function useScenarios(projectId?: string) {
  return useQuery({
    queryKey: ['scenarios', projectId],
    queryFn: () => scenarioApi.list(projectId),
  });
}

export function useScenario(id?: string) {
  return useQuery({
    queryKey: ['scenario', id],
    queryFn: () => scenarioApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ScenarioCreate) => scenarioApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
    },
  });
}

export function useUpdateScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ScenarioCreate> }) =>
      scenarioApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      queryClient.invalidateQueries({ queryKey: ['scenario', id] });
    },
  });
}

export function useDeleteScenario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scenarioApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scenarios'] });
    },
  });
}

export function useAddStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scenarioId, step }: { scenarioId: string; step: Step }) =>
      scenarioApi.addStep(scenarioId, step),
    onSuccess: (_, { scenarioId }) => {
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId] });
    },
  });
}

export function useUpdateStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      scenarioId,
      stepIndex,
      step,
    }: {
      scenarioId: string;
      stepIndex: number;
      step: Step;
    }) => scenarioApi.updateStep(scenarioId, stepIndex, step),
    onSuccess: (_, { scenarioId }) => {
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId] });
    },
  });
}

export function useDeleteStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      scenarioId,
      stepIndex,
    }: {
      scenarioId: string;
      stepIndex: number;
    }) => scenarioApi.deleteStep(scenarioId, stepIndex),
    onSuccess: (_, { scenarioId }) => {
      queryClient.invalidateQueries({ queryKey: ['scenario', scenarioId] });
    },
  });
}
