import {
  ArrowLeft,
  Languages,
  Sun,
  Moon,
  Sparkles,
  BookOpen,
  FolderKanban,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { useProject } from '../hooks/useProject';
import { Button } from '@/components/ui/button';

interface AppLayoutProps {
  showBackButton?: boolean;
  onBack?: () => void;
  onShowDocs: () => void;
  projectId?: string | null;
  children: React.ReactNode;
}

export default function AppLayout({
  showBackButton = false,
  onBack,
  onShowDocs,
  projectId,
  children,
}: AppLayoutProps) {
  const { t, locale, toggleLocale } = useI18n();
  const { theme, toggleMode } = useTheme();
  const { data: project } = useProject(projectId || '');

  return (
    <div className="flex h-screen w-full flex-col">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          {showBackButton ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t.common.back || 'Back'}</span>
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight">{t.app.title}</span>
                <span className="text-xs text-muted-foreground leading-tight hidden sm:block">
                  {t.app.subtitle}
                </span>
              </div>
            </div>
          )}

          {/* Breadcrumb when in project */}
          {showBackButton && project && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">/</span>
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{project.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onShowDocs}
            title={t.docs.title}
            className="h-9 w-9"
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMode}
            title={theme.mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
            className="h-9 w-9"
          >
            {theme.mode === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLocale}
            title={locale === 'en' ? '中文' : 'English'}
            className="h-9 w-9"
          >
            <Languages className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}
