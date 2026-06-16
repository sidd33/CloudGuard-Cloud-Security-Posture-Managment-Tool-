"use client";

import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Download, 
  EyeOff, 
  CheckCircle, 
  SlidersHorizontal
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
import api from '@/lib/api';

interface FindingType {
  id: string;
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
const initialFindings = [
  {
    id: "find-1",
    severity: "CRITICAL",
    service: "IAM",
    resourceId: "arn:aws:iam::123456789:root",
    title: "Root account has active access keys",
    framework: "CIS 1.1, NIST AC-2",
    status: "Open",
    detected: "2h ago",
    desc: "The root user account has access keys configured. Root access keys allow unrestricted access to all resources in your AWS account and cannot be limited by IAM policies. Best practice dictates that the root account should not have active access keys.",
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
    severity: "HIGH",
    service: "IAM",
    resourceId: "arn:aws:iam::123456789:user/deploy",
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
  },
  {
    id: "find-6",
    severity: "HIGH",
    service: "CloudTrail",
    resourceId: "arn:aws:cloudtrail:us-east-1:123456789:trail/default",
    title: "CloudTrail log file validation disabled",
    framework: "CIS 3.2, NIST AU-10",
    status: "Open",
    detected: "4h ago",
    desc: "Log file integrity validation is disabled on trail 'default'. Validating log files ensures that cloud trail logs have not been modified, deleted, or tampered with after storage.",
    remediation: [
      "Go to CloudTrail console.",
      "Click on the default trail.",
      "Edit the configuration.",
      "Check 'Enable log file validation' under the logging settings.",
      "Save changes."
    ]
  },
  {
    id: "find-7",
    severity: "CRITICAL",
    service: "GuardDuty",
    resourceId: "arn:aws:guardduty:us-east-1:123456789:detector/gd-det",
    title: "GuardDuty is not enabled",
    framework: "CIS 4.1, NIST SI-4",
    status: "Open",
    detected: "5h ago",
    desc: "Amazon GuardDuty is disabled in this region. GuardDuty is a continuous security monitoring service that analyzes API logs, DNS logs, and flow logs to detect threat activity.",
    remediation: [
      "Go to the Amazon GuardDuty service console.",
      "Click on 'Get Started' and click 'Enable GuardDuty'."
    ]
  },
  {
    id: "find-8",
    severity: "LOW",
    service: "Config",
    resourceId: "arn:aws:config:us-east-1:123456789:config-recorder",
    title: "AWS Config is disabled",
    framework: "CIS 3.3, NIST CM-8",
    status: "Open",
    detected: "6h ago",
    desc: "AWS Config recording is disabled. AWS Config tracks configuration changes over time, which is critical for compliance audits and incident investigation.",
    remediation: [
      "Navigate to AWS Config console.",
      "Select 'Settings'.",
      "Under Recording Group, turn recording on for all resources.",
      "Configure an S3 bucket to receive history files and configure an IAM role for recording."
    ]
  },
  {
    id: "find-9",
    severity: "HIGH",
    service: "IAM",
    resourceId: "arn:aws:iam::123456789:mfa",
    title: "MFA not enabled for admin users",
    framework: "CIS 1.2, NIST IA-2",
    status: "Open",
    detected: "8h ago",
    desc: "One or more administrative users do not have Multi-Factor Authentication enabled. MFA adds an essential layer of security on top of static passwords.",
    remediation: [
      "Navigate to IAM user page.",
      "Identify administrator accounts with MFA status set to 'Disabled'.",
      "Require administrative accounts to configure an MFA device before performing API calls."
    ]
  },
  {
    id: "find-10",
    severity: "MEDIUM",
    service: "EC2",
    resourceId: "arn:aws:ec2:us-east-1:123456789:instance/i-0c1a2b3c",
    title: "EC2 instance has public IP and open ports",
    framework: "CIS 5.2, NIST SC-7",
    status: "Open",
    detected: "10h ago",
    desc: "The EC2 instance i-0c1a2b3c is launched in a public subnet, has a public IP address, and security groups that expose multiple ports.",
    remediation: [
      "Determine if the instance requires public internet accessibility.",
      "If not, associate it with a private subnet and remove the public IP association.",
      "Restrict security group ingress rules to minimum requirements."
    ]
  },
  {
    id: "find-11",
    severity: "LOW",
    service: "S3",
    resourceId: "arn:aws:s3:::public-assets-bucket",
    title: "S3 Bucket default encryption disabled",
    framework: "CIS 2.3, NIST SC-28",
    status: "Suppressed",
    detected: "1d ago",
    desc: "Default server-side encryption is disabled on public-assets-bucket. Objects uploaded without explicit encryption parameters will be stored in plaintext on disk.",
    remediation: [
      "Navigate to S3 > public-assets-bucket.",
      "Click 'Properties'.",
      "Under 'Default encryption', click Edit.",
      "Select Enable and choose SSE-S3 or SSE-KMS.",
      "Save changes."
    ]
  },
  {
    id: "find-12",
    severity: "MEDIUM",
    service: "RDS",
    resourceId: "arn:aws:rds:us-east-1:123456789:db/prod-db",
    title: "RDS Auto Minor Version Upgrade disabled",
    framework: "CIS 2.6, NIST SI-2",
    status: "Open",
    detected: "1d ago",
    desc: "Auto minor version upgrade is disabled for RDS instance prod-db. Enabling this ensures database engine updates are automatically applied, resolving security patches in minor releases.",
    remediation: [
      "Navigate to RDS > Databases.",
      "Select 'prod-db' and click Modify.",
      "Under Maintenance, enable 'Auto minor version upgrade'.",
      "Save changes and choose Apply Immediately."
    ]
  },
  {
    id: "find-13",
    severity: "HIGH",
    service: "RDS",
    resourceId: "arn:aws:rds:us-east-1:123456789:db/prod-db",
    title: "RDS DB instance is not encrypted at rest",
    framework: "CIS 2.7, NIST SC-28",
    status: "Open",
    detected: "2d ago",
    desc: "The RDS database instance prod-db is stored on unencrypted storage volume. Encryption at rest secures the underlying data, snapshots, and backups.",
    remediation: [
      "Encryption cannot be enabled on an existing DB instance.",
      "Create a snapshot of the database.",
      "Copy the snapshot and select 'Enable Encryption' using an AWS KMS key.",
      "Restore the database from the encrypted snapshot copy.",
      "Update backend environment variables to point to the new encrypted DB."
    ]
  },
  {
    id: "find-14",
    severity: "MEDIUM",
    service: "KMS",
    resourceId: "arn:aws:kms:us-east-1:123456789:key/key-id",
    title: "KMS key rotation disabled",
    framework: "CIS 3.8, NIST SC-12",
    status: "Open",
    detected: "2d ago",
    desc: "Key rotation is disabled for customer managed KMS key. Rotating cryptographic keys yearly reduces the volume of data encrypted under a single key.",
    remediation: [
      "Navigate to KMS console.",
      "Select Customer managed keys.",
      "Click on key-id.",
      "Select Key rotation tab.",
      "Check 'Automatically rotate this KMS key every year'.",
      "Save changes."
    ]
  },
  {
    id: "find-15",
    severity: "LOW",
    service: "IAM",
    resourceId: "arn:aws:iam::123456789:policy/overly-permissive",
    title: "IAM policy contains wildcards",
    framework: "CIS 1.16, NIST AC-3",
    status: "Resolved",
    detected: "3d ago",
    desc: "The IAM policy contains a wildcard (*) action combined with wildcard (*) resource, allowing full administration power to anyone attached. E.g. iam:*, s3:*.",
    remediation: [
      "Review the IAM policy.",
      "Restrict operations to exact actions needed.",
      "Specify the exact resource ARNs instead of using '*' wildcard in the resource field."
    ]
  }
];

export default function Findings() {
  const [findings, setFindings] = useState(initialFindings);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [serviceFilter, setServiceFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedFinding, setSelectedFinding] = useState<FindingType | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    // Check for service filter from dashboard click
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const serviceParam = params.get('service');
      if (serviceParam) {
        setServiceFilter(serviceParam.toUpperCase());
      }
    }
    loadFindings();
  }, []);

  const loadFindings = async () => {
    try {
      // Check if there are any real accounts onboarded
      const accountsRes = await api.get('/accounts');
      const hasAccounts = accountsRes.data && accountsRes.data.length > 0;

      const res = await api.get('/findings');
      if (hasAccounts) {
        // Use real findings list (even if empty)
        const mapped = (res.data || []).map((f: FindingBackendType) => {
          return {
            id: f.id,
            severity: f.severity,
            service: f.service,
            resourceId: f.resourceId,
            title: f.title,
            framework: f.framework && f.framework.length > 0 ? f.framework.join(", ") : "CIS 1.1",
            status: f.status === "OPEN" ? "Open" : f.status === "RESOLVED" ? "Resolved" : "Suppressed",
            detected: f.timestamp ? new Date(f.timestamp).toLocaleDateString() : "Just now",
            desc: f.description || f.title,
            remediation: f.remediationSteps ? f.remediationSteps.split("\n") : ["Go to AWS Console.", "Locate the affected resource.", "Remediate according to security guidelines."]
          };
        });
        setFindings(mapped);
      } else {
        // Fallback to preview mock findings
        setFindings(initialFindings);
      }
    } catch (err) {
      console.warn("Backend findings API failed, using demo data.", err);
      setFindings(initialFindings);
    }
  };

  // Actions handlers
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

  // Filter logic
  const filteredFindings = findings.filter(f => {
    const matchesSearch = 
      f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.resourceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.service.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSeverity = severityFilter === "ALL" || f.severity === severityFilter;
    const matchesService = serviceFilter === "ALL" || f.service === serviceFilter;
    const matchesStatus = statusFilter === "ALL" || f.status === statusFilter;

    return matchesSearch && matchesSeverity && matchesService && matchesStatus;
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
          <div className="flex items-center gap-1.5 text-xs text-[#2a2e34] font-medium font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1f883d]" />
            Resolved
          </div>
        );
      case 'Suppressed':
        return (
          <div className="flex items-center gap-1.5 text-xs text-[#687076] font-medium font-sans">
            <span className="w-1.5 h-1.5 rounded-full bg-[#687076]" />
            Suppressed
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 text-xs text-[#2a2e34] font-medium font-sans">
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

  const openDetails = (finding: FindingType) => {
    setSelectedFinding(finding);
    setPanelOpen(true);
  };

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen text-foreground font-sans">
      
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

          {/* Severity Select */}
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

          {/* Service Select */}
          <Select value={serviceFilter} onValueChange={(val) => setServiceFilter(val || "ALL")}>
            <SelectTrigger className="w-[140px] bg-card border border-border text-foreground h-8 text-xs rounded font-sans">
              <SelectValue placeholder="Service" />
            </SelectTrigger>
            <SelectContent className="bg-card border border-border text-foreground font-sans">
              <SelectItem value="ALL">All Services</SelectItem>
              <SelectItem value="IAM">IAM</SelectItem>
              <SelectItem value="S3">S3</SelectItem>
              <SelectItem value="EC2">EC2</SelectItem>
              <SelectItem value="CloudTrail">CloudTrail</SelectItem>
              <SelectItem value="GuardDuty">GuardDuty</SelectItem>
              <SelectItem value="Config">Config</SelectItem>
              <SelectItem value="RDS">RDS</SelectItem>
              <SelectItem value="KMS">KMS</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Select */}
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

          {/* Reset Filters button */}
          {(searchTerm !== "" || severityFilter !== "ALL" || serviceFilter !== "ALL" || statusFilter !== "ALL") && (
            <Button
              onClick={() => {
                setSearchTerm("");
                setSeverityFilter("ALL");
                setServiceFilter("ALL");
                setStatusFilter("ALL");
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
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 w-[150px]">Framework</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 w-[110px]">Status</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 w-[100px]">Detected</TableHead>
              <TableHead className="text-muted-foreground font-semibold text-xs h-10 text-right w-[100px] pr-6">Actions</TableHead>
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
                      {finding.framework.split(',').map((fw, index) => (
                        <span key={index} className="inline-flex px-1.5 py-0.5 rounded bg-muted text-muted-foreground text-[10px] font-sans font-medium border border-border">
                          {fw.trim()}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="py-3">{getStatusIndicator(finding.status)}</TableCell>
                  <TableCell className="py-3 text-[11px] text-muted-foreground font-sans font-medium">{finding.detected}</TableCell>
                  <TableCell className="py-3 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      <Tooltip>
                        <TooltipTrigger render={
                          <Button 
                            onClick={(e) => handleSuppress(finding.id, e)}
                            disabled={finding.status === "Suppressed"}
                            size="icon-sm"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted disabled:opacity-30 rounded"
                          />
                        }>
                          <EyeOff className="w-3.5 h-3.5" />
                        </TooltipTrigger>
                        <TooltipContent className="bg-card border border-border text-foreground text-xs font-sans shadow-sm">
                          Suppress Finding
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger render={
                          <Button 
                            onClick={(e) => handleResolve(finding.id, e)}
                            disabled={finding.status === "Resolved"}
                            size="icon-sm"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground bg-transparent hover:bg-muted disabled:opacity-30 rounded"
                          />
                        }>
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

    </div>
  );
}
