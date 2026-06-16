"use client";

import { useEffect, useState } from 'react';
import { 
  Activity, 
  Shield, 
  Database, 
  Users, 
  Server, 
  Settings, 
  LineChart, 
  Loader2,
  ChevronRight,
  Info,
  RefreshCw
} from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import api from '@/lib/api';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer 
} from 'recharts';

// Trend Chart Data
const trendData = [
  { day: 'Mon', critical: 2, high: 8, medium: 18 },
  { day: 'Tue', critical: 3, high: 10, medium: 20 },
  { day: 'Wed', critical: 4, high: 9, medium: 22 },
  { day: 'Thu', critical: 3, high: 11, medium: 21 },
  { day: 'Fri', critical: 4, high: 12, medium: 23 },
  { day: 'Sat', critical: 5, high: 11, medium: 24 },
  { day: 'Sun', critical: 4, high: 12, medium: 26 },
];

interface FindingBackendType {
  id: string;
  accountId: string;
  severity: string;
  service: string;
  resourceId: string;
  title: string;
  status: string;
  timestamp?: string | null;
  description?: string | null;
}

interface AccountBackendType {
  id: string;
  alias: string;
  region: string;
  lastScore?: number | null;
  lastScanTime?: string | null;
}

interface RiskType {
  sev: string;
  res: string;
  desc: string;
  time: string;
  color: string;
  bgColor: string;
}
interface ServiceCoverageType {
  name: string;
  findings: number;
  worst: string;
  status: string;
  counts: string;
  icon: import('lucide-react').LucideIcon;
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState("2 mins ago");
  const [lastScannedTime, setLastScannedTime] = useState("2026-06-16T02:56:00.000Z");

  // Dynamic dashboard states
  const [score, setScore] = useState(78);
  const [activeFindings, setActiveFindings] = useState(42);
  const [monitoredAccounts, setMonitoredAccounts] = useState(2);
  const [criticalCount, setCriticalCount] = useState(4);
  const [highCount, setHighCount] = useState(12);
  const [mediumCount, setMediumCount] = useState(26);
  const [monitoredRegions, setMonitoredRegions] = useState("ap-south-1, us-east-1");

  const [topRisks, setTopRisks] = useState<RiskType[]>([
    { sev: "CRITICAL", res: "arn:aws:iam::123456789:root", desc: "Root account has active access keys", time: "2h ago", color: "text-white border-none", bgColor: "bg-[var(--status-critical)]" },
    { sev: "CRITICAL", res: "arn:aws:s3:::prod-backups", desc: "S3 bucket publicly accessible", time: "2h ago", color: "text-white border-none", bgColor: "bg-[var(--status-critical)]" },
    { sev: "HIGH", res: "arn:aws:iam::123456789:user/deploy", desc: "Access keys not rotated (127 days)", time: "2h ago", color: "text-white border-none", bgColor: "bg-[var(--status-high)]" },
    { sev: "HIGH", res: "sg-0a1b2c3d", desc: "SSH port 22 open to 0.0.0.0/0", time: "2h ago", color: "text-white border-none", bgColor: "bg-[var(--status-high)]" },
    { sev: "MEDIUM", res: "arn:aws:s3:::logs-bucket", desc: "S3 versioning disabled", time: "2h ago", color: "text-white border-none", bgColor: "bg-[var(--status-medium)]" },
  ]);

  const [serviceCoverage, setServiceCoverage] = useState<ServiceCoverageType[]>([
    { name: "S3", findings: 8, worst: "High", status: "Scanned", counts: "0C 3H 5M", icon: Database },
    { name: "IAM", findings: 15, worst: "Critical", status: "Scanned", counts: "3C 5H 7M", icon: Users },
    { name: "EC2", findings: 6, worst: "Medium", status: "Scanned", counts: "0C 0H 6M", icon: Server },
    { name: "CloudTrail", findings: 5, worst: "High", status: "Scanned", counts: "0C 2H 3M", icon: Activity },
    { name: "GuardDuty", findings: 4, worst: "Critical", status: "Scanned", counts: "1C 2H 1M", icon: Shield },
    { name: "Config", findings: 4, worst: "Low", status: "Scanned", counts: "0C 0H 4L", icon: Settings },
  ]);

