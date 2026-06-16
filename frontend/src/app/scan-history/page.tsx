"use client";

import { useState, useEffect } from 'react';
import { 
  History, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Info
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import api from '@/lib/api';

interface ScanHistoryType {
  id: string;
  timestamp: string;
  fullTime: string;
  account: string;
  duration: string;
  total: string;
  critical: string;
  status: string;
  error: string | null;
}

interface AccountBackendType {
  id: string;
  alias: string;
  region: string;
  lastScore?: number | null;
  lastScanTime?: string | null;
}

interface ScanBackendType {
  id: string;
  accountId: string;
  startTime: string | null;
  endTime: string | null;
  status: string;
  totalFindings: number;
  findingsBySeverity?: Record<string, number> | null;
  findingsByService?: Record<string, number> | null;
}

const initialHistory = [
  {
    id: "scan-1",
    timestamp: "Just now",
    fullTime: "2026-06-16T02:56:00.000Z",
    account: "production-main",
    duration: "Running...",
    total: "Calculating...",
    critical: "Calculating...",
    status: "RUNNING",
    error: null
  },
  {
    id: "scan-2",
    timestamp: "30 mins ago",
    fullTime: "2026-06-16T02:30:15Z",
    account: "production-main",
    duration: "12.4s",
    total: "14",
    critical: "1",
    status: "COMPLETED",
    error: null
  },
  {
    id: "scan-3",
    timestamp: "45 mins ago",
    fullTime: "2026-06-16T02:15:00Z",
    account: "staging-environment",
    duration: "8.2s",
    total: "28",
    critical: "3",
    status: "COMPLETED",
    error: null
  },
  {
    id: "scan-4",
    timestamp: "2 hours ago",
    fullTime: "2026-06-16T01:00:22Z",
    account: "production-main",
    duration: "14.1s",
    total: "15",
    critical: "2",
    status: "COMPLETED",
    error: null
  },
  {
    id: "scan-5",
    timestamp: "3 hours ago",
    fullTime: "2026-06-15T23:30:00Z",
    account: "staging-environment",
    duration: "0.0s",
    total: "0",
    critical: "0",
    status: "FAILED",
    error: "AccessDenied: Client is not authorized to assume role or read configurations"
  },
  {
    id: "scan-6",
    timestamp: "7 hours ago",
    fullTime: "2026-06-15T20:00:00Z",
    account: "production-main",
    duration: "11.8s",
    total: "18",
    critical: "2",
    status: "COMPLETED",
    error: null
  },
  {
    id: "scan-7",
    timestamp: "8 hours ago",
    fullTime: "2026-06-15T18:45:00Z",
    account: "staging-environment",
    duration: "7.9s",
    total: "29",
    critical: "3",
    status: "COMPLETED",
    error: null
  },
  {
    id: "scan-8",
    timestamp: "15 hours ago",
    fullTime: "2026-06-15T12:00:00Z",
    account: "production-main",
    duration: "13.2s",
    total: "19",
    critical: "2",
    status: "COMPLETED",
    error: null
  },
  {
    id: "scan-9",
    timestamp: "19 hours ago",
    fullTime: "2026-06-15T08:00:00Z",
    account: "staging-environment",
    duration: "8.5s",
    total: "32",
    critical: "4",
    status: "COMPLETED",
    error: null
  },
  {
    id: "scan-10",
    timestamp: "1 day ago",
    fullTime: "2026-06-14T20:00:00Z",
    account: "production-main",
    duration: "12.9s",
    total: "20",
    critical: "3",
    status: "COMPLETED",
    error: null
  },
  {
    id: "scan-11",
    timestamp: "1 day ago",
    fullTime: "2026-06-14T18:00:00Z",
    account: "staging-environment",
    duration: "0.0s",
    total: "0",
    critical: "0",
    status: "FAILED",
    error: "ConnectionTimeout: STS endpoints did not respond within 5000ms"
  }
];

export default function ScanHistory() {
  const [history, setHistory] = useState<ScanHistoryType[]>(initialHistory);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadScanHistory();
  }, []);

  const loadScanHistory = async () => {
    try {
      const accountsRes = await api.get('/accounts');
      const accountsList = accountsRes.data || [];
      const hasAccounts = accountsList.length > 0;

      const res = await api.get('/scans');
      if (hasAccounts) {
        const mapped = (res.data || []).map((scan: ScanBackendType) => {
          const acc = accountsList.find((a: AccountBackendType) => a.id === scan.accountId);
          const accountAlias = acc ? acc.alias : `Account (${scan.accountId})`;
          
          let duration = "-";
          if (scan.startTime && scan.endTime) {
            const diff = new Date(scan.endTime).getTime() - new Date(scan.startTime).getTime();
            duration = `${(diff / 1000).toFixed(1)}s`;
          } else if (scan.status === "RUNNING") {
            duration = "Running...";
          }

          const crit = scan.findingsBySeverity?.CRITICAL || 0;

          return {
            id: scan.id,
            timestamp: scan.startTime ? new Date(scan.startTime).toLocaleTimeString() + " " + new Date(scan.startTime).toLocaleDateString() : "Just now",
            fullTime: scan.startTime || "",
            account: accountAlias,
            duration,
            total: scan.status === "RUNNING" ? "Calculating..." : String(scan.totalFindings || 0),
            critical: scan.status === "RUNNING" ? "Calculating..." : String(crit),
            status: scan.status || "COMPLETED",
            error: scan.status === "FAILED" ? "Scan execution encountered scanner failures" : null
          };
        });
        setHistory(mapped);
      } else {
        setHistory(initialHistory);
      }
    } catch (err) {
      console.warn("Backend scans API failed, using demo data.", err);
      setHistory(initialHistory);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadScanHistory().finally(() => {
      setIsRefreshing(false);
    });
  };

  const getStatusBadge = (status: string, error: string | null) => {
    switch (status) {
      case 'RUNNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 font-sans">
            <Loader2 className="w-3 h-3 animate-spin" />
            RUNNING
          </span>
        );
      case 'FAILED':
        return (
          <span 
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-destructive/10 text-destructive text-[10px] font-bold border border-destructive/20 font-sans cursor-pointer"
            title={error || "Scan failed due to an internal error"}
          >
            <XCircle className="w-3 h-3" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1f883d]/10 text-[#1f883d] text-[10px] font-bold border border-[#1f883d]/20 font-sans">
            <CheckCircle className="w-3 h-3" />
            COMPLETED
          </span>
        );
    }
  };

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen text-foreground font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight font-sans flex items-center gap-2">
            <History className="w-6 h-6 text-primary" />
            Scan History
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">Audit log of compliance check runs across connected cloud nodes</p>
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          variant="outline"
          className="border-border text-foreground hover:bg-muted bg-card h-9 px-4 gap-2 font-semibold text-xs rounded transition-colors shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Log
        </Button>
      </div>

      {/* Main Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30 border-b border-border">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 w-[150px]">Timestamp</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10">AWS Account</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 w-[110px]">Duration</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 w-[120px]">Total Findings</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 w-[100px]">Critical</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 w-[120px]">Status</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 pr-6 w-[220px]">Error Details / Execution Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((scan) => (
              <TableRow 
                key={scan.id} 
                className="border-b border-border last:border-none hover:bg-muted/50 transition-colors"
              >
                <TableCell className="py-3 font-sans text-[11px] text-muted-foreground" title={scan.fullTime}>
                  {scan.timestamp}
                </TableCell>
                <TableCell className="py-3 font-semibold text-xs text-foreground font-sans">
                  {scan.account}
                </TableCell>
                <TableCell className="py-3 font-sans text-xs text-foreground">
                  {scan.duration}
                </TableCell>
                <TableCell className="py-3 font-sans text-xs text-foreground">
                  {scan.total}
                </TableCell>
                <TableCell className="py-3 font-sans text-xs text-foreground">
                  {scan.status === "FAILED" ? "-" : (
                    <span className={scan.critical !== "0" && scan.critical !== "Calculating..." ? "text-destructive font-bold" : "text-muted-foreground"}>
                      {scan.critical}
                    </span>
                  )}
                </TableCell>
                <TableCell className="py-3">
                  {getStatusBadge(scan.status, scan.error)}
                </TableCell>
                <TableCell className="py-3 pr-6 text-xs text-muted-foreground max-w-[220px] truncate font-sans" title={scan.error || "No errors encountered"}>
                  {scan.error ? (
                    <span className="text-orange-600 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {scan.error}
                    </span>
                  ) : scan.status === "RUNNING" ? (
                    <span className="text-primary font-medium">Orchestrating scanner tasks...</span>
                  ) : (
                    "Execution successful"
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Info notice */}
      <div className="flex items-start gap-2.5 p-4 rounded bg-muted border border-border text-muted-foreground text-xs">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-foreground font-bold font-sans">Audit Logging Policy</p>
          <p className="leading-relaxed font-sans">
            Scan logs are retained for 30 days. Inbound requests to the scanning API trigger parallel scanners that execute on secondary threads, resolving credentials and emitting SSE events for live updates.
          </p>
        </div>
      </div>

    </div>
  );
}
