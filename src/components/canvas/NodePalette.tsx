"use client";

import { useState } from "react";
import { nodeDefinitions, categoryColors, categoryLabels } from "@/lib/node-definitions";
import {
  Play, Webhook, Clock, Timer, Globe, Code, Braces, Type,
  ArrowRightLeft, List, GitBranch, Database, Send, Bell,
  Search, GripVertical, FileSpreadsheet, Calculator, Binary,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Play, Webhook, Clock, Timer, Globe, Code, Braces, Type,
  ArrowRightLeft, List, GitBranch, Database, Send, Bell,
  FileSpreadsheet, Calculator, Binary,
};

export default function NodePalette() {
  const [search, setSearch] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("trigger");

  const categories = Array.from(new Set(nodeDefinitions.map((d) => d.category)));

  const filtered = nodeDefinitions.filter(
    (d) =>
      d.label.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase())
  );

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/enoflow-node", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-64 bg-[#181825] border-r border-[#313244] flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-[#313244]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#1e1e2e] border border-[#313244] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] transition-colors"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {search ? (
          <div className="p-2 space-y-1">
            {filtered.map((def) => {
              const Icon = iconMap[def.icon] || Code;
              return (
                <div
                  key={def.type}
                  draggable
                  onDragStart={(e) => onDragStart(e, def.type)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-grab active:cursor-grabbing hover:bg-[#1e1e2e] transition-colors group"
                >
                  <div className="text-gray-500 group-hover:text-gray-400">
                    <GripVertical className="w-3 h-3" />
                  </div>
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{ background: `${def.color}20` }}
                  >
                    <Icon className="w-3.5 h-3.5" style={{ color: def.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{def.label}</p>
                    <p className="text-[10px] text-gray-500 truncate">{def.description}</p>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">No nodes found</p>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {categories.map((cat) => {
              const catDefs = nodeDefinitions.filter((d) => d.category === cat);
              const isExpanded = expandedCategory === cat;
              const color = categoryColors[cat];

              return (
                <div key={cat}>
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : cat)}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-[#1e1e2e] transition-colors"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: color }}
                    />
                    <span className="text-xs font-semibold text-gray-300 flex-1 text-left">
                      {categoryLabels[cat] || cat}
                    </span>
                    <span className="text-[10px] text-gray-500">{catDefs.length}</span>
                  </button>

                  {isExpanded && (
                    <div className="ml-2 space-y-0.5 mt-0.5 mb-1">
                      {catDefs.map((def) => {
                        const Icon = iconMap[def.icon] || Code;
                        return (
                          <div
                            key={def.type}
                            draggable
                            onDragStart={(e) => onDragStart(e, def.type)}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-grab active:cursor-grabbing hover:bg-[#1e1e2e] transition-colors group"
                          >
                            <div className="text-gray-600 group-hover:text-gray-400">
                              <GripVertical className="w-3 h-3" />
                            </div>
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                              style={{ background: `${def.color}20` }}
                            >
                              <Icon className="w-3 h-3" style={{ color: def.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-gray-200 truncate">
                                {def.label}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Help */}
      <div className="p-3 border-t border-[#313244]">
        <p className="text-[10px] text-gray-500 leading-relaxed">
          Drag nodes onto the canvas to add them. Connect outputs to inputs to build your flow.
        </p>
      </div>
    </div>
  );
}
