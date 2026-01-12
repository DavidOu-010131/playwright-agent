import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme';
import AppLayout from './components/AppLayout';
import ProjectsHomePage from './pages/ProjectsHomePage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import DocsPage from './pages/DocsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

type ViewMode = 'home' | 'project' | 'docs';

function AppContent() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('home');

  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setViewMode('project');
  };

  const handleBackToHome = () => {
    setSelectedProjectId(null);
    setViewMode('home');
  };

  const handleShowDocs = () => {
    setViewMode('docs');
  };

  const handleBackFromDocs = () => {
    setViewMode(selectedProjectId ? 'project' : 'home');
  };

  if (viewMode === 'docs') {
    return <DocsPage onBack={handleBackFromDocs} />;
  }

  return (
    <AppLayout
      showBackButton={viewMode === 'project'}
      onBack={handleBackToHome}
      onShowDocs={handleShowDocs}
      projectId={selectedProjectId}
    >
      {viewMode === 'project' && selectedProjectId ? (
        <ProjectDetailPage projectId={selectedProjectId} />
      ) : (
        <ProjectsHomePage onSelectProject={handleSelectProject} />
      )}
    </AppLayout>
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
