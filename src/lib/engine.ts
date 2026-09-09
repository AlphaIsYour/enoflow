import { Node, Edge } from "@xyflow/react";
import { NodeData, ExecutionResult, StepExecution, ValidationResult, ValidationError } from "@/types";

// ─── Execution Engine ─────────────────────────────────────────────
export class FlowEngine {
  private results: Map<string, ExecutionResult> = new Map();
  private executionId: string;
  private abortController: AbortController | null = null;

  constructor() {
    this.executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  }

  abort() {
    this.abortController?.abort();
  }

  // ── Topological sort of nodes ───────────────────────────────────
  private topologicalSort(nodes: Node<NodeData>[], edges: Edge[]): Node<NodeData>[] {
    const adj = new Map<string, string[]>();
    const inDeg = new Map<string, number>();

    for (const n of nodes) {
      adj.set(n.id, []);
      inDeg.set(n.id, 0);
    }
    for (const e of edges) {
      adj.get(e.source)?.push(e.target);
      inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
    }

    const queue: string[] = [];
    for (const [id, deg] of inDeg) {
      if (deg === 0) queue.push(id);
    }

    const sorted: string[] = [];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      sorted.push(cur);
      for (const next of adj.get(cur) || []) {
        const newDeg = (inDeg.get(next) || 1) - 1;
        inDeg.set(next, newDeg);
        if (newDeg === 0) queue.push(next);
      }
    }

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    return sorted.map((id) => nodeMap.get(id)!).filter(Boolean);
  }

  // ── Get input data from parent nodes ────────────────────────────
  private getInputData(nodeId: string, edges: Edge[]): unknown {
    const incomingEdges = edges.filter((e) => e.target === nodeId);
    if (incomingEdges.length === 0) return undefined;
    if (incomingEdges.length === 1) {
      const result = this.results.get(incomingEdges[0].source);
      return result?.output;
    }
    // Multiple inputs: combine into array
    return incomingEdges.map((e) => this.results.get(e.source)?.output).filter((v) => v !== undefined);
  }

  // ── Get output data for a specific handle ───────────────────────
  private getOutputForHandle(nodeId: string, handleId: string | undefined, edges: Edge[]): unknown {
    const incomingEdge = edges.find(
      (e) => e.target === nodeId && (!handleId || e.targetHandle === handleId)
    );
    if (!incomingEdge) return undefined;
    return this.results.get(incomingEdge.source)?.output;
  }

  // ── Execute a single node ───────────────────────────────────────
  private async executeNode(node: Node<NodeData>, input: unknown): Promise<unknown> {
    const { nodeType, config } = node.data;
    const start = performance.now();

    try {
      let output: unknown;

      switch (nodeType) {
        // ── Triggers ──
        case "manual-trigger":
          output = { trigger: "manual", timestamp: new Date().toISOString(), data: config.data || {} };
          break;

        case "webhook-trigger": {
          let body = {};
          try { body = JSON.parse(config.sampleBody as string || "{}"); } catch {}
          output = {
            trigger: "webhook",
            method: config.method || "POST",
            path: config.path || "/api/webhook",
            headers: { "content-type": "application/json" },
            body,
            timestamp: new Date().toISOString(),
          };
          break;
        }

        case "schedule-trigger":
          output = {
            trigger: "schedule",
            cron: config.cron || "*/5 * * * *",
            description: config.description || "Every 5 minutes",
            timestamp: new Date().toISOString(),
            scheduledFor: new Date(Date.now() + 5 * 60000).toISOString(),
          };
          break;

        // ── Actions ──
        case "delay": {
          const duration = (config.duration as number) || 1000;
          await new Promise((r) => setTimeout(r, Math.min(duration, 5000)));
          output = { ...((input as object) || {}), delayed: true, delayMs: duration };
          break;
        }

        case "http-request": {
          // Simulate HTTP request with mock response
          const mockDelay = (config.mockDelay as number) || 500;
          await new Promise((r) => setTimeout(r, Math.min(mockDelay, 3000)));
          let mockData: unknown;
          try {
            mockData = JSON.parse(config.mockResponse as string || "{}");
          } catch {
            mockData = config.mockResponse || "OK";
          }
          output = {
            status: config.mockStatus || 200,
            url: config.url,
            method: config.method || "GET",
            data: mockData,
            headers: { "content-type": "application/json" },
            duration: mockDelay,
          };
          break;
        }

        case "code-block": {
          const code = config.code as string || "return input;";
          const fn = new Function("input", "config", "results", `return (async () => {\n${code}\n})();`);
          let timeout: ReturnType<typeof setTimeout> | undefined;
          try {
            output = await Promise.race([
              fn(input, config, Object.fromEntries(this.results)),
              new Promise<never>((_, reject) => {
                timeout = setTimeout(() => reject(new Error("Code block timed out after 5000ms")), 5000);
              }),
            ]);
          } finally {
            clearTimeout(timeout);
          }
          break;
        }

        // ── Transforms ──
        case "json-parser": {
          const op = config.operation || "parse";
          if (op === "parse") {
            const str = typeof input === "string" ? input : JSON.stringify(input);
            let parsed = JSON.parse(str);
            if (config.path) {
              const pathParts = (config.path as string).split(".");
              for (const p of pathParts) {
                if (parsed && typeof parsed === "object" && p in parsed) {
                  parsed = (parsed as Record<string, unknown>)[p];
                } else {
                  parsed = undefined;
                  break;
                }
              }
            }
            output = parsed;
          } else {
            output = JSON.stringify(input, null, 2);
          }
          break;
        }

        case "text-formatter": {
          const op = config.operation || "template";
          const inputStr = typeof input === "string" ? input : JSON.stringify(input);
          switch (op) {
            case "template": {
              const tpl = (config.template as string) || "";
              output = tpl.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                if (input && typeof input === "object" && key in (input as Record<string, unknown>)) {
                  return String((input as Record<string, unknown>)[key]);
                }
                return `{{${key}}}`;
              });
              break;
            }
            case "uppercase":
              output = inputStr.toUpperCase();
              break;
            case "lowercase":
              output = inputStr.toLowerCase();
              break;
            case "trim":
              output = inputStr.trim();
              break;
            case "reverse":
              output = inputStr.split("").reverse().join("");
              break;
            default:
              output = inputStr;
          }
          break;
        }

        case "object-mapper": {
          let mapping: Record<string, string> = {};
          try { mapping = JSON.parse(config.mapping as string || "{}"); } catch {}
          const inputObj = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
          const result: Record<string, unknown> = {};
          for (const [targetKey, sourcePath] of Object.entries(mapping)) {
            const parts = sourcePath.split(".");
            let val: unknown = inputObj;
            for (const p of parts) {
              if (val && typeof val === "object" && p in (val as Record<string, unknown>)) {
                val = (val as Record<string, unknown>)[p];
              } else {
                val = undefined;
                break;
              }
            }
            result[targetKey] = val;
          }
          output = result;
          break;
        }

        case "array-iterator": {
          const inputObj = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
          let arr: unknown[] = [];
          if (Array.isArray(input)) {
            arr = input;
          } else if (config.path && typeof config.path === "string") {
            const parts = config.path.split(".");
            let val: unknown = inputObj;
            for (const p of parts) {
              if (val && typeof val === "object" && p in (val as Record<string, unknown>)) {
                val = (val as Record<string, unknown>)[p];
              } else {
                val = [];
                break;
              }
            }
            arr = Array.isArray(val) ? val : [];
          }
          const operation = config.operation || "map";
          const expr = config.expression as string || "item";
          const fn = new Function("item", "index", `return ${expr}`);
          switch (operation) {
            case "map":
              output = arr.map((item, i) => fn(item, i));
              break;
            case "filter":
              output = arr.filter((item, i) => fn(item, i));
              break;
            case "forEach":
              arr.forEach((item, i) => fn(item, i));
              output = arr;
              break;
            default:
              output = arr;
          }
          break;
        }

        // ── Conditions ──
        case "condition": {
          const inputObj = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
          let result = false;
          if (config.expression) {
            try {
              const fn = new Function("input", "config", `return ${config.expression}`);
              result = !!fn(input, config);
            } catch {
              result = false;
            }
          } else {
            const field = config.field as string;
            const op = config.operator as string;
            const val = config.value as string;
            const fieldVal = field ? inputObj[field] : input;
            switch (op) {
              case "equals":
                result = String(fieldVal) === val;
                break;
              case "not_equals":
                result = String(fieldVal) !== val;
                break;
              case "contains":
                result = String(fieldVal).includes(val);
                break;
              case "greater_than":
                result = Number(fieldVal) > Number(val);
                break;
              case "less_than":
                result = Number(fieldVal) < Number(val);
                break;
              case "is_empty":
                result = !fieldVal || fieldVal === "" || (Array.isArray(fieldVal) && fieldVal.length === 0);
                break;
              case "is_not_empty":
                result = !!fieldVal && fieldVal !== "" && !(Array.isArray(fieldVal) && fieldVal.length === 0);
                break;
              default:
                result = !!fieldVal;
            }
          }
          output = { condition: result, value: input };
          break;
        }

        // ── Outputs ──
        case "local-storage": {
          const key = (config.key as string) || "enoflow_result";
          const op = config.operation || "set";
          if (op === "set") {
            localStorage.setItem(key, JSON.stringify(input));
            output = { saved: true, key, data: input };
          } else {
            const stored = localStorage.getItem(key);
            output = { key, data: stored ? JSON.parse(stored) : null };
          }
          break;
        }

        case "webhook-response": {
          let responseData: unknown;
          try {
            responseData = JSON.parse(config.response as string || "{}");
          } catch {
            responseData = config.response || "OK";
          }
          output = {
            sent: true,
            statusCode: config.statusCode || 200,
            response: responseData,
            timestamp: new Date().toISOString(),
          };
          break;
        }

        case "notification": {
          output = {
            notified: true,
            title: config.title || "Flow Complete",
            message: config.message || "Your workflow has finished.",
            type: config.type || "info",
            data: input,
            timestamp: new Date().toISOString(),
          };
          // Show browser notification if permitted
          if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "granted") {
              new Notification(config.title as string || "EnoFlow", {
                body: config.message as string || "Flow completed",
              });
            }
          }
          break;
        }

        default:
          output = input;
      }

      const duration = performance.now() - start;
      const result: ExecutionResult = {
        nodeId: node.id,
        output,
        duration,
        timestamp: new Date().toISOString(),
      };
      this.results.set(node.id, result);
      return output;
    } catch (err) {
      const duration = performance.now() - start;
      const error = err instanceof Error ? err.message : String(err);
      const result: ExecutionResult = {
        nodeId: node.id,
        output: undefined,
        error,
        duration,
        timestamp: new Date().toISOString(),
      };
      this.results.set(node.id, result);
      throw err;
    }
  }

  // ── Run full flow ───────────────────────────────────────────────
  async executeFlow(
    nodes: Node<NodeData>[],
    edges: Edge[],
    onNodeStart?: (nodeId: string) => void,
    onNodeComplete?: (nodeId: string, result: ExecutionResult) => void,
    onNodeError?: (nodeId: string, error: string) => void
  ): Promise<Map<string, ExecutionResult>> {
    this.results.clear();
    this.abortController = new AbortController();
    const sorted = this.topologicalSort(nodes, edges);

    for (const node of sorted) {
      if (this.abortController.signal.aborted) break;

      onNodeStart?.(node.id);
      const input = this.getInputData(node.id, edges);

      try {
        await this.executeNode(node, input);
        const result = this.results.get(node.id)!;
        onNodeComplete?.(node.id, result);
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        onNodeError?.(node.id, error);
      }
    }

    return this.results;
  }

  // ── Step-by-step execution ──────────────────────────────────────
  async *executeStepByStep(
    nodes: Node<NodeData>[],
    edges: Edge[]
  ): AsyncGenerator<StepExecution> {
    this.results.clear();
    const sorted = this.topologicalSort(nodes, edges);

    for (const node of sorted) {
      const input = this.getInputData(node.id, edges);
      const step: StepExecution = {
        nodeId: node.id,
        status: "running",
        input,
        output: undefined,
        duration: 0,
      };

      const start = performance.now();
      try {
        const output = await this.executeNode(node, input);
        step.output = output;
        step.status = "completed";
        step.duration = performance.now() - start;
      } catch (err) {
        step.error = err instanceof Error ? err.message : String(err);
        step.status = "error";
        step.duration = performance.now() - start;
      }

      yield step;
    }
  }

  getResults(): Map<string, ExecutionResult> {
    return this.results;
  }
}

