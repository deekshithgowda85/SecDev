"use client";

import { useEffect, useRef, useState } from "react";
import {
  Network, ZoomIn, ZoomOut, Download, Maximize2, ChevronRight,
} from "lucide-react";

interface MNode { id: string; label: string; relation?: string; children?: MNode[]; }
interface MindMap { id: string; title: string; root: MNode; }

const REL_COLOR: Record<string, string> = {
  includes: "#6366f1",
  leads: "#ec4899",
  mitigates: "#10b981",
  related: "#f59e0b",
};

const MAPS: MindMap[] = [
  {
    id: "web", title: "Web Security",
    root: {
      id: "w", label: "Web Security", children: [
        { id: "w1", label: "Injection", relation: "includes", children: [
          { id: "w1a", label: "SQLi", relation: "includes" },
          { id: "w1b", label: "Command Inj", relation: "includes" },
        ]},
        { id: "w2", label: "XSS", relation: "includes", children: [
          { id: "w2a", label: "Stored", relation: "includes" },
          { id: "w2b", label: "Reflected", relation: "includes" },
          { id: "w2c", label: "DOM", relation: "includes" },
        ]},
        { id: "w3", label: "CSP", relation: "mitigates", children: [
          { id: "w3a", label: "Nonce", relation: "includes" },
        ]},
      ],
    },
  },
  {
    id: "crypto", title: "Cryptography",
    root: {
      id: "c", label: "Cryptography", children: [
        { id: "c1", label: "Symmetric", relation: "includes", children: [
          { id: "c1a", label: "AES", relation: "includes" },
          { id: "c1b", label: "ChaCha20", relation: "includes" },
        ]},
        { id: "c2", label: "Asymmetric", relation: "includes", children: [
          { id: "c2a", label: "RSA", relation: "includes" },
          { id: "c2b", label: "ECC", relation: "includes" },
        ]},
        { id: "c3", label: "Hashing", relation: "includes", children: [
          { id: "c3a", label: "SHA-256", relation: "includes" },
          { id: "c3b", label: "Argon2", relation: "includes" },
        ]},
      ],
    },
  },
  {
    id: "net", title: "Network Security",
    root: {
      id: "n", label: "Network Security", children: [
        { id: "n1", label: "Firewalls", relation: "includes" },
        { id: "n2", label: "VPN", relation: "includes", children: [
          { id: "n2a", label: "IPsec", relation: "includes" },
          { id: "n2b", label: "WireGuard", relation: "includes" },
        ]},
        { id: "n3", label: "DNS Security", relation: "related", children: [
          { id: "n3a", label: "DNSSEC", relation: "includes" },
        ]},
      ],
    },
  },
];

function useLocalStorage<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate local value after mount
      if (raw) setValue(JSON.parse(raw) as T);
    } catch { /* ignore */ }
  }, [key]);
  const update = (next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      try { localStorage.setItem(key, JSON.stringify(resolved)); } catch { /* ignore */ }
      return resolved;
    });
  };
  return [value, update] as const;
}

const NODE_W = 132, NODE_H = 34, DX = 168, DY = 96;

