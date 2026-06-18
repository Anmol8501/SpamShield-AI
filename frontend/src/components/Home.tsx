import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Zap, Server, ChevronDown, Star, ShieldAlert } from "lucide-react";

interface HomeProps {
  setActiveTab: (tab: string) => void;
}

export default function Home({ setActiveTab }: HomeProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.5, ease: "easeOut" as any },
    },
  };

  const faqs = [
    {
      question: "What is SpamShield AI?",
      answer: "SpamShield AI is an intelligent classifier that scans text messages in real time. It uses TF-IDF feature weights and a Multinomial Naive Bayes algorithm to isolate suspicious promotional elements, links, and urgent language.",
    },
    {
      question: "How accurate is the classification model?",
      answer: "Our pre-trained model achieves an accuracy rating of 98.2% on standard SMS corpora, striking a careful balance to prevent false positives (marking safe messages as spam) while capturing aggressive marketing texts.",
    },
    {
      question: "Is my message content securely processed?",
      answer: "Absolutely. All messages sent to the API are parsed in memory to compute probability matrices. We do not store your SMS messages or private logs on the server. All test histories are saved strictly inside your local browser storage.",
    },
  ];

  const stats = [
    { value: "98.2%", label: "Accuracy Rating", desc: "Minimal false positives" },
    { value: "10ms", label: "Analysis Time", desc: "Sub-millisecond inference" },
    { value: "0", label: "Data Logs Saved", desc: "Privacy-first processing" },
  ];

  return (
    <div className="relative overflow-hidden space-y-24 py-6">
      {/* Background radial highlights */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-brand-500/10 dark:bg-brand-500/5 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse" />
      <div className="absolute top-[40%] right-0 w-[400px] h-[400px] bg-indigo-500/10 dark:bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Hero Section */}
      <motion.div
        className="max-w-6xl mx-auto text-center space-y-8 px-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Glow badge */}
        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 text-slate-700 dark:text-slate-350 text-xs font-semibold shadow-sm">
          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          <span>Next-Gen Bayesian Spam Filter</span>
        </motion.div>

        {/* Large Headline */}
        <motion.h1
          variants={itemVariants}
          className="font-outfit text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight max-w-4xl mx-auto"
        >
          Verify SMS Legitimacy <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 via-indigo-500 to-emerald-500 dark:from-brand-400 dark:via-indigo-400 dark:to-emerald-400">
            Powered by Machine Learning
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          variants={itemVariants}
          className="max-w-2xl mx-auto text-base sm:text-lg text-slate-650 dark:text-slate-400 leading-relaxed font-normal"
        >
          SpamShield AI flags SMS scams instantly. Analyze raw text strings, verify risk quotients, check probability gauges, and extract suspicious patterns safely.
        </motion.p>

        {/* Action triggers */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => setActiveTab("detector")}
            className="w-full sm:w-auto group px-7 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-bold text-base shadow-xl shadow-brand-500/20 hover:shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
          >
            Launch Classifier
            <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={() => {
              const element = document.getElementById("faq-section");
              element?.scrollIntoView({ behavior: "smooth" });
            }}
            className="w-full sm:w-auto px-7 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-base transition-all"
          >
            Frequently Asked Questions
          </button>
        </motion.div>

        {/* Live Preview / Hero Mockup */}
        <motion.div
          variants={itemVariants}
          className="pt-10 max-w-4xl mx-auto"
        >
          <div className="relative rounded-3xl bg-slate-900/5 dark:bg-slate-900/40 p-3 md:p-4 border border-slate-200 dark:border-slate-800 shadow-2xl backdrop-blur-md">
            <div className="rounded-2xl overflow-hidden bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 shadow-inner flex flex-col">
              {/* Mock App Header */}
              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-850 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-rose-500 block" />
                  <span className="w-3 h-3 rounded-full bg-amber-500 block" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 block" />
                </div>
                <span className="text-[10px] font-mono text-slate-450 dark:text-slate-500 uppercase tracking-widest font-semibold">
                  SpamShield Live Preview
                </span>
                <span className="w-12 h-2 rounded bg-slate-200 dark:bg-slate-800 block" />
              </div>

              {/* Mock App Body */}
              <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 text-left">
                {/* Mock Input */}
                <div className="md:col-span-7 space-y-4">
                  <div className="space-y-1.5">
                    <div className="h-4 w-28 bg-slate-200 dark:bg-slate-850 rounded" />
                    <div className="h-3 w-48 bg-slate-100 dark:bg-slate-900 rounded" />
                  </div>
                  <div className="h-32 w-full bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200/60 dark:border-slate-850 flex p-3 text-xs text-slate-450 font-mono">
                    "Congratulations! You've won ₹50,000 cash! Claim your prize now at http://win-now.in..."
                  </div>
                  <div className="h-12 w-full bg-brand-500/80 rounded-2xl" />
                </div>

                {/* Mock Output */}
                <div className="md:col-span-5 flex flex-col justify-center">
                  <div className="rounded-2xl border border-rose-200 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/15 p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="px-2 py-0.5 text-[9px] font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-600 rounded-full uppercase tracking-wider">
                        Spam
                      </span>
                      <span className="text-xs font-mono text-rose-500">Risk: High</span>
                    </div>
                    <div className="h-5 w-24 bg-slate-200 dark:bg-slate-850 rounded" />
                    <div className="h-3 w-full bg-slate-100 dark:bg-slate-900 rounded animate-pulse" />
                    <div className="h-3 w-3/4 bg-slate-100 dark:bg-slate-900 rounded animate-pulse" />
                    <div className="h-8 w-full bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Feature Grid */}
      <div className="max-w-6xl mx-auto px-4 space-y-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="font-outfit text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
            High Performance Core Features
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Engineered for high safety, fast analysis, and local device control.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: <Zap className="h-6 w-6 text-brand-600 dark:text-brand-400" />,
              title: "Instant Detection",
              desc: "Bayesian vectors return prediction coefficients in under 10 milliseconds.",
            },
            {
              icon: <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
              title: "AI Power Pipeline",
              desc: "Trained using scikit-learn TF-IDF matrices to match vocabulary weights.",
            },
            {
              icon: <Server className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
              title: "Secure Processing",
              desc: "Parsed strictly in memory. We never log or cache your private SMS details.",
            },
            {
              icon: <ShieldAlert className="h-6 w-6 text-rose-600 dark:text-rose-400" />,
              title: "Risk Evaluator",
              desc: "Assesses risk levels dynamically to tag suspicious links and offers.",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all space-y-4 text-left"
            >
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl w-12 h-12 flex items-center justify-center">
                {item.icon}
              </div>
              <h3 className="font-outfit font-bold text-base text-slate-900 dark:text-white">
                {item.title}
              </h3>
              <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How it Works Stepper */}
      <div className="max-w-6xl mx-auto px-4 py-8 bg-slate-100/40 dark:bg-slate-900/20 border border-slate-200/30 dark:border-slate-800/20 rounded-3xl space-y-12">
        <div className="text-center max-w-md mx-auto space-y-2">
          <h2 className="font-outfit text-2xl font-bold text-slate-900 dark:text-white">
            Simple 3-Step Analysis
          </h2>
          <p className="text-xs text-slate-500">How our SaaS classification platform computes outcomes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl mx-auto">
          {[
            { num: "01", title: "Enter Message String", desc: "Type your SMS content or upload a screenshot to simulate OCR parsing." },
            { num: "02", title: "Wait for AI Scan", desc: "Flask vectorizes content across 6,708 words using Naive Bayes distributions." },
            { num: "03", title: "Get Risk Indicators", desc: "View animated gauges showing probabilities, risk levels, and warning triggers." },
          ].map((step, idx) => (
            <div key={idx} className="space-y-3 relative group">
              <span className="font-mono text-3xl font-extrabold text-brand-600/30 dark:text-brand-400/20 group-hover:text-brand-500/60 transition-colors">
                {step.num}
              </span>
              <h3 className="font-outfit font-bold text-base text-slate-900 dark:text-white">
                {step.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-455 leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Numerical Metrics Section */}
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-3 gap-8">
        {stats.map((stat, idx) => (
          <div key={idx} className="text-center p-6 border-b sm:border-b-0 sm:border-r border-slate-200/50 dark:border-slate-800/60 last:border-0 space-y-2">
            <h4 className="font-outfit text-4xl sm:text-5xl font-extrabold text-slate-950 dark:text-white">
              {stat.value}
            </h4>
            <div className="space-y-1">
              <strong className="text-sm font-semibold text-slate-850 dark:text-slate-200 block">{stat.label}</strong>
              <span className="text-xs text-slate-500 dark:text-slate-500">{stat.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* FAQ Accordions */}
      <div id="faq-section" className="max-w-3xl mx-auto px-4 space-y-8">
        <h2 className="font-outfit text-2xl sm:text-3xl font-extrabold text-slate-905 dark:text-white text-center">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl overflow-hidden transition-all duration-200 shadow-sm"
              >
                <button
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="px-6 pb-4 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-850/50">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
