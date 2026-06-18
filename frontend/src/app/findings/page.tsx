"use client";

import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Download, 
  EyeOff, 
  CheckCircle, 
  SlidersHorizontal,
  Wand2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Sheet, 
  SheetContent
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import api from '@/lib/api';
import { AUTO_REMEDIABLE, MANUAL_ONLY } from '@/lib/constants';

interface FindingType {
  id: string;
  checkId: string;
  severity: string;
  service: string;
  resourceId: string;
  title: string;
  framework: string;
  status: string;
  detected: string;
  desc: string;
  remediation: string[];
}

interface FindingBackendType {
  id: string;
  checkId: string;
  severity: string;
  service: string;
  resourceId: string;
  title: string;
  status: string;
  timestamp?: string | null;
  description?: string | null;
  remediationSteps?: string | null;
  framework?: string[] | null;
}

// Initial realistic findings data
const initialFindings: FindingType[] = [
  {
    id: "find-1",
    checkId: "IAM_003",
    severity: "CRITICAL",
    service: "IAM",
    resourceId: "arn:aws:iam::123456789:root",
    title: "Root account has active access keys",
    framework: "CIS 1.1, NIST AC-2",
    status: "Open",
    detected: "2h ago",
    desc: "The root user account has access keys configured. Root access keys allow unrestricted access to all resources in your AWS account and cannot be limited by IAM policies.",
    remediation: [
      "Log in to the AWS Management Console as the root user.",
      "Navigate to the IAM Dashboard.",
      "Select 'Manage Security Credentials'.",
      "Locate the Access Keys section and delete or deactivate all root access keys.",
      "Create individual IAM users with least privilege permissions for daily operations."
    ]
  },
  {
    id: "find-2",
    checkId: "S3_001",
    severity: "CRITICAL",
    service: "S3",
    resourceId: "arn:aws:s3:::prod-backups",
    title: "S3 bucket publicly accessible",
    framework: "CIS 2.1, NIST CP-9",
    status: "Open",
    detected: "2h ago",
    desc: "The S3 bucket 'prod-backups' allows public read/write access. This exposes sensitive database backups to the public internet, posing a severe data leakage risk.",
    remediation: [
      "Navigate to the S3 service in the AWS Console.",
      "Click on the 'prod-backups' bucket.",
      "Select the 'Permissions' tab.",
      "Enable 'Block all public access'.",
      "Save changes and verify bucket policy does not contain Principal: '*'."
    ]
  },
  {
    id: "find-3",
    checkId: "IAM_002",
    severity: "HIGH",
    service: "IAM",
    resourceId: "arn:aws:iam::123456789:user/deploy|AKIAIOSFODNN7EXAMPLE",
    title: "Access keys not rotated (127 days)",
    framework: "CIS 1.4, NIST IA-2",
    status: "Open",
    detected: "2h ago",
    desc: "The access keys for user 'deploy' have not been rotated in 127 days. AWS recommends rotating access credentials every 90 days to minimize risk of credential exposure.",
    remediation: [
      "Log in as administrator and navigate to IAM.",
      "Locate the 'deploy' user and navigate to 'Security credentials'.",
      "Generate a new access key and update your deployment environment scripts.",
      "Deactivate and delete the old access key."
    ]
  },
  {
    id: "find-4",
    checkId: "EC2_001",
    severity: "HIGH",
    service: "EC2",
    resourceId: "sg-0a1b2c3d",
    title: "SSH port 22 open to 0.0.0.0/0",
    framework: "CIS 5.1, NIST SC-7",
    status: "Open",
    detected: "2h ago",
    desc: "The security group sg-0a1b2c3d has an inbound rule permitting SSH access on port 22 from any IP address (0.0.0.0/0). This exposes your instances to brute force SSH attacks.",
    remediation: [
      "Navigate to EC2 > Security Groups in the console.",
      "Select security group sg-0a1b2c3d.",
      "Click 'Edit inbound rules'.",
      "Change the source of Port 22 from 'Anywhere-IPv4' (0.0.0.0/0) to your corporate CIDR block or specific bastion host IP.",
      "Save rules."
    ]
  },
  {
    id: "find-5",
    checkId: "S3_003",
    severity: "MEDIUM",
    service: "S3",
    resourceId: "arn:aws:s3:::logs-bucket",
    title: "S3 versioning disabled",
    framework: "CIS 2.2, NIST CP-10",
    status: "Open",
    detected: "2h ago",
    desc: "S3 versioning is disabled on logs-bucket. Versioning helps protect objects from accidental deletion or overwrite by maintaining multiple historical versions.",
    remediation: [
      "Go to the S3 dashboard.",
      "Select 'logs-bucket'.",
      "Under the 'Properties' tab, locate 'Bucket Versioning'.",
      "Click 'Edit' and select 'Enable'.",
      "Save changes."
    ]
  }
];

