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
  Loader2,
  Target
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const pathname = usePathname();
  const [isSyncing, setIsSyncing] = useState(false);

  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Findings', href: '/findings', icon: ShieldAlert },
    { name: 'Accounts', href: '/accounts', icon: Cloud },
    { name: 'Deep Scan', href: '/deep-scan', icon: Target },
    { name: 'Scan History', href: '/scan-history', icon: History },
    { name: 'Reports', href: '/reports', icon: FileText },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
    }, 2000);
  };

  return (
    <aside className="w-[240px] bg-[#0D1117] border-r border-[rgba(255,255,255,0.07)] min-h-screen flex flex-col z-20">
      {/* Logo Section */}
      <div className="h-16 px-6 border-b border-[rgba(255,255,255,0.07)] flex items-center gap-2.5">
        <Shield className="w-5 h-5 text-[#00E5FF]" />
        <span className="text-base font-semibold tracking-tight text-white font-sans">CloudGuard</span>
      </div>

      {/* Nav List */}
      <nav className="flex-1 py-4 flex flex-col gap-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-6 py-3 text-sm font-sans transition-all relative",
                isActive 
                  ? "bg-[rgba(0,229,255,0.08)] text-[#00E5FF] font-medium border-l-[3px] border-[#00E5FF] pl-[21px]" 
                  : "text-slate-400 hover:bg-white/5 hover:text-white border-l-[3px] border-transparent pl-[21px]"
              )}
            >
              <Icon className="w-4 h-4" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Profile and Sync */}
      <div className="p-4 border-t border-[rgba(255,255,255,0.07)] flex flex-col gap-3 bg-[#0D1117]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#161B24] border border-[rgba(255,255,255,0.07)] flex items-center justify-center text-xs font-semibold text-[#00E5FF] font-mono">
            AD
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-white font-sans">Admin User</span>
            <span className="text-[10px] text-slate-500 font-mono">arn:aws::1234...</span>
          </div>
        </div>

        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center justify-center gap-2 w-full py-2 border border-[#00E5FF] text-[#00E5FF] hover:bg-[#00E5FF]/10 text-xs font-medium rounded transition-colors disabled:opacity-50"
        >
          {isSyncing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Shield className="w-3.5 h-3.5" />
          )}
          {isSyncing ? "Syncing..." : "Sync Now"}
        </button>
      </div>
    </aside>
  );
}
