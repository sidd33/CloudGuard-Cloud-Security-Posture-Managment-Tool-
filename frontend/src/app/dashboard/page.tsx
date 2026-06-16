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
  ChevronRight
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
    { sev: "CRITICAL", res: "arn:aws:iam::123456789:root", desc: "Root account has active access keys", time: "2h ago", color: "bg-[#FF4560]/10 text-[#FF4560] border-[#FF4560]/20" },
    { sev: "CRITICAL", res: "arn:aws:s3:::prod-backups", desc: "S3 bucket publicly accessible", time: "2h ago", color: "bg-[#FF4560]/10 text-[#FF4560] border-[#FF4560]/20" },
    { sev: "HIGH", res: "arn:aws:iam::123456789:user/deploy", desc: "Access keys not rotated (127 days)", time: "2h ago", color: "bg-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/20" },
    { sev: "HIGH", res: "sg-0a1b2c3d", desc: "SSH port 22 open to 0.0.0.0/0", time: "2h ago", color: "bg-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/20" },
    { sev: "MEDIUM", res: "arn:aws:s3:::logs-bucket", desc: "S3 versioning disabled", time: "2h ago", color: "bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/20" },
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
            const color = f.severity === 'CRITICAL' ? "bg-[#FF4560]/10 text-[#FF4560] border-[#FF4560]/20" :
                          f.severity === 'HIGH' ? "bg-[#F5A623]/10 text-[#F5A623] border-[#F5A623]/20" :
                          "bg-[#00E5FF]/10 text-[#00E5FF] border-[#00E5FF]/20";
            return {
              sev: f.severity,
              res: f.resourceId,
              desc: f.title,
              time: "Just now",
              color
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
      } else {
        // demo mode default is shown by fallback initial states
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
    if (val < 50) return "#FF4560"; // red
    if (val < 75) return "#F5A623"; // amber
    if (val < 90) return "#A3E635"; // yellow-green
    return "#00E5FF"; // cyan
  };

  // Score SVG values
  const radius = 45;
  const circumference = 2 * Math.PI * radius; // 282.74
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const currentColor = getScoreColor(score);

  return (
    <div className="p-8 space-y-6 bg-[#07080F] min-h-screen text-slate-100 font-sans">
      
      {/* TOP BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.05)] pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Infrastructure Overview</h1>
          <p className="text-[13px] text-slate-400 mt-1">Aggregate security telemetry across all monitored AWS environments</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium">Last Synced</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{lastSynced}</p>
          </div>
          <Button 
            onClick={handleSync} 
            disabled={isSyncing}
            variant="outline"
            className="border-[#00E5FF] text-[#00E5FF] hover:bg-[#00E5FF]/10 hover:text-[#00E5FF] bg-transparent h-9 px-4 gap-2 font-medium text-xs rounded transition-colors"
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
        <Card className="bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 flex flex-col justify-between">
          <div className="flex items-center justify-center py-2 relative">
            <svg className="w-[120px] h-[120px] transform -rotate-90">
              <circle
                cx="60"
                cy="60"
                r={radius}
                stroke="rgba(255,255,255,0.04)"
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
              <span className="text-[10px] text-slate-500 font-mono mt-0.5">/ 100</span>
            </div>
          </div>
          <div className="mt-4 flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#00E096]/10 text-[#00E096] text-[11px] font-medium border border-[#00E096]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00E096]" />
              System Healthy
            </div>
            <p className="text-[12px] text-slate-400 font-semibold uppercase tracking-[0.08em] mt-3">Posture Score</p>
          </div>
        </Card>

        {/* Card 2 — ACTIVE FINDINGS */}
        <Card className="bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <p className="text-[12px] text-slate-400 font-semibold uppercase tracking-[0.08em]">Active Findings</p>
            <h2 className="text-40px font-bold text-white tracking-tight mt-4 font-sans leading-none">{activeFindings}</h2>
          </div>
          <div className="mt-6">
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded bg-[#FF4560]/10 text-[#FF4560] text-[11px] font-semibold font-mono border border-[#FF4560]/20">
                {criticalCount} Critical
              </span>
              <span className="px-2 py-1 rounded bg-[#F5A623]/10 text-[#F5A623] text-[11px] font-semibold font-mono border border-[#F5A623]/20">
                {highCount} High
              </span>
              <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 text-[11px] font-semibold font-mono border border-yellow-500/20">
                {mediumCount} Medium
              </span>
            </div>
          </div>
        </Card>

        {/* Card 3 — MONITORED ACCOUNTS */}
        <Card className="bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <p className="text-[12px] text-slate-400 font-semibold uppercase tracking-[0.08em]">Monitored Accounts</p>
            <h2 className="text-40px font-bold text-[#00E5FF] tracking-tight mt-4 font-sans leading-none">{monitoredAccounts}</h2>
          </div>
          <div className="mt-6">
            <span className="text-xs text-slate-400 font-mono bg-[#161B24] border border-[rgba(255,255,255,0.05)] px-2 py-1.5 rounded block truncate">
              {monitoredRegions}
            </span>
          </div>
        </Card>

        {/* Card 4 — LAST SCANNED */}
        <Card className="bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <p className="text-[12px] text-slate-400 font-semibold uppercase tracking-[0.08em]">Last Scanned</p>
            <h2 className="text-24px font-bold text-white tracking-tight mt-5 font-sans leading-none">Just now</h2>
          </div>
          <div className="mt-6">
            <span className="text-[11px] text-slate-500 font-mono block truncate" title={lastScannedTime}>
              {lastScannedTime}
            </span>
          </div>
        </Card>
      </div>

      {/* ROW 2 — TWO COLUMN LAYOUT (60% left, 40% right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT — FINDINGS TREND CHART */}
        <Card className="bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 lg:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LineChart className="w-4 h-4 text-[#00E5FF]" />
              <h3 className="text-sm font-semibold text-white">Findings Over Time</h3>
            </div>
            <span className="text-[11px] text-slate-500">7 Days Trend</span>
          </div>
          
          <div className="h-[300px] w-full mt-2">
            {mounted ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF4560" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#FF4560" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F5A623" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#F5A623" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis 
                    dataKey="day" 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={11} 
                    fontFamily="JetBrains Mono"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.3)" 
                    fontSize={11} 
                    fontFamily="JetBrains Mono"
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 30]}
                  />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: '#161B24',
                      borderColor: '#00E5FF',
                      borderWidth: '1px',
                      borderRadius: '6px',
                      color: '#F8FAFC',
                      fontFamily: 'Inter',
                      fontSize: '12px',
                    }}
                    itemStyle={{ padding: '2px 0' }}
                  />
                  <Area type="monotone" dataKey="critical" stroke="#FF4560" strokeWidth={2} fillOpacity={1} fill="url(#colorCritical)" />
                  <Area type="monotone" dataKey="high" stroke="#F5A623" strokeWidth={2} fillOpacity={1} fill="url(#colorHigh)" />
                  <Area type="monotone" dataKey="medium" stroke="#00E5FF" strokeWidth={2} fillOpacity={1} fill="url(#colorMedium)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Skeleton className="w-full h-full bg-[#161B24]" />
              </div>
            )}
          </div>

          {/* Custom Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-[rgba(255,255,255,0.04)]">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#FF4560] rounded-sm" />
              <span className="text-xs text-slate-400">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#F5A623] rounded-sm" />
              <span className="text-xs text-slate-400">High</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-[#00E5FF] rounded-sm" />
              <span className="text-xs text-slate-400">Medium</span>
            </div>
          </div>
        </Card>

        {/* RIGHT — RISK DISTRIBUTION TABLE */}
        <Card className="bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white">Risk Distribution</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Quantitative analysis of open vulnerabilities</p>
            </div>

            <Table className="border-none mt-2">
              <TableHeader className="bg-transparent border-b border-[rgba(255,255,255,0.05)]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs px-0 h-8">Severity Level</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right h-8">Count</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right h-8">% Total</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right pr-0 h-8">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Critical Row */}
                <TableRow className="border-b border-[rgba(255,255,255,0.05)] hover:bg-white/5 transition-colors">
                  <TableCell className="px-0 py-3 font-medium text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#FF4560]" />
                      Critical
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-slate-300">4</TableCell>
                  <TableCell className="text-right font-mono text-xs text-slate-400">9.5%</TableCell>
                  <TableCell className="text-right pr-0 py-3">
                    <span className="inline-flex px-1.5 py-0.5 rounded bg-[#FF4560]/10 text-[#FF4560] text-[10px] font-semibold border border-[#FF4560]/20">
                      Immediate Action
                    </span>
                  </TableCell>
                </TableRow>
                {/* High Row */}
                <TableRow className="border-b border-[rgba(255,255,255,0.05)] hover:bg-white/5 transition-colors">
                  <TableCell className="px-0 py-3 font-medium text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#F5A623]" />
                      High
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-slate-300">12</TableCell>
                  <TableCell className="text-right font-mono text-xs text-slate-400">28.6%</TableCell>
                  <TableCell className="text-right pr-0 py-3">
                    <span className="inline-flex px-1.5 py-0.5 rounded bg-[#F5A623]/10 text-[#F5A623] text-[10px] font-semibold border border-[#F5A623]/20">
                      Review Recommended
                    </span>
                  </TableCell>
                </TableRow>
                {/* Medium Row */}
                <TableRow className="border-none hover:bg-white/5 transition-colors">
                  <TableCell className="px-0 py-3 font-medium text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
                      Medium
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-slate-300">26</TableCell>
                  <TableCell className="text-right font-mono text-xs text-slate-400">61.9%</TableCell>
                  <TableCell className="text-right pr-0 py-3">
                    <span className="inline-flex px-1.5 py-0.5 rounded bg-[#775DD0]/10 text-[#775DD0] text-[10px] font-semibold border border-[#775DD0]/20">
                      Monitor
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="text-[11px] text-slate-500 pt-3 border-t border-[rgba(255,255,255,0.04)] text-center font-mono">
            Total active vulnerabilities: 42
          </div>
        </Card>
      </div>

      {/* ROW 3 — SERVICE COVERAGE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Service Coverage</h3>
          <span className="text-[11px] text-slate-500">6 Monitored Cloud Resources</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {serviceCoverage.map((srv) => {
            const SrvIcon = srv.icon;
            const worstColor = srv.worst === "Critical" ? "bg-[#FF4560]" : srv.worst === "High" ? "bg-[#F5A623]" : "bg-[#00E5FF]";
            
            return (
              <Card 
                key={srv.name} 
                className="bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 flex flex-col justify-between hover:bg-[#161B24]/40 transition-colors cursor-pointer"
                onClick={() => window.location.href = `/findings?service=${srv.name}`}
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-[#161B24] border border-[rgba(255,255,255,0.05)] flex items-center justify-center">
                    <SrvIcon className="w-4 h-4 text-[#00E5FF]" />
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${worstColor}`}>
                    {srv.findings}
                  </span>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-xs font-semibold text-white font-sans">{srv.name}</h4>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00E096]" />
                    <span className="text-[10px] text-slate-400">{srv.status}</span>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[rgba(255,255,255,0.04)] flex justify-between items-center">
                  <span className="text-[9px] text-slate-500 font-mono tracking-wider">{srv.counts}</span>
                  <ChevronRight className="w-3 h-3 text-slate-600" />
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ROW 4 — BOTTOM TWO COLUMN (50/50) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT — FRAMEWORK COMPLIANCE */}
        <Card className="bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-white">Framework Compliance</h3>
              <p className="text-[12px] text-slate-500 mt-0.5">Standards mapped to AWS environment security posture</p>
            </div>

            <div className="space-y-6 mt-4">
              {/* CIS Benchmarks */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-300">CIS AWS Foundations 1.4</span>
                  <span className="text-xs font-bold text-[#00E5FF] font-mono">68%</span>
                </div>
                <Progress value={68} className="h-1.5 bg-[#161B24]" />
                <p className="text-[10px] text-slate-500 font-mono">68 / 100 controls passing</p>
              </div>

              {/* NIST */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-slate-300">NIST 800-53 Rev 5</span>
                  <span className="text-xs font-bold text-[#00E5FF] font-mono">73%</span>
                </div>
                <Progress value={73} className="h-1.5 bg-[#161B24]" />
                <p className="text-[10px] text-slate-500 font-mono">146 / 200 controls passing</p>
              </div>
            </div>
          </div>
          
          <div className="text-[10px] text-slate-500 border-t border-[rgba(255,255,255,0.04)] pt-3 mt-6 text-center font-mono">
            Compliance scores are updated continuously during security scans.
          </div>
        </Card>

        {/* RIGHT — TOP RISKS TABLE */}
        <Card className="bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Top Open Risks</h3>
              <span className="text-[11px] text-[#FF4560] font-medium font-mono">Action Required</span>
            </div>

            <Table className="border-none mt-2">
              <TableHeader className="bg-transparent border-b border-[rgba(255,255,255,0.05)]">
                <TableRow className="border-none hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs px-0 h-8">Severity</TableHead>
                  <TableHead className="text-slate-400 text-xs h-8">Resource</TableHead>
                  <TableHead className="text-slate-400 text-xs h-8">Finding</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right pr-0 h-8">Detected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRisks.map((risk, index) => (
                  <TableRow key={index} className="border-b border-[rgba(255,255,255,0.05)] last:border-none hover:bg-white/5 transition-colors">
                    <TableCell className="px-0 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${risk.color}`}>
                        {risk.sev}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <span className="text-[11px] text-slate-400 font-mono block max-w-[120px] truncate" title={risk.res}>
                        {risk.res}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 text-xs text-slate-200 font-sans truncate max-w-[150px]" title={risk.desc}>
                      {risk.desc}
                    </TableCell>
                    <TableCell className="text-right pr-0 py-2.5 text-[11px] text-slate-500 font-mono">
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