export default function MindMapsPage() {
  const [mapId, setMapId] = useState(MAPS[0].id);
  const [expanded, setExpanded] = useLocalStorage<Record<string, boolean>>("secdev.mindmaps.expanded", {});
  const [scale, setScale] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);

  const map = MAPS.find((m) => m.id === mapId) ?? MAPS[0];

  const toggle = (id: string) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  // layout: traverse visible nodes
  interface P { node: MNode; x: number; y: number; parent: P | null; }
  const positioned: P[] = [];
  const edges: { from: P; to: P }[] = [];
  let leafCursor = 0;
  const layout = (node: MNode, depth: number, parent: P | null): P => {
    const isOpen = expanded[node.id];
    const kids = isOpen && node.children ? node.children : [];
    const curP: P = { node, x: 0, y: depth * DY + 40, parent };
    positioned.push(curP);
    if (kids.length === 0) {
      curP.x = leafCursor * DX;
      leafCursor++;
    } else {
      const childPs = kids.map((c) => layout(c, depth + 1, curP));
      curP.x = (childPs[0].x + childPs[childPs.length - 1].x) / 2;
      childPs.forEach((cp) => edges.push({ from: curP, to: cp }));
    }
    return curP;
  };
  layout(map.root, 0, null);

  const W = Math.max(700, leafCursor * DX + 40);
  const H = (maxDepth(positioned) + 1) * DY + 40;

  const exportSvg = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", String(W));
    clone.setAttribute("height", String(H));
    const data = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([data], { type: "image/svg+xml" });
    const u = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = u; a.download = `mindmap-${map.id}.svg`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(u);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Network className="w-6 h-6" /> Security Concept Mind Maps
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">
            Explore relationships between security concepts visually.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setScale((s) => Math.min(2, s + 0.2))} className="w-9 h-9 flex items-center justify-center border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={() => setScale((s) => Math.max(0.4, s - 0.2))} className="w-9 h-9 flex items-center justify-center border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800"><ZoomOut className="w-4 h-4" /></button>
          <button onClick={() => setScale(1)} className="w-9 h-9 flex items-center justify-center border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800"><Maximize2 className="w-4 h-4" /></button>
          <button onClick={exportSvg} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-zinc-700 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-zinc-400">Topic:</span>
        {MAPS.map((m) => (
          <button key={m.id} onClick={() => setMapId(m.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${mapId === m.id ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 border-gray-900 dark:border-white" : "border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800"}`}>
            {m.title}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-zinc-400">
        {Object.entries(REL_COLOR).map(([k, c]) => (
          <span key={k} className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: c }} /> {k}</span>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-auto">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%" className="min-w-[640px]" style={{ transform: `scale(${scale})`, transformOrigin: "top left", height: H * scale }}>
          {edges.map((e, i) => {
            const color = REL_COLOR[e.to.node.relation ?? "related"] ?? REL_COLOR.related;
            return <line key={i} x1={e.from.x + NODE_W / 2} y1={e.from.y + NODE_H / 2} x2={e.to.x + NODE_W / 2} y2={e.to.y + NODE_H / 2} stroke={color} strokeWidth={2} />;
          })}
          {positioned.map((p) => {
            const hasKids = !!p.node.children?.length;
            const open = expanded[p.node.id];
            const isRoot = p.node === map.root;
            return (
              <g key={p.node.id} transform={`translate(${p.x},${p.y})`} onClick={() => hasKids && toggle(p.node.id)} style={{ cursor: hasKids ? "pointer" : "default" }}>
                <rect width={NODE_W} height={NODE_H} rx={8}
                  className={isRoot ? "fill-indigo-600" : open ? "fill-indigo-100 dark:fill-indigo-500/20" : "fill-white dark:fill-zinc-800"}
                  stroke={isRoot ? "#4f46e5" : "#e5e7eb"} strokeWidth={1} />
                <text x={NODE_W / 2} y={NODE_H / 2 + 4} textAnchor="middle"
                  className={isRoot ? "fill-white" : "fill-gray-800 dark:fill-zinc-200"} style={{ fontSize: 11, fontWeight: 600 }}>
                  {p.node.label.length > 16 ? p.node.label.slice(0, 15) + "…" : p.node.label}
                </text>
                {hasKids && (
                  <g transform={`translate(${NODE_W - 18},${NODE_H / 2 - 6})`}>
                    <ChevronRight className="w-3 h-3" style={{ transform: open ? "rotate(90deg)" : "none", transformOrigin: "center" }} />
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <p className="text-xs text-gray-400 dark:text-zinc-500">Tap a node with a chevron to expand or collapse its branch.</p>
    </div>
  );
}

function maxDepth(nodes: { y: number }[]): number {
  if (nodes.length === 0) return 0;
  return Math.max(...nodes.map((n) => Math.round((n.y - 40) / DY)));
}
