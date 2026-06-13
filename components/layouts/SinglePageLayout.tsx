/**
 * Single Page Layout
 * Minimal UI for users restricted to a single page
 *
 * Features:
 * - No sidebar
 * - Minimal header (page title only)
 * - Language and theme toggles
 * - Main content area only
 * - Focus on privacy and simplicity
 */

'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface SinglePageLayoutProps {
  children: ReactNode;
  pageTitle: string;
  pageCode: string;
}

export function SinglePageLayout({
  children,
  pageTitle,
  pageCode: _pageCode
}: SinglePageLayoutProps) {
  const router = useRouter();

  const handleLogout = async () => {
    // Call logout endpoint
    await fetch('/api/auth/logout', { method: 'POST' });
    // Redirect to login
    router.push('/login');
  };

  return (
    <div className="single-page-layout min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* MINIMAL HEADER */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-4 px-6 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Left: Page Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">📚</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {pageTitle}
            </h1>
          </div>

          {/* Right: Controls & User Info */}
          <div className="flex items-center gap-6">
            {/* Restricted Access Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-full">
              <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">
                🔒 Restricted Access
              </span>
            </div>

            {/* Spacer */}
            <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Logout from system"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 py-8 px-6">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>

      {/* MINIMAL FOOTER */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4 px-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} School Management System
        </p>
      </footer>

      {/* Hidden: Accessibility info for screen readers */}
      <div className="sr-only" role="status" aria-live="polite">
        You are viewing the {pageTitle} page only. This is a restricted access account.
      </div>
    </div>
  );
}

/**
 * Page Access Information Component
 * Shows user what pages they have access to (for reference)
 * Appears as an optional info card
 */
export function PageAccessInfo({
  currentPage,
  accessiblePages
}: {
  currentPage: string;
  accessiblePages: Array<{ code: string; label: string }>;
}) {
  return (
    <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
      <div className="flex items-start gap-3">
        <span className="text-lg">ℹ️</span>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Your Access
          </h3>
          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
            You have access to the following page(s):
          </p>
          <div className="flex flex-wrap gap-2">
            {accessiblePages.map((page) => (
              <div
                key={page.code}
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  page.code === currentPage
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100 opacity-50'
                }`}
              >
                {page.label}
                {page.code === currentPage && ' (current)'}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Standard Layout (for comparison)
 * Used by normal users with full access
 * Has sidebar, full navbar, dashboard, etc.
 */
interface StandardLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
}

export function StandardLayout({
  children,
  sidebar,
  header
}: StandardLayoutProps) {
  return (
    <div className="standard-layout flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Full Header/Navbar */}
      {header && <div>{header}</div>}

      {/* Main Layout with Sidebar */}
      <div className="flex flex-1">
        {/* Sidebar */}
        {sidebar && (
          <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            {sidebar}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 py-6 px-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * Layout Router Hook
 * Determines which layout to use based on user type
 * Usage: const Layout = useAppLayout();
 */
export function useAppLayout(user: any) {
  return user?.isSinglePageUser ? SinglePageLayout : StandardLayout;
}
