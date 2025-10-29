'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, LucideIcon } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  icon?: LucideIcon;
}

export function CollapsibleSection({
  title,
  children,
  defaultCollapsed = false,
  icon: Icon,
}: CollapsibleSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  return (
    <div className="overflow-hidden rounded-2xl">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between bg-gradient-to-br from-slate-800/70 to-slate-800/50 backdrop-blur-sm px-5 py-3.5 sm:py-4 rounded-t-2xl hover:from-slate-800/80 hover:to-slate-800/60 transition-all duration-200 border border-slate-700/50 shadow-lg"
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Icon className="w-5 h-5 text-blue-400" />
            </div>
          )}
          <h2 className="text-base lg:text-lg font-bold tracking-tight text-white">
            {title}
          </h2>
        </div>
        <motion.div
          animate={{ rotate: collapsed ? 0 : 90 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-5 h-5 text-slate-300" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-br from-slate-800/40 to-slate-900/40 backdrop-blur-sm px-5 sm:px-6 py-5 sm:py-6 rounded-b-2xl border-l border-r border-b border-slate-700/50 shadow-lg">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
