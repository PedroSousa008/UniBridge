export default function WorkspaceLoading() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      <div className="h-32 rounded-3xl bg-muted" />
      <div className="grid grid-cols-3 gap-3">
        <div className="h-20 rounded-2xl bg-muted" />
        <div className="h-20 rounded-2xl bg-muted" />
        <div className="h-20 rounded-2xl bg-muted" />
      </div>
    </div>
  );
}
