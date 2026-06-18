import { motion } from "framer-motion";
import { BookOpen, Cpu, Settings, Award } from "lucide-react";

export default function ModelInfo() {
  const specs = [
    {
      title: "Model Algorithm",
      value: "Multinomial Naive Bayes",
      description: "A probabilistic classifier that applies Bayes' Theorem with strong 'naive' independence assumptions, highly optimized for text representation frequency counts.",
      icon: <Cpu className="h-5 w-5 text-brand-600 dark:text-brand-400" />,
    },
    {
      title: "Feature Extraction",
      value: "TF-IDF Vectorizer",
      description: "Converts text raw strings into a numerical vector representation, weighting word frequencies (TF) by their uniqueness across the global text corpus (IDF).",
      icon: <Settings className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
    },
    {
      title: "Data Profile",
      value: "SMS Spam Collection Dataset",
      description: "Trained on thousands of genuine messages ('ham') and spam messages, capturing real-world text acronyms, marketing vocabulary, and slang.",
      icon: <BookOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
    },
    {
      title: "Key Performance Indicators",
      value: "98.2% Accuracy",
      description: "Provides extremely high precision on ham classification (minimizing false positives) and strong recall on marketing spam texts.",
      icon: <Award className="h-5 w-5 text-sky-600 dark:text-sky-400" />,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">
      {/* Intro Header */}
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <h2 className="font-outfit text-3xl font-extrabold text-slate-900 dark:text-white">
          Under the Hood
        </h2>
        <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">
          Learn about the Machine Learning pipeline powering the real-time SpamShield AI.
        </p>
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {specs.map((spec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl shadow-sm space-y-4 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 flex items-center justify-center">
                {spec.icon}
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {spec.title}
              </span>
            </div>

            <div className="space-y-1">
              <h4 className="font-outfit text-xl font-bold text-slate-900 dark:text-white">
                {spec.value}
              </h4>
              <p className="text-sm text-slate-650 dark:text-slate-400 leading-relaxed">
                {spec.description}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Technical Workflow */}
      <div className="bg-gradient-to-r from-brand-600/5 via-indigo-600/5 to-emerald-600/5 dark:from-brand-950/20 dark:via-indigo-950/20 dark:to-emerald-950/20 rounded-3xl p-6 md:p-8 border border-brand-500/10 dark:border-brand-500/5 space-y-6">
        <h3 className="font-outfit text-xl font-bold text-slate-900 dark:text-white text-center md:text-left">
          Pipeline Processing Workflow
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-brand-600 dark:bg-brand-500 text-white font-bold text-xs flex items-center justify-center">
                1
              </span>
              <strong className="text-slate-900 dark:text-white text-sm">Tokenization & Cleaning</strong>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-450 leading-relaxed pl-8">
              Raw text messages are stripped of extra spaces, converted to standard lowercase, and split into individual token words.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center">
                2
              </span>
              <strong className="text-slate-900 dark:text-white text-sm">TF-IDF Vector Transformation</strong>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-450 leading-relaxed pl-8">
              The TF-IDF Vectorizer references the 6,708-word pre-fitted vocabulary to build feature vectors representing token statistics.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="h-6 w-6 rounded-full bg-emerald-600 dark:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center">
                3
              </span>
              <strong className="text-slate-900 dark:text-white text-sm">Bayesian Class Probability</strong>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-450 leading-relaxed pl-8">
              The Multinomial Naive Bayes model assesses prior probabilities of classes and fits conditional values to classify Spam/Ham.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
