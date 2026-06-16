"use client";

import { useState } from 'react';
import { 
  Settings, 
  Save, 
  Bell, 
  Shield, 
  Cpu, 
  Clock, 
  Eye, 
  EyeOff,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Form states
  const [cronExpression, setCronExpression] = useState("0 0 * * *");
  const [slackWebhook, setSlackWebhook] = useState("");
  const [jwtLifetime, setJwtLifetime] = useState("24h");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }, 1200);
  };

  return (
    <div className="p-8 space-y-6 bg-[#07080F] min-h-screen text-slate-100 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.05)] pb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight font-sans flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#00E5FF]" />
            Global Settings
          </h1>
          <p className="text-[13px] text-slate-400 mt-1">Configure global scanning loops, alert forwarding, and cryptographic credentials</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT/MID: Forms */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Scanning Daemon */}
          <Card className="bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.04)] pb-3">
                <Clock className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="text-sm font-bold text-white">Scanner Daemon Interval</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Automatic Scanning Schedule</label>
                  <Select value={cronExpression} onValueChange={(val) => setCronExpression(val || "0 0 * * *")}>
                    <SelectTrigger className="bg-[#161B24] border border-[rgba(255,255,255,0.07)] text-slate-300 h-9 text-xs rounded">
                      <SelectValue placeholder="Interval" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161B24] border border-[rgba(255,255,255,0.07)] text-slate-300">
                      <SelectItem value="0 * * * *">Every Hour</SelectItem>
                      <SelectItem value="0 */12 * * *">Twice Daily (12 Hours)</SelectItem>
                      <SelectItem value="0 0 * * *">Once Daily (Midnight)</SelectItem>
                      <SelectItem value="0 0 * * 0">Weekly (Sundays)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Cron Expression</label>
                  <Input 
                    type="text" 
                    value={cronExpression} 
                    onChange={e => setCronExpression(e.target.value)}
                    className="bg-[#161B24] border border-[rgba(255,255,255,0.07)] text-slate-300 h-9 rounded text-xs font-mono focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-colors"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Notifications Webhooks */}
          <Card className="bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.04)] pb-3">
                <Bell className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="text-sm font-bold text-white">Alert Dispatchers</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Slack Webhook Endpoint</label>
                  <div className="relative">
                    <Input 
                      type={showSecret ? "text" : "password"} 
                      value={slackWebhook}
                      onChange={e => setSlackWebhook(e.target.value)}
                      className="bg-[#161B24] border border-[rgba(255,255,255,0.07)] text-slate-300 h-9 rounded text-xs pr-10 font-mono focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500 font-sans block">
                    Critical and High severity alerts are dispatched to this webhook upon scan finalization.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Auth configs */}
          <Card className="bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.04)] pb-3">
                <Shield className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="text-sm font-bold text-white">Identity Access Management</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">JWT Token Expiry Lifetime</label>
                  <Select value={jwtLifetime} onValueChange={(val) => setJwtLifetime(val || "24h")}>
                    <SelectTrigger className="bg-[#161B24] border border-[rgba(255,255,255,0.07)] text-slate-300 h-9 text-xs rounded">
                      <SelectValue placeholder="Lifetime" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#161B24] border border-[rgba(255,255,255,0.07)] text-slate-300">
                      <SelectItem value="1h">1 Hour (Testing)</SelectItem>
                      <SelectItem value="12h">12 Hours</SelectItem>
                      <SelectItem value="24h">24 Hours (Standard)</SelectItem>
                      <SelectItem value="7d">7 Days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-medium">Symmetric Encryption Algorithm</label>
                  <Input 
                    type="text" 
                    value="AES-256-GCM" 
                    disabled 
                    className="bg-[#161B24]/40 border border-[rgba(255,255,255,0.05)] text-slate-500 h-9 rounded text-xs font-mono"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* RIGHT: Actions info */}
        <div className="space-y-6">
          <Card className="bg-[#0D1117] border border-[rgba(255,255,255,0.07)] rounded-xl p-6 flex flex-col justify-between h-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-[rgba(255,255,255,0.04)] pb-3">
                <Cpu className="w-4 h-4 text-[#00E5FF]" />
                <h3 className="text-sm font-bold text-white">System Actions</h3>
              </div>
              
              <div className="text-xs text-slate-400 space-y-2 leading-relaxed">
                <p>
                  Saving modifications updates internal Spring application contexts. Background scheduler threads are automatically re-aligned dynamically.
                </p>
                <p>
                  To rotate master databases or security keys, edit settings parameters in the root environment configurations (`.env`).
                </p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-[rgba(255,255,255,0.04)]">
              <Button 
                type="submit"
                disabled={isSaving}
                className="w-full bg-[#00E5FF] text-[#07080F] hover:bg-[#00E5FF]/90 h-9 font-bold text-xs rounded transition-colors flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isSaved ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                {isSaving ? "Saving Configuration..." : isSaved ? "Settings Saved" : "Save Changes"}
              </Button>
            </div>
          </Card>
        </div>

      </form>

    </div>
  );
}
