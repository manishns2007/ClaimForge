import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
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
  FolderGit2,
  Check,
  Zap,
  Shield,
  Bot,
  Mail,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../context/AuthContext';

interface HeroSectionProps {
  onLaunchPlatform?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onLaunchPlatform }) => {
  const { isAuthenticated, openAuthModal } = useAuth();
  const [activeNav, setActiveNav] = useState<string>('Home');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactSubmitted, setContactSubmitted] = useState<boolean>(false);

  const handleNavClick = (sectionId: string, name: string) => {
    setActiveNav(name);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBookDemo = () => {
    setActiveNav('Pricing');
    const pricingElem = document.getElementById('pricing');
    if (pricingElem) {
      pricingElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleTriggerAuthOrPlatform = (mode: 'signin' | 'signup' = 'signup') => {
    if (isAuthenticated) {
      if (onLaunchPlatform) onLaunchPlatform();
    } else {
      openAuthModal(mode);
    }
  };

  const handleTriggerDemo = () => {
    handleTriggerAuthOrPlatform('signup');
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-background overflow-y-auto font-body relative scroll-smooth">
      {/* ----------------- NAVBAR ----------------- */}
      <header className="flex items-center justify-between px-6 md:px-12 lg:px-20 py-5 font-body flex-shrink-0 z-20 relative sticky top-0 bg-background/80 backdrop-blur-md border-b border-border/40">
        {/* Left: Logo */}
        <a 
          href="#home" 
          onClick={(e) => { e.preventDefault(); handleNavClick('home', 'Home'); }}
          className="flex items-center gap-2"
        >
          <span className="text-xl font-semibold tracking-tight text-foreground">
            ✦ ClaimForge
          </span>
        </a>

        {/* Right: Nav Links (hidden on mobile) */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          {[
            { id: 'home', name: 'Home' },
            { id: 'pricing', name: 'Pricing' },
            { id: 'about', name: 'About' },
            { id: 'contact', name: 'Contact' },
          ].map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => {
                e.preventDefault();
                handleNavClick(link.id, link.name);
              }}
              className={`transition-colors text-sm hover:text-foreground ${
                activeNav === link.name ? 'text-foreground font-semibold underline underline-offset-4' : ''
              }`}
            >
              {link.name}
            </a>
          ))}
        </nav>

      </header>

      {/* ----------------- HERO SECTION (#home) ----------------- */}
      <section id="home" className="relative flex-1 flex flex-col items-center w-full z-10 px-4 pt-2 pb-12">
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
            Automate your busywork with intelligent agents that learn, adapt, and execute—so your team can focus on what matters most.
          </motion.p>

          {/* 3. CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-5 flex items-center gap-3 z-30 relative"
          >
            <Button 
              variant="outline"
              onClick={handleBookDemo}
              className="rounded-full px-6 py-5 text-sm font-medium font-body shadow-xs bg-background/90 hover:bg-background backdrop-blur-md border-border/80 text-foreground cursor-pointer transition-all"
            >
              Book a demo
            </Button>
            <Button
              onClick={() => handleTriggerAuthOrPlatform('signup')}
              className="rounded-full px-6 py-5 text-sm font-medium font-body shadow-md cursor-pointer flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>

          {/* 4. Dashboard Preview (Interactive React UI - Clicking enters live demo!) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="mt-8 w-full max-w-5xl flex-1 flex flex-col justify-start"
          >
            <div
              onClick={handleTriggerDemo}
              className="rounded-2xl overflow-hidden p-3 md:p-4 w-full flex-1 flex flex-col backdrop-blur-md cursor-pointer transition-transform hover:scale-[1.005]"
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
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px]">
                      CF
                    </div>
                    <span className="font-semibold text-foreground">ClaimForge</span>
                    <ChevronDown className="w-3 h-3 text-muted-foreground ml-0.5" />
                  </div>

                  {/* Center: Search Bar */}
                  <div className="flex items-center gap-2 bg-secondary/80 px-3 py-1.5 rounded-lg text-muted-foreground w-48 justify-between border border-border/50">
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
                      <span className="text-[10px] text-muted-foreground font-medium">
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
                          <div>Date/Description</div>
                          <div>Category</div>
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
      </section>



      {/* ----------------- PRICING SECTION (#pricing) ----------------- */}
      <section id="pricing" className="max-w-6xl mx-auto px-4 py-16 w-full z-20 relative border-t border-border/40">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="font-display text-4xl font-bold text-foreground">Simple, Transparent Pricing</h2>
          <p className="text-muted-foreground text-sm mt-2">
            Discover recoverable commercial claims automatically. Pay for performance, not setup.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tier 1 */}
          <div className="bg-background border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-accent/50 transition-colors">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Starter Audit</span>
              <div className="text-3xl font-bold font-display text-foreground mt-2">$0 <span className="text-xs font-normal text-muted-foreground">/ month</span></div>
              <p className="text-xs text-muted-foreground mt-2">Perfect for single vendor audits up to $250k exposure.</p>
              
              <ul className="mt-6 space-y-2 text-xs text-foreground">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Up to 50 Evidence Files</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 2 Autonomous Agents</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Basic Discrepancy Scoring</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Exportable Audit Briefs</li>
              </ul>
            </div>

            <Button onClick={handleTriggerDemo} className="w-full rounded-xl mt-8 font-medium">
              Start Free Audit
            </Button>
          </div>

          {/* Tier 2 (Popular) */}
          <div className="bg-background border-2 border-accent rounded-2xl p-6 shadow-lg flex flex-col justify-between relative">
            <span className="absolute -top-3 right-6 bg-accent text-accent-foreground text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
              Most Popular
            </span>
            <div>
              <span className="text-xs font-semibold text-accent uppercase tracking-wider">Enterprise Pro</span>
              <div className="text-3xl font-bold font-display text-foreground mt-2">$499 <span className="text-xs font-normal text-muted-foreground">/ month</span></div>
              <p className="text-xs text-muted-foreground mt-2">For high-volume commercial contracts and continuous telemetry auditing.</p>
              
              <ul className="mt-6 space-y-2 text-xs text-foreground">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-accent" /> Unlimited Evidence Ingestion</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-accent" /> All 4 Autonomous AI Agents</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-accent" /> Real-time SSE Execution Stream</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-accent" /> Hard Overrides & Contradictions</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-accent" /> Direct Legal Package Generation</li>
              </ul>
            </div>

            <Button onClick={handleTriggerDemo} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl mt-8 font-medium">
              Launch Pro Demo <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Tier 3 */}
          <div className="bg-background border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:border-accent/50 transition-colors">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">API & Custom</span>
              <div className="text-3xl font-bold font-display text-foreground mt-2">Custom <span className="text-xs font-normal text-muted-foreground">/ volume</span></div>
              <p className="text-xs text-muted-foreground mt-2">Dedicated infrastructure for enterprise insurance and Fortune 500 teams.</p>
              
              <ul className="mt-6 space-y-2 text-xs text-foreground">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Custom LLM & Rule Tuning</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> On-Premise SQLite/Postgres DB</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> Dedicated Account Manager</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-500" /> 99.99% SLA Guarantee</li>
              </ul>
            </div>

            <Button onClick={handleTriggerDemo} variant="outline" className="w-full rounded-xl mt-8 font-medium border-border">
              Contact Enterprise
            </Button>
          </div>
        </div>
      </section>

      {/* ----------------- ABOUT SECTION (#about) ----------------- */}
      <section id="about" className="max-w-6xl mx-auto px-4 py-16 w-full z-20 relative border-t border-border/40">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-semibold text-accent uppercase tracking-wider">Autonomous AI Architecture</span>
            <h2 className="font-display text-4xl font-bold text-foreground mt-2 leading-tight">
              AI Investigates. Code Verifies. Human Decides.
            </h2>
            <p className="text-muted-foreground text-sm mt-4 leading-relaxed">
              ClaimForge is an autonomous financial claim discovery platform that continuously scans fragmented commercial evidence—PDF contracts, CSV telemetry, EML emails, and invoices.
            </p>

            <div className="mt-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Document Ingestion Agent</h4>
                  <p className="text-[11px] text-muted-foreground">Parses page citations, PDF clauses, and telemetry columns with zero manual tagging.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Contradiction Engine</h4>
                  <p className="text-[11px] text-muted-foreground">Applies deterministic rule overrides to prevent false positive disputes before legal action.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">Score-Weighted Recovery Model</h4>
                  <p className="text-[11px] text-muted-foreground">Calculates actual dollar value recovery potential based on evidence strength and contract precedent.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-secondary/40 border border-border rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" /> Live System Performance
            </h3>
            <div className="space-y-3 font-mono text-xs">
              <div className="bg-background p-3 rounded-lg border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Evidence Processing Time</span>
                <span className="text-emerald-500 font-bold">1.4 seconds / doc</span>
              </div>
              <div className="bg-background p-3 rounded-lg border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Contradiction Accuracy</span>
                <span className="text-accent font-bold">99.8% precision</span>
              </div>
              <div className="bg-background p-3 rounded-lg border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Disputed Value Discovered</span>
                <span className="text-foreground font-bold">$14.2M+ total</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------- CONTACT SECTION (#contact) ----------------- */}
      <section id="contact" className="max-w-4xl mx-auto px-4 py-16 w-full z-20 relative border-t border-border/40">
        <div className="bg-background border border-border rounded-2xl p-8 shadow-xl text-center">
          <Mail className="w-10 h-10 text-accent mx-auto mb-3" />
          <h2 className="font-display text-3xl font-bold text-foreground">Get Started with ClaimForge</h2>
          <p className="text-muted-foreground text-xs mt-2 max-w-md mx-auto">
            Ready to uncover hidden financial recovery in your commercial contracts? Enter your work email below.
          </p>

          {contactSubmitted ? (
            <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-xl p-4 text-xs font-semibold">
              Thank you! Our AI Claim Specialist will reach out to {contactEmail} shortly.
            </div>
          ) : (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                setContactSubmitted(true);
              }}
              className="mt-6 flex items-center gap-2 max-w-md mx-auto"
            >
              <input
                type="email"
                required
                placeholder="jane@company.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button type="submit" className="rounded-xl px-5 text-xs font-semibold py-2.5">
                Get Early Access
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* ----------------- FOOTER ----------------- */}
      <footer className="border-t border-border/40 py-8 px-6 text-center text-xs text-muted-foreground z-20 relative">
        <p>© 2026 ClaimForge Inc. All rights reserved. Autonomous Pre-Dispute Intelligence Engine.</p>
      </footer>

    </div>
  );
};

export default HeroSection;
