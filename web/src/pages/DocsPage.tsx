import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BookOpen, FileText, ChevronLeft } from 'lucide-react';
import { useI18n } from '../i18n';
import { docsApi } from '../api';
import type { DocFile } from '../api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DocsPageProps {
  onBack: () => void;
}

export default function DocsPage({ onBack }: DocsPageProps) {
  const { t } = useI18n();
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

  const { data: docs, isLoading: loadingList } = useQuery({
    queryKey: ['docs'],
    queryFn: docsApi.list,
  });

  const { data: docContent, isLoading: loadingContent } = useQuery({
    queryKey: ['docs', selectedDoc],
    queryFn: () => docsApi.get(selectedDoc!),
    enabled: !!selectedDoc,
  });

  if (loadingList) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Left sidebar - Doc list */}
      <div className="w-64 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="font-semibold">{t.docs.title}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3">
          {docs && docs.length > 0 ? (
            <div className="space-y-1">
              {docs.map((doc: DocFile) => (
                <div
                  key={doc.name}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedDoc === doc.name
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedDoc(doc.name)}
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="text-sm truncate">{doc.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              {t.docs.noDocs}
            </div>
          )}
        </div>
      </div>

      {/* Right content - Doc content */}
      <div className="flex-1 overflow-auto p-6">
        {selectedDoc && docContent ? (
          loadingContent ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">{t.common.loading}</p>
            </div>
          ) : (
            <article className="prose max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {docContent.content}
              </ReactMarkdown>
            </article>
          )
        ) : (
          <div className="flex h-full items-center justify-center">
            <Card className="max-w-md text-center">
              <CardHeader>
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted mx-auto mb-4">
                  <BookOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <CardTitle>{t.docs.title}</CardTitle>
                <CardDescription>{t.docs.selectDoc}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t.docs.description}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
