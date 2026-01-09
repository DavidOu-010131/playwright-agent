import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { uiMapApi, type UIMapCreate, type ElementLocator } from '../api';

export function useUIMaps(projectId?: string) {
  return useQuery({
    queryKey: ['ui-maps', projectId],
    queryFn: () => uiMapApi.list(projectId),
  });
}

export function useUIMap(id?: string) {
  return useQuery({
    queryKey: ['ui-map', id],
    queryFn: () => uiMapApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateUIMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UIMapCreate) => uiMapApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ui-maps'] });
    },
  });
}

export function useUpdateUIMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UIMapCreate> }) =>
      uiMapApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['ui-maps'] });
      queryClient.invalidateQueries({ queryKey: ['ui-map', id] });
    },
  });
}

export function useDeleteUIMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => uiMapApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ui-maps'] });
    },
  });
}

export function useAddElement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      uiMapId,
      elementName,
      element,
    }: {
      uiMapId: string;
      elementName: string;
      element: ElementLocator;
    }) => uiMapApi.addElement(uiMapId, elementName, element),
    onSuccess: (_, { uiMapId }) => {
      queryClient.invalidateQueries({ queryKey: ['ui-map', uiMapId] });
    },
  });
}

export function useDeleteElement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      uiMapId,
      elementName,
    }: {
      uiMapId: string;
      elementName: string;
    }) => uiMapApi.deleteElement(uiMapId, elementName),
    onSuccess: (_, { uiMapId }) => {
      queryClient.invalidateQueries({ queryKey: ['ui-map', uiMapId] });
    },
  });
}
