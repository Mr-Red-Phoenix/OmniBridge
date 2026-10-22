import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HeartPulse,
  ShieldAlert,
  Clock,
  Lock,
  ArrowRight,
  Cpu,
  ChevronDown,
} from 'lucide-react';

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const teamMembers = [
    {
      name: 'Parth Sharma',
      role: 'Frontend Engineering',
      tech: 'React 19, Vite, STOMP, ESI',
      image: '/team/parth.png',
    },
    {
      name: 'Chirag Dobriyal',
      role: 'Frontend Engineering',
      tech: 'Framer Motion, 3D Transforms',
      image: '/team/chirag.png',
    },
    {
      name: 'Rishabh Gupta',
      role: 'Backend Architecture',
      tech: 'Java 21, Spring Boot 3',
      image: '/team/rishabh.png',
    },
    {
      name: 'Akshat Kala',
      role: 'Backend Architecture',
      tech: 'PostgreSQL, Virtual Threads',
      image: '/team/akshat.png',
    },
  ];

  const faqs = [
    {
      q: 'How does OmniBridge operate when the internet is completely severed?',
      a: 'OmniBridge features an air-gapped local architecture. The Contextual ESI Engine, in-memory PriorityBlockingQueue, and STOMP WebSocket broker run self-contained on local hospital hardware, requiring zero WAN connection to intake, score, and rotate triage cards.',
    },
    {
      q: 'How does dynamic decay prevent patient starvation in the waiting room?',
      a: 'Unlike static paper tags, OmniBridge continuously updates priority scores via an algorithmic decay formula. As waiting time elapses, lower acuity patients gradually accumulate priority, guaranteeing that deteriorating vitals or extended delays are mathematically elevated.',
    },
    {
      q: 'Who has authorization to override automated ESI levels?',
      a: 'The system enforces strict role-based access control (RBAC). Only authenticated users holding the ROLE_DOCTOR or ROLE_ADMIN authorities can execute clinical overrides. All override events require mandatory clinical justifications and are immutably logged.',
    },
    {
      q: 'How are audit logs preserved against tampering?',
      a: 'Every intake and override triggers an asynchronous write to the triage_audit_ledger table powered by Java 21 Virtual Threads (@Async("virtualThreadExecutor")). This ensures zero latency for the live websocket queue while maintaining an append-only, forensic audit log.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-slate-100 transition-colors">
      
      {/* 1. HERO SECTION */}
      <section className="pt-20 pb-20 md:pt-28 md:pb-32 max-w-6xl mx-auto px-4 sm:px-6 flex flex-col items-center justify-center text-center">
        
        {/* Eyebrow Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-8 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
          <span>Autonomous ESI Triage &amp; Emergency Response</span>
        </div>

        {/* Primary Editorial Headline */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-[1.08]">
          Clinical triage, designed around every second.
        </h1>

        {/* Subtitle */}
        <p className="mt-7 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
          OmniBridge is a resilient, air-gapped disaster triage engine built for high-stress mass surges. Objective vitals are dynamically scored, decayed, and routed without paper delay.
        </p>

        {/* Dual Call to Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Link
            to="/hall"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-medium text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
          >
            <span>Open Live Hall Board</span>
            <ArrowRight size={16} />
          </Link>

          <Link
            to="/auth"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <Lock size={15} className="text-slate-500 dark:text-slate-400" />
            <span>Staff &amp; Clinical Portal</span>
          </Link>
        </div>

        {/* Feature Metric Strip */}
        <div className="mt-16 w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-4 p-6 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-left shadow-xs">
          <div className="border-r-0 md:border-r border-slate-200 dark:border-slate-800 pr-3">
            <span className="block text-xl font-bold text-slate-900 dark:text-white">Zero Cloud</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Offline LAN Independence</span>
          </div>
          <div className="border-r-0 md:border-r border-slate-200 dark:border-slate-800 pr-3">
            <span className="block text-xl font-bold text-slate-900 dark:text-white">ESI Level 1–5</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Deterministic Scoring</span>
          </div>
          <div className="border-r-0 md:border-r border-slate-200 dark:border-slate-800 pr-3">
            <span className="block text-xl font-bold text-slate-900 dark:text-white">Dynamic Decay</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Anti-Starvation Heap</span>
          </div>
          <div>
            <span className="block text-xl font-bold text-slate-900 dark:text-white">Virtual Loom</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">Non-blocking Audit Log</span>
          </div>
        </div>
      </section>

      {/* 2. CORE CAPABILITIES */}
      <section className="py-24 bg-white dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-14 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Our clinical engines</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
              Deterministic care for critical surges.
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-3 text-base max-w-xl">
              From triage vital acquisition to doctor override review, every protocol is engineered for speed and medical clarity.
            </p>
          </div>

          {/* Differentiated Grid Layout: Left Spotlight + Right Quadrant */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Spotlight Card */}
            <div className="lg:col-span-5 rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div className="h-64 sm:h-72 w-full overflow-hidden relative">
                <img
                  src="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80"
                  alt="Emergency Room Triage"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute bottom-4 left-4 text-xs font-bold px-3 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white shadow-xs">
                  Live Operations
                </span>
              </div>
              <div className="p-7">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Real-Time LAN Queue Orchestration
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  Distributes live patient acuity statuses to wallboards and staff tablets over local WebSockets without cloud dependencies or external bandwidth.
                </p>
                <Link
                  to="/hall"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:gap-2 transition-all"
                >
                  <span>View live hall board</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            </div>

            {/* Right Quadrant (2x2 Grid) */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
              
              {/* Card 1 */}
              <div className="p-7 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
                    <Clock size={20} />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    Dynamic Wait-Time Decay
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Patient priority scores continuously increment over duration elapsed to prevent neglect in overcrowded emergency bays.
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-5 inline-flex items-center gap-1">
                  Learn more <ArrowRight size={12} />
                </span>
              </div>

              {/* Card 2 */}
              <div className="p-7 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
                    <HeartPulse size={20} />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    Objective Vitals &amp; AVPU
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Automated physiological thresholds for pulse, SpO2, and respiratory depression paired with high-risk pediatric fever rules.
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-5 inline-flex items-center gap-1">
                  Learn more <ArrowRight size={12} />
                </span>
              </div>

              {/* Card 3 */}
              <div className="p-7 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
                    <ShieldAlert size={20} />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    Air-Gapped LAN Security
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Full cryptographic passwordless OTP and OTT token validation executed entirely within local memory for extreme disaster resilience.
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-5 inline-flex items-center gap-1">
                  Learn more <ArrowRight size={12} />
                </span>
              </div>

              {/* Card 4 */}
              <div className="p-7 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
                    <Cpu size={20} />
                  </div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    Immutable Audit Ledger
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Java 21 virtual threads persist all clinician overrides and score recalculations asynchronously with zero impact on real-time wallboard broadcasts.
                  </p>
                </div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-5 inline-flex items-center gap-1">
                  Learn more <ArrowRight size={12} />
                </span>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 3. STEP PROCESS */}
      <section className="py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column Image */}
          <div className="lg:col-span-6 rounded-3xl overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-sm">
            <img
              src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80"
              alt="Physician at intake"
              className="w-full h-[520px] object-cover"
            />
          </div>

          {/* Right Column Numbered Process */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Operational architecture</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white mb-8">
              Clinical triage, designed around you.
            </h2>

            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-4 items-start pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Immediate Ingress &amp; Vital Acquisition
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Patients are ingested via nurse intake stations with rapid vital capture, mental AVPU categorization, and projected hospital resource counts.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4 items-start pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Dynamic Anti-Starvation Decay
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Patients in the active PriorityBlockingQueue mathematically gain priority over time, ensuring non-urgent cases do not wait indefinitely.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4 items-start pb-6 border-b border-slate-200 dark:border-slate-800">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Doctor Review &amp; Override Loop
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Physicians review flagged borderline cases, submitting clinical overrides with mandatorily validated justifications.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center shrink-0">
                  4
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    Virtual Thread Audit Logging
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Every state mutation is dispatched to an immutable Postgres audit ledger via Project Loom virtual threads with zero socket lag.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. TEAM SECTION */}
      <section className="py-24 bg-white dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-14 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              <span>Meet our engineering team</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
              Built for resilience. Guided by precision.
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mt-3 text-base">
              The engineers behind the OmniBridge 2.0 disaster response architecture.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((member) => (
              <div
                key={member.name}
                className="rounded-3xl overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group"
              >
                <div className="aspect-[4/5] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-5">
                  <h4 className="text-base font-bold text-slate-900 dark:text-white">
                    {member.name}
                  </h4>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold block mt-0.5">
                    {member.role}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-2 font-mono">
                    {member.tech}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. FAQ SECTION */}
      <section className="py-24 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            <span>Technical FAQ</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            Answers to critical system questions.
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all shadow-xs"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-5 text-left flex items-center justify-between text-sm sm:text-base font-semibold text-slate-900 dark:text-white cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={`text-slate-400 transition-transform duration-200 ${
                    openFaq === idx ? 'rotate-180 text-blue-600' : ''
                  }`}
                />
              </button>
              {openFaq === idx && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 6. MINIMALIST FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-12 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white text-sm">OmniBridge 2.0</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>Disaster Venue SOS &amp; Autonomous ESI Triage Engine</span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <Link to="/hall" className="hover:text-blue-600 transition-colors">
              Hall Board
            </Link>
            <Link to="/auth" className="hover:text-blue-600 transition-colors">
              Staff Login
            </Link>
            <Link to="/report" className="hover:text-blue-600 transition-colors">
              Report SOS
            </Link>
          </div>

          <div>
            © {new Date().getFullYear()} OmniBridge System. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
