import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme';
import Layout from './components/Layout';
import ProjectDetailPage from './pages/ProjectDetailPage';
import EmptyState from './pages/EmptyState';
import DocsPage from './pages/DocsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

type ViewMode = 'projects' | 'docs';

function AppContent() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('projects');

  const handleShowDocs = () => {
    setViewMode('docs');
  };

  const handleBackFromDocs = () => {
    setViewMode('projects');
  };

  if (viewMode === 'docs') {
    return <DocsPage onBack={handleBackFromDocs} />;
  }

  return (
    <Layout
      selectedProjectId={selectedProjectId}
      onSelectProject={setSelectedProjectId}
      onShowDocs={handleShowDocs}
    >
      {selectedProjectId ? (
        <ProjectDetailPage projectId={selectedProjectId} />
      ) : (
        <EmptyState />
      )}
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <AppContent />
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
