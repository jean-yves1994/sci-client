'use client';

import * as React from 'react';
import {
  Alert, Badge, Card, CardHeader, EmptyState, PageHeader, Skeleton,
} from '@/components/ui';
import { IconLayers } from '@/components/icons';
import { api, readableError } from '@/lib/api';
import { humanise } from '@/lib/format';

interface Template {
  id: string; code: string; name: string; description: string | null;
  version: number; isDefault: boolean; status: string;
  _count: { inspections: number };
  sections: Array<{
    id: string; code: string; name: string; isAssessment: boolean;
    fields: Array<{ id: string; code: string; label: string; type: string; required: boolean }>;
  }>;
  photoRules: Array<{ id: string; category: string; minCount: number; required: boolean }>;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = React.useState<Template[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.get<Template[]>('/templates')
      .then(setTemplates)
      .catch((caught: unknown) => setError(readableError(caught)));
  }, []);

  if (error) return <Alert tone="danger" title="Could not load templates">{error}</Alert>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inspection templates"
        description="What inspectors record in the field. Templates are versioned, so editing one never alters an inspection already carried out under an earlier version."
      />

      {templates === null ? (
        <div className="space-y-5">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState
            icon={<IconLayers />}
            title="No templates configured"
            description="An administrator must configure a template before inspections can be raised."
          />
        </Card>
      ) : (
        templates.map((template) => (
          <Card key={template.id}>
            <CardHeader
              title={`${template.name} · v${template.version}`}
              description={template.description ?? undefined}
              action={
                <div className="flex gap-1.5">
                  {template.isDefault && <Badge tone="brand">Default</Badge>}
                  <Badge tone={template.status === 'ACTIVE' ? 'success' : 'neutral'}>
                    {humanise(template.status)}
                  </Badge>
                </div>
              }
            />
            <div className="space-y-6 px-6 pb-6">
              <p className="text-xs text-ink-faint">
                Used by {template._count.inspections} inspection
                {template._count.inspections === 1 ? '' : 's'}
              </p>

              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Sections
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {template.sections.map((section) => (
                    <div key={section.id} className="rounded-xl bg-surface-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold text-ink">{section.name}</p>
                        {section.isAssessment && <Badge tone="accent">Rated</Badge>}
                      </div>
                      {section.fields.length > 0 && (
                        <ul className="mt-2.5 space-y-1.5">
                          {section.fields.map((field) => (
                            <li
                              key={field.id}
                              className="flex items-center justify-between gap-2 text-xs"
                            >
                              <span className="text-ink-muted">
                                {field.label}
                                {field.required && (
                                  <span className="text-danger-fg" aria-label="required"> *</span>
                                )}
                              </span>
                              <span className="font-mono text-[10px] text-ink-faint">
                                {field.type.toLowerCase()}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Required photographs
                </h3>
                <div className="flex flex-wrap gap-2">
                  {template.photoRules.map((rule) => (
                    <Badge key={rule.id} tone={rule.required ? 'brand' : 'neutral'}>
                      {humanise(rule.category)} ×{rule.minCount}
                      {!rule.required && ' (optional)'}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
