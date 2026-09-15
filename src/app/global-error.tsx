"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#F7FAF9]">
          <p className="text-5xl mb-4">💧</p>
          <h1 className="text-xl font-bold text-[#0F2A2E] mb-2">Kuch गड़बड़ हो गई</h1>
          <p className="text-[#227069] mb-6 max-w-sm">
            Something went wrong on this page. Aapka data safe hai — please try again.
          </p>
          <button
            onClick={reset}
            className="rounded-xl bg-[#227069] text-white text-lg font-semibold px-6 py-3"
          >
            Try Again
          </button>
        </main>
      </body>
    </html>
  );
}
