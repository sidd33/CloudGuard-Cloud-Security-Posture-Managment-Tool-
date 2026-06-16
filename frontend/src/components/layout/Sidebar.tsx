"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShieldAlert, 
  Cloud, 
  History, 
  FileText, 
  Settings, 
  Shield,
  Target,
  Sun,
  Moon
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from 'next-themes';

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Findings', href: '/findings', icon: ShieldAlert },
    { name: 'Accounts', href: '/accounts', icon: Cloud },
    { name: 'Deep Scan', href: '/deep-scan', icon: Target },
    { name: 'Scan History', href: '/scan-history', icon: History },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-[240px] bg-sidebar border-r border-border min-h-screen flex flex-col z-20">
      {/* Logo Section */}
      <div className="h-16 px-6 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-primary" />
          <span className="text-base font-bold tracking-tight text-sidebar-foreground font-sans">CloudGuard</span>
        </div>
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-sidebar-foreground transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-6 py-3 text-sm font-sans transition-all relative font-semibold",
                isActive 
                  ? "bg-secondary text-primary border-l-[3px] border-primary pl-[21px]" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-sidebar-foreground border-l-[3px] border-transparent pl-[21px]"
              )}
            >
              <Icon className="w-4 h-4" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile Area */}
      <div className="p-6 border-t border-border flex items-center gap-3 bg-sidebar">
        <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold text-primary font-mono">
          AD
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-sidebar-foreground font-sans leading-tight">Admin User</span>
          <span className="text-[11px] text-muted-foreground font-mono mt-0.5">arn:aws::1234...</span>
        </div>
      </div>
    </aside>
  );
}
