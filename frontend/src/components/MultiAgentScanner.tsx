import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  FileText, 
  Cpu, 
  Terminal, 
  RefreshCw, 
  Sparkles, 
  Play, 
  Pause,
  ArrowRight,
  FileSpreadsheet,
  Mail
} from 'lucide-react';

interface AgentState {
  id: string;
  name: string;
  role: string;
  status: 'idle' | 'running' | 'completed' | 'flagged';
  progress: number;
  currentDocument: string;
  itemsProcessed: number;
}

export const MultiAgentScanner: React.FC<{ onOpenWorkspace?: (id: string) => void }> = ({ onOpenWorkspace }) => {
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [logs, setLogs] = useState<Array<{ timestamp: string; agent: string; type: string; message: string; level: 'info' | 'warn' | 'success' }>>([]);
  const [agents, setAgents] = useState<AgentState[]>([
    {
      id: 'agent-1',
      name: 'Document Ingestion Agent',
      role: 'Parses PDF contracts, CSV logs & EML emails',
      status: 'running',
      progress: 85,
      currentDocument: 'Master_Service_Agreement_v4.pdf',
      itemsProcessed: 142
    },
    {
      id: 'agent-2',
      name: 'Event Reasoning Agent',
      role: 'Correlates outage telemetry with SLA terms',
      status: 'running',
      progress: 64,
      currentDocument: 'Telemetry_Outage_Oct24.csv',
      itemsProcessed: 890
    },
    {
      id: 'agent-3',
      name: 'Contradiction Hunter',
      role: 'Detects billing discrepancies & hard overrides',
      status: 'flagged',
      progress: 92,
      currentDocument: 'Vendor_Invoice_INV9821.csv',
      itemsProcessed: 48
    },
    {
      id: 'agent-4',
      name: 'Financial Scoring Engine',
      role: 'Calculates score-weighted recovery value',
      status: 'completed',
      progress: 100,
      currentDocument: 'Dispute_Claim_Target_C12.json',
      itemsProcessed: 12
    }
  ]);

  // Simulated real-time log streaming
  useEffect(() => {
    if (!isScanning) return;

    const sampleLogs = [
      { agent: 'Ingestion Agent', type: 'DOC_PARSED', message: 'Extracted Clause 14.2 (SLA Credit Threshold: 99.9% uptime requirement)', level: 'info' as const },
      { agent: 'Reasoning Agent', type: 'TELEMETRY_MATCH', message: 'Detected 4hr 12min downtime during peak window Oct 24 14:00-18:12 UTC', level: 'info' as const },
      { agent: 'Contradiction Hunter', type: 'OVERRIDE_FLAG', message: 'Vendor billed full rate ($125,000) despite 4.2h outage. Discrepancy confirmed.', level: 'warn' as const },
      { agent: 'Scoring Engine', type: 'RECOVERY_CALCULATED', message: 'Calculated recoverable dispute exposure: $125,000.00 (Confidence: 94%)', level: 'success' as const },
      { agent: 'Ingestion Agent', type: 'EMAIL_ANALYZED', message: 'Parsed email thread "Re: Service disruption update" from vendor account manager', level: 'info' as const },
      { agent: 'Reasoning Agent', type: 'CLAUSE_VERIFIED', message: 'Penalty clause $5,000/hr outage triggered. Total claim value updated to $146,000', level: 'success' as const }
    ];

    let logIndex = 0;
    const interval = setInterval(() => {
      const log = sampleLogs[logIndex % sampleLogs.length];
      const now = new Date().toLocaleTimeString();
      
      setLogs((prev) => [
        {
          timestamp: now,
          agent: log.agent,
          type: log.type,
          message: log.message,
          level: log.level
        },
        ...prev.slice(0, 19)
      ]);

      // Update progress
      setAgents((prev) => prev.map((a) => {
        if (a.status === 'running') {
          const nextProg = Math.min(100, a.progress + Math.floor(Math.random() * 5) + 1);
          return {
            ...a,
            progress: nextProg,
            itemsProcessed: a.itemsProcessed + Math.floor(Math.random() * 3) + 1,
            status: nextProg >= 100 ? 'completed' : 'running'
          };
        }
        return a;
      }));

      logIndex++;
    }, 1800);

    return () => clearInterval(interval);
  }, [isScanning]);

  const handleRestartScan = () => {
    setLogs([]);
    setAgents([
      { id: 'agent-1', name: 'Document Ingestion Agent', role: 'Parses PDF contracts, CSV logs & EML emails', status: 'running', progress: 15, currentDocument: 'Master_Service_Agreement_v4.pdf', itemsProcessed: 20 },
      { id: 'agent-2', name: 'Event Reasoning Agent', role: 'Correlates outage telemetry with SLA terms', status: 'running', progress: 10, currentDocument: 'Telemetry_Outage_Oct24.csv', itemsProcessed: 110 },
      { id: 'agent-3', name: 'Contradiction Hunter', role: 'Detects billing discrepancies & hard overrides', status: 'running', progress: 25, currentDocument: 'Vendor_Invoice_INV9821.csv', itemsProcessed: 8 },
      { id: 'agent-4', name: 'Financial Scoring Engine', role: 'Calculates score-weighted recovery value', status: 'running', progress: 5, currentDocument: 'Dispute_Claim_Target_C12.json', itemsProcessed: 2 }
    ]);
    setIsScanning(true);
  };

  return (
    <div className="bg-background border border-border rounded-xl p-5 shadow-lg font-body my-6">
      {/* Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-accent animate-pulse" />
            <h2 className="text-base font-bold text-foreground tracking-tight">
              Autonomous ClaimForge Multi-Agent Pipeline
            </h2>
            <span className="bg-accent/15 text-accent text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 4 Agents Active
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time evidence ingestion, SLA telemetry reasoning, and financial dispute calculation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScanning(!isScanning)}
            className="bg-secondary hover:bg-secondary/80 text-foreground border border-border rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            {isScanning ? <Pause className="w-3.5 h-3.5 text-amber-500" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
            <span>{isScanning ? 'Pause Pipeline' : 'Resume Pipeline'}</span>
          </button>
          <button
            onClick={handleRestartScan}
            className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-run Agent Scan</span>
          </button>
        </div>
      </div>

      {/* 4 Agent Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {agents.map((agent) => (
          <div 
            key={agent.id}
            className="bg-secondary/40 border border-border/60 rounded-xl p-3.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-accent" />
                  {agent.name}
                </span>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                  agent.status === 'completed' 
                    ? 'bg-emerald-500/15 text-emerald-600'
                    : agent.status === 'flagged'
                    ? 'bg-amber-500/15 text-amber-600'
                    : 'bg-accent/15 text-accent animate-pulse'
                }`}>
                  {agent.status}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground line-clamp-1">{agent.role}</p>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span className="truncate max-w-[130px]" title={agent.currentDocument}>
                  📄 {agent.currentDocument}
                </span>
                <span className="font-mono font-semibold">{agent.progress}%</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    agent.status === 'flagged' ? 'bg-amber-500' : 'bg-accent'
                  }`} 
                  style={{ width: `${agent.progress}%` }} 
                />
              </div>
              
              <div className="text-[9px] text-muted-foreground mt-1 flex items-center justify-between">
                <span>Processed: {agent.itemsProcessed} records</span>
                <span>{agent.progress === 100 ? 'Done' : 'Scanning...'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Evidence Document Badges */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-[11px]">
        <span className="text-muted-foreground font-semibold text-[10px] uppercase tracking-wider flex-shrink-0">
          Ingested Evidence Files:
        </span>
        <span className="bg-background border border-border rounded-md px-2.5 py-1 text-foreground flex items-center gap-1.5 flex-shrink-0">
          <FileText className="w-3 h-3 text-red-500" /> Contract_SLA_2024.pdf (Clause 14.2)
        </span>
        <span className="bg-background border border-border rounded-md px-2.5 py-1 text-foreground flex items-center gap-1.5 flex-shrink-0">
          <FileSpreadsheet className="w-3 h-3 text-emerald-500" /> Telemetry_Outage_Logs.csv (890 rows)
        </span>
        <span className="bg-background border border-border rounded-md px-2.5 py-1 text-foreground flex items-center gap-1.5 flex-shrink-0">
          <Mail className="w-3 h-3 text-blue-500" /> Vendor_Discrepancy_Thread.eml (3 attachments)
        </span>
      </div>

      {/* Real-time Streaming Logs Console */}
      <div className="bg-[#090D16] border border-border rounded-xl p-3">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40 text-xs">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-accent" />
            <span className="font-semibold text-white">Live Execution Logs</span>
            {isScanning && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" /> STREAMING ACTIVE
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{logs.length} events logged</span>
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1.5 font-mono text-[11px] pr-2">
          {logs.length === 0 ? (
            <div className="text-slate-500 py-3 text-center">Initializing agent stream...</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2.5 leading-relaxed">
                <span className="text-slate-500 text-[10px] flex-shrink-0">{log.timestamp}</span>
                <span className="text-accent font-semibold flex-shrink-0">[{log.agent}]</span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold flex-shrink-0 ${
                  log.level === 'warn' 
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : log.level === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}>
                  {log.type}
                </span>
                <span className="text-slate-200 word-break-all">{log.message}</span>
              </div>
            ))
          )}
        </div>

        {onOpenWorkspace && (
          <div className="pt-3 mt-2 border-t border-border/40 flex justify-end">
            <button
              onClick={() => onOpenWorkspace('inv-101')}
              className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-lg px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              Inspect High-Recovery Claim Case ($125,000.00) <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MultiAgentScanner;
