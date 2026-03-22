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
import { Save, Search, RefreshCw, AlertCircle, CheckCircle2, GripVertical, Play, Settings2, Zap } from 'lucide-react';
import {
  fetchConfig,
  saveConfig,
  runLiveTest,
  DEFAULT_PREFERENCES,
  type Config,
  type StreamResult,
  type PrioritizeBy,
} from './services/github';
import { ScraperItem } from './components/ScraperItem';

export default function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showLiveTest, setShowLiveTest] = useState(false);
  const [testTmdbId, setTestTmdbId] = useState('155');
  const [testRunning, setTestRunning] = useState(false);
  const [testResult, setTestResult] = useState<{ streams: StreamResult[]; logs: string[] } | null>(null);

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
    setStatus(null);
    try {
      const data = await fetchConfig();
      setConfig(data);
    } catch (err: unknown) {
      console.error('Failed to load config:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load configuration';
      setStatus({ 
        type: 'error', 
        message: errorMessage
      });
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

  const handleRunTest = async () => {
    setTestRunning(true);
    setTestResult(null);
    setStatus(null);
    try {
      const result = await runLiveTest(testTmdbId);
      setTestResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Live test failed';
      setStatus({ type: 'error', message: msg });
    } finally {
      setTestRunning(false);
    }
  };

  const updatePreferences = (updates: Partial<Config['preferences']>) => {
    if (!config) return;
    setConfig({
      ...config,
      preferences: {
        ...(config.preferences ?? DEFAULT_PREFERENCES),
        ...updates,
      },
    });
  };

  const providerStats = useMemo(() => {
    if (!testResult?.streams.length) return null;
    const byKey = new Map<string, { count: number; latencies: number[]; sizes: number[] }>();
    for (const s of testResult.streams) {
      const key = s.providerKey ?? 'unknown';
      const cur = byKey.get(key) ?? { count: 0, latencies: [], sizes: [] };
      cur.count += 1;
      if (s.latencyMs != null) cur.latencies.push(s.latencyMs);
      if (s.fileSizeGb != null) cur.sizes.push(s.fileSizeGb);
      byKey.set(key, cur);
    }
    const out: Record<string, { count: number; avgLatency: number | null; maxSizeGb: number | null }> = {};
    byKey.forEach((v, k) => {
      out[k] = {
        count: v.count,
        avgLatency: v.latencies.length
          ? Math.round(v.latencies.reduce((a, b) => a + b, 0) / v.latencies.length)
          : null,
        maxSizeGb: v.sizes.length ? Math.max(...v.sizes) : null,
      };
    });
    return out;
  }, [testResult]);

  const filteredProviders = useMemo(() => {
    if (!config || !Array.isArray(config.providers)) return [];
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
          
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                showPreferences ? 'bg-primary/20 border-primary text-primary' : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <Settings2 size={18} />
              <span className="text-sm font-medium">Preferences</span>
            </button>
            <button
              onClick={() => setShowLiveTest(!showLiveTest)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                showLiveTest ? 'bg-primary/20 border-primary text-primary' : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              <Zap size={18} />
              <span className="text-sm font-medium">Live Test</span>
            </button>
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
        {/* Preferences Panel */}
        {showPreferences && config && (
          <div className="mb-8 p-6 rounded-2xl bg-card border border-zinc-800">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Settings2 size={20} />
              Stream preferences
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Prioritize by</label>
                <select
                  value={config.preferences?.prioritizeBy ?? 'latency'}
                  onChange={(e) => updatePreferences({ prioritizeBy: e.target.value as PrioritizeBy })}
                  className="w-full max-w-xs bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-primary/40"
                >
                  <option value="latency">Latency (fastest first)</option>
                  <option value="size">Size (smaller first, avoid buffering)</option>
                  <option value="balanced">Balanced (size limit, then latency)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Max preferred file size (GB) – deprioritize larger</label>
                <input
                  type="number"
                  min={0.5}
                  max={20}
                  step={0.5}
                  value={config.preferences?.maxPreferredSizeGb ?? 3}
                  onChange={(e) => updatePreferences({ maxPreferredSizeGb: parseFloat(e.target.value) || 3 })}
                  className="w-full max-w-xs bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          </div>
        )}

        {/* Live Test Panel */}
        {showLiveTest && (
          <div className="mb-8 p-6 rounded-2xl bg-card border border-zinc-800">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Zap size={20} />
              Live scrape test
            </h2>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                placeholder="TMDB ID (e.g. 155 for The Dark Knight)"
                value={testTmdbId}
                onChange={(e) => setTestTmdbId(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-600 focus:ring-2 focus:ring-primary/40"
              />
              <button
                onClick={handleRunTest}
                disabled={testRunning}
                className="flex items-center gap-2 bg-primary hover:bg-accent disabled:opacity-50 px-6 py-2.5 rounded-xl font-bold text-white"
              >
                {testRunning ? <RefreshCw className="animate-spin" size={20} /> : <Play size={20} />}
                {testRunning ? 'Testing...' : 'Run Test'}
              </button>
            </div>
            {testResult && (
              <div className="space-y-4">
                <div className="flex gap-6 text-sm">
                  <span className="text-green-500 font-medium">
                    {testResult.streams.length} stream{testResult.streams.length !== 1 ? 's' : ''} found
                  </span>
                  {providerStats && (
                    <span className="text-zinc-400">
                      {Object.keys(providerStats).length} provider{Object.keys(providerStats).length !== 1 ? 's' : ''} working
                    </span>
                  )}
                </div>
                {providerStats && Object.keys(providerStats).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(providerStats).map(([key, stats]) => (
                      <div
                        key={key}
                        className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-sm"
                      >
                        <p className="font-mono font-medium text-primary truncate" title={key}>
                          {key}
                        </p>
                        <p className="text-zinc-400 mt-0.5">
                          {stats.count} stream{stats.count !== 1 ? 's' : ''}
                          {stats.avgLatency != null && (
                            <span className="text-green-400 ml-2">~{stats.avgLatency}ms</span>
                          )}
                          {stats.maxSizeGb != null && (
                            <span className="text-zinc-500 ml-2">max {stats.maxSizeGb.toFixed(2)} GB</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                <details className="text-sm">
                  <summary className="cursor-pointer text-zinc-500 hover:text-zinc-400">
                    View {testResult.streams.length} stream details
                  </summary>
                  <div className="mt-2 max-h-60 overflow-y-auto space-y-1.5 pr-2">
                    {testResult.streams.slice(0, 50).map((s, i) => (
                      <div
                        key={i}
                        className="p-2 rounded-lg bg-zinc-900/60 text-xs font-mono flex flex-wrap gap-x-4 gap-y-1"
                      >
                        <span className="text-white truncate max-w-[200px]" title={s.server}>
                          {s.server}
                        </span>
                        {s.latencyMs != null && (
                          <span className="text-green-400">{s.latencyMs}ms</span>
                        )}
                        {s.fileSizeGb != null && (
                          <span className="text-blue-400">{s.fileSizeGb.toFixed(2)} GB</span>
                        )}
                        {s.providerKey && (
                          <span className="text-zinc-500">{s.providerKey}</span>
                        )}
                      </div>
                    ))}
                    {testResult.streams.length > 50 && (
                      <p className="text-zinc-500 py-2">… and {testResult.streams.length - 50} more</p>
                    )}
                  </div>
                </details>
              </div>
            )}
          </div>
        )}

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
                  stats={providerStats?.[scraper.key]}
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
