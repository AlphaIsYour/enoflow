"use client";

import { memo, useState } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { NodeData } from "@/types";
import { nodeDefinitionMap } from "@/lib/node-definitions";
import { cn } from "@/lib/utils";
import {
  Play, Webhook, Clock, Timer, Globe, Code, Braces, Type,
  ArrowRightLeft, List, GitBranch, Database, Send, Bell,
  CheckCircle, XCircle, Loader2, ChevronDown, ChevronUp,
  FileSpreadsheet, Calculator, Binary,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  Play, Webhook, Clock, Timer, Globe, Code, Braces, Type,
  ArrowRightLeft, List, GitBranch, Database, Send, Bell,
  FileSpreadsheet, Calculator, Binary,
};

function CustomNode({ data, selected }: NodeProps) {
  const nodeData = data as NodeData;
  const def = nodeDefinitionMap[nodeData.nodeType];
  const color = def?.color || "#6b7280";
  const Icon = iconMap[def?.icon || "Code"] || Code;
  const [expanded, setExpanded] = useState(false);

  const statusIcon = {
    idle: null,
    skipped: <span className="text-[10px] text-gray-400">Skipped</span>,
    running: <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />,
    success: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
    error: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  }[nodeData.status || "idle"];

  const statusBorder = {
    idle: "",
    skipped: "opacity-50",
    running: "ring-2 ring-blue-400/50",
    success: "ring-2 ring-emerald-400/50",
    error: "ring-2 ring-red-400/50",
  }[nodeData.status || "idle"];

  const isCondition = nodeData.nodeType === "condition";
  const hasOutput = def && def.outputs > 0;
  const hasInput = def && def.inputs > 0;

  return (
    <div
      className={cn(
        "relative group transition-all duration-200",
        selected && "scale-[1.02]",
        statusBorder
      )}
    >
      {/* Input Handle */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !border-2 !rounded-full !-left-1.5"
          style={{ borderColor: color, background: "#1e1e2e" }}
        />
      )}

      {/* Node Body */}
      <div
        className={cn(
          "rounded-xl border shadow-lg min-w-[180px] max-w-[240px] overflow-hidden transition-all",
          "bg-[#1e1e2e] border-[#313244]",
          selected && "border-opacity-100 shadow-xl",
          !selected && "border-opacity-50"
        )}
        style={{ borderColor: selected ? color : undefined }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ background: `${color}15` }}
        >
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}25` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
          <span className="text-xs font-semibold text-white truncate flex-1">
            {nodeData.label}
          </span>
          <div className="flex items-center gap-1">
            {statusIcon}
            {nodeData.result !== undefined && (
              <button
                onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {/* Category Badge */}
        <div className="px-3 py-1.5 border-t border-[#313244]">
          <span
            className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ color, background: `${color}15` }}
          >
            {nodeData.category}
          </span>
        </div>

        {/* Error Display */}
        {nodeData.error && (
          <div className="px-3 py-1.5 border-t border-red-500/20 bg-red-500/5">
            <p className="text-[10px] text-red-400 truncate">{nodeData.error}</p>
          </div>
        )}

        {/* Result Preview */}
        {expanded && nodeData.result !== undefined && (
          <div className="px-3 py-2 border-t border-[#313244] bg-[#181825]">
            <pre className="text-[10px] text-gray-300 overflow-auto max-h-[120px] whitespace-pre-wrap break-all font-mono">
              {typeof nodeData.result === "string"
                ? nodeData.result
                : JSON.stringify(nodeData.result, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* Output Handles */}
      {hasOutput && !isCondition && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !border-2 !rounded-full !-right-1.5"
          style={{ borderColor: color, background: "#1e1e2e" }}
        />
      )}

      {/* Condition: True/False handles */}
      {isCondition && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="true"
            className="!w-3 !h-3 !border-2 !rounded-full !-right-1.5 !top-[35%]"
            style={{ borderColor: "#10b981", background: "#1e1e2e" }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="false"
            className="!w-3 !h-3 !border-2 !rounded-full !-right-1.5 !top-[65%]"
            style={{ borderColor: "#ef4444", background: "#1e1e2e" }}
          />
        </>
      )}
    </div>
  );
}

export default memo(CustomNode);
