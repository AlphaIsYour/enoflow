import { describe, it, expect, vi, afterEach } from "vitest";
import { FlowEngine, validateFlow } from "./engine";
import { Node, Edge } from "@xyflow/react";
import { NodeData } from "@/types";

describe("validateFlow", () => {
  it("should fail validation if there are no trigger nodes", () => {
    const nodes: Node<NodeData>[] = [
      {
        id: "action-1",
        position: { x: 0, y: 0 },
        data: {
          label: "Delay",
          nodeType: "delay",
          category: "action",
          config: { duration: 100 },
        },
      },
    ];
    const edges: Edge[] = [];

    const result = validateFlow(nodes, edges);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("at least one trigger"))).toBe(true);
  });

  it("should detect cyclic dependency in flow", () => {
    const nodes: Node<NodeData>[] = [
      {
        id: "n1",
        position: { x: 0, y: 0 },
        data: { label: "Trigger", nodeType: "manual-trigger", category: "trigger", config: {} },
      },
      {
        id: "n2",
        position: { x: 100, y: 0 },
        data: { label: "Delay", nodeType: "delay", category: "action", config: {} },
      },
    ];
    const edges: Edge[] = [
      { id: "e1", source: "n1", target: "n2" },
      { id: "e2", source: "n2", target: "n1" }, // cycle
    ];

    const result = validateFlow(nodes, edges);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.message.includes("cycle"))).toBe(true);
  });

  it("should pass validation for valid trigger and action sequence", () => {
    const nodes: Node<NodeData>[] = [
      {
        id: "trigger-1",
        position: { x: 0, y: 0 },
        data: { label: "Start", nodeType: "manual-trigger", category: "trigger", config: {} },
      },
      {
        id: "action-1",
        position: { x: 200, y: 0 },
        data: { label: "Format", nodeType: "text-formatter", category: "transform", config: { operation: "uppercase" } },
      },
      {
        id: "output-1",
        position: { x: 400, y: 0 },
        data: { label: "Notify", nodeType: "notification", category: "output", config: { title: "Done" } },
      },
    ];
    const edges: Edge[] = [
      { id: "e1", source: "trigger-1", target: "action-1" },
      { id: "e2", source: "action-1", target: "output-1" },
    ];

    const result = validateFlow(nodes, edges);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe("FlowEngine Execution", () => {
  it("should execute nodes in topological order and pass data downstream", async () => {
    const engine = new FlowEngine();

    const nodes: Node<NodeData>[] = [
      {
        id: "t1",
        position: { x: 0, y: 0 },
        data: {
          label: "Trigger",
          nodeType: "manual-trigger",
          category: "trigger",
          config: { data: "hello world" },
        },
      },
      {
        id: "fmt",
        position: { x: 200, y: 0 },
        data: {
          label: "Uppercase",
          nodeType: "text-formatter",
          category: "transform",
          config: { operation: "uppercase" },
        },
      },
    ];

    const edges: Edge[] = [{ id: "e1", source: "t1", target: "fmt" }];

    const executionOrder: string[] = [];
    const results = await engine.executeFlow(
      nodes,
      edges,
      (nodeId) => executionOrder.push(nodeId)
    );

    expect(executionOrder).toEqual(["t1", "fmt"]);
    expect(results.get("t1")?.output).toHaveProperty("trigger", "manual");
  });
});


describe("Code block async execution", () => {
  afterEach(() => vi.useRealTimers());

  function codeNode(code: string, id = "code"): Node<NodeData> {
    return {
      id, position: { x: 0, y: 0 },
      data: { label: id, nodeType: "code-block", category: "action", config: { code } },
    };
  }

  it.each([
    'return Promise.resolve({ foo: "bar" });',
    'const data = await Promise.resolve({ foo: "bar" }); return data;',
    'return { then(resolve) { resolve({ foo: "bar" }); } };',
    'return { foo: "bar" };',
  ])("stores resolved output and passes it downstream: %s", async (code) => {
    vi.useFakeTimers();
    const complete = vi.fn();
    const results = await new FlowEngine().executeFlow(
      [codeNode(code), codeNode('return input.foo + ":" + results.code.output.foo;', "next")],
      [{ id: "edge", source: "code", target: "next" }], undefined, complete,
    );
    expect(results.get("code")?.output).toEqual({ foo: "bar" });
    expect(results.get("next")?.output).toBe("bar:bar");
    expect(complete.mock.calls[0][1].output).toEqual({ foo: "bar" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['return Promise.reject(new Error("failed"));', 'throw new Error("failed");']) (
    "records failures and invokes the error callback: %s", async (code) => {
      vi.useFakeTimers();
      const error = vi.fn();
      const complete = vi.fn();
      const results = await new FlowEngine().executeFlow([codeNode(code)], [], undefined, complete, error);
      expect(results.get("code")).toMatchObject({ output: undefined, error: "failed" });
      expect(error).toHaveBeenCalledWith("code", "failed");
      expect(complete).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("resolves outputs and reports rejected promises in step mode", async () => {
    const engine = new FlowEngine();
    const steps = [];
    for await (const step of engine.executeStepByStep([
      codeNode('return Promise.resolve({ foo: "bar" });'),
      codeNode('return Promise.reject(new Error("failed"));', "bad"),
    ], [])) steps.push(step);
    expect(steps[0]).toMatchObject({ status: "completed", output: { foo: "bar" } });
    expect(engine.getResults().get("code")?.output).toEqual({ foo: "bar" });
    expect(steps[1]).toMatchObject({ status: "error", error: "failed" });
    expect(engine.getResults().get("bad")?.error).toBe("failed");
  });

  it("times out a pending promise and continues the flow", async () => {
    vi.useFakeTimers();
    const error = vi.fn();
    const pending = new FlowEngine().executeFlow([
      codeNode('return new Promise(() => {});'), codeNode('return "done";', "next"),
    ], [], undefined, undefined, error);
    await vi.advanceTimersByTimeAsync(4999);
    expect(error).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    const results = await pending;
    expect(error).toHaveBeenCalledWith("code", "Code block timed out after 5000ms");
    expect(results.get("code")?.error).toBe("Code block timed out after 5000ms");
    expect(results.get("next")?.output).toBe("done");
    expect(vi.getTimerCount()).toBe(0);
  });
});
