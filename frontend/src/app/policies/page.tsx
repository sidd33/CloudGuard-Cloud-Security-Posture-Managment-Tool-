"use client";

import { useState, useEffect } from "react";
import { Plus, Play, Save, Search, Trash2, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import api from "@/lib/api";

interface Policy {
  id: string;
  name: string;
  description: string;
  policyId: string;
  regoContent: string;
  resourceType: "S3" | "IAM" | "EC2";
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFORMATIONAL";
  framework: string;
  controlId: string;
  enabled: boolean;
  createdAt: string;
}

interface Template {
  name: string;
  content: string;
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Policy>>({
    name: "",
    description: "",
    policyId: "cloudguard/custom/",
    regoContent: "",
    resourceType: "S3",
    severity: "MEDIUM",
    framework: "AcmeCorp_Playbook_v1",
    controlId: "",
  });

  // Test state
  const [testLoading, setTestLoading] = useState(false);
  const [testResults, setTestResults] = useState<any[] | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [polRes, tempRes] = await Promise.all([
        api.get("/policies"),
        api.get("/policies/templates"),
      ]);
      setPolicies(polRes.data);
      setTemplates(tempRes.data);
    } catch (error) {
      console.error("Failed to fetch data. Falling back to Demo Mode templates.", error);
      // Demo Mode Fallback Templates
      setTemplates([
        { name: "Template 1 — No public S3 buckets", content: "package cloudguard.custom.no_public_s3\n\nviolation[msg] {\n  bucket := input.buckets[_]\n  bucket.public_access_blocked == false\n  msg := {\n    \"resource_arn\": bucket.arn,\n    \"title\": \"S3 bucket has public access enabled\",\n    \"description\": sprintf(\"Bucket '%v' does not have Block Public Access enabled\", [bucket.name]),\n    \"severity\": \"CRITICAL\"\n  }\n}" },
        { name: "Template 2 — Require MFA for all IAM users", content: "package cloudguard.custom.require_mfa\n\nviolation[msg] {\n  user := input.users[_]\n  user.mfa_enabled == false\n  msg := {\n    \"resource_arn\": user.arn,\n    \"title\": \"IAM user does not have MFA enabled\",\n    \"description\": sprintf(\"User '%v' has console access without MFA\", [user.username]),\n    \"severity\": \"HIGH\"\n  }\n}" },
        { name: "Template 3 — Enforce Department tag on EC2", content: "package cloudguard.custom.require_department_tag\n\nviolation[msg] {\n  instance := input.instances[_]\n  not instance.tags[\"Department\"]\n  msg := {\n    \"resource_arn\": instance.arn,\n    \"title\": \"EC2 instance missing required Department tag\",\n    \"severity\": \"MEDIUM\"\n  }\n}" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredPolicies = policies.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.framework.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreateNew = () => {
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      policyId: "cloudguard/custom/",
      regoContent: "",
      resourceType: "S3",
      severity: "MEDIUM",
      framework: "AcmeCorp_Playbook_v1",
      controlId: "",
      enabled: true,
    });
    setTestResults(null);
  };

  const handleEdit = (p: Policy) => {
    setEditingId(p.id);
    setFormData({ ...p });
    setTestResults(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this policy?")) return;
    try {
      await api.delete(`/policies/${id}`);
      fetchData();
      if (editingId === id) handleCreateNew();
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await api.patch(`/policies/${id}/toggle`);
      fetchData();
    } catch (error) {
      console.error("Toggle failed", error);
    }
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await api.put(`/policies/${editingId}`, formData);
      } else {
        await api.post("/policies", { ...formData, enabled: true });
      }
      fetchData();
      alert("Policy saved successfully!");
    } catch (error) {
      console.error("Save failed", error);
      alert("Failed to save policy.");
    }
  };

  const handleTest = async () => {
    if (!editingId) {
      alert("Please save the policy first before testing.");
      return;
    }
    setTestLoading(true);
    setTestResults(null);
    try {
      const res = await api.post(`/policies/${editingId}/test`);
      const violations = res.data?.result?.violation || [];
      setTestResults(violations);
    } catch (error) {
      console.error("Test failed", error);
      alert("Failed to test policy.");
    } finally {
      setTestLoading(false);
    }
  };

  const getSeverityColor = (sev: string) => {
    switch(sev) {
      case "CRITICAL": return "bg-red-500/10 text-red-500 hover:bg-red-500/20";
      case "HIGH": return "bg-orange-500/10 text-orange-500 hover:bg-orange-500/20";
      case "MEDIUM": return "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20";
      case "LOW": return "bg-green-500/10 text-green-500 hover:bg-green-500/20";
      default: return "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20";
    }
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-4rem)] max-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Panel - Policy List */}
      <div className="w-[400px] border-r border-border bg-background flex flex-col h-full">
        <div className="p-4 border-b border-border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Custom Policies</h2>
            <Button size="sm" onClick={handleCreateNew} className="bg-cyan-600 hover:bg-cyan-700">
              <Plus className="w-4 h-4 mr-2" /> New
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search policies..." 
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-muted-foreground text-sm py-8">Loading policies...</div>
          ) : filteredPolicies.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">No policies found.</div>
          ) : (
            filteredPolicies.map(p => (
              <Card 
                key={p.id} 
                className={`cursor-pointer transition-colors ${editingId === p.id ? 'border-primary ring-1 ring-primary' : 'hover:border-primary/50'}`}
                onClick={() => handleEdit(p)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">{p.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{p.framework}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono">{p.resourceType}</Badge>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Badge className={getSeverityColor(p.severity)} variant="secondary">{p.severity}</Badge>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleToggle(p.id); }}
                        className={`text-[10px] px-2 py-1 rounded-md font-semibold ${p.enabled ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground'}`}
                      >
                        {p.enabled ? "ENABLED" : "DISABLED"}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }} className="p-1 text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Policy Editor */}
      <div className="flex-1 bg-background overflow-y-auto flex flex-col h-full">
        <div className="p-6 border-b border-border space-y-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{editingId ? "Edit Policy" : "Create New Policy"}</h2>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={handleTest} disabled={testLoading} className="text-amber-500 border-amber-500/30 hover:bg-amber-500/10">
                {testLoading ? <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                Test Policy
              </Button>
              <Button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-700">
                <Save className="w-4 h-4 mr-2" /> Save Policy
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Policy Name</label>
              <Input value={formData.name || ""} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. No Public S3" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Framework</label>
              <Input value={formData.framework || ""} onChange={e => setFormData({...formData, framework: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Resource Type</label>
              <Select value={formData.resourceType} onValueChange={(val: any) => setFormData({...formData, resourceType: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="S3">S3</SelectItem>
                  <SelectItem value="IAM">IAM</SelectItem>
                  <SelectItem value="EC2">EC2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Severity</label>
              <Select value={formData.severity} onValueChange={(val: any) => setFormData({...formData, severity: val})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                  <SelectItem value="HIGH">HIGH</SelectItem>
                  <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                  <SelectItem value="LOW">LOW</SelectItem>
                  <SelectItem value="INFORMATIONAL">INFO</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium">OPA Policy ID (Path)</label>
              <Input value={formData.policyId || ""} onChange={e => setFormData({...formData, policyId: e.target.value})} placeholder="cloudguard/custom/..." />
            </div>
            <div className="space-y-1.5 col-span-2">
              <label className="text-sm font-medium">Control ID</label>
              <Input value={formData.controlId || ""} onChange={e => setFormData({...formData, controlId: e.target.value})} placeholder="e.g. ACME-01" />
            </div>
          </div>

          <div className="space-y-2 flex flex-col h-[350px]">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Rego Policy Code</label>
              <Select onValueChange={(val) => {
                const t = templates.find(temp => temp.name === val);
                if (t) setFormData({...formData, regoContent: t.content});
              }}>
                <SelectTrigger className="w-[300px] h-8 text-xs"><SelectValue placeholder="Load Template..." /></SelectTrigger>
                <SelectContent>
                  {templates.map(t => (
                    <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <textarea
              className="w-full flex-1 bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm p-4 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-cyan-600/50 resize-none leading-relaxed"
              value={formData.regoContent || ""}
              onChange={e => setFormData({...formData, regoContent: e.target.value})}
              spellCheck={false}
              placeholder="package cloudguard.custom..."
            />
          </div>
        </div>

        {/* Test Results Area */}
        {testResults !== null && (
          <div className="p-6 flex-1 bg-secondary/20 border-t border-border overflow-y-auto min-h-[250px]">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              Test Results
            </h3>
            {testResults.length === 0 ? (
              <div className="flex items-center justify-center p-8 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500">
                <CheckCircle className="w-5 h-5 mr-2" />
                <span className="font-medium">No violations found against current AWS state.</span>
              </div>
            ) : (
              <div className="border border-border rounded-lg overflow-hidden bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Resource ARN</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Severity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {testResults.map((v, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs">{v.resource_arn}</TableCell>
                        <TableCell className="font-medium text-sm">{v.title}</TableCell>
                        <TableCell>
                          <Badge className={getSeverityColor(v.severity || "MEDIUM")} variant="secondary">
                            {v.severity || "MEDIUM"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
