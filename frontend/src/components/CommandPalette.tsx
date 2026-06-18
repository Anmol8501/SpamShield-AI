import React, { useState, useEffect, useRef } from "react";
import { Search, Monitor, Terminal, Shield, BarChart3, Sun, Moon, Trash2, Keyboard } from "lucide-react";

interface CommandItem {
  id: string;
  category: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  setActiveTab: (tab: string) => void;
  setDarkMode: (dark: boolean) => void;
  darkMode: boolean;
  onInjectExample: (text: string) => void;
  onClearHistory: () => void;
}

export default function CommandPalette({
  isOpen,
  onClose,
  setActiveTab,
  setDarkMode,
  darkMode,
  onInjectExample,
  onClearHistory,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    // Navigation
    {
      id: "nav-home",
      category: "Navigation",
      title: "Go to Home",
      subtitle: "Return to landing screen",
      icon: <Monitor className="h-4 w-4" />,
      shortcut: "⌥H",
      action: () => {
        setActiveTab("home");
        onClose();
      },
    },
    {
      id: "nav-detector",
      category: "Navigation",
      title: "Go to Detector",
      subtitle: "Open prediction sandbox",
      icon: <Shield className="h-4 w-4" />,
      shortcut: "⌥D",
      action: () => {
        setActiveTab("detector");
        onClose();
      },
    },
    {
      id: "nav-dashboard",
      category: "Navigation",
      title: "Go to Dashboard",
      subtitle: "Open analytics and logs",
      icon: <BarChart3 className="h-4 w-4" />,
      shortcut: "⌥A",
      action: () => {
        setActiveTab("dashboard");
        onClose();
      },
    },
    {
      id: "nav-model",
      category: "Navigation",
      title: "Go to Model Info",
      subtitle: "Review algorithm specifications",
      icon: <Terminal className="h-4 w-4" />,
      action: () => {
        setActiveTab("modelInfo");
        onClose();
      },
    },
    // Theme
    {
      id: "theme-toggle",
      category: "Preferences",
      title: `Switch to ${darkMode ? "Light" : "Dark"} Mode`,
      subtitle: `Toggle light or dark styling theme`,
      icon: darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
      shortcut: "⌥T",
      action: () => {
        setDarkMode(!darkMode);
        onClose();
      },
    },
    // Templates / Examples
    {
      id: "ex-spam1",
      category: "Templates",
      title: "Inject Spam Example: Cash Prize",
      subtitle: "'Congratulations! You have won ₹50,000...'",
      icon: <Shield className="h-4 w-4 text-rose-500" />,
      action: () => {
        onInjectExample("Congratulations! You have won ₹50,000. Click here to claim.");
        setActiveTab("detector");
        onClose();
      },
    },
    {
      id: "ex-spam2",
      category: "Templates",
      title: "Inject Spam Example: Contest Win",
      subtitle: "'Free entry into our contest. Reply WIN now.'",
      icon: <Shield className="h-4 w-4 text-rose-500" />,
      action: () => {
        onInjectExample("Free entry into our contest. Reply WIN now.");
        setActiveTab("detector");
        onClose();
      },
    },
    {
      id: "ex-ham1",
      category: "Templates",
      title: "Inject Ham Example: Lunch Meeting",
      subtitle: "'Hey, let's meet at 5 PM.'",
      icon: <Shield className="h-4 w-4 text-emerald-500" />,
      action: () => {
        onInjectExample("Hey, let's meet at 5 PM.");
        setActiveTab("detector");
        onClose();
      },
    },
    // Actions
    {
      id: "clear-logs",
      category: "Actions",
      title: "Clear Prediction History",
      subtitle: "Delete all saved logs from local storage",
      icon: <Trash2 className="h-4 w-4 text-rose-500" />,
      action: () => {
        if (confirm("Are you sure you want to clear your local database?")) {
          onClearHistory();
        }
        onClose();
      },
    },
  ];

  // Filter commands
  const filtered = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase()) ||
    (cmd.subtitle && cmd.subtitle.toLowerCase().includes(query.toLowerCase()))
  );

  // Group commands
  const categories = Array.from(new Set(filtered.map((cmd) => cmd.category)));

  // Global flat index helper
  const flattenedList = categories.flatMap((cat) =>
    filtered.filter((cmd) => cmd.category === cat)
  );

  useEffect(() => {
    // Reset index on search change
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % flattenedList.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + flattenedList.length) % flattenedList.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (flattenedList[selectedIndex]) {
          flattenedList[selectedIndex].action();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, flattenedList]);

  // Adjust scroll position to active item
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  let flatCounter = 0;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Palette Container */}
      <div
        ref={containerRef}
        className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[450px]"
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400 mr-3 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent border-none focus:outline-none text-slate-800 dark:text-slate-200 text-sm placeholder-slate-400"
          />
          <span className="text-[10px] text-slate-450 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 px-2 py-1 rounded font-mono shrink-0">
            ESC
          </span>
        </div>

        {/* Command List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2">
          {flattenedList.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No commands found matching "{query}"
            </div>
          ) : (
            categories.map((cat) => {
              const catCmds = filtered.filter((cmd) => cmd.category === cat);
              return (
                <div key={cat} className="space-y-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider">
                    {cat}
                  </div>
                  {catCmds.map((cmd) => {
                    const currentFlatIndex = flatCounter++;
                    const isActive = currentFlatIndex === selectedIndex;
                    return (
                      <button
                        key={cmd.id}
                        data-active={isActive}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIndex(currentFlatIndex)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all ${
                          isActive
                            ? "bg-brand-500 text-white shadow-md shadow-brand-500/10"
                            : "text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`p-1.5 rounded-lg ${isActive ? "bg-white/20" : "bg-slate-100 dark:bg-slate-800"}`}>
                            {cmd.icon}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold truncate leading-normal">
                              {cmd.title}
                            </div>
                            {cmd.subtitle && (
                              <div className={`text-[10px] truncate ${isActive ? "text-white/80" : "text-slate-400"}`}>
                                {cmd.subtitle}
                              </div>
                            )}
                          </div>
                        </div>

                        {cmd.shortcut && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 ${
                            isActive ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-750 text-slate-500"
                          }`}>
                            {cmd.shortcut}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="border-t border-slate-200 dark:border-slate-800 px-4 py-2.5 bg-slate-50 dark:bg-slate-900/60 flex justify-between text-[10px] text-slate-400">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <Keyboard className="h-3.5 w-3.5" /> Navigate: <kbd className="font-mono">↑↓</kbd>
            </span>
            <span className="flex items-center gap-1">
              Select: <kbd className="font-mono">Enter</kbd>
            </span>
          </div>
          <span>SaaS Command Center</span>
        </div>
      </div>
    </div>
  );
}
