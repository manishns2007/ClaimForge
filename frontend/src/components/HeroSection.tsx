import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  ChevronDown, 
  Search, 
  Bell, 
  CheckCircle2, 
  Plus, 
  MoreVertical, 
  LayoutDashboard, 
  FolderGit2, 
  FileText, 
  ShieldCheck, 
  Scale, 
  BarChart3, 
  FileSpreadsheet, 
  SlidersHorizontal,
  UploadCloud,
  X,
  Sparkles,
  ArrowRight,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  onLaunchPlatform?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onLaunchPlatform }) => {
  // Interactive UI States
  const [activeNav, setActiveNav] = useState<string>('Home');
  const [activeSidebar, setActiveSidebar] = useState<string>('Home');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeActionPill, setActiveActionPill] = useState<string>('Send');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30d' | '90d' | 'ytd'>('30d');
  
  // Modals & Notifications
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [demoFormData, setDemoFormData] = useState({ name: '', email: '', company: '', volume: '$1M-$10M' });
  const [demoSubmitted, setDemoSubmitted] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDemoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDemoSubmitted(true);
    setTimeout(() => {
      setDemoSubmitted(false);
      setIsDemoModalOpen(false);
      showToast('Demo request received! Our claims team will contact you shortly.');
    }, 1500);
  };

  // Mock Transactions / Claims data for dynamic search filtering
  const allTransactions = [
    { id: '1', date: 'Oct 24', desc: 'AWS Telemetry Outage', cat: 'Contract SLA Breach', amount: '-$5,200.00', status: 'Pending', statusColor: 'amber' },
    { id: '2', date: 'Oct 23', desc: 'Vendor Overbilling Dispute', cat: 'Invoice Discrepancy', amount: '+$125,000.00', status: 'Completed', statusColor: 'emerald' },
    { id: '3', date: 'Oct 22', desc: 'Unbilled Fleet Services', cat: 'Telemetry Audit', amount: '-$85,450.00', status: 'Completed', statusColor: 'emerald' },
    { id: '4', date: 'Oct 21', desc: 'Freight Surcharge Audit', cat: 'Logistics Claim', amount: '-$1,200.00', status: 'Completed', statusColor: 'emerald' },
  ];

  const filteredTransactions = allTransactions.filter(item => 
    item.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.cat.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-background overflow-y-auto font-body relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-foreground text-background px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------- NAVBAR ----------------- */}
      <header className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-5 font-body flex-shrink-0 z-20 relative">
        {/* Left: Logo */}
        <button 
          onClick={() => { setActiveNav('Home'); showToast('Welcome to ClaimForge'); }}
          className="flex items-center gap-2 text-left group"
        >
          <span className="text-xl font-semibold tracking-tight text-foreground group-hover:opacity-80 transition-opacity">
            ✦ ClaimForge
          </span>
        </button>

        {/* Right: Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          {['Home', 'Pricing', 'About', 'Contact'].map((item) => (
            <button
              key={item}
              onClick={() => {
                setActiveNav(item);
                showToast(`Navigated to ${item}`);
              }}
              className={`transition-colors text-sm ${
                activeNav === item 
                  ? 'text-foreground font-semibold underline underline-offset-4' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          {onLaunchPlatform && (
            <Button
              variant="outline"
              onClick={onLaunchPlatform}
              className="rounded-full px-4 text-xs font-medium border-border hover:bg-secondary hidden sm:inline-flex"
            >
              Open Platform
            </Button>
          )}
          <Button 
            onClick={() => setIsDemoModalOpen(true)}
            className="rounded-full px-5 text-sm font-medium"
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* ----------------- HERO SECTION ----------------- */}
      <main className="relative flex-1 flex flex-col items-center w-full z-10 px-4 pt-2 pb-12">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover z-0 pointer-events-none opacity-90"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4"
        />

        {/* Hero Content Wrapper */}
        <div className="relative z-10 flex flex-col items-center w-full max-w-6xl mx-auto flex-1">
          
          {/* 1. Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center font-display text-5xl md:text-6xl lg:text-[5rem] leading-[0.95] tracking-tight text-foreground max-w-xl"
          >
            The Future of <span className="italic font-display">Smarter</span> Automation
          </motion.h1>

          {/* 2. Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-center text-base md:text-lg text-muted-foreground max-w-[650px] leading-relaxed font-body"
          >
            Discover financially recoverable commercial claims from contracts, invoices, and telemetry with intelligent agents that learn, adapt, and execute.
          </motion.p>

          {/* 3. CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-5 flex items-center gap-3"
          >
            <Button 
              onClick={() => setIsDemoModalOpen(true)}
              className="rounded-full px-6 py-5 text-sm font-medium font-body shadow-md"
            >
              Book a demo
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIsVideoModalOpen(true)}
              className="h-11 w-11 rounded-full border-0 bg-background shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:bg-background/80 p-0 flex items-center justify-center"
              aria-label="Play video"
            >
              <Play className="h-4 w-4 fill-foreground text-foreground ml-0.5" />
            </Button>
          </motion.div>

          {/* 4. Dashboard Preview (Interactive React UI for ClaimForge) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-6 w-full max-w-5xl flex-1 flex flex-col justify-start"
          >
            <div
              className="rounded-2xl overflow-hidden p-3 md:p-4 w-full flex-1 flex flex-col backdrop-blur-md"
              style={{
                background: 'rgba(255, 255, 255, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                boxShadow: 'var(--shadow-dashboard)',
              }}
            >
              {/* Dashboard Internals Wrapper */}
              <div className="bg-background/95 rounded-xl border border-border/60 shadow-sm flex flex-col text-[11px] select-none flex-1 overflow-hidden">
                
                {/* Dashboard Top Bar */}
                <div className="h-11 border-b border-border/60 px-4 flex items-center justify-between bg-background">
                  {/* Left: Brand */}
                  <button 
                    onClick={() => showToast('ClaimForge Workspace Active')}
                    className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                  >
                    <div className="w-5 h-5 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px]">
                      CF
                    </div>
                    <span className="font-semibold text-foreground">ClaimForge</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
                  </button>

                  {/* Center: Search Bar */}
                  <div className="flex items-center gap-2 bg-secondary/80 px-3 py-1 rounded-lg text-muted-foreground w-64 justify-between border border-border/50 focus-within:ring-1 focus-within:ring-ring">
                    <div className="flex items-center gap-1.5 flex-1">
                      <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <input 
                        type="text"
                        placeholder="Search claims & evidence..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent border-none outline-none text-[10px] text-foreground w-full placeholder:text-muted-foreground"
                      />
                    </div>
                    {searchQuery ? (
                      <button onClick={() => setSearchQuery('')} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    ) : (
                      <kbd className="text-[9px] bg-background px-1.5 py-0.5 rounded border border-border font-sans">
                        ⌘K
                      </kbd>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => setIsUploadModalOpen(true)}
                      className="bg-accent text-accent-foreground hover:bg-accent/90 rounded-md px-2.5 py-1 font-medium text-[10px] shadow-sm flex items-center gap-1 transition-colors pointer-events-auto cursor-pointer"
                    >
                      <UploadCloud className="w-3 h-3" />
                      Upload Evidence
                    </button>
                    <button 
                      onClick={() => showToast('3 Unread Claim Intelligence Notifications')}
                      className="relative p-1 hover:text-foreground text-muted-foreground transition-colors pointer-events-auto"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-accent rounded-full" />
                    </button>
                    <button 
                      onClick={() => showToast('Jane Bennett (Chief Claims Officer)')}
                      className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-semibold border border-slate-300 pointer-events-auto"
                    >
                      JB
                    </button>
                  </div>
                </div>

                {/* Dashboard Body (Sidebar + Main Content) */}
                <div className="flex flex-1 overflow-hidden min-h-[360px]">
                  
                  {/* Sidebar (w-40) */}
                  <aside className="w-40 flex-shrink-0 flex flex-col justify-between border-r border-border/60 p-2.5 bg-background font-body">
                    <div className="space-y-1">
                      {[
                        { name: 'Home', icon: LayoutDashboard },
                        { name: 'Investigations', icon: FolderGit2, badge: '10' },
                        { name: 'Discovered Claims', icon: Scale },
                        { name: 'Evidence Vault', icon: FileText, chevron: true },
                        { name: 'Audit Trail', icon: ShieldCheck },
                        { name: 'Intelligence', icon: BarChart3 },
                        { name: 'Portfolios', icon: FileSpreadsheet, chevron: true },
                      ].map((item) => {
                        const Icon = item.icon;
                        const isActive = activeSidebar === item.name;
                        return (
                          <button
                            key={item.name}
                            onClick={() => {
                              setActiveSidebar(item.name);
                              showToast(`View switched to ${item.name}`);
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-md flex items-center justify-between text-left transition-colors pointer-events-auto cursor-pointer ${
                              isActive
                                ? 'bg-primary/10 text-primary font-medium'
                                : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className="w-3.5 h-3.5" />
                              <span>{item.name}</span>
                            </div>
                            {item.badge && (
                              <span className="bg-accent/15 text-accent font-semibold px-1.5 py-0.2 rounded-full text-[9px]">
                                {item.badge}
                              </span>
                            )}
                            {item.chevron && <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                          </button>
                        );
                      })}

                      {/* Workflows Section */}
                      <div className="pt-3">
                        <div className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-2.5 mb-1">
                          Workflows
                        </div>
                        {['Contract Audit', 'Payments', 'Notifications', 'Settings'].map((wf) => (
                          <button
                            key={wf}
                            onClick={() => showToast(`Workflow: ${wf}`)}
                            className="w-full text-muted-foreground hover:text-foreground px-2.5 py-1 flex items-center gap-2 text-left pointer-events-auto"
                          >
                            <SlidersHorizontal className="w-3 h-3" />
                            <span>{wf}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </aside>

                  {/* Main Content (bg-secondary/30) */}
                  <main className="bg-secondary/30 flex-1 p-3.5 flex flex-col gap-3 overflow-hidden">
                    
                    {/* Greeting Header */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-sm font-semibold text-foreground">
                          {activeSidebar === 'Home' ? 'Welcome, Jane' : `${activeSidebar} Overview`}
                        </h2>
                        <p className="text-[10px] text-muted-foreground">
                          {searchQuery ? `Filtering claims matching "${searchQuery}"` : 'Autonomous Pre-Dispute Intelligence Engine'}
                        </p>
                      </div>
                      {onLaunchPlatform && (
                        <button
                          onClick={onLaunchPlatform}
                          className="text-[10px] text-accent font-semibold flex items-center gap-1 hover:underline pointer-events-auto"
                        >
                          Launch Workspace <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* Action buttons row */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['Send', 'Request', 'Transfer', 'Deposit', 'Pay Bill', 'Create Invoice'].map((action) => {
                          const isSelected = activeActionPill === action;
                          return (
                            <button
                              key={action}
                              onClick={() => {
                                setActiveActionPill(action);
                                showToast(`Action Triggered: ${action}`);
                              }}
                              className={`rounded-full px-3 py-1 text-[10px] font-medium transition-all pointer-events-auto cursor-pointer ${
                                isSelected
                                  ? 'bg-accent text-accent-foreground shadow-sm'
                                  : 'bg-background text-foreground border border-border/60 hover:bg-secondary'
                              }`}
                            >
                              {action}
                            </button>
                          );
                        })}
                      </div>
                      <button 
                        onClick={() => showToast('Custom action layout editor opened')}
                        className="text-[10px] text-muted-foreground hover:text-foreground font-medium pointer-events-auto"
                      >
                        + Customize
                      </button>
                    </div>

                    {/* Cards Grid: Balance Card + Accounts Card */}
                    <div className="grid grid-cols-2 gap-3">
                      
                      {/* Balance Card (Recoverable Claim Exposure) */}
                      <div className="bg-background rounded-xl p-3 border border-border/60 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-[10px] font-medium">Mercury Balance</span>
                            <div className="flex items-center gap-1">
                              {(['30d', '90d', 'ytd'] as const).map((tf) => (
                                <button
                                  key={tf}
                                  onClick={() => setSelectedTimeframe(tf)}
                                  className={`text-[9px] uppercase px-1.5 py-0.5 rounded pointer-events-auto ${
                                    selectedTimeframe === tf ? 'bg-primary text-primary-foreground font-bold' : 'hover:bg-secondary'
                                  }`}
                                >
                                  {tf}
                                </button>
                              ))}
                              <CheckCircle2 className="w-3.5 h-3.5 text-accent ml-1" />
                            </div>
                          </div>
                          <div className="text-base font-bold text-foreground tracking-tight">
                            {selectedTimeframe === '30d' ? '$8,450,190' : selectedTimeframe === '90d' ? '$14,210,800' : '$28,950,400'}
                            <span className="text-xs font-normal text-muted-foreground">.32</span>
                          </div>
                        </div>

                        {/* Chart Area */}
                        <div className="my-2 relative h-16 w-full overflow-hidden">
                          <svg className="w-full h-full" viewBox="0 0 400 70" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="claimGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(239, 84%, 67%)" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="hsl(239, 84%, 67%)" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            {/* Smooth cubic Bézier area path */}
                            <path
                              d={
                                selectedTimeframe === '30d'
                                  ? "M 0,45 C 60,40 100,10 150,25 C 200,40 240,15 300,30 C 340,40 370,10 400,20 L 400,70 L 0,70 Z"
                                  : "M 0,55 C 80,20 140,50 200,15 C 260,35 320,5 400,25 L 400,70 L 0,70 Z"
                              }
                              fill="url(#claimGradient)"
                            />
                            {/* Smooth cubic Bézier line stroke */}
                            <path
                              d={
                                selectedTimeframe === '30d'
                                  ? "M 0,45 C 60,40 100,10 150,25 C 200,40 240,15 300,30 C 340,40 370,10 400,20"
                                  : "M 0,55 C 80,20 140,50 200,15 C 260,35 320,5 400,25"
                              }
                              fill="none"
                              stroke="hsl(239, 84%, 67%)"
                              strokeWidth="1.5"
                            />
                          </svg>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border/40">
                          <span className="text-muted-foreground">
                            {selectedTimeframe === '30d' ? 'Last 30 Days' : selectedTimeframe === '90d' ? 'Last 90 Days' : 'Year To Date'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-medium">+$1.8M</span>
                            <span className="text-rose-500 font-medium">-$900K</span>
                          </div>
                        </div>
                      </div>

                      {/* Accounts / Portfolio Card */}
                      <div className="bg-background rounded-xl p-3 border border-border/60 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-foreground">Accounts</span>
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => showToast('Create New Portfolio')} className="hover:text-foreground text-muted-foreground pointer-events-auto">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => showToast('Portfolio Settings')} className="hover:text-foreground text-muted-foreground pointer-events-auto">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Account rows */}
                        <div className="flex flex-col">
                          <button onClick={() => showToast('Credit Account Selected')} className="py-2 flex items-center justify-between text-xs hover:bg-secondary/40 px-1 rounded transition-colors text-left pointer-events-auto">
                            <span className="text-muted-foreground text-[11px]">Credit</span>
                            <span className="font-medium text-foreground text-[11px]">$98,125.50</span>
                          </button>
                          <button onClick={() => showToast('Treasury Account Selected')} className="py-2 flex items-center justify-between text-xs hover:bg-secondary/40 px-1 rounded transition-colors text-left pointer-events-auto">
                            <span className="text-muted-foreground text-[11px]">Treasury</span>
                            <span className="font-medium text-foreground text-[11px]">$6,750,200.00</span>
                          </button>
                          <button onClick={() => showToast('Operations Account Selected')} className="py-2 flex items-center justify-between text-xs hover:bg-secondary/40 px-1 rounded transition-colors text-left pointer-events-auto">
                            <span className="text-muted-foreground text-[11px]">Operations</span>
                            <span className="font-medium text-foreground text-[11px]">$1,592,864.82</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Recent Transactions Table */}
                    <div className="bg-background rounded-xl p-3 border border-border/60 shadow-sm flex-1 overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-foreground">Recent Transactions</span>
                        <span className="text-[9px] text-muted-foreground">{filteredTransactions.length} items</span>
                      </div>
                      
                      <div className="w-full text-left border-collapse text-[10px]">
                        <div className="grid grid-cols-4 pb-1.5 text-muted-foreground font-medium border-b border-border/40 uppercase tracking-wider text-[9px]">
                          <div>Date/Description</div>
                          <div>Category</div>
                          <div>Amount</div>
                          <div className="text-right">Status</div>
                        </div>

                        {filteredTransactions.map((item) => (
                          <div 
                            key={item.id}
                            onClick={() => showToast(`Selected Transaction: ${item.desc} (${item.amount})`)}
                            className="grid grid-cols-4 py-2 items-center border-b border-border/30 hover:bg-secondary/40 px-1 rounded transition-colors cursor-pointer pointer-events-auto"
                          >
                            <div className="font-medium text-foreground">{item.desc}</div>
                            <div className="text-muted-foreground">{item.cat}</div>
                            <div className={`font-medium ${item.amount.startsWith('+') ? 'text-emerald-600' : 'text-foreground'}`}>
                              {item.amount}
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium inline-block ${
                                item.statusColor === 'amber' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600'
                              }`}>
                                {item.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </main>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </main>

      {/* ----------------- DEMO MODAL ----------------- */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setIsDemoModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-bold font-display text-foreground">Book a ClaimForge Demo</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              See how autonomous claim discovery finds hidden financial recovery targets in minutes.
            </p>
            {demoSubmitted ? (
              <div className="py-8 text-center space-y-2">
                <Check className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-semibold text-foreground">Demo Scheduled!</h4>
                <p className="text-xs text-muted-foreground">We sent a calendar invite to {demoFormData.email}</p>
              </div>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">Full Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Jane Bennett"
                    value={demoFormData.name}
                    onChange={(e) => setDemoFormData({ ...demoFormData, name: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">Work Email</label>
                  <input 
                    type="email" 
                    required
                    placeholder="jane@company.com"
                    value={demoFormData.email}
                    onChange={(e) => setDemoFormData({ ...demoFormData, email: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1 font-medium">Company Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Apex Logistics Corp"
                    value={demoFormData.company}
                    onChange={(e) => setDemoFormData({ ...demoFormData, company: e.target.value })}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <Button type="submit" className="w-full rounded-lg py-2 mt-2 font-medium">
                  Submit Request
                </Button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ----------------- UPLOAD MODAL ----------------- */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl relative">
            <button 
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="text-xl font-bold font-display text-foreground">Upload Claim Evidence</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Ingest Contracts (PDF), Invoices (CSV), Telemetry Logs, or Emails (EML) for autonomous discovery.
            </p>
            <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-accent transition-colors bg-secondary/30 cursor-pointer">
              <UploadCloud className="w-10 h-10 text-accent mx-auto mb-2" />
              <p className="text-xs font-medium text-foreground">Drag & drop evidence files here</p>
              <p className="text-[10px] text-muted-foreground mt-1">Supports PDF, CSV, EML, TXT up to 50MB</p>
              <Button 
                onClick={() => {
                  setIsUploadModalOpen(false);
                  showToast('Evidence ingested into ClaimForge AI Pipeline!');
                }}
                className="mt-4 rounded-full text-xs px-4 py-1.5"
              >
                Browse Files
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- VIDEO PLAYER MODAL ----------------- */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/20">
            <button 
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute top-4 right-4 z-10 bg-black/60 text-white rounded-full p-2 hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <video
              autoPlay
              controls
              className="w-full h-full object-cover"
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260319_015952_e1deeb12-8fb7-4071-a42a-60779fc64ab6.mp4"
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default HeroSection;
