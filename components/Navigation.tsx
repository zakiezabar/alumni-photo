// components/Navigation.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton, SignInButton, useUser } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import { Space_Mono } from "next/font/google";
import Image from "next/image";

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
});

export default function Navigation() {
  const pathname = usePathname();
  const { isSignedIn } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Gallery", href: "/gallery" },
    { name: "Upload", href: "/upload" },
    { name: "My Photos", href: "/dashboard" },
  ];

  return (
    <nav className="bg-primary-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link
                href="/"
                className={`${spaceMono.className} text-xl font-bold text-secondary-400`}
              >
                <Image
                src="/id50uitm-logo-full.png"
                alt="id50uitm-logo"
                width={320}
                height={124}
                className="mr-3"
              />
              </Link>
            </div>
          </div>

          {/* Desktop navigation */}
          <div
            className={`${spaceMono.className} hidden sm:ml-6 sm:flex sm:space-x-8`}
          >
            {navigation.map((item) => {
              // Don't show Upload and My Photos if not signed in
              if (
                !isSignedIn &&
                (item.href === "/upload" || item.href === "/dashboard")
              ) {
                return null;
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    pathname === item.href
                      ? "border-primary-800 text-mono-900"
                      : "border-transparent text-mono-600 hover:text-mono-700 hover:border-primary-600"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isSignedIn ? (
              <UserButton afterSignOutUrl="/" />
            ) : (
              <SignInButton mode="modal">
                <button className="bg-secondary-400 px-4 py-2 rounded-md text-white text-sm font-medium hover:bg-secondary-600">
                  Sign In
                </button>
              </SignInButton>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-mono-400 hover:text-mono-500 hover:bg-mono-100"
            >
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              // Don't show Upload and My Photos if not signed in
              if (
                !isSignedIn &&
                (item.href === "/upload" || item.href === "/dashboard")
              ) {
                return null;
              }

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                    pathname === item.href
                      ? "bg-blue-50 border-blue-500 text-blue-700"
                      : "border-transparent text-mono-500 hover:bg-mono-50 hover:border-mono-300 hover:text-mono-700"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              );
            })}
          </div>

          <div className="pt-4 pb-3 border-t border-mono-200">
            <div className="flex items-center px-4">
              {isSignedIn ? (
                <div className="ml-auto">
                  <UserButton afterSignOutUrl="/" />
                </div>
              ) : (
                <div className="ml-auto">
                  <SignInButton mode="modal">
                    <button className="bg-secondary-400 px-4 py-2 rounded-md text-white text-sm font-medium hover:bg-blue-700">
                      Sign In
                    </button>
                  </SignInButton>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
