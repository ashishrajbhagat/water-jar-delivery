"use client";

export default function DriverError({
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
        Internet check karein aur dobara try karein. Koi data delete nahi hua hai.
      </p>
      <button onClick={reset} className="btn-primary max-w-xs">
        Try Again
      </button>
    </div>
  );
}
