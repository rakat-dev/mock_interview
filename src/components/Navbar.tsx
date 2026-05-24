import Link from 'next/link';

export function Navbar() {
  return (
    <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-gray-900 text-lg tracking-tight">
          Interview Engine
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/profile" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            New Profile
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Dashboard
          </Link>
          <Link href="/history" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            History
          </Link>
        </div>
      </div>
    </nav>
  );
}