export default function Findings() {
  const [findings, setFindings] = useState<FindingType[]>(initialFindings);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [frameworkFilter, setFrameworkFilter] = useState("ALL");
  const [selectedFinding, setSelectedFinding] = useState<FindingType | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  
  const [remediateFinding, setRemediateFinding] = useState<FindingType | null>(null);
  const [isRemediating, setIsRemediating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [remediationLog, setRemediationLog] = useState<any[]>([]);
  const [toastMsg, setToastMsg] = useState<{title: string, error?: boolean} | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const serviceParam = params.get('service');
      if (serviceParam) {
        setServiceFilter(serviceParam.toUpperCase());
      }
      
      const cache = sessionStorage.getItem('findingsCache');
      if (cache) {
        try {
          setFindings(JSON.parse(cache));
        } catch(e) {}
      }
    }
    loadFindings();
  }, []);

  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  const loadFindings = async () => {
    try {
      const accountsRes = await api.get('/accounts');
      const hasAccounts = accountsRes.data && accountsRes.data.length > 0;

      const res = await api.get('/findings');
      if (hasAccounts) {
        const mapped = (res.data || []).map((f: FindingBackendType) => {
          return {
            id: f.id,
            checkId: f.checkId || "UNKNOWN",
            severity: f.severity,
            service: f.service,
            resourceId: f.resourceId,
            title: f.title,
            framework: f.framework && f.framework.length > 0 ? f.framework.join(", ") : "CIS 1.1",
            status: f.status === "OPEN" ? "Open" : f.status === "RESOLVED" ? "Resolved" : f.status === "REMEDIATION_FAILED" ? "REMEDIATION_FAILED" : "Suppressed",
            detected: f.timestamp ? new Date(f.timestamp).toLocaleDateString() : "Just now",
            desc: f.description || f.title,
            remediation: f.remediationSteps ? f.remediationSteps.split("\n") : ["Go to AWS Console.", "Locate the affected resource.", "Remediate according to security guidelines."]
          };
        });
        
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('findingsCache', JSON.stringify(mapped));
        }
        setFindings(mapped);
      } else {
        setFindings(initialFindings);
      }
    } catch (err) {
      console.warn("Backend findings API failed, using demo data.", err);
      setFindings(initialFindings);
    }
  };

  const handleResolve = async (id: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    try {
      if (id.startsWith("find-")) {
        setFindings(prev => prev.map(f => f.id === id ? { ...f, status: "Resolved" } : f));
        if (selectedFinding?.id === id) {
          setSelectedFinding(prev => prev ? { ...prev, status: "Resolved" } : null);
        }
        return;
      }
      await api.patch(`/findings/${id}`, { status: "RESOLVED" });
      loadFindings();
    } catch (err) {
      console.error("Resolve failed", err);
    }
  };

  const handleSuppress = async (id: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    try {
      if (id.startsWith("find-")) {
        setFindings(prev => prev.map(f => f.id === id ? { ...f, status: "Suppressed" } : f));
        if (selectedFinding?.id === id) {
          setSelectedFinding(prev => prev ? { ...prev, status: "Suppressed" } : null);
        }
        return;
      }
      await api.patch(`/findings/${id}`, { status: "SUPPRESSED" });
      loadFindings();
    } catch (err) {
      console.error("Suppress failed", err);
    }
  };

  const handleAutoFixClick = (finding: FindingType, e: React.MouseEvent) => {
    e.stopPropagation();
    setRemediateFinding(finding);
    setDialogOpen(true);
  };

  const confirmRemediation = async () => {
    if (!remediateFinding) return;
    setIsRemediating(true);
    try {
      if (remediateFinding.id.startsWith("find-")) {
        await new Promise(r => setTimeout(r, 1000));
        setFindings(prev => prev.map(f => f.id === remediateFinding.id ? { ...f, status: "Resolved" } : f));
        setToastMsg({ title: `Remediated: ${remediateFinding.title}` });
      } else {
        const res = await api.post(`/findings/${remediateFinding.id}/remediate`);
        if (res.data.success) {
          setFindings(prev => prev.map(f => f.id === remediateFinding.id ? { ...f, status: "Resolved" } : f));
          setToastMsg({ title: `Remediated: ${remediateFinding.title}` });
        } else {
          setFindings(prev => prev.map(f => f.id === remediateFinding.id ? { ...f, status: "REMEDIATION_FAILED" } : f));
          setToastMsg({ title: `Failed: ${res.data.message}`, error: true });
        }
      }
    } catch (err: any) {
      setToastMsg({ title: "Remediation API Error", error: true });
      setFindings(prev => prev.map(f => f.id === remediateFinding.id ? { ...f, status: "REMEDIATION_FAILED" } : f));
    } finally {
      setIsRemediating(false);
      setDialogOpen(false);
      if (selectedFinding?.id === remediateFinding?.id) {
         setSelectedFinding(findings.find(f => f.id === remediateFinding?.id) || null);
      }
      setRemediateFinding(null);
    }
  };

  const filteredFindings = findings.filter(f => {
    const matchesSearch = 
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.resourceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.service.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity = severityFilter === "ALL" || f.severity === severityFilter;
    const matchesService = serviceFilter === "ALL" || f.service === serviceFilter;
    const matchesStatus = statusFilter === "ALL" || f.status === statusFilter || (statusFilter === "Open" && f.status === "REMEDIATION_FAILED");
    const matchesFramework = frameworkFilter === "ALL" || f.framework.includes(frameworkFilter);

    return matchesSearch && matchesSeverity && matchesService && matchesStatus && matchesFramework;
  });

  const getSeverityBadge = (sev: string) => {
    switch(sev) {
      case 'CRITICAL': 
        return <span className="inline-flex px-2 py-0.5 rounded bg-[#d13212] text-white text-[10px] font-bold font-sans tracking-wide">CRITICAL</span>;
      case 'HIGH': 
        return <span className="inline-flex px-2 py-0.5 rounded bg-[#ff9900] text-white text-[10px] font-bold font-sans tracking-wide">HIGH</span>;
      case 'MEDIUM': 
        return <span className="inline-flex px-2 py-0.5 rounded bg-[#0066cc] text-white text-[10px] font-bold font-sans tracking-wide">MEDIUM</span>;
      default: 
        return <span className="inline-flex px-2 py-0.5 rounded bg-slate-500 text-white text-[10px] font-bold font-sans tracking-wide">LOW</span>;
    }
  };

  const getStatusIndicator = (status: string) => {
    switch(status) {
      case 'Resolved':
        return (
          <div className="flex items-center gap-1.5 text-xs text-foreground font-medium font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1f883d]" />
            Resolved
          </div>
        );
      case 'Suppressed':
        return (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-[#687076]" />
            Suppressed
          </div>
        );
      case 'REMEDIATION_FAILED':
        return (
          <div className="flex items-center gap-1.5 text-xs text-red-500 font-medium font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Failed
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-xs text-foreground font-medium font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-[#d13212]" />
            Open
          </div>
        );
    }
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Severity,Service,Resource,Finding,Framework,Status,Detected"].join(",") + "\n"
      + filteredFindings.map(f => `"${f.severity}","${f.service}","${f.resourceId}","${f.title}","${f.framework}","${f.status}","${f.detected}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cloudguard_findings_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openDetails = async (finding: FindingType) => {
    setSelectedFinding(finding);
    setPanelOpen(true);
    setRemediationLog([]);
    if (finding.status === "Resolved" && !finding.id.startsWith("find-")) {
      try {
        const res = await api.get(`/findings/${finding.id}/remediation-log`);
        setRemediationLog(res.data || []);
      } catch (e) {}
    } else if (finding.status === "Resolved" && finding.id.startsWith("find-")) {
       setRemediationLog([{ actionTaken: "Mocked action from initial data", executedAt: new Date().toISOString() }]);
    }
  };

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen text-foreground font-sans relative">
      
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded shadow-lg border ${toastMsg.error ? 'bg-red-50 text-red-900 border-red-200' : 'bg-green-50 text-green-900 border-green-200'} font-sans text-sm font-medium animate-in slide-in-from-top-2`}>
          {toastMsg.title}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight font-sans">Vulnerability Findings</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Audit log of real-time security vulnerabilities across AWS monitoring pipelines</p>
        </div>
        <Button 
          onClick={handleExportCSV} 
          variant="outline"
          className="border-border text-foreground bg-card hover:bg-muted h-9 px-4 gap-2 font-semibold text-xs rounded transition-colors shadow-sm font-sans"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Search findings, resources, ARNs..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 bg-card border border-border text-foreground placeholder:text-muted-foreground h-9 rounded focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors font-sans"
          />
        </div>

        {/* Filter Selection Row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-sans font-medium">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <Select value={severityFilter} onValueChange={(val) => setSeverityFilter(val || "ALL")}>
            <SelectTrigger className="w-[140px] bg-card border border-border text-foreground h-8 text-xs rounded font-sans">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border text-foreground font-sans">
              <SelectItem value="ALL">All Severities</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={serviceFilter} onValueChange={(val) => setServiceFilter(val || "ALL")}>
            <SelectTrigger className="w-[140px] bg-card border border-border text-foreground h-8 text-xs rounded font-sans">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border text-foreground font-sans">
              <SelectItem value="ALL">All Services</SelectItem>
              <SelectItem value="IAM">IAM</SelectItem>
              <SelectItem value="S3">S3</SelectItem>
              <SelectItem value="EC2">EC2</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || "ALL")}>
            <SelectTrigger className="w-[140px] bg-card border border-border text-foreground h-8 text-xs rounded font-sans">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border text-foreground font-sans">
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="Resolved">Resolved</SelectItem>
              <SelectItem value="Suppressed">Suppressed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={frameworkFilter} onValueChange={(val) => setFrameworkFilter(val || "ALL")}>
            <SelectTrigger className="w-[140px] bg-card border border-border text-foreground h-8 text-xs rounded font-sans">
              <SelectValue placeholder="Framework" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border text-foreground font-sans">
              <SelectItem value="ALL">All Frameworks</SelectItem>
              <SelectItem value="CIS">CIS</SelectItem>
              <SelectItem value="NIST">NIST</SelectItem>
              <SelectItem value="CUSTOM">Custom Policy</SelectItem>
            </SelectContent>
          </Select>

          {(searchTerm !== "" || severityFilter !== "ALL" || serviceFilter !== "ALL" || statusFilter !== "ALL" || frameworkFilter !== "ALL") && (
            <Button
              onClick={() => {
                setSearchTerm("");
                setSeverityFilter("ALL");
                setServiceFilter("ALL");
                setStatusFilter("ALL");
                setFrameworkFilter("ALL");
              }}
              variant="ghost"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground font-sans"
            >
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/30 border-b border-border">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 w-[110px]">Severity</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 w-[80px]">Service</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10">Resource ARN</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10">Finding</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 w-[200px]">Framework</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 w-[100px]">Status</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 w-[120px]">Remediate</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 text-right w-[90px] pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFindings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center space-y-2 py-8">
                    <ShieldAlert className="w-8 h-8 text-muted-foreground" />
                    <p className="text-foreground text-sm font-semibold font-sans">No findings discoverable</p>
                    <p className="text-muted-foreground text-xs font-sans">Verify your search term or select other filters.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredFindings.map((finding) => (
                <TableRow 
                  key={finding.id} 
                  onClick={() => openDetails(finding)}
                  className="border-b border-border last:border-none hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <TableCell className="py-3">{getSeverityBadge(finding.severity)}</TableCell>
                  <TableCell className="py-3 font-sans text-xs text-foreground font-semibold">{finding.service}</TableCell>
                  <TableCell className="py-3 max-w-[200px]">
                    <Tooltip>
                      <TooltipTrigger render={
                        <span className="font-sans text-[11px] text-muted-foreground block truncate" />
                      }>
                        {finding.resourceId}
                      </TooltipTrigger>
                      <TooltipContent className="bg-card border border-border text-foreground font-sans text-[10px] shadow-sm">
                        {finding.resourceId}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="py-3 text-xs text-foreground font-medium font-sans">{finding.title}</TableCell>
                  <TableCell className="py-3">
                    <div className="flex flex-wrap gap-1">
                      {finding.framework.split(',').map((fw, index) => {
                        const isCustom = fw.trim().toUpperCase() === "CUSTOM" || fw.trim().toUpperCase().includes("CUSTOM");
                        return (
                          <span key={index} className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-sans font-medium border ${isCustom ? 'bg-purple-500/10 text-purple-500 border-purple-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                            {fw.trim()}
                          </span>
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">{getStatusIndicator(finding.status)}</TableCell>
                  <TableCell className="py-3" onClick={(e) => e.stopPropagation()}>
                    {finding.status === "Resolved" && (
                      <span className="text-xs text-[#1f883d] font-semibold flex items-center gap-1">Fixed ✓</span>
                    )}
                    {(finding.status === "Open" || finding.status === "REMEDIATION_FAILED") && AUTO_REMEDIABLE.includes(finding.checkId) && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={(e) => handleAutoFixClick(finding, e)}
                        className={finding.status === "REMEDIATION_FAILED" ? "border-red-500 text-red-500 hover:bg-red-500/10 h-7 text-xs px-2" : "border-cyan-500 text-cyan-600 bg-cyan-500/10 hover:bg-cyan-500/20 h-7 text-xs px-2 gap-1.5"}
                      >
                        {finding.status === "REMEDIATION_FAILED" ? "Retry" : <><Wand2 className="w-3 h-3" /> Auto-Fix</>}
                      </Button>
                    )}
                    {finding.status === "Open" && MANUAL_ONLY.includes(finding.checkId) && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="ghost" disabled className="h-7 text-xs px-2 cursor-not-allowed">Manual Only</Button>
                        </TooltipTrigger>
                        <TooltipContent>Root access keys cannot be deleted programmatically.</TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Tooltip>
                        <TooltipTrigger 
                          onClick={(e) => handleSuppress(finding.id, e)}
                          disabled={finding.status === "Suppressed"}
                          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted disabled:opacity-30 rounded"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-card border border-border text-foreground text-xs font-sans shadow-sm">
                          Suppress Finding
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger 
                          onClick={(e) => handleResolve(finding.id, e)}
                          disabled={finding.status === "Resolved"}
                          className="h-7 w-7 flex items-center justify-center text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted disabled:opacity-30 rounded"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-card border border-border text-foreground text-xs font-sans shadow-sm">
                          Mark Resolved
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* DETAIL SLIDE-OVER (SHEET) */}
      <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] bg-card border-l border-border text-foreground p-6 flex flex-col justify-between overflow-y-auto font-sans">
          {selectedFinding && (
            <div className="space-y-6 flex-1 flex flex-col justify-between h-full">
              <div className="space-y-6">
                
                {/* Panel Title */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    {getSeverityBadge(selectedFinding.severity)}
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-muted border border-border text-foreground font-sans">
                      {selectedFinding.service}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-foreground leading-tight font-sans">
                    {selectedFinding.title}
                  </h2>
                </div>

                {/* Auto Remediate Button Inside Panel */}
                {['Open', 'REMEDIATION_FAILED'].includes(selectedFinding.status) && AUTO_REMEDIABLE.includes(selectedFinding.checkId) && (
                  <Button onClick={(e) => handleAutoFixClick(selectedFinding, e)} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs">
                    <Wand2 className="w-4 h-4 mr-2"/>
                    Auto-Remediate
                  </Button>
                )}

                {/* Resource ARN */}
                <div className="space-y-1.5 p-3 rounded bg-muted border border-border">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold font-sans block">Affected Resource</span>
                  <span className="font-sans text-xs text-foreground break-all font-medium">
                    {selectedFinding.resourceId}
                  </span>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-sans">Description</h3>
                  <p className="text-xs text-foreground leading-relaxed font-sans">
                    {selectedFinding.desc}
                  </p>
                </div>

                {/* Remediation Steps */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-sans">Remediation Steps</h3>
                  <ol className="list-decimal pl-4 space-y-2 text-xs text-foreground">
                    {selectedFinding.remediation.map((step: string, index: number) => (
                      <li key={index} className="leading-relaxed font-sans pl-1">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Framework Mappings */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-sans">Framework Mappings</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedFinding.framework.split(',').map((fw: string, index: number) => (
                      <span key={index} className="inline-flex px-2 py-1 rounded bg-muted border border-border text-foreground text-xs font-sans font-medium">
                        {fw.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Audit Trail */}
                {selectedFinding.status === "Resolved" && remediationLog.length > 0 && (
                  <div className="space-y-2 mt-4 border-t border-border pt-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-sans">Audit Trail</h3>
                    {remediationLog.map((log, idx) => (
                      <div key={idx} className="bg-muted p-3 rounded border border-border">
                        <p className="text-[11px] text-muted-foreground mb-1">Fixed at {new Date(log.executedAt).toLocaleString()}</p>
                        <pre className="text-[12px] font-mono text-foreground whitespace-pre-wrap">
                          {log.actionTaken}
                        </pre>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Action Buttons */}
              <div className="border-t border-border pt-6 mt-6 flex items-center justify-end gap-3 bg-card">
                <Button
                  onClick={() => {
                    handleSuppress(selectedFinding.id);
                    setPanelOpen(false);
                  }}
                  disabled={selectedFinding.status === "Suppressed"}
                  variant="outline"
                  className="flex-1 border-border text-foreground hover:bg-muted bg-card h-9 text-xs rounded transition-colors font-semibold"
                >
                  <EyeOff className="w-3.5 h-3.5 mr-2" />
                  Suppress Finding
                </Button>
                <Button
                  onClick={() => {
                    handleResolve(selectedFinding.id);
                    setPanelOpen(false);
                  }}
                  disabled={selectedFinding.status === "Resolved"}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs rounded transition-colors font-bold"
                >
                  <CheckCircle className="w-3.5 h-3.5 mr-2" />
                  Mark Resolved
                </Button>
              </div>

            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* REMEDIATION DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Remediation</DialogTitle>
            <DialogDescription>
              This will modify your AWS resource immediately.
            </DialogDescription>
          </DialogHeader>
          {remediateFinding && (
            <div className="py-4 space-y-4">
              <div>
                <p className="text-sm font-semibold">{remediateFinding.title}</p>
                <p className="text-xs text-muted-foreground mt-1 font-mono break-all">{remediateFinding.resourceId}</p>
              </div>
              <div className="bg-muted p-3 rounded text-sm text-foreground">
                <p className="font-semibold text-xs uppercase mb-1">Action to be taken:</p>
                <p className="text-xs">{remediateFinding.remediation[0] || "Execute automated security fix."}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isRemediating}>Cancel</Button>
            <Button variant="destructive" onClick={confirmRemediation} disabled={isRemediating}>
              {isRemediating ? "Fixing..." : "Fix Now"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
