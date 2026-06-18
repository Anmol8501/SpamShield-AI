import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Copy, Check, Download, RefreshCw, ClipboardPaste, Trash2, ShieldCheck, Share2, Upload, AlertCircle } from "lucide-react";

interface DetectorProps {
  onPredictionSuccess: () => void;
  addToast: (message: string, type: "success" | "error" | "warning" | "info") => void;
  injectedExample: string;
  clearInjectedExample: () => void;
}

interface OCRMetadata {
  confidence: number;
  processing_time: string;
  char_count: number;
}

export default function Detector({ onPredictionSuccess, addToast, injectedExample, clearInjectedExample }: DetectorProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanningImage, setScanningImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Real prediction and OCR metadata
  const [result, setResult] = useState<{
    prediction: string;
    confidence: number;
    risk: string;
    processing_time: string;
    timestamp: string;
    source: string;
  } | null>(null);
  
  const [ocrMetadata, setOcrMetadata] = useState<OCRMetadata | null>(null);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const charLimit = 500;

  // Auto-expand textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Inject command palette examples
  useEffect(() => {
    if (injectedExample) {
      setMessage(injectedExample);
      setResult(null);
      setOcrMetadata(null);
      setImagePreview(null);
      setError(null);
      clearInjectedExample();
      addToast("Example message injected", "info");
    }
  }, [injectedExample]);

  const charCount = message.length;
  const wordCount = message.trim() ? message.trim().split(/\s+/).length : 0;

  const examples = {
    spam: [
      { text: "Congratulations! You have won ₹50,000. Click here to claim.", label: "Prize Win" },
      { text: "Free entry into our contest. Reply WIN now.", label: "Contest Freebie" },
    ],
    ham: [
      { text: "Hey, let's meet at 5 PM.", label: "Friendly Meeting" },
      { text: "Your order has been delivered.", label: "Shipping Update" },
    ],
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setMessage(text.slice(0, charLimit));
        addToast("Pasted content from clipboard", "success");
      }
    } catch (err) {
      addToast("Failed to read clipboard permissions", "error");
    }
  };

  // Real OCR Upload & Execution
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verify format extension
    const allowed = ["png", "jpg", "jpeg", "webp"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowed.includes(ext)) {
      addToast("Unsupported file type. Please upload PNG, JPG, JPEG, or WEBP.", "error");
      return;
    }

    setScanningImage(true);
    setUploadProgress(15);
    setResult(null);
    setOcrMetadata(null);
    setError(null);
    
    // Create local preview
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);

    // Mock progress increments for smoother UX
    const progressInterval = setInterval(() => {
      setUploadProgress((p) => (p < 85 ? p + 12 : p));
    }, 150);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("http://localhost:5000/ocr", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "OCR request failed.");
      }

      const data = await response.json();
      
      if (!data.extracted_text || !data.extracted_text.trim()) {
        throw new Error("No readable text could be extracted from this image.");
      }

      // Populate text
      setMessage(data.extracted_text);
      setOcrMetadata({
        confidence: data.confidence,
        processing_time: data.processing_time,
        char_count: data.char_count,
      });

      addToast("OCR Text Extracted! Starting prediction scan...", "success");

      // Auto trigger prediction after short delay
      setTimeout(() => {
        triggerAnalysis(data.extracted_text, "ocr");
      }, 600);

    } catch (err: any) {
      const msg = err.message || "OCR engine error.";
      setError(msg);
      addToast(msg, "error");
      setScanningImage(false);
      setImagePreview(null);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const triggerAnalysis = async (textToScan: string, source: "manual" | "ocr") => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToScan, source }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Prediction request failed.");
      }

      const data = await response.json();
      setResult({
        prediction: data.prediction,
        confidence: data.confidence,
        risk: data.risk,
        processing_time: data.processing_time,
        timestamp: data.timestamp,
        source: source === "ocr" ? "OCR Image Upload" : "Manual Input",
      });

      onPredictionSuccess();
      addToast(`Classifier result: ${data.prediction}`, "success");
    } catch (err: any) {
      const msg = err.message || "Could not reach predictions server.";
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
      setScanningImage(false);
    }
  };

  const handleAnalyze = () => {
    if (!message.trim()) return;
    triggerAnalysis(message, "manual");
  };

  // Keyword check client-side
  const checkSpamIndicators = () => {
    const text = message.toLowerCase();
    return {
      promo: /won|prize|cash|congratulations|reward|gift|free|claim/i.test(text),
      links: /https?:\/\/|www\.|\.com|\.net|\.org|\.in|\.info|\.cc|\.xyz/i.test(text),
      indigo: /urgent|immediate|expires|act now|today only|last chance/i.test(text),
      caps: /[A-Z]{4,}/.test(message),
    };
  };

  const indicators = checkSpamIndicators();

  const copyResult = () => {
    if (!result) return;
    const reportText = `🛡️ SpamShield AI Report\n` +
      `Timestamp: ${result.timestamp}\n` +
      `Message: "${message}"\n` +
      `Classification: ${result.prediction}\n` +
      `Confidence: ${result.confidence}%\n` +
      `Risk Quotient: ${result.risk}\n` +
      `Source: ${result.source}\n` +
      `Inference Latency: ${result.processing_time}`;
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    addToast("Copied to clipboard", "success");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareResult = () => {
    if (!result) return;
    const shareUrl = `${window.location.origin}/?prediction=${result.prediction}&conf=${result.confidence}`;
    navigator.clipboard.writeText(shareUrl);
    setShared(true);
    addToast("Share URL copied to clipboard", "info");
    setTimeout(() => setShared(false), 2000);
  };

  const downloadReport = () => {
    if (!result) return;
    const text = `========================================\n` +
      `         SPAMSHIELD AI REPORT (REAL)    \n` +
      `========================================\n\n` +
      `Timestamp: ${result.timestamp}\n` +
      `Source Channel: ${result.source}\n` +
      `SMS Input: "${message}"\n\n` +
      `----------------------------------------\n` +
      `Classification: ${result.prediction.toUpperCase()}\n` +
      `Confidence: ${result.confidence}%\n` +
      `Risk Level: ${result.risk.toUpperCase()}\n` +
      `Scan Latency: ${result.processing_time}\n` +
      `----------------------------------------\n\n` +
      `ANALYSIS FACTOR BREAKDOWN:\n` +
      `- Promotional Text: ${indicators.promo ? "TRIGGERED (Spam indicator)" : "CLEAN"}\n` +
      `- Suspicious Links: ${indicators.links ? "TRIGGERED (Spam indicator)" : "CLEAN"}\n` +
      `- Urgent Terminology: ${indicators.indigo ? "TRIGGERED (Spam indicator)" : "CLEAN"}\n` +
      `- Uppercase Spikes: ${indicators.caps ? "TRIGGERED (Spam indicator)" : "CLEAN"}\n\n` +
      `Database: SQLite persistent predictions log.\n`;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `spamshield_saas_report_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    addToast("Report report text file downloaded", "success");
  };

  // Circle Gauge
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = result ? circumference - (result.confidence / 100) * circumference : circumference;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Sandbox Controls panel */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 shadow-md space-y-4">
            
            <div className="flex justify-between items-center">
              <label className="font-outfit font-bold text-lg text-slate-800 dark:text-slate-200">
                Inference Sandbox
              </label>
              
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || scanningImage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/20 dark:hover:bg-brand-950/40 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload SMS Image
                </button>

                <button
                  type="button"
                  onClick={handlePaste}
                  disabled={loading || scanningImage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-650 dark:text-slate-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-xl transition-all"
                >
                  <ClipboardPaste className="h-3.5 w-3.5" />
                  Paste
                </button>

                {message && (
                  <button
                    type="button"
                    onClick={() => { setMessage(""); setResult(null); setOcrMetadata(null); setImagePreview(null); setError(null); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-455 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955/20 dark:hover:bg-rose-955/40 rounded-xl transition-all"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Input Form */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, charLimit))}
                placeholder="Provide text content manually or upload SMS screenshot for real OCR extraction..."
                rows={4}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-650 transition-all resize-none text-base min-h-[120px]"
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-650">
                <span>{wordCount} words</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                <span>{charCount} / {charLimit} chars</span>
              </div>
            </div>

            {/* Preview image thumbnail */}
            {imagePreview && (
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 flex items-center gap-3">
                <img src={imagePreview} alt="SMS Screenshot" className="w-12 h-12 object-cover rounded-lg border border-slate-200 dark:border-slate-800" />
                <div className="space-y-0.5 text-left">
                  <span className="text-[10px] font-bold text-slate-450 uppercase block">Active Image Preview</span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate max-w-[200px] block">Uploaded SMS Capture</span>
                </div>
                <button
                  onClick={() => { setImagePreview(null); if (message === ocrMetadata?.char_count.toString()) setMessage(""); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Run Button */}
            <button
              onClick={handleAnalyze}
              disabled={loading || scanningImage || !message.trim()}
              className="w-full py-4 px-6 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-105 disabled:dark:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg shadow-brand-500/10 hover:shadow-brand-600/25 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin h-5 w-5" />
                  Running Inference...
                </>
              ) : (
                "Scan Content"
              )}
            </button>
          </div>

          {/* Quick fills */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 shadow-md">
            <h3 className="font-outfit font-bold text-sm text-slate-800 dark:text-slate-200 mb-4">
              Developer Examples
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-500">Spam Examples</span>
                {examples.spam.map((ex, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setMessage(ex.text); setResult(null); setOcrMetadata(null); setImagePreview(null); setError(null); }}
                    className="w-full text-left p-3.5 bg-rose-50/40 hover:bg-rose-50 dark:bg-rose-955/10 dark:hover:bg-rose-955/20 border border-rose-250/20 rounded-xl transition-all text-xs text-slate-700 dark:text-slate-350"
                  >
                    <strong className="block text-rose-600 dark:text-rose-450 mb-1">{ex.label}</strong>
                    "{ex.text}"
                  </button>
                ))}
              </div>
              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-500">Safe Examples</span>
                {examples.ham.map((ex, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setMessage(ex.text); setResult(null); setOcrMetadata(null); setImagePreview(null); setError(null); }}
                    className="w-full text-left p-3.5 bg-emerald-50/40 hover:bg-emerald-50 dark:bg-emerald-955/10 dark:hover:bg-emerald-955/20 border border-emerald-250/20 rounded-xl transition-all text-xs text-slate-700 dark:text-slate-350"
                  >
                    <strong className="block text-emerald-600 dark:text-emerald-450 mb-1">{ex.label}</strong>
                    "{ex.text}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostics & Result Display */}
        <div className="lg:col-span-5">
          <AnimatePresence mode="wait">
            
            {/* Upload progress & OCR Loader */}
            {scanningImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center min-h-[350px] relative overflow-hidden text-center"
              >
                {/* Visual Scanning Laser */}
                <div className="absolute left-0 w-full h-1 bg-brand-500 top-0 animate-[bounce_2s_infinite]" />
                <div className="absolute inset-0 bg-gradient-to-b from-brand-500/10 to-transparent pointer-events-none" />

                <div className="relative mb-6">
                  <Upload className="h-10 w-10 text-brand-400 animate-bounce" />
                </div>
                
                <h3 className="font-outfit font-bold text-lg text-white mb-2">
                  Scanning Image (OCR)
                </h3>
                
                {/* Upload Progress Bar */}
                <div className="w-full max-w-[200px] space-y-2 mt-2">
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="bg-brand-500 h-full transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold block text-center">
                    Upload & Processing: {uploadProgress}%
                  </span>
                </div>
              </motion.div>
            )}

            {/* Prediction Loading */}
            {loading && !scanningImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200/50 dark:border-slate-800/50 shadow-md flex flex-col items-center justify-center min-h-[350px] text-center"
              >
                <div className="relative flex items-center justify-center w-20 h-20 mb-6">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-brand-600 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                  <ShieldCheck className="h-8 w-8 text-brand-600 dark:text-brand-400 animate-pulse" />
                </div>
                <h3 className="font-outfit font-bold text-lg text-slate-800 dark:text-slate-200 mb-2">
                  Analyzing Bayes Ratios
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-450 max-w-[200px]">
                  Evaluating input features via persistent database pipeline...
                </p>
              </motion.div>
            )}

            {/* Error Message Card */}
            {error && !loading && !scanningImage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-rose-50 dark:bg-rose-955/10 border border-rose-200 dark:border-rose-900/30 rounded-3xl p-6 text-center space-y-4"
              >
                <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
                <h3 className="font-outfit font-bold text-rose-800 dark:text-rose-400 text-lg">Server Error</h3>
                <p className="text-xs text-rose-700 dark:text-rose-350 leading-relaxed">
                  {error}
                </p>
                <button
                  onClick={handleAnalyze}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-colors"
                >
                  Retry Request
                </button>
              </motion.div>
            )}

            {/* Standard Sandbox Idle State */}
            {!result && !loading && !scanningImage && !error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-slate-100/50 dark:bg-slate-900/35 border border-dashed border-slate-300 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center min-h-[350px] text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-slate-200/50 dark:bg-slate-850/50 flex items-center justify-center mb-5 border border-slate-300/40 dark:border-slate-800/40">
                  <ShieldCheck className="h-7 w-7 text-slate-400 dark:text-slate-650" />
                </div>
                <h3 className="font-outfit font-bold text-sm text-slate-700 dark:text-slate-400 mb-2">
                  Awaiting Input
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-550 max-w-[200px] leading-relaxed">
                  Type your message or upload an image screenshot to trigger live SQLite evaluation.
                </p>
              </motion.div>
            )}

            {/* Upgraded Real Result Diagnostics Card */}
            {result && !loading && !scanningImage && !error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-3xl p-6 border shadow-xl overflow-hidden relative ${
                  result.prediction === "Spam"
                    ? "bg-rose-50/60 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/30"
                    : "bg-emerald-50/60 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-900/30"
                }`}
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        result.prediction === "Spam"
                          ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-455"
                          : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-455"
                      }`}>
                        {result.prediction === "Spam" ? <AlertTriangle className="h-2.5 w-2.5" /> : <ShieldCheck className="h-2.5 w-2.5" />}
                        {result.prediction === "Spam" ? "Spam" : "Safe"}
                      </span>
                      
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        result.risk === "High"
                          ? "bg-red-500/10 text-red-650 dark:text-red-400"
                          : result.risk === "Medium"
                          ? "bg-amber-500/10 text-amber-650 dark:text-amber-400"
                          : "bg-emerald-500/10 text-emerald-650 dark:text-emerald-450"
                      }`}>
                        Risk: {result.risk}
                      </span>
                    </div>
                    
                    <h3 className="font-outfit font-bold text-xl text-slate-900 dark:text-white">
                      Scan Result
                    </h3>
                  </div>

                  {/* Circular Dial */}
                  <div className="relative flex items-center justify-center select-none shrink-0">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        className="stroke-slate-200 dark:stroke-slate-800"
                        strokeWidth="4.5"
                        fill="transparent"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        className={result.prediction === "Spam" ? "stroke-rose-500" : "stroke-emerald-500"}
                        strokeWidth="4.5"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[11px] font-bold text-slate-800 dark:text-slate-200">
                      {result.confidence.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Database Metrics and source */}
                <div className="space-y-3 bg-white/60 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/40 dark:border-slate-850/60 mb-6 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100 dark:border-slate-900">
                    <span className="text-slate-400">Analysis Channel:</span>
                    <strong className="text-slate-850 dark:text-white">{result.source}</strong>
                  </div>
                  {ocrMetadata && (
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-100 dark:border-slate-900">
                      <span className="text-slate-400">OCR Confidence:</span>
                      <strong className="text-slate-850 dark:text-white">{ocrMetadata.confidence}%</strong>
                    </div>
                  )}
                  {ocrMetadata && (
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-100 dark:border-slate-900">
                      <span className="text-slate-400">Extracted Size:</span>
                      <strong className="text-slate-850 dark:text-white">{ocrMetadata.char_count} chars</strong>
                    </div>
                  )}
                  <div className="flex justify-between items-center py-0.5 border-b border-slate-100 dark:border-slate-900">
                    <span className="text-slate-400">Execution Speed:</span>
                    <strong className="text-slate-850 dark:text-white">{result.processing_time}</strong>
                  </div>
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-slate-400">Committed At:</span>
                    <strong className="text-slate-850 dark:text-white">{result.timestamp}</strong>
                  </div>
                </div>

                {/* Spam Risk Factors Checklist */}
                <div className="space-y-4 bg-white/60 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-200/40 dark:border-slate-850/60 mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block text-left">
                    Trigger Profiles
                  </span>
                  
                  <div className="space-y-2 text-left">
                    {[
                      { key: "promo", label: "Promotional Content", active: indicators.promo, desc: "Contains cash/win marketing labels" },
                      { key: "links", label: "Suspicious Hyperlinks", active: indicators.links, desc: "Includes routing redirect paths" },
                      { key: "urgent", label: "Urgent Terminology", active: indicators.indigo, desc: "Prompts deadline warnings" },
                      { key: "caps", label: "Uppercase Overload", active: indicators.caps, desc: "Excessive uppercase flags" },
                    ].map((factor) => (
                      <div key={factor.key} className="flex justify-between items-start gap-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-semibold text-slate-850 dark:text-slate-250 block">
                            {factor.label}
                          </span>
                          <span className="text-[9px] text-slate-450 dark:text-slate-500 block leading-tight">
                            {factor.desc}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide shrink-0 ${
                          factor.active 
                            ? "bg-rose-100 dark:bg-rose-900/35 text-rose-700 dark:text-rose-400" 
                            : "bg-slate-100 dark:bg-slate-850 text-slate-400"
                        }`}>
                          {factor.active ? "Detected" : "Clean"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={copyResult}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-250/50 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>Copy</span>
                  </button>

                  <button
                    onClick={shareResult}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-250/50 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    {shared ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Share2 className="h-3.5 w-3.5" />}
                    <span>Share</span>
                  </button>

                  <button
                    onClick={downloadReport}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white hover:bg-slate-55 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-250/50 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Report</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
      </div>
    </div>
  );
}
