// src/app/page.tsx
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-6">Networking Lunches</h1>
      <p className="text-xl text-gray-600 mb-8">
        Connect with colleagues over lunch
      </p>
      <a 
        href="/survey" 
        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition"
      >
        Join Networking Lunch
      </a>
    </main>
  );
}