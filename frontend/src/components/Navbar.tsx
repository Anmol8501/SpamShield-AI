import { useState } from "react";
import { Shield, Sun, Moon, Monitor, Menu, X, Search } from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
  onOpenCommandPalette: () => void;
}

export default function Navbar({ activeTab, setActiveTab, theme, setTheme, onOpenCommandPalette }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { id: "home", label: "Home" },
    { id: "detector", label: "Detector" },
    { id: "dashboard", label: "Dashboard" },
    { id: "modelInfo", label: "Model Info" },
  ];

  // Cycles theme: light -> dark -> system -> light...
  const handleThemeCycle = () => {
    if (theme === "light") setTheme("dark");
    else if (theme === "dark") setTheme("system");
    else setTheme("light");
  };

  const getThemeIcon = () => {
    switch (theme) {
      case "light":
        return <Sun className="h-5 w-5 text-amber-500" />;
      case "dark":
        return <Moon className="h-5 w-5 text-indigo-400" />;
      case "system":
        return <Monitor className="h-5 w-5 text-slate-500" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case "light":
        return "Light Theme";
      case "dark":
        return "Dark Theme";
      case "system":
        return "System Theme";
    }
  };

  return (
    <nav className="sticky top-0 z-[80] w-full backdrop-blur-md bg-white/70 dark:bg-slate-950/75 border-b border-slate-200/50 dark:border-slate-800/50 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => setActiveTab("home")}>
            <div className="bg-brand-600 dark:bg-brand-500 text-white p-2 rounded-xl shadow-lg shadow-brand-500/25">
              <Shield className="h-5 w-5" />
            </div>
            <span className="font-outfit font-extrabold text-lg bg-clip-text text-transparent bg-gradient-to-r from-slate-950 via-brand-600 to-slate-950 dark:from-white dark:via-brand-400 dark:to-white">
              SpamShield AI
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex space-x-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeTab === item.id
                      ? "bg-slate-100 dark:bg-slate-900 text-brand-600 dark:text-brand-400 font-semibold"
                      : "text-slate-650 dark:text-slate-405 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/50 dark:hover:bg-slate-900/50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Command Palette Trigger */}
            <button
              onClick={onOpenCommandPalette}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-850 text-slate-500 dark:text-slate-450 transition-all text-xs"
              title="Search commands"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
              <kbd className="font-mono text-[9px] px-1 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded">
                Ctrl+K
              </kbd>
            </button>

            {/* Theme Cycler */}
            <button
              onClick={handleThemeCycle}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title={getThemeLabel()}
              aria-label="Toggle Theme"
            >
              {getThemeIcon()}
            </button>
          </div>

          {/* Mobile Menu Trigger & Right elements */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onOpenCommandPalette}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Search commands"
            >
              <Search className="h-4 w-4" />
            </button>

            <button
              onClick={handleThemeCycle}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title={getThemeLabel()}
            >
              {getThemeIcon()}
            </button>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900"
              aria-label="Toggle Menu"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden border-t border-slate-200/50 dark:border-slate-800/50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsOpen(false);
              }}
              className={`block w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === item.id
                  ? "bg-slate-100 dark:bg-slate-900 text-brand-600 dark:text-brand-400 font-semibold"
                  : "text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
