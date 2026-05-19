interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, badge, action }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4 animate-fade-in">
      <div>
        {badge ? (
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand">
            {badge}
          </p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-base text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
