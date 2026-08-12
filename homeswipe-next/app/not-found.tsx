import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <h1 className="text-8xl font-display font-black text-primary mb-4 drop-shadow-sm">404</h1>
      <h2 className="text-2xl font-display font-bold text-foreground mb-2">Page Not Found</h2>
      <p className="text-muted-foreground mb-8 max-w-sm">
        The property or page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="flex items-center px-8 py-4 bg-primary text-primary-foreground font-bold rounded-2xl shadow-xl shadow-primary/25 hover:-translate-y-1 transition-transform"
      >
        <Home className="w-5 h-5 mr-2" />
        Return Home
      </Link>
    </div>
  );
}
