"use client";

import { useFlowStore } from "@/lib/store";
import { nodeDefinitionMap } from "@/lib/node-definitions";
import { X, Trash2, Copy, Settings } from "lucide-react";
import { generateId } from "@/lib/utils";

export default function PropertiesPanel() {
  const {
    nodes,
    selectedNodeId,
    selectNode,
    updateNodeData,
    removeNode,
    addNode,
  } = useFlowStore();
  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-72 bg-[#181825] border-l border-[#313244] flex flex-col items-center justify-center p-6 text-center">
        <Settings className="w-8 h-8 text-gray-600 mb-3" />
        <p className="text-sm text-gray-400 font-medium">No Node Selected</p>
        <p className="text-xs text-gray-500 mt-1">
          Click on a node to view and edit its properties
        </p>
      </div>
    );
  }

  const def = nodeDefinitionMap[selectedNode.data.nodeType];
  const config = selectedNode.data.config || {};

  const updateConfig = (key: string, value: unknown) => {
    updateNodeData(selectedNode.id, {
      config: { ...config, [key]: value },
    });
  };

  const handleDuplicate = () => {
    const newId = `node-${generateId()}`;
    addNode({
      ...selectedNode,
      id: newId,
      position: {
        x: selectedNode.position.x + 40,
        y: selectedNode.position.y + 40,
      },
      data: {
        ...selectedNode.data,
        label: `${selectedNode.data.label} (copy)`,
      },
    });
  };

  const renderConfigField = (
    key: string,
    label: string,
    type: string,
    options?: string[],
  ) => {
    const value = config[key];

    switch (type) {
      case "textarea":
        return (
          <div key={key}>
            <label className="text-[11px] text-gray-400 font-medium mb-1 block">
              {label}
            </label>
            <textarea
              value={String(value || "")}
              onChange={(e) => updateConfig(key, e.target.value)}
              rows={4}
              className="w-full bg-[#1e1e2e] border border-[#313244] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6] resize-none font-mono"
            />
          </div>
        );

      case "select":
        return (
          <div key={key}>
            <label className="text-[11px] text-gray-400 font-medium mb-1 block">
              {label}
            </label>
            <select
              value={String(value || "")}
              onChange={(e) => updateConfig(key, e.target.value)}
              className="w-full bg-[#1e1e2e] border border-[#313244] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8b5cf6]"
            >
              {options?.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        );

      case "number":
        return (
          <div key={key}>
            <label className="text-[11px] text-gray-400 font-medium mb-1 block">
              {label}
            </label>
            <input
              type="number"
              value={Number(value) || 0}
              onChange={(e) => updateConfig(key, Number(e.target.value))}
              className="w-full bg-[#1e1e2e] border border-[#313244] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#8b5cf6]"
            />
          </div>
        );

      case "boolean":
        return (
          <div key={key} className="flex items-center justify-between py-1">
            <label className="text-[11px] text-gray-400 font-medium">
              {label}
            </label>
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => updateConfig(key, e.target.checked)}
              className="w-4 h-4 accent-[#8b5cf6] rounded cursor-pointer"
            />
          </div>
        );

      default:
        return (
          <div key={key}>
            <label className="text-[11px] text-gray-400 font-medium mb-1 block">
              {label}
            </label>
            <input
              type="text"
              value={String(value || "")}
              onChange={(e) => updateConfig(key, e.target.value)}
              className="w-full bg-[#1e1e2e] border border-[#313244] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#8b5cf6]"
            />
          </div>
        );
    }
  };

  const getConfigFields = (): Array<{
    key: string;
    label: string;
    type: string;
    options?: string[];
  }> => {
    switch (selectedNode.data.nodeType) {
      case "webhook-trigger":
        return [
          {
            key: "method",
            label: "Method",
            type: "select",
            options: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          },
          { key: "path", label: "Path", type: "text" },
          { key: "sampleBody", label: "Sample Body (JSON)", type: "textarea" },
        ];
      case "schedule-trigger":
        return [
          { key: "cron", label: "Cron Expression", type: "text" },
          { key: "description", label: "Description", type: "text" },
        ];
      case "delay":
        return [{ key: "duration", label: "Duration (ms)", type: "number" }];
      case "http-request":
        return [
          {
            key: "method",
            label: "Method",
            type: "select",
            options: ["GET", "POST", "PUT", "DELETE", "PATCH"],
          },
          { key: "url", label: "URL", type: "text" },
          { key: "headers", label: "Headers (JSON)", type: "textarea" },
          { key: "body", label: "Body", type: "textarea" },
          {
            key: "mockResponse",
            label: "Mock Response (JSON)",
            type: "textarea",
          },
          { key: "mockStatus", label: "Mock Status Code", type: "number" },
          { key: "mockDelay", label: "Mock Delay (ms)", type: "number" },
        ];
      case "code-block":
        return [{ key: "code", label: "JavaScript Code", type: "textarea" }];
      case "json-parser":
        return [
          {
            key: "operation",
            label: "Operation",
            type: "select",
            options: ["parse", "stringify"],
          },
          { key: "path", label: "Extract Path (dot notation)", type: "text" },
        ];
      case "csv-to-json":
        return [
          {
            key: "delimiter",
            label: "Delimiter",
            type: "select",
            options: [",", ";", "\\t", "|"],
          },
          { key: "hasHeader", label: "Has Header Row", type: "boolean" },
          { key: "trimValues", label: "Trim Whitespace", type: "boolean" },
          { key: "path", label: "CSV Field Path (optional)", type: "text" },
        ];
      case "text-formatter":
        return [
          {
            key: "operation",
            label: "Operation",
            type: "select",
            options: ["template", "uppercase", "lowercase", "trim", "reverse"],
          },
          {
            key: "template",
            label: "Template (use {{field}})",
            type: "textarea",
          },
        ];
      case "base64-transform":
        return [
          {
            key: "operation",
            label: "Operation",
            type: "select",
            options: ["encode", "decode"],
          },
          { key: "path", label: "Field Path (dot notation)", type: "text" },
          { key: "urlSafe", label: "URL Safe", type: "boolean" },
        ];
      case "object-mapper":
        return [
          { key: "mapping", label: "Field Mapping (JSON)", type: "textarea" },
        ];
      case "array-iterator":
        return [
          { key: "path", label: "Array Path", type: "text" },
          {
            key: "operation",
            label: "Operation",
            type: "select",
            options: ["map", "filter", "forEach"],
          },
          {
            key: "expression",
            label: "Expression (use 'item')",
            type: "textarea",
          },
        ];
      case "math-operation":
        return [
          {
            key: "operation",
            label: "Operations",
            type: "select",
            options: [
              "add",
              "subtract",
              "multiply",
              "divide",
              "modulo",
              "round",
              "floor",
              "ceil",
            ],
          },
          { key: "operand", label: "Operand", type: "number" },
          { key: "path", label: "Path (dot notation, optional)", type: "text" },
        ];
      case "condition":
        return [
          { key: "field", label: "Field Name", type: "text" },
          {
            key: "operator",
            label: "Operator",
            type: "select",
            options: [
              "equals",
              "not_equals",
              "contains",
              "greater_than",
              "less_than",
              "is_empty",
              "is_not_empty",
            ],
          },
          { key: "value", label: "Compare Value", type: "text" },
          {
            key: "expression",
            label: "Custom Expression (optional)",
            type: "textarea",
          },
        ];
      case "local-storage":
        return [
          { key: "key", label: "Storage Key", type: "text" },
          {
            key: "operation",
            label: "Operation",
            type: "select",
            options: ["set", "get"],
          },
        ];
      case "webhook-response":
        return [
          { key: "statusCode", label: "Status Code", type: "number" },
          { key: "response", label: "Response Body (JSON)", type: "textarea" },
        ];
      case "notification":
        return [
          { key: "title", label: "Title", type: "text" },
          { key: "message", label: "Message", type: "textarea" },
          {
            key: "type",
            label: "Type",
            type: "select",
            options: ["info", "success", "warning", "error"],
          },
        ];
      default:
        return [];
    }
  };

  return (
    <div className="w-72 bg-[#181825] border-l border-[#313244] flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-[#313244]">
        <div
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: def?.color || "#6b7280" }}
        />
        <span className="text-xs font-semibold text-white flex-1 truncate">
          {selectedNode.data.label}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handleDuplicate}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {
              removeNode(selectedNode.id);
              selectNode(null);
            }}
            className="text-gray-500 hover:text-red-400 transition-colors p-1"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => selectNode(null)}
            className="text-gray-500 hover:text-gray-300 transition-colors p-1"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Node Label */}
      <div className="px-3 py-2 border-b border-[#313244]">
        <label className="text-[11px] text-gray-400 font-medium mb-1 block">
          Node Label
        </label>
        <input
          type="text"
          value={selectedNode.data.label}
          onChange={(e) =>
            updateNodeData(selectedNode.id, { label: e.target.value })
          }
          className="w-full bg-[#1e1e2e] border border-[#313244] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#8b5cf6]"
        />
      </div>

      {/* Description */}
      {def && (
        <div className="px-3 py-2 border-b border-[#313244]">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            {def.description}
          </p>
        </div>
      )}

      {/* Config Fields */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
          Configuration
        </p>
        {getConfigFields().map((field) =>
          renderConfigField(field.key, field.label, field.type, field.options),
        )}
      </div>

      {/* Execution Result */}
      {selectedNode.data.result !== undefined && (
        <div className="border-t border-[#313244] px-3 py-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-1">
            Last Result
          </p>
          <pre className="text-[10px] text-gray-300 bg-[#1e1e2e] rounded-lg p-2 overflow-auto max-h-[150px] font-mono whitespace-pre-wrap break-all">
            {JSON.stringify(selectedNode.data.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
