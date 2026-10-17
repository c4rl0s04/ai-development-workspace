'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const destinations = [
  {
    href: '/',
    label: 'Overview',
    path: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  },
  {
    href: '/projects',
    label: 'Projects',
    path: 'M3 7h7l2 3h9v10H3z M3 7V4h7l2 3h8v3',
  },
  {
    href: '/approvals',
    label: 'Approvals',
    path: 'M8 3h8v4H8z M8 5H5v16h14V5h-3 M8 14l3 3 5-6',
  },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main navigation"
      className="flex gap-1 lg:flex-col lg:gap-2"
    >
      {destinations.map(({ href, label, path }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            pathname === href ||
            (href !== '/' && pathname.startsWith(`${href}/`))
              ? 'page'
              : undefined
          }
          className="nav-link flex min-h-12 flex-1 items-center justify-center gap-3 rounded-lg px-3 py-3 text-sm font-medium lg:flex-none lg:justify-start lg:px-4"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="hidden sm:block"
          >
            <path d={path} />
          </svg>
          {label}
        </Link>
      ))}
    </nav>
  );
}
