"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl mb-3">⚠️</p>
      <h2 className="text-lg font-bold mb-2">Page load nahi hua</h2>
      <p className="text-teal-600 mb-6 max-w-sm text-sm">
        {error.message || "Kuch unexpected error hua. Dobara try karein."}
      </p>
      <button onClick={reset} className="btn-primary max-w-xs">
        Try Again
      </button>
    </div>
  );
}