// ─── Validation ───────────────────────────────────────────────────
export function validateFlow(nodes: Node<NodeData>[], edges: Edge[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Check for triggers
  const triggers = nodes.filter((n) => n.data.category === "trigger");
  if (triggers.length === 0) {
    errors.push({ message: "Flow must have at least one trigger node", severity: "error" });
  }

  // Check for disconnected nodes
  for (const node of nodes) {
    const hasIncoming = edges.some((e) => e.target === node.id);
    const hasOutgoing = edges.some((e) => e.source === node.id);

    if (node.data.category !== "trigger" && !hasIncoming) {
      warnings.push({
        nodeId: node.id,
        message: `"${node.data.label}" has no incoming connections`,
        severity: "warning",
      });
    }

    if (node.data.category !== "output" && !hasOutgoing) {
      warnings.push({
        nodeId: node.id,
        message: `"${node.data.label}" has no outgoing connections`,
        severity: "warning",
      });
    }
  }

  // Check for cycles (simple DFS)
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) adj.set(n.id, []);
  for (const e of edges) adj.get(e.source)?.push(e.target);

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    inStack.add(nodeId);
    for (const next of adj.get(nodeId) || []) {
      if (inStack.has(next)) return true;
      if (!visited.has(next) && hasCycle(next)) return true;
    }
    inStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id) && hasCycle(node.id)) {
      errors.push({ message: "Flow contains a cycle", severity: "error" });
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
