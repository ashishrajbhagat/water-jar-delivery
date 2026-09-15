export default function AdminLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 w-32 bg-teal-100 rounded-lg" />
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-20 bg-teal-50" />
        ))}
      </div>
    </div>
  );
}
