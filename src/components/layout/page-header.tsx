interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
}

export function PageHeader({ title, subtitle, badge }: PageHeaderProps) {
  return (
    <div className="mb-8 animate-fade-in">
      {badge ? (
        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-brand">
          {badge}
        </p>
      ) : null}
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 max-w-2xl text-base text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
