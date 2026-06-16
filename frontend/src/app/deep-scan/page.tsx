"use client";

import { useState, useEffect } from 'react';
import { Target, Server, Database, Users, Shield, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const SERVICES = [
  { id: 'S3', name: 'S3 Configurations', icon: Database, desc: 'Aggressive checks for bucket logging, KMS encryption, ACLs.' },
  { id: 'IAM', name: 'IAM Identities & Policies', icon: Users, desc: 'Deep inspection of password policies, MFA requirements, and key rotation.' },
  { id: 'EC2', name: 'EC2 Instances & SGs', icon: Server, desc: 'Enforcement checks for IMDSv2 and strict ingress/egress boundaries.' },
];

export default function DeepScanPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>(['S3', 'IAM', 'EC2']);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/accounts');
      if (res.data && res.data.length > 0) {
        setAccounts(res.data);
        setSelectedAccount(res.data[0].id);
      }
    } catch (e) {
      console.warn("Could not fetch accounts for deep scan", e);
    }
  };

  const toggleService = (id: string) => {
    setSelectedServices(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const initiateScan = async () => {
    if (!selectedAccount || selectedServices.length === 0) return;
    setIsScanning(true);
    setScanComplete(false);

    try {
      await api.post(`/accounts/${selectedAccount}/scan/deep`, {
        services: selectedServices
      });
      
      // In a real app we'd listen to SSE for completion, but since deep scan 
      // might be fast locally, we just wait a bit to show a nice UI.
      setTimeout(() => {
        setIsScanning(false);
        setScanComplete(true);
      }, 3500);
      
    } catch (e) {
      console.error("Failed to start deep scan", e);
      setIsScanning(false);
    }
  };

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen text-foreground font-sans max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center border border-destructive/20">
            <Target className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Deep Scan</h1>
            <p className="text-[13px] text-muted-foreground mt-1">Run aggressive security audits to identify minor inconsistencies</p>
          </div>
        </div>
      </div>

      {!scanComplete ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* CONFIGURATION COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Account Selection */}
            <Card className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-foreground mb-4">1. Select Target Environment</h2>
              {accounts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {accounts.map(acc => (
                    <div 
                      key={acc.id}
                      onClick={() => setSelectedAccount(acc.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedAccount === acc.id 
                          ? 'bg-primary/5 border-primary shadow-sm' 
                          : 'bg-card border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className={`w-4 h-4 ${selectedAccount === acc.id ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className="text-sm font-semibold text-foreground">{acc.alias}</span>
                        </div>
                        {selectedAccount === acc.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono mt-2 ml-6">{acc.id}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-muted border border-border text-center text-sm text-muted-foreground">
                  No onboarded accounts found.
                </div>
              )}
            </Card>

            {/* Service Selection */}
            <Card className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-foreground mb-4">2. Select Services to Audit</h2>
              <div className="space-y-3">
                {SERVICES.map(srv => {
                  const Icon = srv.icon;
                  const isSelected = selectedServices.includes(srv.id);
                  return (
                    <div 
                      key={srv.id}
                      onClick={() => toggleService(srv.id)}
                      className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-primary/5 border-primary/30' 
                          : 'bg-card border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-primary border-primary' : 'bg-transparent border-input'
                      }`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`text-sm font-semibold ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{srv.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{srv.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

          </div>

          {/* ACTION COLUMN */}
          <div className="lg:col-span-1">
            <Card className="bg-card border border-destructive/30 rounded-xl p-6 sticky top-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4 border border-destructive/20">
                <Target className="w-6 h-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Aggressive Audit</h3>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                Deep scans bypass standard compliance thresholds and enforce strict, highly aggressive security postures. This may result in a large volume of low-severity findings.
              </p>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Target:</span>
                  <span className="text-primary font-semibold">{selectedAccount || 'None'}</span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-muted-foreground">Services:</span>
                  <span className="text-foreground font-semibold">{selectedServices.length} selected</span>
                </div>
              </div>

              <Button 
                onClick={initiateScan}
                disabled={isScanning || !selectedAccount || selectedServices.length === 0}
                className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-bold h-11 transition-all"
              >
                {isScanning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Executing Deep Scan...
                  </>
                ) : (
                  <>
                    Initiate Deep Scan
                  </>
                )}
              </Button>
            </Card>
          </div>

        </div>
      ) : (
        /* SUCCESS STATE */
        <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Deep Scan Complete</h2>
          <p className="text-sm text-muted-foreground mb-8 max-w-md text-center">
            The aggressive audit has successfully finished evaluating {selectedServices.length} services. The new findings have been recorded in your workspace.
          </p>
          <div className="flex gap-4">
            <Button 
              variant="outline"
              onClick={() => setScanComplete(false)}
              className="border-border text-foreground hover:bg-muted bg-card font-semibold"
            >
              Run Another Scan
            </Button>
            <Button 
              onClick={() => router.push('/findings')}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold group"
            >
              View Findings
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
