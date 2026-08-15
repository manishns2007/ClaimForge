import React from 'react';
import { motion } from 'framer-motion';
import { 
  Play, 
  ChevronDown, 
  Search, 
  Bell, 
  CheckCircle2, 
  Plus, 
  MoreVertical, 
  LayoutDashboard, 
  CheckSquare, 
  ArrowUpRight, 
  CreditCard, 
  Building2, 
  Layers, 
  FileText, 
  SlidersHorizontal,
  FolderGit2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export const HeroSection: React.FC = () => {
  return (
    <div className="h-screen w-full flex flex-col bg-background overflow-hidden font-body relative">
      {/* ----------------- NAVBAR ----------------- */}
      <header className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-5 font-body flex-shrink-0 z-20 relative">
        {/* Left: Logo */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight text-foreground">
            ✦ Nexora
          </span>
        </div>

        {/* Right: Nav Links (hidden on mobile) */}
        <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          <a href="#home" className="hover:text-foreground transition-colors">Home</a>
          <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          <a href="#about" className="hover:text-foreground transition-colors">About</a>
          <a href="#contact" className="hover:text-foreground transition-colors">Contact</a>
        </nav>

        {/* CTA Button */}
        <div className="flex items-center">
          <Button className="rounded-full px-5 text-sm font-medium">
            Get Started
          </Button>
        </div>
      </header>

      {/* ----------------- HERO SECTION ----------------- */}
      <main className="relative flex-1 flex flex-col items-center w-full overflow-hidden z-10 px-4 pt-2">
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
        <div className="relative z-10 flex flex-col items-center w-full max-w-6xl mx-auto flex-1 overflow-hidden">
          
          {/* 1. Badge (top) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-1.5 text-sm text-muted-foreground font-body mb-4 shadow-sm"
          >
            <span>Now with GPT-5 support ✨</span>
          </motion.div>

          {/* 2. Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center font-display text-5xl md:text-6xl lg:text-[5rem] leading-[0.95] tracking-tight text-foreground max-w-xl"
          >
            The Future of <span className="italic font-display">Smarter</span> Automation
          </motion.h1>

          {/* 3. Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-4 text-center text-base md:text-lg text-muted-foreground max-w-[650px] leading-relaxed font-body"
          >
            Automate your busywork with intelligent agents that learn, adapt, and execute—so your team can focus on what matters most.
          </motion.p>

          {/* 4. CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-5 flex items-center gap-3"
          >
            <Button className="rounded-full px-6 py-5 text-sm font-medium font-body shadow-md">
              Book a demo
            </Button>
            <Button
              variant="ghost"
              className="h-11 w-11 rounded-full border-0 bg-background shadow-[0_2px_12px_rgba(0,0,0,0.08)] hover:bg-background/80 p-0 flex items-center justify-center"
              aria-label="Play video"
            >
              <Play className="h-4 w-4 fill-foreground text-foreground ml-0.5" />
            </Button>
          </motion.div>

          {/* 5. Dashboard Preview (Custom Coded React UI) */}
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
              <div className="bg-background/95 rounded-xl border border-border/60 shadow-sm flex flex-col text-[11px] select-none pointer-events-none flex-1 overflow-hidden">
                
                {/* Dashboard Top Bar */}
                <div className="h-11 border-b border-border/60 px-4 flex items-center justify-between bg-background">
                  {/* Left: Brand */}
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px]">
                      N
                    </div>
                    <span className="font-semibold text-foreground">Nexora</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
                  </div>

                  {/* Center: Search Bar */}
                  <div className="flex items-center gap-2 bg-secondary/80 px-3 py-1 rounded-lg text-muted-foreground w-52 justify-between border border-border/50">
                    <div className="flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[10px]">Search...</span>
                    </div>
                    <kbd className="text-[9px] bg-background px-1.5 py-0.5 rounded border border-border font-sans">
                      ⌘K
                    </kbd>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-3">
                    <button className="bg-accent text-accent-foreground rounded-md px-2.5 py-1 font-medium text-[10px] shadow-sm">
                      Move Money
                    </button>
                    <Bell className="w-3.5 h-3.5 text-muted-foreground" />
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-semibold border border-slate-300">
                      JB
                    </div>
                  </div>
                </div>

                {/* Dashboard Body (Sidebar + Main Content) */}
                <div className="flex flex-1 overflow-hidden">
                  
                  {/* Sidebar (w-40) */}
                  <aside className="w-40 flex-shrink-0 flex flex-col justify-between border-r border-border/60 p-2.5 bg-background font-body">
                    <div className="space-y-1">
                      <div className="bg-primary/10 text-primary font-medium rounded-md px-2.5 py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LayoutDashboard className="w-3.5 h-3.5" />
                          <span>Home</span>
                        </div>
                      </div>

                      <div className="text-muted-foreground px-2.5 py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Tasks</span>
                        </div>
                        <span className="bg-accent/15 text-accent font-semibold px-1.5 py-0.2 rounded-full text-[9px]">
                          10
                        </span>
                      </div>

                      <div className="text-muted-foreground px-2.5 py-1.5 flex items-center gap-2">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Transactions</span>
                      </div>

                      <div className="text-muted-foreground px-2.5 py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Payments</span>
                        </div>
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      </div>

                      <div className="text-muted-foreground px-2.5 py-1.5 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Cards</span>
                      </div>

                      <div className="text-muted-foreground px-2.5 py-1.5 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>Capital</span>
                      </div>

                      <div className="text-muted-foreground px-2.5 py-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Accounts</span>
                        </div>
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      </div>

                      {/* Workflows Section */}
                      <div className="pt-3">
                        <div className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider px-2.5 mb-1">
                          Workflows
                        </div>
                        <div className="text-muted-foreground px-2.5 py-1 flex items-center gap-2">
                          <FolderGit2 className="w-3 h-3" />
                          <span>Trake rutes</span>
                        </div>
                        <div className="text-muted-foreground px-2.5 py-1 flex items-center gap-2">
                          <CreditCard className="w-3 h-3" />
                          <span>Payments</span>
                        </div>
                        <div className="text-muted-foreground px-2.5 py-1 flex items-center gap-2">
                          <Bell className="w-3 h-3" />
                          <span>Notifications</span>
                        </div>
                        <div className="text-muted-foreground px-2.5 py-1 flex items-center gap-2">
                          <SlidersHorizontal className="w-3 h-3" />
                          <span>Settings</span>
                        </div>
                      </div>
                    </div>
                  </aside>

                  {/* Main Content (bg-secondary/30) */}
                  <main className="bg-secondary/30 flex-1 p-3.5 flex flex-col gap-3 overflow-hidden">
                    
                    {/* Greeting */}
                    <div className="flex items-center justify-between">
                      <h2 className="text-sm font-semibold text-foreground">Welcome, Jane</h2>
                    </div>

                    {/* Action buttons row */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button className="bg-accent text-accent-foreground rounded-full px-3 py-1 text-[10px] font-medium shadow-sm">
                          Send
                        </button>
                        <button className="bg-background text-foreground border border-border/60 rounded-full px-3 py-1 text-[10px] font-medium shadow-sm">
                          Request
                        </button>
                        <button className="bg-background text-foreground border border-border/60 rounded-full px-3 py-1 text-[10px] font-medium shadow-sm">
                          Transfer
                        </button>
                        <button className="bg-background text-foreground border border-border/60 rounded-full px-3 py-1 text-[10px] font-medium shadow-sm">
                          Deposit
                        </button>
                        <button className="bg-background text-foreground border border-border/60 rounded-full px-3 py-1 text-[10px] font-medium shadow-sm">
                          Pay Bill
                        </button>
                        <button className="bg-background text-foreground border border-border/60 rounded-full px-3 py-1 text-[10px] font-medium shadow-sm">
                          Create Invoice
                        </button>
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium cursor-pointer">
                        + Customize
                      </span>
                    </div>

                    {/* Cards Grid: Balance Card + Accounts Card */}
                    <div className="grid grid-cols-2 gap-3">
                      
                      {/* Balance Card */}
                      <div className="bg-background rounded-xl p-3 border border-border/60 shadow-sm flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-[10px] font-medium">Mercury Balance</span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                          </div>
                          <div className="text-base font-bold text-foreground tracking-tight">
                            $8,450,190<span className="text-xs font-normal text-muted-foreground">.32</span>
                          </div>
                        </div>

                        {/* Chart Area */}
                        <div className="my-2 relative h-16 w-full overflow-hidden">
                          <svg className="w-full h-full" viewBox="0 0 400 70" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="accentGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="hsl(239, 84%, 67%)" stopOpacity="0.15" />
                                <stop offset="100%" stopColor="hsl(239, 84%, 67%)" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            {/* Smooth cubic Bézier area path */}
                            <path
                              d="M 0,45 C 60,40 100,10 150,25 C 200,40 240,15 300,30 C 340,40 370,10 400,20 L 400,70 L 0,70 Z"
                              fill="url(#accentGradient)"
                            />
                            {/* Smooth cubic Bézier line stroke */}
                            <path
                              d="M 0,45 C 60,40 100,10 150,25 C 200,40 240,15 300,30 C 340,40 370,10 400,20"
                              fill="none"
                              stroke="hsl(239, 84%, 67%)"
                              strokeWidth="1.5"
                            />
                          </svg>
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border/40">
                          <span className="text-muted-foreground">Last 30 Days</span>
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-600 font-medium">+$1.8M</span>
                            <span className="text-rose-500 font-medium">-$900K</span>
                          </div>
                        </div>
                      </div>

                      {/* Accounts Card */}
                      <div className="bg-background rounded-xl p-3 border border-border/60 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-semibold text-foreground">Accounts</span>
                          <div className="flex items-center gap-1.5">
                            <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                            <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                        </div>

                        {/* Account rows */}
                        <div className="flex flex-col">
                          <div className="py-2 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground text-[11px]">Credit</span>
                            <span className="font-medium text-foreground text-[11px]">$98,125.50</span>
                          </div>
                          <div className="py-2 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground text-[11px]">Treasury</span>
                            <span className="font-medium text-foreground text-[11px]">$6,750,200.00</span>
                          </div>
                          <div className="py-2 flex items-center justify-between text-xs">
                            <span className="text-muted-foreground text-[11px]">Operations</span>
                            <span className="font-medium text-foreground text-[11px]">$1,592,864.82</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Recent Transactions Table */}
                    <div className="bg-background rounded-xl p-3 border border-border/60 shadow-sm flex-1 overflow-hidden flex flex-col">
                      <div className="text-[11px] font-semibold text-foreground mb-2">
                        Recent Transactions
                      </div>
                      
                      <div className="w-full text-left border-collapse text-[10px]">
                        <div className="grid grid-cols-4 pb-1.5 text-muted-foreground font-medium border-b border-border/40 uppercase tracking-wider text-[9px]">
                          <div>Date/Desc</div>
                          <div>Type</div>
                          <div>Amount</div>
                          <div className="text-right">Status</div>
                        </div>

                        {/* Row 1 */}
                        <div className="grid grid-cols-4 py-1.5 items-center border-b border-border/30">
                          <div className="font-medium text-foreground">AWS</div>
                          <div className="text-muted-foreground">Infrastructure</div>
                          <div className="font-medium text-foreground">-$5,200.00</div>
                          <div className="text-right">
                            <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full text-[9px] font-medium inline-block">
                              Pending
                            </span>
                          </div>
                        </div>

                        {/* Row 2 */}
                        <div className="grid grid-cols-4 py-1.5 items-center border-b border-border/30">
                          <div className="font-medium text-foreground">Client Payment</div>
                          <div className="text-muted-foreground">Deposit</div>
                          <div className="font-medium text-emerald-600">+$125,000.00</div>
                          <div className="text-right">
                            <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-medium inline-block">
                              Completed
                            </span>
                          </div>
                        </div>

                        {/* Row 3 */}
                        <div className="grid grid-cols-4 py-1.5 items-center border-b border-border/30">
                          <div className="font-medium text-foreground">Payroll</div>
                          <div className="text-muted-foreground">Operations</div>
                          <div className="font-medium text-foreground">-$85,450.00</div>
                          <div className="text-right">
                            <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-medium inline-block">
                              Completed
                            </span>
                          </div>
                        </div>

                        {/* Row 4 */}
                        <div className="grid grid-cols-4 py-1.5 items-center">
                          <div className="font-medium text-foreground">Office Supplies</div>
                          <div className="text-muted-foreground">Vendor</div>
                          <div className="font-medium text-foreground">-$1,200.00</div>
                          <div className="text-right">
                            <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-medium inline-block">
                              Completed
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </main>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
};

export default HeroSection;
