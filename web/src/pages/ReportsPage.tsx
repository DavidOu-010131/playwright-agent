import { FileText } from 'lucide-react';
import { useI18n } from '../i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ReportsPage() {
  const { t } = useI18n();

  return (
    <div className="flex h-full items-center justify-center">
      <Card className="max-w-md text-center">
        <CardHeader>
          <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-muted mx-auto mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>{t.reports.title}</CardTitle>
          <CardDescription>{t.reports.comingSoon}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Test reports and analytics will be available here soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
