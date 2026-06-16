"use client";

import { 
  FileText, 
  Download, 
  Code, 
  CheckCircle2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

  const triggerDownload = (reportTitle: string, format: string) => {
    alert(`Generating ${reportTitle} in ${format} format. Your download will start momentarily.`);
  };

  return (
    <div className="p-8 space-y-6 bg-[#07080F] min-h-screen text-slate-100 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight font-sans flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#00E5FF]" />
            Compliance Reports
          </h1>
          <p className="text-[13px] text-slate-400 mt-1">Generate and export regulatory compliance audits and executive security summaries</p>
        </div>
      </div>

      {/* Grid of Report Frameworks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((rep) => (
          <Card key={rep.id} className="bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden hover:border-[#00E5FF]/30 transition-colors">
            <CardContent className="p-6 flex flex-col justify-between h-full space-y-5">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">{rep.title}</h3>
                    <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">{rep.version}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-[#00E5FF]/10 text-[#00E5FF] text-[10px] font-bold border border-[#00E5FF]/20 font-mono">
                    {rep.score}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  {rep.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[rgba(255,255,255,0.04)] text-xs">
                <span className="text-slate-500 font-mono font-medium">{rep.controls}</span>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => triggerDownload(rep.title, "PDF")}
                    variant="outline" 
                    className="border-[rgba(255,255,255,0.1)] text-slate-300 hover:bg-white/5 bg-transparent h-8 px-3 text-xs rounded transition-colors"
                  >
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    PDF
                  </Button>
                  <Button 
                    onClick={() => triggerDownload(rep.title, "JSON")}
                    variant="outline" 
                    className="border-[rgba(255,255,255,0.1)] text-slate-300 hover:bg-white/5 bg-transparent h-8 px-3 text-xs rounded transition-colors"
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
        <h3 className="text-sm font-semibold text-white">Generated Report History</h3>
        
        <div className="bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-transparent border-b border-[rgba(255,255,255,0.05)]">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-slate-400 text-xs h-10">Timestamp</TableHead>
                <TableHead className="text-slate-400 text-xs h-10">Report Type</TableHead>
                <TableHead className="text-slate-400 text-xs h-10 w-[100px]">Format</TableHead>
                <TableHead className="text-slate-400 text-xs h-10 w-[100px]">Status</TableHead>
                <TableHead className="text-slate-400 text-xs text-right pr-6 w-[100px] h-10">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                { time: "2 hours ago", type: "CIS AWS Foundations Benchmark - production-main", format: "PDF", status: "READY" },
                { time: "1 day ago", type: "NIST 800-53 Compliance Audit - staging-environment", format: "JSON", status: "READY" },
                { time: "3 days ago", type: "Executive Security Summary - All Environments", format: "PDF", status: "READY" },
              ].map((h, i) => (
                <TableRow key={i} className="border-b border-[rgba(255,255,255,0.05)] last:border-none hover:bg-white/5 transition-colors">
                  <TableCell className="py-3 font-mono text-[11px] text-slate-500">{h.time}</TableCell>
                  <TableCell className="py-3 text-xs text-white font-medium">{h.type}</TableCell>
                  <TableCell className="py-3 font-mono text-xs text-slate-400">{h.format}</TableCell>
                  <TableCell className="py-3">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#00E096]/10 text-[#00E096] text-[10px] font-bold border border-[#00E096]/20 font-mono">
                      <CheckCircle2 className="w-3 h-3" />
                      {h.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-3 text-right pr-6">
                    <Button 
                      onClick={() => alert("Downloading existing report artifact...")}
                      size="icon-sm"
                      variant="ghost" 
                      className="h-7 w-7 text-[#00E5FF] hover:bg-[#00E5FF]/10 rounded"
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
