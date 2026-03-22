import { useState, useEffect, useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { Save, Search, RefreshCw, AlertCircle, CheckCircle2, GripVertical } from 'lucide-react';
import { fetchConfig, saveConfig, type Config } from './services/github';
import { ScraperItem } from './components/ScraperItem';

export default function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await fetchConfig();
      setConfig(data);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && config) {
      setConfig((prev) => {
        if (!prev) return null;
        const oldIndex = prev.providers.findIndex((p) => p.key === active.id);
        const newIndex = prev.providers.findIndex((p) => p.key === over.id);
        return {
          ...prev,
          providers: arrayMove(prev.providers, oldIndex, newIndex),
        };
      });
    }
  };

  const toggleScraper = (key: string) => {
    if (!config) return;
    setConfig({
      ...config,
      providers: config.providers.map((p) =>
        p.key === key ? { ...p, enabled: !p.enabled } : p
      ),
    });
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setStatus(null);
    try {
      await saveConfig(config);
      setStatus({ type: 'success', message: 'Configuration saved successfully!' });
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', message: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const filteredProviders = useMemo(() => {
    if (!config) return [];
    return config.providers.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.key.toLowerCase().includes(search.toLowerCase())
    );
  }, [config, search]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <RefreshCw className="animate-spin text-primary mb-4" size={48} />
        <p className="text-zinc-500 font-medium animate-pulse">Loading Scraper Config...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-zinc-300 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-zinc-800/50 shadow-xl">
        <div className="max-w-3xl mx-auto px-4 h-20 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">Scraper</span> Admin
            </h1>
            <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-[0.2em] mt-0.5">Control Center for Moovie API</p>
          </div>
          
          <div className="flex items-center gap-3">
            {status && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${
                status.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'
              }`}>
                {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {status.message}
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-primary hover:bg-accent disabled:bg-zinc-800 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:scale-105 active:scale-95"
            >
              {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-8">
        {/* Search Bar */}
        <div className="relative mb-8 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-primary transition-colors" size={20} />
          <input
            type="text"
            placeholder="Search scrapers (name, key, type...)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all placeholder:text-zinc-600"
          />
        </div>

        {/* List */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext
            items={filteredProviders.map((p) => p.key)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {filteredProviders.map((scraper) => (
                <ScraperItem
                  key={scraper.key}
                  scraper={scraper}
                  onToggle={toggleScraper}
                />
              ))}
              {filteredProviders.length === 0 && (
                <div className="text-center py-20 bg-card/30 rounded-3xl border border-dashed border-zinc-800">
                   <Search className="mx-auto text-zinc-700 mb-4" size={48} />
                   <p className="text-zinc-500">No scrapers match your search query.</p>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </main>
      
      <footer className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent pb-8 pointer-events-none">
          <div className="max-w-3xl mx-auto px-4 flex justify-center">
             <div className="bg-card/80 backdrop-blur-md border border-zinc-700/50 px-6 py-2 rounded-full text-[11px] font-medium text-zinc-400 pointer-events-auto shadow-2xl">
                Tip: Drag the <GripVertical size={12} className="inline mx-0.5" /> handle to change scraper priority.
             </div>
          </div>
      </footer>
    </div>
  );
}
