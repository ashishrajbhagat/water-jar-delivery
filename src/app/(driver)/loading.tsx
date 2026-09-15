export default function DriverLoading() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-5 w-40 bg-teal-100 rounded-lg" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card h-24 bg-teal-50" />
      ))}
    </div>
  );
}
