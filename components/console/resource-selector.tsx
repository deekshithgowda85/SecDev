import React, { useState, useEffect } from 'react';

interface ResourceSelectorProps {
  repoMeta: {
    framework?: string;
    hasNextJs?: boolean;
    totalDependencies?: number;
  };
  onChange: (resources: { cpu: number; memory: number }) => void;
}

export const ResourceSelector: React.FC<ResourceSelectorProps> = ({ repoMeta, onChange }) => {
  // 1. Mirror the backend heuristics for the initial frontend state
  const getRecommendation = () => {
    if (repoMeta.hasNextJs || repoMeta.framework === 'nextjs' || repoMeta.framework === 'nuxt') {
      return { cpu: 2, memory: 4096, label: 'Heavy SSR Tier (Recommended)' };
    }
    if (repoMeta.framework === 'express' || repoMeta.framework === 'nest') {
      return { cpu: 1, memory: 2048, label: 'Backend Server Tier (Recommended)' };
    }
    return { cpu: 1, memory: 1024, label: 'Lightweight/Static Tier (Recommended)' };
  };

  const recommendation = getRecommendation();
  const [cpu, setCpu] = useState(recommendation.cpu);
  const [memory, setMemory] = useState(recommendation.memory);
  const [isManual, setIsManual] = useState(false);

  // Keep parent state synced
  useEffect(() => {
    onChange({ cpu, memory });
  }, [cpu, memory]);

  const handleResetToRecommended = () => {
    setCpu(recommendation.cpu);
    setMemory(recommendation.memory);
    setIsManual(false);
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-900 text-white space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-300">Sandbox Resource Allocation</h3>
        {isManual && (
          <button 
            type="button"
            onClick={handleResetToRecommended}
            className="text-xs text-blue-400 hover:underline"
          >
            Reset to Recommended
          </button>
        )}
      </div>

      {!isManual ? (
        <div className="p-3 bg-gray-800 rounded border border-blue-500/30 flex justify-between items-center">
          <div>
            <p className="text-xs text-blue-400 font-medium">{recommendation.label}</p>
            <p className="text-sm font-mono mt-1">{cpu} vCPU / {memory / 1024} GB RAM</p>
          </div>
          <button
            type="button"
            onClick={() => setIsManual(true)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-xs rounded transition"
          >
            Customize
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* CPU Selection */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">vCPU Cores: {cpu}</label>
            <input 
              type="range" 
              min="1" 
              max="4" 
              step="1"
              value={cpu} 
              onChange={(e) => setCpu(Number(e.target.value))}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* RAM Selection */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">RAM: {memory / 1024} GB</label>
            <select
              value={memory}
              onChange={(e) => setMemory(Number(e.target.value))}
              className="w-full bg-gray-800 border border-gray-700 rounded p-1.5 text-sm"
            >
              <option value={1024}>1 GB (Static/Light)</option>
              <option value={2048}>2 GB (Standard Node)</option>
              <option value={4096}>4 GB (Next.js/Heavy Build)</option>
              <option value={8192}>8 GB (High Performance)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
