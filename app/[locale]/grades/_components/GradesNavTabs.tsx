import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = 'entry' | 'dashboard' | 'my-classes'

interface Props {
  active: Tab
  locale?: string
  /** Show analytics tab only if user has the permission */
  canViewAnalytics?: boolean
  /** Show my-classes tab (teacher view) */
  showMyClasses?: boolean
}

// ── GradesNavTabs ─────────────────────────────────────────────────────────────

export function GradesNavTabs({
  active,
  locale = 'ar',
  canViewAnalytics = false,
  showMyClasses = false,
}: Props) {
  const isRtl = locale === 'ar'

  const base = `/${locale}/grades`

  const tabs = [
    {
      key: 'entry' as Tab,
      href: base,
      label: isRtl ? 'إدخال الدرجات' : 'Grade Entry',
      icon: (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
    },
    ...(canViewAnalytics
      ? [
          {
            key: 'dashboard' as Tab,
            href: `${base}/dashboard`,
            label: isRtl ? 'لوحة التحليلات' : 'Analytics',
            icon: (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            ),
          },
        ]
      : []),
    ...(showMyClasses
      ? [
          {
            key: 'my-classes' as Tab,
            href: `${base}/my-classes`,
            label: isRtl ? 'صفوفي' : 'My Classes',
            icon: (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            ),
          },
        ]
      : []),
  ]

  // Only render if there's more than one tab to show
  if (tabs.length <= 1) return null

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="flex items-center gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-sm w-fit"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
              isActive
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-muted)]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
