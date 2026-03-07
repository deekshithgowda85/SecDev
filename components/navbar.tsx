'use client';
import React from 'react';
import Link from 'next/link';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon';
import { useScroll } from '@/components/ui/use-scroll';
import { ThemeToggle } from '@/components/theme-toggle';

const links = [
  { label: 'Features', href: '/features' },
  { label: 'Solution', href: '/solutions' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Console', href: '/console' },
];

export function Navbar() {
  const [open, setOpen] = React.useState(false);
  const scrolled = useScroll(10);

  React.useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 mx-auto w-full max-w-6xl border-b border-transparent md:rounded-md md:border md:transition-all md:ease-out',
        {
          'bg-background/95 supports-[backdrop-filter]:bg-background/50 border-border backdrop-blur-lg md:top-4 md:max-w-5xl md:shadow':
            scrolled && !open,
          'bg-background/90': open,
        },
      )}
    >
      <nav
        className={cn(
          'flex h-16 w-full items-center justify-between px-6 md:h-14 md:transition-all md:ease-out',
          { 'md:px-3': scrolled },
        )}
      >
        {/* Logo */}
        <Link href="/" aria-label="home" className="flex items-center gap-2">
          <SecDevLogo className="h-8" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-3 md:flex">
          {links.map((link, i) => (
            <Link key={i} className={buttonVariants({ variant: 'ghost', size: 'default' })} href={link.href}>
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
          <Button variant="outline" size="default" asChild>
            <Link href="/login">Sign In</Link>
          </Button>
          <Button size="default" asChild>
            <Link href="/register">Get Started</Link>
          </Button>
        </div>

        {/* Mobile actions */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button size="icon" variant="outline" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'}>
            <MenuToggleIcon open={open} className="size-5" duration={300} />
          </Button>
        </div>
      </nav>

      {/* Mobile dropdown */}
      <div
        className={cn(
          'bg-background/95 fixed top-16 right-0 bottom-0 left-0 z-50 flex flex-col overflow-hidden border-y border-border backdrop-blur-lg md:hidden',
          open ? 'block' : 'hidden',
        )}
      >
        <div
          data-slot={open ? 'open' : 'closed'}
          className={cn(
            'data-[slot=open]:animate-in data-[slot=open]:zoom-in-95 data-[slot=closed]:animate-out data-[slot=closed]:zoom-out-95 ease-out',
            'flex h-full w-full flex-col justify-between gap-y-2 p-4',
          )}
        >
          <div className="grid gap-y-1">
            {links.map((link) => (
              <Link
                key={link.label}
                className={buttonVariants({ variant: 'ghost', className: 'justify-start' })}
                href={link.href}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login" onClick={() => setOpen(false)}>Sign In</Link>
            </Button>
            <Button className="w-full" asChild>
              <Link href="/register" onClick={() => setOpen(false)}>Get Started</Link>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ── SecDev brand logo ── */
function SecDevLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 110 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('w-auto', className)}>
      <defs>
        <linearGradient id="sd-grad" x1="0" y1="0" x2="0" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9B99FE" />
          <stop offset="1" stopColor="#2BC8B7" />
        </linearGradient>
      </defs>
      <rect x="0" y="2" width="5" height="5" rx="1" fill="url(#sd-grad)" />
      <rect x="7" y="2" width="5" height="5" rx="1" fill="url(#sd-grad)" />
      <rect x="0" y="9" width="5" height="5" rx="1" fill="url(#sd-grad)" />
      <rect x="7" y="9" width="5" height="5" rx="1" fill="url(#sd-grad)" />
      <text x="18" y="16" fontFamily="inherit" fontWeight="700" fontSize="13" fill="currentColor">SecDev</text>
    </svg>
  );
}