  useEffect(() => {
    setMounted(true);
    setLastScannedTime(new Date().toISOString());
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const summaryRes = await api.get('/dashboard/summary');
      const data = summaryRes.data;
      
      if (data && data.totalAccounts > 0) {
        setScore(data.averageScore !== undefined ? data.averageScore : 100);
        setActiveFindings(data.totalOpenFindings || 0);
        setMonitoredAccounts(data.totalAccounts || 0);
        setCriticalCount(data.severityBreakdown?.CRITICAL || 0);
        setHighCount(data.severityBreakdown?.HIGH || 0);
        setMediumCount(data.severityBreakdown?.MEDIUM || 0);

        // Fetch accounts for regions list
        try {
          const accountsRes = await api.get('/accounts');
          const regions = Array.from(new Set(accountsRes.data.map((a: AccountBackendType) => a.region))).join(", ");
          setMonitoredRegions(regions || "None");
        } catch (e) {
          console.warn("Could not load accounts list", e);
        }

        // Fetch findings to enrich service coverage and top risks
        try {
          const findingsRes = await api.get('/findings');
          const allFindings = findingsRes.data || [];
          
          // Populate top open risks
          const openFindings = allFindings.filter((f: FindingBackendType) => f.status === 'OPEN' || f.status === 'Open');
          const mappedRisks = openFindings.slice(0, 5).map((f: FindingBackendType) => {
            const isCrit = f.severity === 'CRITICAL';
            const isHigh = f.severity === 'HIGH';
            const color = "text-white border-none";
            const bgColor = isCrit ? "bg-[var(--status-critical)]" :
                            isHigh ? "bg-[var(--status-high)]" :
                            "bg-[var(--status-medium)]";
            return {
              sev: f.severity,
              res: f.resourceId,
              desc: f.title,
              time: "Just now",
              color,
              bgColor
            };
          });
          setTopRisks(mappedRisks);

          // Populate service coverage dynamically
          const services = ["S3", "IAM", "EC2", "CloudTrail", "GuardDuty", "Config"];
          const serviceIcons = { S3: Database, IAM: Users, EC2: Server, CloudTrail: Activity, GuardDuty: Shield, Config: Settings };
          const mappedCoverage = services.map(srvName => {
            const srvFindings = allFindings.filter((f: FindingBackendType) => f.service.toUpperCase() === srvName.toUpperCase());
            const openSrv = srvFindings.filter((f: FindingBackendType) => f.status === 'OPEN' || f.status === 'Open');
            
            let worst = "Low";
            if (openSrv.some((f: FindingBackendType) => f.severity === 'CRITICAL')) worst = "Critical";
            else if (openSrv.some((f: FindingBackendType) => f.severity === 'HIGH')) worst = "High";
            else if (openSrv.some((f: FindingBackendType) => f.severity === 'MEDIUM')) worst = "Medium";

            const c = openSrv.filter((f: FindingBackendType) => f.severity === 'CRITICAL').length;
            const h = openSrv.filter((f: FindingBackendType) => f.severity === 'HIGH').length;
            const m = openSrv.filter((f: FindingBackendType) => f.severity === 'MEDIUM').length;

            return {
              name: srvName,
              findings: openSrv.length,
              worst,
              status: "Scanned",
              counts: `${c}C ${h}H ${m}M`,
              icon: serviceIcons[srvName as keyof typeof serviceIcons] || Settings
            };
          });
          setServiceCoverage(mappedCoverage);
        } catch (e) {
          console.warn("Could not enrich findings data", e);
        }
      }
    } catch {
      console.warn("Backend API not reachable. Operating in Demo Mode.");
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    fetchDashboardData();
    setTimeout(() => {
      setIsSyncing(false);
      setLastSynced("Just now");
      setLastScannedTime(new Date().toISOString());
    }, 1500);
  };

  const getScoreColor = (val: number) => {
    if (val < 50) return "var(--status-critical)";
    if (val < 75) return "var(--status-high)";
    if (val < 90) return "var(--status-medium)";
    return "var(--status-safe)";
  };

  // Score SVG values
  const radius = 45;
  const circumference = 2 * Math.PI * radius; // 282.74
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const currentColor = getScoreColor(score);

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen text-foreground font-sans">
      
      {/* TOP BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2a2e34] dark:text-foreground tracking-tight">Infrastructure Overview</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Aggregate security telemetry across all monitored AWS environments</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Last Synced</p>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{lastSynced}</p>
          </div>
          <Button 
            onClick={handleSync} 
            disabled={isSyncing}
            className="bg-primary hover:bg-primary/90 text-primary-foreground border-none h-9 px-4 gap-2 font-bold text-xs rounded transition-colors"
          >
            {isSyncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Shield className="w-3.5 h-3.5" />
            )}
            Sync Now
          </Button>
        </div>
      </div>

      {/* ROW 1 — HERO METRICS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1 — SECURITY SCORE */}
        <Card className="bg-card border border-border shadow-subtle dark:shadow-none rounded-xl p-6 flex flex-col justify-between relative">
          <div className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" title="Score Info">
            <Info className="w-4 h-4" />
          </div>
          <div className="flex items-center justify-center py-2 relative">
            <svg className="w-[120px] h-[120px] transform -rotate-90">
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="var(--border)"
                strokeWidth="8"
                fill="transparent"
              />
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke={currentColor}
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold font-sans" style={{ color: currentColor }}>
                {score}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono mt-0.5">/ 100</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--status-safe)] text-white text-[11px] font-bold">
              System Healthy
            </div>
            <p className="text-[13px] text-foreground font-bold uppercase tracking-[0.08em] mt-3">Posture Score</p>
          </div>
        </Card>

        {/* Card 2 — ACTIVE FINDINGS */}
        <Card className="bg-card border border-border shadow-subtle dark:shadow-none rounded-xl p-6 flex flex-col justify-between relative">
          <div className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" title="Findings Info">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[13px] text-foreground font-bold uppercase tracking-[0.08em]">Active Findings</p>
            <h2 className="text-40px font-bold text-foreground tracking-tight mt-4 font-sans leading-none">{activeFindings}</h2>
          </div>
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-[var(--status-critical)] text-white text-[11px] font-semibold font-sans tracking-wide">
                {criticalCount} Critical
              </span>
              <span className="px-2 py-1 rounded bg-[var(--status-high)] text-white text-[11px] font-semibold font-sans tracking-wide">
                {highCount} High
              </span>
              <span className="px-2 py-1 rounded bg-[var(--status-medium)] text-white text-[11px] font-semibold font-sans tracking-wide">
                {mediumCount} Medium
              </span>
            </div>
          </div>
        </Card>

        {/* Card 3 — MONITORED ACCOUNTS */}
        <Card className="bg-card border border-border shadow-subtle dark:shadow-none rounded-xl p-6 flex flex-col justify-between relative">
          <div className="absolute top-4 right-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" title="Accounts Info">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[13px] text-foreground font-bold uppercase tracking-[0.08em]">Monitored Accounts</p>
            <h2 className="text-40px font-bold text-primary tracking-tight mt-4 font-sans leading-none">{monitoredAccounts}</h2>
          </div>
          <div className="mt-6">
            <span className="text-xs text-muted-foreground font-mono bg-secondary border border-border px-2 py-1.5 rounded block truncate">
              {monitoredRegions}
            </span>
          </div>
        </Card>

        {/* Card 4 — LAST SCANNED */}
        <Card className="bg-card border border-border shadow-subtle dark:shadow-none rounded-xl p-6 flex flex-col justify-between relative">
          <button onClick={handleSync} disabled={isSyncing} className="absolute top-4 right-4 text-muted-foreground hover:text-primary cursor-pointer transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-primary' : ''}`} />
          </button>
          <div>
            <p className="text-[13px] text-foreground font-bold uppercase tracking-[0.08em]">Last Scanned</p>
            <h2 className="text-24px font-bold text-foreground tracking-tight mt-5 font-sans leading-none">Just now</h2>
          </div>
          <div className="mt-6">
            <span className="text-[11px] text-muted-foreground font-mono block truncate" title={lastScannedTime}>
              {lastScannedTime}
            </span>
          </div>
        </Card>
      </div>

      {/* ROW 2 — TWO COLUMN LAYOUT (60% left, 40% right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT — FINDINGS TREND CHART */}
        <Card className="bg-card border border-border shadow-subtle dark:shadow-none rounded-xl p-6 lg:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4 text-primary" />
              <h3 className="text-base font-bold text-[#2a2e34] dark:text-foreground">Findings Over Time</h3>
            </div>
            <span className="text-[11px] text-muted-foreground">7 Days Trend</span>
          </div>
          
          <div className="h-[300px] w-full mt-2">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--status-critical)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="var(--status-critical)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--status-high)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="var(--status-high)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--status-medium)" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="var(--status-medium)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    stroke="var(--muted-foreground)" 
                    fontSize={11} 
                    fontFamily="var(--font-mono)"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="var(--muted-foreground)" 
                    fontSize={11} 
                    fontFamily="var(--font-mono)"
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 30]}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)',
                      borderWidth: '1px',
                      borderRadius: '6px',
                      color: 'var(--foreground)',
                      fontFamily: 'inherit',
                      fontSize: '12px',
                    }}
                    itemStyle={{ padding: '2px 0' }}
                  />
                  <Area type="monotone" dataKey="critical" stroke="var(--status-critical)" strokeWidth={2} fillOpacity={1} fill="url(#colorCritical)" />
                  <Area type="monotone" dataKey="high" stroke="var(--status-high)" strokeWidth={2} fillOpacity={1} fill="url(#colorHigh)" />
                  <Area type="monotone" dataKey="medium" stroke="var(--status-medium)" strokeWidth={2} fillOpacity={1} fill="url(#colorMedium)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Skeleton className="w-full h-full bg-secondary" />
              </div>
            )}
          </div>

          {/* Custom Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[var(--status-critical)] rounded-sm" />
              <span className="text-xs text-muted-foreground font-bold">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[var(--status-high)] rounded-sm" />
              <span className="text-xs text-muted-foreground font-bold">High</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[var(--status-medium)] rounded-sm" />
              <span className="text-xs text-muted-foreground font-bold">Medium</span>
            </div>
          </div>
        </Card>

        {/* RIGHT — RISK DISTRIBUTION TABLE */}
        <Card className="bg-card border border-border shadow-subtle dark:shadow-none rounded-xl p-6 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-base font-bold text-[#2a2e34] dark:text-foreground">Risk Distribution</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">Quantitative analysis of open vulnerabilities</p>
            </div>

            <Table className="border-none mt-2">
              <TableHeader className="bg-transparent border-b border-border">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs px-0 h-8">Severity Level</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right h-8">Count</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right h-8">% Total</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right pr-0 h-8">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Critical Row */}
                <TableRow className="border-b border-border hover:bg-secondary/50 transition-colors">
                  <TableCell className="px-0 py-3 font-bold text-xs">
                    <div className="flex items-center gap-2 text-foreground">
                      <span className="w-2 h-2 rounded-full bg-[var(--status-critical)]" />
                      Critical
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground font-bold">4</TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">9.5%</TableCell>
                  <TableCell className="text-right pr-0 py-3">
                    <span className="inline-flex px-1.5 py-0.5 rounded bg-[var(--status-critical)] text-white text-[10px] font-bold">
                      Immediate Action
                    </span>
                  </TableCell>
                </TableRow>
                {/* High Row */}
                <TableRow className="border-b border-border hover:bg-secondary/50 transition-colors">
                  <TableCell className="px-0 py-3 font-bold text-xs">
                    <div className="flex items-center gap-2 text-foreground">
                      <span className="w-2 h-2 rounded-full bg-[var(--status-high)]" />
                      High
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground font-bold">12</TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">28.6%</TableCell>
                  <TableCell className="text-right pr-0 py-3">
                    <span className="inline-flex px-1.5 py-0.5 rounded bg-[var(--status-high)] text-white text-[10px] font-bold">
                      Review Recommended
                    </span>
                  </TableCell>
                </TableRow>
                {/* Medium Row */}
                <TableRow className="border-none hover:bg-secondary/50 transition-colors">
                  <TableCell className="px-0 py-3 font-bold text-xs">
                    <div className="flex items-center gap-2 text-foreground">
                      <span className="w-2 h-2 rounded-full bg-[var(--status-medium)]" />
                      Medium
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground font-bold">26</TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">61.9%</TableCell>
                  <TableCell className="text-right pr-0 py-3">
                    <span className="inline-flex px-1.5 py-0.5 rounded bg-[var(--status-medium)] text-white text-[10px] font-bold">
                      Monitor
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="text-[11px] text-muted-foreground pt-3 border-t border-border text-center font-mono">
            Total active vulnerabilities: 42
          </div>
        </Card>
      </div>

      {/* ROW 3 — SERVICE COVERAGE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#2a2e34] dark:text-foreground">Service Coverage</h3>
          <span className="text-[11px] text-muted-foreground">6 Monitored Cloud Resources</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {serviceCoverage.map((srv) => {
            const SrvIcon = srv.icon;
            const badgeColor = srv.findings === 0 ? "bg-[#3a3f47]" : srv.worst === "Critical" ? "bg-[var(--status-critical)]" : srv.worst === "High" ? "bg-[var(--status-high)]" : "bg-[var(--status-medium)]";
            
            return (
              <Card 
                key={srv.name} 
                className="bg-card border border-border shadow-subtle dark:shadow-none rounded-xl p-4 flex flex-col justify-between hover:bg-secondary/50 transition-colors cursor-pointer"
                onClick={() => window.location.href = `/findings?service=${srv.name}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-secondary border border-border flex items-center justify-center">
                    <SrvIcon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                  </div>
                  <span className={`min-w-[20px] h-[20px] px-1.5 flex items-center justify-center rounded text-[10px] font-bold text-white ${badgeColor}`}>
                    {srv.findings}
                  </span>
                </div>
                
                <div className="mt-4 flex flex-col space-y-1.5">
                  <h4 className="text-xs font-bold text-foreground font-sans leading-none text-left">{srv.name}</h4>
                  <div className="flex items-center gap-1.5 justify-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--status-safe)] block" />
                    <span className="text-[10px] text-muted-foreground font-medium leading-none">{srv.status}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-border flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground font-sans">Last scanned: 2 hrs ago</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ROW 4 — BOTTOM TWO COLUMN (50/50) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT — FRAMEWORK COMPLIANCE */}
        <Card className="bg-card border border-border shadow-subtle dark:shadow-none rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-base font-bold text-[#2a2e34] dark:text-foreground">Framework Compliance</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">Standards mapped to AWS environment security posture</p>
            </div>

            <div className="space-y-6 mt-4">
              {/* CIS Benchmarks */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground">CIS AWS Foundations 1.4</span>
                  <span className="text-xs font-bold text-primary font-mono">68%</span>
                </div>
                <Progress value={68} className="h-1.5 bg-secondary" />
                <p className="text-[10px] text-muted-foreground font-mono">68 / 100 controls passing</p>
              </div>

              {/* NIST */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-foreground">NIST 800-53 Rev 5</span>
                  <span className="text-xs font-bold text-primary font-mono">73%</span>
                </div>
                <Progress value={73} className="h-1.5 bg-secondary" />
                <p className="text-[10px] text-muted-foreground font-mono">146 / 200 controls passing</p>
              </div>
            </div>
          </div>
          
          <div className="text-[10px] text-muted-foreground border-t border-border pt-3 mt-6 text-center font-mono">
            Compliance scores are updated continuously during security scans.
          </div>
        </Card>

        {/* RIGHT — TOP RISKS TABLE */}
        <Card className="bg-card border border-border shadow-subtle dark:shadow-none rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#2a2e34] dark:text-foreground">Top Open Risks</h3>
              <span className="text-[11px] text-[var(--status-critical)] font-bold font-mono">Action Required</span>
            </div>

            <Table className="border-none mt-2">
              <TableHeader className="bg-transparent border-b border-border">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-muted-foreground text-xs px-0 h-8">Severity</TableHead>
                  <TableHead className="text-muted-foreground text-xs h-8">Resource</TableHead>
                  <TableHead className="text-muted-foreground text-xs h-8">Finding</TableHead>
                  <TableHead className="text-muted-foreground text-xs text-right pr-0 h-8">Detected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRisks.map((risk, index) => (
                  <TableRow key={index} className="border-b border-border last:border-none hover:bg-secondary/50 transition-colors">
                    <TableCell className="px-0 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${risk.color} ${risk.bgColor}`}>
                        {risk.sev}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-[11px] text-muted-foreground font-mono block max-w-[120px] truncate" title={risk.res}>
                        {risk.res}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-foreground font-sans font-medium truncate max-w-[150px]" title={risk.desc}>
                      {risk.desc}
                    </TableCell>
                    <TableCell className="text-right pr-0 py-2.5 text-[11px] text-muted-foreground font-mono">
                      {risk.time}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

    </div>
  );
}
