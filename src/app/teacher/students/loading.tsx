export default function TeacherStudentsLoading() {
  return (
    <div className="animate-pulse space-y-6 p-1">
      <div className="h-10 w-48 rounded-lg bg-muted" />
      <div className="h-4 w-full max-w-xl rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-56 rounded-2xl bg-muted/60" />
        ))}
      </div>
    </div>
  );
}
