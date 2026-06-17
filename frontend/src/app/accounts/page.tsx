"use client";

import { useState, useEffect } from 'react';
import { 
  Cloud, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  Lock
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription
} from "@/components/ui/dialog";
import api from '@/lib/api';

interface FindingBackendType {
  id: string;
  accountId: string;
  severity: string;
  service: string;
  resourceId: string;
  title: string;
  status: string;
  timestamp?: string | null;
}

interface AccountBackendType {
  id: string;
  alias: string;
  region: string;
  lastScore?: number | null;
  lastScanTime?: string | null;
}

export default function Accounts() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Form states
  const [alias, setAlias] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [region, setRegion] = useState("us-east-1");

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      if (Array.isArray(res.data)) {
        let allFindings: FindingBackendType[] = [];
        try {
          const findingsRes = await api.get('/findings');
          allFindings = findingsRes.data || [];
        } catch (e) {
          console.warn("Could not load findings", e);
        }

        const mapped = res.data.map((acc: AccountBackendType) => {
          const accFindings = allFindings.filter((f: FindingBackendType) => f.accountId === acc.id);
          const critical = accFindings.filter((f: FindingBackendType) => f.severity === 'CRITICAL' && f.status === 'OPEN').length;
          const total = accFindings.filter((f: FindingBackendType) => f.status === 'OPEN').length;

          return {
            id: acc.id,
            alias: acc.alias,
            awsId: acc.id && acc.id.length > 12 ? acc.id.substring(0, 12) : acc.id,
            region: acc.region,
            score: acc.lastScore !== null && acc.lastScore !== undefined ? acc.lastScore : 100,
            lastScanned: acc.lastScanTime ? new Date(acc.lastScanTime).toLocaleTimeString() + " " + new Date(acc.lastScanTime).toLocaleDateString() : "Never scanned",
            totalFindings: total,
            criticalFindings: critical,
            isScanning: false
          };
        });
        setAccounts(mapped);
      } else {
        setAccounts([]);
      }
    } catch (err) {
      console.error("Backend accounts API failed.", err);
      setAccounts([]);
    }
  };

  const handleScan = async (id: string) => {
    setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, isScanning: true } : acc));
    try {
      await api.post(`/accounts/${id}/scan`);
      // Reload the accounts after 4 seconds once the background scanner has run
      setTimeout(() => {
        loadAccounts();
      }, 4000);
    } catch (err) {
      console.error("Scan trigger failed", err);
      setAccounts(prev => prev.map(acc => acc.id === id ? { ...acc, isScanning: false } : acc));
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await api.delete(`/accounts/${id}`);
      loadAccounts();
    } catch (err) {
      console.error("Remove failed", err);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alias || !accessKey || !secretKey) return;

    try {
      // Connect new account to database
      const res = await api.post('/accounts', {
        alias,
        accessKey,
        secretKey,
        region
      });
      
      const newAcc = res.data;
      
      // Close dialog immediately
      setIsOpen(false);
      setAlias("");
      setAccessKey("");
      setSecretKey("");
      setRegion("us-east-1");

      // Reload list so that it shows the new account in scanning status
      loadAccounts();

      // Trigger scan in background
      await api.post(`/accounts/${newAcc.id}/scan`);
      
      // Reload again after 4 seconds to show results
      setTimeout(() => {
        loadAccounts();
      }, 4000);

    } catch (error: unknown) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      console.error("Add account error details:", err.response?.data || err.message || err);
      const errMsg = err.response?.data?.error || "Please check your inputs.";
      alert(`Failed to connect account. Error: ${errMsg}`);
    }
  };

  const drawMiniDonut = (score: number, isScanning: boolean) => {
    if (isScanning) {
      return (
        <div className="relative w-[60px] h-[60px] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      );
    }

    const r = 22;
    const circ = 2 * Math.PI * r; // ~138.2
    const offset = circ - (score / 100) * circ;
    
    // Score color logic
    let color = "var(--status-safe)"; // cyan/green
    if (score < 50) color = "var(--status-critical)"; // red
    else if (score < 75) color = "var(--status-high)"; // amber
    else if (score < 90) color = "var(--status-medium)"; // yellow-green

    return (
      <div className="relative w-[60px] h-[60px] flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="30"
            cy="30"
            r={r}
            stroke="var(--border)"
            strokeWidth="4.5"
            fill="transparent"
          />
          <circle
            cx="30"
            cy="30"
            r={r}
            stroke={color}
            strokeWidth="4.5"
            fill="transparent"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[12px] font-bold text-foreground font-sans">{score}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen text-foreground font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight font-sans">AWS Accounts</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Connect and audit cloud environments under multi-tenant security monitors</p>
        </div>
        <Button 
          onClick={() => setIsOpen(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 gap-2 font-bold text-xs rounded transition-colors"
        >
          <Plus className="w-4 h-4 text-primary-foreground" />
          Add Account
        </Button>
      </div>

      {/* Grid wrapper */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {accounts.length === 0 ? (
          <div className="col-span-full border border-dashed border-border rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4">
            <Cloud className="w-12 h-12 text-muted-foreground" />
            <div>
              <p className="text-foreground font-semibold text-sm font-sans">No accounts configured</p>
              <p className="text-muted-foreground text-xs mt-1 font-sans">Onboard an AWS credentials profile to orchestrate compliance checks.</p>
            </div>
            <Button 
              onClick={() => setIsOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9 px-4 font-bold rounded"
            >
              Connect First Account
            </Button>
          </div>
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          accounts.map((acc: any) => (
            <Card key={acc.id} className="bg-card border border-border shadow-sm rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
              <CardContent className="p-6 space-y-5">
                
                {/* Header row */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-base font-bold text-foreground tracking-tight">{acc.alias}</h3>
                    <p className="text-xs text-muted-foreground font-sans mt-1">ID: {acc.awsId}</p>
                  </div>
                  <Badge variant="outline" className="bg-muted border-border text-foreground text-[10px] font-sans rounded">
                    {acc.region}
                  </Badge>
                </div>

                {/* Score and status row */}
                <div className="flex items-center justify-between py-2 border-y border-border">
                  <div className="flex items-center gap-4">
                    {drawMiniDonut(acc.score, acc.isScanning)}
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Security Score</p>
                      <p className="text-xs text-foreground font-sans mt-0.5">
                        {acc.isScanning ? "Evaluating Rules..." : acc.score >= 90 ? "Excellent Posture" : acc.score >= 75 ? "Satisfactory" : "At Risk"}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Last Checked</p>
                    <p className="text-xs text-foreground font-sans mt-0.5">{acc.lastScanned}</p>
                  </div>
                </div>

                {/* Details row */}
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[var(--status-critical)]" />
                      <span className="text-muted-foreground font-sans">{acc.criticalFindings} Critical</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[var(--status-high)]" />
                      <span className="text-muted-foreground font-sans">{acc.totalFindings} Total</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      onClick={() => handleScan(acc.id)} 
                      disabled={acc.isScanning}
                      variant="outline"
                      className="border-border text-foreground hover:bg-muted bg-card h-8 px-3 text-xs rounded transition-colors shadow-sm"
                    >
                      {acc.isScanning ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Scan Now
                    </Button>
                    <Button 
                      onClick={() => handleRemove(acc.id)}
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* CONNECT AWS DIALOG MODAL */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-[440px] bg-card border border-border text-foreground p-6 rounded-xl shadow-lg font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground tracking-tight">Connect AWS Account</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs mt-1">
              Synchronize audit records by mounting read-only IAM security roles.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddAccount} className="space-y-4 py-3">
            {/* Alias field */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium font-sans">Account Alias</label>
              <Input 
                type="text" 
                placeholder="production-main" 
                value={alias}
                onChange={e => setAlias(e.target.value)}
                required
                className="bg-card border border-border text-foreground placeholder:text-muted-foreground h-9 rounded text-xs focus:border-primary focus:ring-1 focus:ring-primary transition-colors font-sans"
              />
            </div>

            {/* Access Key ID field */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium font-sans">AWS Access Key ID</label>
              <Input 
                type="password" 
                placeholder="AKIAIOSFODNN7EXAMPLE" 
                value={accessKey}
                onChange={e => setAccessKey(e.target.value)}
                required
                className="bg-card border border-border text-foreground placeholder:text-muted-foreground h-9 rounded text-xs font-sans focus:border-primary focus:ring-1 focus:ring-primary transition-colors tracking-wide"
              />
            </div>

            {/* Secret Access Key field */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium font-sans">AWS Secret Access Key</label>
              <Input 
                type="password" 
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" 
                value={secretKey}
                onChange={e => setSecretKey(e.target.value)}
                required
                className="bg-card border border-border text-foreground placeholder:text-muted-foreground h-9 rounded text-xs font-sans focus:border-primary focus:ring-1 focus:ring-primary transition-colors tracking-wide"
              />
            </div>

            {/* Region dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground font-medium font-sans">Default Region</label>
              <Select value={region} onValueChange={(val) => setRegion(val || "us-east-1")}>
                <SelectTrigger className="w-full bg-card border border-border text-foreground h-9 text-xs rounded font-sans">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border text-foreground font-sans">
                  <SelectItem value="us-east-1">us-east-1 (N. Virginia)</SelectItem>
                  <SelectItem value="us-west-2">us-west-2 (Oregon)</SelectItem>
                  <SelectItem value="eu-west-1">eu-west-1 (Ireland)</SelectItem>
                  <SelectItem value="ap-south-1">ap-south-1 (Mumbai)</SelectItem>
                  <SelectItem value="ap-northeast-1">ap-northeast-1 (Tokyo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Encrypted credentials notice */}
            <div className="flex items-center gap-2 p-2.5 rounded bg-orange-50 border border-orange-200 text-orange-600">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <p className="text-[10px] leading-normal font-sans font-medium">
                Credentials are encrypted with AES-256-GCM before storage.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
              <Button
                type="button"
                onClick={() => setIsOpen(false)}
                variant="outline"
                className="border-border text-foreground hover:bg-muted bg-card h-9 text-xs rounded transition-colors font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 font-bold text-xs rounded transition-colors"
              >
                Connect & Scan
              </Button>
            </div>

          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
