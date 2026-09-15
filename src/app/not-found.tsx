import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-[#F7FAF9]">
      <p className="text-5xl mb-4">🔍</p>
      <h1 className="text-xl font-bold text-ink mb-2">Page nahi mila</h1>
      <p className="text-teal-600 mb-6">Ye page exist nahi karta ya move ho gaya hai.</p>
      <Link href="/" className="rounded-xl bg-teal-600 text-white text-lg font-semibold px-6 py-3">
        Home Jaayein
      </Link>
    </main>
  );
}
