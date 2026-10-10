import React from 'react';
import { Sliders, Terminal, RefreshCw, CheckCircle2, AlertTriangle, Info, XCircle } from 'lucide-react';
import { LogEntry } from '../../server/types';

interface Props {
  logs: LogEntry[];
  onRefreshLogs: () => void;
}

export const SettingsLogsView: React.FC<Props> = ({ logs, onRefreshLogs }) => {
  const [categoryFilter, setCategoryFilter] = React.useState<string>('all');
  const [levelFilter, setLevelFilter] = React.useState<string>('all');

  const filteredLogs = logs.filter((log) => {
    const matchesCat = categoryFilter === 'all' || log.category === categoryFilter;
    const matchesLvl = levelFilter === 'all' || log.level === levelFilter;
    return matchesCat && matchesLvl;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-6 shadow-xs">
        <h1 className="text-2xl font-bold text-[#1C1B19] tracking-tight">System Settings & Production Logs</h1>
        <p className="text-xs text-[#625E56] max-w-2xl mt-1 leading-relaxed">
          Comprehensive audit trail of all generation requests, reference attachments, Google Drive uploads, and
          recoverable error retries.
        </p>
      </div>

      {/* Production Specifications */}
      <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#A94336]" />
          <h2 className="text-sm font-bold text-[#1C1B19] uppercase tracking-wider">
            Production Pipeline Specifications
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-[#ECE6D8]/50 p-3.5 rounded-lg border border-[#D7D0C0] space-y-1">
            <span className="text-[#625E56] text-[11px] block">Drive Root Directory</span>
            <span className="font-semibold text-[#1C1B19]">Ninety Sense/</span>
          </div>

          <div className="bg-[#ECE6D8]/50 p-3.5 rounded-lg border border-[#D7D0C0] space-y-1">
            <span className="text-[#625E56] text-[11px] block">Target Video Format</span>
            <span className="font-semibold text-[#1C1B19]">16:9 Landscape PNG</span>
          </div>

          <div className="bg-[#ECE6D8]/50 p-3.5 rounded-lg border border-[#D7D0C0] space-y-1">
            <span className="text-[#625E56] text-[11px] block">Estimated Dimensions</span>
            <span className="font-semibold text-[#1C1B19]">1920 x 1080 (FHD)</span>
          </div>

          <div className="bg-[#ECE6D8]/50 p-3.5 rounded-lg border border-[#D7D0C0] space-y-1">
            <span className="text-[#625E56] text-[11px] block">Character Authority</span>
            <span className="font-semibold text-[#1C1B19]">Mandatory Raw Bytes</span>
          </div>
        </div>
      </div>

      {/* Log Audit Trail */}
      <div className="bg-[#FAF8F2] border border-[#D7D0C0] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#A94336]" />
            <h2 className="text-sm font-bold text-[#1C1B19] uppercase tracking-wider">Audit Log Trail</h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by Category */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1 rounded text-xs bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19]"
            >
              <option value="all">All Categories</option>
              <option value="generation">Generation</option>
              <option value="brand">Brand</option>
              <option value="drive">Drive</option>
              <option value="notion">Notion</option>
              <option value="job">Job Queue</option>
              <option value="system">System</option>
            </select>

            {/* Filter by Level */}
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="px-2.5 py-1 rounded text-xs bg-[#FAF8F2] border border-[#D7D0C0] text-[#1C1B19]"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="success">Success</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>

            <button
              onClick={onRefreshLogs}
              className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium text-[#1C1B19] bg-[#ECE6D8] border border-[#D7D0C0] hover:bg-[#FAF8F2]"
            >
              <RefreshCw className="w-3 h-3 text-[#A94336]" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Logs Terminal Container */}
        <div className="bg-[#1C1B19] text-[#F4F0E6] rounded-lg p-4 font-mono text-xs max-h-[450px] overflow-y-auto space-y-2 border border-[#2E2C28]">
          {filteredLogs.length === 0 ? (
            <div className="text-[#8E897E] text-center py-8">No log entries recorded matching filter.</div>
          ) : (
            filteredLogs.map((log) => {
              const time = new Date(log.timestamp).toLocaleTimeString();
              return (
                <div key={log.id} className="flex items-start gap-2.5 py-1 border-b border-[#2E2C28]/60 last:border-0">
                  <span className="text-[#8E897E] shrink-0 text-[11px]">{time}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold shrink-0 ${
                      log.level === 'success'
                        ? 'bg-[#366340] text-[#F4F0E6]'
                        : log.level === 'error'
                        ? 'bg-[#A94336] text-[#F4F0E6]'
                        : log.level === 'warning'
                        ? 'bg-[#875F20] text-[#F4F0E6]'
                        : 'bg-[#2E2C28] text-[#8E897E]'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className="text-[#A94336] shrink-0 text-[11px]">[{log.category}]</span>
                  <span className="text-[#F4F0E6] leading-relaxed break-all">{log.message}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
