import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Power } from 'lucide-react';
import { type Scraper } from '../services/github';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ProviderStats {
  count: number;
  avgLatency: number | null;
  maxSizeGb: number | null;
}

interface Props {
  scraper: Scraper;
  onToggle: (key: string) => void;
  stats?: ProviderStats | null;
}

export const ScraperItem: React.FC<Props> = ({ scraper, onToggle, stats }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scraper.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-4 p-4 mb-2 rounded-xl border transition-all duration-200",
        scraper.enabled 
          ? "bg-card border-zinc-800 hover:border-zinc-700 shadow-lg" 
          : "bg-zinc-900/50 border-zinc-900 opacity-60 grayscale",
        isDragging && "z-50 shadow-2xl opacity-100 scale-[1.02] border-primary"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-white"
      >
        <GripVertical size={20} />
      </button>

      <div className="flex-grow">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-white tracking-tight">{scraper.name}</span>
          {!scraper.enabled && (
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500">Disabled</span>
          )}
          {stats && stats.count > 0 && (
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">
              {stats.count} stream{stats.count !== 1 ? 's' : ''}
              {stats.avgLatency != null && ` · ~${stats.avgLatency}ms`}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-500 font-mono mt-0.5">{scraper.key}</p>
      </div>

      <button
        onClick={() => onToggle(scraper.key)}
        className={cn(
          "p-2.5 rounded-full transition-all duration-300 group",
          scraper.enabled 
            ? "bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white shadow-[0_0_15px_-5px_rgba(34,197,94,0.4)]" 
            : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
        )}
      >
        <Power size={18} className={cn(scraper.enabled && "animate-pulse-slow")} />
      </button>
    </div>
  );
};
