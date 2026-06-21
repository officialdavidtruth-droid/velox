import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, ShieldAlert, Sparkles, Key, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FaqItem {
  question: string;
  answer: string;
  icon: React.ReactNode;
}

export default function MarketingFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  const FAQS: FaqItem[] = [
    {
      question: 'How does the simultaneous broadcast scheduler operate?',
      answer: 'Our synchronized multi-platform engine handles real-time content cloning. When you schedule or write a caption inside the Caption Studio, our server-side pipelines parse the text, package localized asset URLs, and translate tags correctly for individual platform rules (such as character limits, aspect ratios, or hashtag structures) for Instagram, Facebook, TikTok, and LinkedIn instantly.',
      icon: <Sparkles className="w-5 h-5 text-indigo-500" />
    },
    {
      question: 'What is the SOC2 isolated token-vault guarantee?',
      answer: 'SocialPilot AI does not record your direct social media login credentials or passwords. Authentic handshakes occur strictly via secure OAuth 2.0 PKCE protocol protocols. Authorized access tokens reside under fully encrypted, TLS-isolated storage tables (as demonstrated in our integrated social accounts database vault). Disconnecting any platform instantly and permanently flushes all active token buffers.',
      icon: <Key className="w-5 h-5 text-emerald-500" />
    },
    {
      question: 'Can I link multiple property calendars from my PMS?',
      answer: "Absolutely. SocialPilot maps active workspaces directly to lodging properties. When your PMS logs indicate vacant slots or sudden cancellations on specific luxury suites, the property supervisor dashboard displays a 'promo creator' prompt. This constructs tailored copy containing daily rates and direct CTAs to fill occupancy gaps instantly.",
      icon: <HelpCircle className="w-5 h-5 text-pink-500" />
    },
    {
      question: 'Is Google Ads telemetry calculated in live real-time?',
      answer: 'Yes. Our live Analytics View queries direct campaign performance vectors, cost-per-click values (CPC), customer acquisitions (CPA), and absolute daily click-through trends (CTR). This compiles a transparent calculation of Return on Ad Spend (ROAS) plotted side-by-side with your organic social campaign engagement stats.',
      icon: <BarChart3 className="w-5 h-5 text-blue-500" />
    }
  ];

  return (
    <div className="bg-white dark:bg-slate-950 py-16 border-t border-slate-100 dark:border-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header Title */}
        <div className="text-center space-y-2">
          <span className="text-[10px] uppercase font-black tracking-widest text-[#6366f1] font-mono block">SUPPORT KNOWLEDGE BASE</span>
          <h2 className="text-xl sm:text-2xl font-bold font-display uppercase text-slate-900 dark:text-white">
            Frequently Asked Inquiries
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mx-auto">
            Review detailed technical guidelines outlining simultaneous publishing workflows, PMS database connections, and credential caching rules.
          </p>
        </div>

        {/* Accordion Container */}
        <div className="border border-slate-150 dark:border-slate-850 rounded-sm divide-y divide-slate-150 dark:divide-slate-850 overflow-hidden shadow-xs">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div key={idx} className="bg-slate-50/30 dark:bg-slate-900/10 transition">
                
                {/* Accordion Header */}
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/60 transition group select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="shrink-0 rounded-sm p-1.5 bg-white dark:bg-slate-950 border border-slate-150 dark:border-slate-800 shadow-2xs">
                      {faq.icon}
                    </div>
                    <span className="text-xs font-bold text-slate-850 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                      {faq.question}
                    </span>
                  </div>
                  
                  <div className="shrink-0 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Animated Accordion Body */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 text-slate-500 dark:text-slate-400 text-xs leading-relaxed border-t border-slate-100/50 dark:border-slate-900/50 pl-14 font-medium">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            );
          })}
        </div>

        {/* Security Trust badge */}
        <div className="bg-indigo-50/30 dark:bg-indigo-950/20 border border-indigo-150/40 dark:border-indigo-900/30 rounded-sm p-5 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 border border-indigo-200/20">
            <ShieldAlert className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1 text-xs">
            <h4 className="font-extrabold text-slate-900 dark:text-white uppercase tracking-wider text-[10px] font-mono text-indigo-700 dark:text-indigo-300">
              SOC2 Security & GDPR Token Compliance Verified
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed">
              We employ strict Transport Layer Security (TLS 1.3), OAuth token sandboxing, and periodic automatic session sweeps. If you require private container nodes or have customized database requirements, please speak with our Enterprise staff.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
