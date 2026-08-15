import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  FileText, 
  Cpu, 
  RefreshCw, 
  Sparkles, 
  Play, 
  Pause,
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

interface LogEntry {
  timestamp: string;
  agent: string;
  statusType: 'progress' | 'success' | 'warn';
  tag: string;
  formattedMessage: React.ReactNode;
}

export const MultiAgentScanner: React.FC<{ onOpenWorkspace?: (id: string) => void }> = ({ onOpenWorkspace }) => {
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [visibleLogCount, setVisibleLogCount] = useState<number>(0);
  const terminalScrollRef = useRef<HTMLDivElement>(null);

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

  // Full sequential list of terminal log items to reveal one line at a time
  const sequentialLogs: LogEntry[] = [
    {
      timestamp: '09:14:01',
      agent: 'Ingestion Agent',
      statusType: 'progress',
      tag: 'PARSE',
      formattedMessage: <>Parsing intent specification <span className="text-[#4E7570]">...</span></>
    },
    {
      timestamp: '09:14:02',
      agent: 'Ingestion Agent',
      statusType: 'success',
      tag: 'VALIDATED',
      formattedMessage: <>Intent validated <span className="text-[#4E7570]">|</span> name=Escrow <span className="text-[#4E7570]">|</span> version=1.0</>
    },
    {
      timestamp: '09:14:03',
      agent: 'Reasoning Agent',
      statusType: 'progress',
      tag: 'IR_GEN',
      formattedMessage: <>Generating NexIR intermediate representation <span className="text-[#4E7570]">...</span></>
    },
    {
      timestamp: '09:14:04',
      agent: 'Reasoning Agent',
      statusType: 'success',
      tag: 'IR_DONE',
      formattedMessage: <>NexIR generated <span className="text-[#4E7570]">|</span> ops=47 <span className="text-[#4E7570]">|</span> size=2.3KB</>
    },
    {
      timestamp: '09:14:05',
      agent: 'Contradiction Hunter',
      statusType: 'progress',
      tag: 'BYTECODE',
      formattedMessage: <>Compiling to CashScript bytecode <span className="text-[#4E7570]">...</span></>
    },
    {
      timestamp: '09:14:06',
      agent: 'Contradiction Hunter',
      statusType: 'success',
      tag: 'BYTECODE_DONE',
      formattedMessage: <>Bytecode compiled <span className="text-[#4E7570]">|</span> hash=0x7a4c9b2f1e8d3c5a <span className="text-[#4E7570]">|</span> size=1.8KB</>
    },
    {
      timestamp: '09:14:07',
      agent: 'Scoring Engine',
      statusType: 'progress',
      tag: 'SECURITY',
      formattedMessage: <>Running TollGate security analysis <span className="text-[#4E7570]">...</span></>
    },
    {
      timestamp: '09:14:08',
      agent: 'Scoring Engine',
      statusType: 'success',
      tag: 'SECURITY_PASS',
      formattedMessage: <>Logic flaws: <span className="text-[#00E676]">PASS</span> <span className="text-[#4E7570]">|</span> Signatures: <span className="text-[#00E676]">PASS</span></>
    },
    {
      timestamp: '09:14:09',
      agent: 'Scoring Engine',
      statusType: 'success',
      tag: 'CHECKS_PASS',
      formattedMessage: <>Balance checks: <span className="text-[#00E676]">PASS</span> <span className="text-[#4E7570]">|</span> Reentrancy: <span className="text-[#00E676]">PASS</span></>
    },
    {
      timestamp: '09:14:10',
      agent: 'Scoring Engine',
      statusType: 'success',
      tag: 'DETERMINISM',
      formattedMessage: <>Determinism verified <span className="text-[#4E7570]">|</span> Reproducible: <span className="text-[#00E676]">YES</span></>
    }
  ];

  // Sequential reveal line-by-line timer
  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(() => {
      setVisibleLogCount((prev) => {
        if (prev < sequentialLogs.length) {
          return prev + 1;
        }
        return prev;
      });

      // Update agent progress bars sequentially
      setAgents((prev) => prev.map((a) => {
        if (a.status === 'running') {
          const nextProg = Math.min(100, a.progress + Math.floor(Math.random() * 3) + 1);
          return {
            ...a,
            progress: nextProg,
            itemsProcessed: a.itemsProcessed + Math.floor(Math.random() * 2) + 1,
            status: nextProg >= 100 ? 'completed' : 'running'
          };
        }
        return a;
      }));
    }, 700);

    return () => clearInterval(interval);
  }, [isScanning]);

  // Smooth auto-scroll as new lines appear
  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [visibleLogCount]);

  const handleRestartScan = () => {
    setVisibleLogCount(0);
    setAgents([
      { id: 'agent-1', name: 'Document Ingestion Agent', role: 'Parses PDF contracts, CSV logs & EML emails', status: 'running', progress: 15, currentDocument: 'Master_Service_Agreement_v4.pdf', itemsProcessed: 20 },
      { id: 'agent-2', name: 'Event Reasoning Agent', role: 'Correlates outage telemetry with SLA terms', status: 'running', progress: 10, currentDocument: 'Telemetry_Outage_Oct24.csv', itemsProcessed: 110 },
      { id: 'agent-3', name: 'Contradiction Hunter', role: 'Detects billing discrepancies & hard overrides', status: 'running', progress: 25, currentDocument: 'Vendor_Invoice_INV9821.csv', itemsProcessed: 8 },
      { id: 'agent-4', name: 'Financial Scoring Engine', role: 'Calculates score-weighted recovery value', status: 'running', progress: 5, currentDocument: 'Dispute_Claim_Target_C12.json', itemsProcessed: 2 }
    ]);
    setIsScanning(true);
  };

  return (
    <div className="bg-white border border-[#E5E5E2] rounded-2xl p-5 shadow-xs font-body my-6">
      {/* Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-[#E5E5E2]">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#6C63E6] animate-pulse" />
            <h2 className="text-base font-bold text-[#20242A] tracking-tight">
              Autonomous ClaimForge Multi-Agent Pipeline
            </h2>
            <span className="bg-[#6C63E6]/10 text-[#6C63E6] border border-[#6C63E6]/25 text-[10px] font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> 4 Agents Active
            </span>
          </div>
          <p className="text-xs text-[#737A80] mt-0.5">
            Real-time evidence ingestion, SLA telemetry reasoning, and financial dispute calculation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScanning(!isScanning)}
            className="btn-secondary text-xs py-1.5 px-3 rounded-full flex items-center gap-1.5"
          >
            {isScanning ? <Pause className="w-3.5 h-3.5 text-amber-600" /> : <Play className="w-3.5 h-3.5 text-emerald-600" />}
            <span>{isScanning ? 'Pause Pipeline' : 'Resume Pipeline'}</span>
          </button>
          <button
            onClick={handleRestartScan}
            className="btn-primary text-xs py-1.5 px-4 rounded-full flex items-center gap-1.5"
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
            className="bg-[#F7F7F5] border border-[#E5E5E2] rounded-xl p-3.5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-[#20242A] flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-[#6C63E6]" />
                  {agent.name}
                </span>
                <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase ${
                  agent.status === 'completed' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : agent.status === 'flagged'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-[#6C63E6]/10 text-[#6C63E6] border border-[#6C63E6]/25 animate-pulse'
                }`}>
                  {agent.status}
                </span>
              </div>
              <p className="text-[10px] text-[#737A80] truncate">{agent.role}</p>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] text-[#737A80] mb-1">
                <span className="truncate max-w-[130px]" title={agent.currentDocument}>
                  📄 {agent.currentDocument}
                </span>
                <span className="font-mono font-semibold text-[#20242A]">{agent.progress}%</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-[#E5E5E2] h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    agent.status === 'flagged' ? 'bg-amber-500' : 'bg-[#6C63E6]'
                  }`} 
                  style={{ width: `${agent.progress}%` }} 
                />
              </div>
              
              <div className="text-[9px] text-[#737A80] mt-1 flex items-center justify-between">
                <span>Processed: {agent.itemsProcessed} records</span>
                <span>{agent.progress === 100 ? 'Done' : 'Scanning...'}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Evidence Document Badges */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1 text-[11px]">
        <span className="text-[#737A80] font-semibold text-[10px] uppercase tracking-wider flex-shrink-0">
          Ingested Evidence Files:
        </span>
        <span className="bg-[#F7F7F5] border border-[#E5E5E2] rounded-full px-3 py-1 text-[#20242A] flex items-center gap-1.5 flex-shrink-0 text-xs">
          <FileText className="w-3.5 h-3.5 text-rose-500" /> Contract_SLA_2024.pdf (Clause 14.2)
        </span>
        <span className="bg-[#F7F7F5] border border-[#E5E5E2] rounded-full px-3 py-1 text-[#20242A] flex items-center gap-1.5 flex-shrink-0 text-xs">
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Telemetry_Outage_Logs.csv (890 rows)
        </span>
        <span className="bg-[#F7F7F5] border border-[#E5E5E2] rounded-full px-3 py-1 text-[#20242A] flex items-center gap-1.5 flex-shrink-0 text-xs">
          <Mail className="w-3.5 h-3.5 text-amber-500" /> Vendor_Discrepancy_Thread.eml (3 attachments)
        </span>
      </div>

      {/* 5. SEQUENTIAL TERMINAL LOG WINDOW MATCHING USER SCREENSHOT */}
      <div className="rounded-xl border border-[#0F3830] bg-[#061110] shadow-2xl overflow-hidden font-mono text-xs">
        {/* macOS Terminal Window Header Bar */}
        <div className="bg-[#040D0C] border-b border-[#0E2421] px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#FF5F56] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#FFBD2E] inline-block" />
            <span className="w-3 h-3 rounded-full bg-[#27C93F] inline-block" />
          </div>
          <span className="text-[11px] text-[#4E7570] font-medium tracking-wide">
            nexops@protocol:~$
          </span>
        </div>

        {/* Inner Terminal Execution Log Body */}
        <div 
          ref={terminalScrollRef}
          className="p-5 bg-[#061110] text-[#D1EBE7] space-y-2.5 max-h-80 overflow-y-auto leading-relaxed"
        >
          {/* Command prompt header line */}
          <div className="flex items-center gap-2 text-xs pb-1">
            <span className="text-[#00F2FE] font-bold">$</span>
            <span className="text-[#00F2FE] font-bold">nexops compile escrow.intent --network bch</span>
          </div>
          <div className="text-[#4E7570] text-[11px] font-semibold mb-3">
            NexOps Protocol v1.2.4
          </div>

          {/* Sequential line-by-line log entries */}
          {sequentialLogs.slice(0, visibleLogCount).map((log, idx) => (
            <div key={idx} className="flex items-start gap-2.5 animate-fadeIn">
              {log.statusType === 'progress' && (
                <span className="text-[#4E7570] font-bold flex-shrink-0">[→]</span>
              )}
              {log.statusType === 'success' && (
                <span className="text-[#00E676] font-bold flex-shrink-0">[✓]</span>
              )}
              {log.statusType === 'warn' && (
                <span className="text-[#FFC107] font-bold flex-shrink-0">[⚠]</span>
              )}
              <div className="text-[#D1EBE7]">
                {log.formattedMessage}
              </div>
            </div>
          ))}


        </div>


      </div>
    </div>
  );
};

export default MultiAgentScanner;
