"use client";

import { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Code, 
  CheckCircle2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import api from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface FindingBackendType {
  id: string;
  severity: string;
  service: string;
  resourceId: string;
  title: string;
  framework?: string[];
  status: string;
  timestamp?: string;
  description?: string;
  remediationSteps?: string;
}

interface ReportHistoryItem {
  time: string;
  type: string;
  format: string;
  status: string;
}

const complianceReports = [
  {
    id: "rep-cis",
    title: "CIS AWS Foundations Benchmark",
    version: "v1.4.0",
    description: "Industry-standard guidelines for configuring AWS security policies.",
    controls: "100 Controls",
    score: "68% Passing"
  },
  {
    id: "rep-nist",
    title: "NIST 800-53 Compliance Audit",
    version: "Rev 5",
    description: "Security and privacy controls for federal information systems.",
    controls: "200 Controls",
    score: "73% Passing"
  },
  {
    id: "rep-soc2",
    title: "SOC 2 Type II Framework Summary",
    version: "Trust Services",
    description: "Evaluation of security, availability, and confidentiality.",
    controls: "84 Controls",
    score: "Draft Available"
  },
  {
    id: "rep-hipaa",
    title: "HIPAA Security Rule Mapping",
    version: "Health & Human Services",
    description: "Administrative, physical, and technical safeguard mappings.",
    controls: "54 Controls",
    score: "Ready to Scan"
  }
];

export default function Reports() {
  const reports = complianceReports;
  const [findings, setFindings] = useState<FindingBackendType[]>([]);
  const [reportHistory, setReportHistory] = useState<ReportHistoryItem[]>([
    { time: "2 hours ago", type: "CIS AWS Foundations Benchmark", format: "PDF", status: "READY" },
    { time: "1 day ago", type: "NIST 800-53 Compliance Audit", format: "JSON", status: "READY" },
    { time: "3 days ago", type: "Executive Security Summary", format: "PDF", status: "READY" },
  ]);

  useEffect(() => {
    const loadFindings = async () => {
      try {
        const res = await api.get('/findings');
        setFindings(res.data || []);
      } catch (err) {
        console.warn("Backend findings API failed", err);
      }
    };
    loadFindings();
  }, []);

  const triggerDownload = (reportTitle: string, format: string) => {
    const keyword = reportTitle.includes("CIS") ? "CIS" 
                  : reportTitle.includes("NIST") ? "NIST"
                  : reportTitle.includes("SOC 2") ? "SOC 2"
                  : reportTitle.includes("HIPAA") ? "HIPAA"
                  : "";
    
    // Filter findings to match framework, or show all if none specifically matched
    const filtered = keyword 
      ? findings.filter(f => f.framework?.some(fw => fw.includes(keyword))) 
      : findings;

    if (format === "JSON") {
      const jsonContent = JSON.stringify(filtered, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${reportTitle.replace(/\s+/g, '_').toLowerCase()}_report.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (format === "PDF") {
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text(reportTitle, 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Total findings: ${filtered.length}`, 14, 36);
      
      const tableData = filtered.map(f => [
        f.severity || "LOW",
        f.service || "Unknown",
        f.title || "No Title",
        f.status || "OPEN",
        (f.resourceId || "").substring(0, 35) + ((f.resourceId || "").length > 35 ? "..." : "")
      ]);

      autoTable(doc, {
        startY: 42,
        head: [['Severity', 'Service', 'Finding', 'Status', 'Resource']],
        body: tableData,
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 20 },
          2: { cellWidth: 60 },
          3: { cellWidth: 20 },
          4: { cellWidth: 60 }
        }
      });
      
      doc.save(`${reportTitle.replace(/\s+/g, '_').toLowerCase()}_report.pdf`);
    }

    setReportHistory(prev => [{
      time: "Just now",
      type: reportTitle,
      format,
      status: "READY"
    }, ...prev]);
  };

  return (
    <div className="p-8 space-y-6 bg-background min-h-screen text-foreground font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight font-sans flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Compliance Reports
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">Generate and export regulatory compliance audits and executive security summaries</p>
        </div>
      </div>

      {/* Grid of Report Frameworks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((rep) => (
          <Card key={rep.id} className="bg-card border border-border shadow-sm rounded-xl overflow-hidden hover:border-primary/50 transition-colors">
            <CardContent className="p-6 flex flex-col justify-between h-full space-y-5">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground tracking-tight">{rep.title}</h3>
                    <span className="text-[10px] text-muted-foreground font-sans mt-0.5 block font-semibold">{rep.version}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 font-sans">
                    {rep.score}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                  {rep.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border text-xs">
                <span className="text-muted-foreground font-sans font-medium">{rep.controls}</span>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => triggerDownload(rep.title, "PDF")}
                    variant="outline" 
                    className="border-border text-foreground hover:bg-muted bg-card shadow-sm h-8 px-3 text-xs rounded transition-colors font-semibold"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    PDF
                  </Button>
                  <Button 
                    onClick={() => triggerDownload(rep.title, "JSON")}
                    variant="outline" 
                    className="border-border text-foreground hover:bg-muted bg-card shadow-sm h-8 px-3 text-xs rounded transition-colors font-semibold"
                  >
                    <Code className="w-3.5 h-3.5 mr-1.5" />
                    JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generated Report Log */}
      <div className="space-y-3 pt-4">
        <h3 className="text-sm font-bold text-foreground">Generated Report History</h3>
        
        <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30 border-b border-border">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="text-muted-foreground font-semibold text-xs h-10">Timestamp</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-xs h-10">Report Type</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-xs h-10 w-[100px]">Format</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-xs h-10 w-[100px]">Status</TableHead>
                <TableHead className="text-muted-foreground font-semibold text-xs text-right pr-6 w-[100px] h-10">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportHistory.map((h, i) => (
                <TableRow key={i} className="border-b border-border last:border-none hover:bg-muted/50 transition-colors">
                  <TableCell className="py-3 font-sans text-[11px] text-muted-foreground">{h.time}</TableCell>
                  <TableCell className="py-3 text-xs text-foreground font-bold">{h.type}</TableCell>
                  <TableCell className="py-3 font-sans text-xs text-muted-foreground font-semibold">{h.format}</TableCell>
                  <TableCell className="py-3">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1f883d]/10 text-[#1f883d] text-[10px] font-bold border border-[#1f883d]/20 font-sans">
                      <CheckCircle2 className="w-3 h-3" />
                      {h.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-right pr-6">
                    <Button 
                      onClick={() => triggerDownload(h.type, h.format)}
                      size="icon-sm"
                      variant="ghost" 
                      className="h-7 w-7 text-primary hover:bg-primary/10 rounded"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

    </div>
  );
}
