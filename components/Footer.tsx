// components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="absolute bottom-0 right-0 text-mono-400/60 py-4">
      <div className="container mx-auto px-4">
        <div className="flex justify-end items-center">
          <div className="text-sm">
            <Link href="/privacy-policy" className="hover:text-secondary-400 transition duration-200">
              Privacy Policy
            </Link>
            <span className="mx-2">•</span>
            <span>© {currentYear} Share Moments</span>
          </div>
        </div>
      </div>
    </footer>
  );
}