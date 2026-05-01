"use client";

import "@xyflow/react/dist/style.css";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { API_BASE } from "@/app/lib/api";

type Technology = {
  id: string;
  name: string;
  category: string;
};

type Connection = {
  id: string;
  label: string;
  fromTechId: string;
  toTechId: string;
};

const categoryColor: Record<string, string> = {
  Frontend: "#2563eb",
  Backend: "#059669",
  Infrastructure: "#7c3aed",
  Tool: "#d97706",
};

async function requestJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);

  if (!res.ok) {
    throw new Error("グラフデータの取得に失敗しました");
  }

  return res.json() as Promise<T>;
}

function nodePosition(index: number) {
  const columns = 4;

  return {
    x: (index % columns) * 220,
    y: Math.floor(index / columns) * 150,
  };
}

export default function GraphPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    Promise.all([
      requestJson<Technology[]>("/technologies"),
      requestJson<Connection[]>("/connections"),
    ])
      .then(([techs, conns]) => {
        if (ignore) return;

        setNodes(
          techs.map((tech, index) => ({
            id: tech.id,
            data: { label: tech.name },
            position: nodePosition(index),
            style: {
              background: categoryColor[tech.category] ?? "#172033",
              border: "1px solid rgba(255, 255, 255, 0.28)",
              borderRadius: 8,
              color: "#fff",
              fontWeight: 700,
              padding: 10,
              textAlign: "center",
              width: 160,
            },
          })),
        );

        setEdges(
          conns.map((connection) => ({
            id: connection.id,
            source: connection.fromTechId,
            target: connection.toTechId,
            label: connection.label,
            animated: true,
            style: { stroke: "#536174", strokeWidth: 2 },
          })),
        );
      })
      .catch((e: unknown) => {
        if (!ignore) {
          setError(e instanceof Error ? e.message : "グラフデータの取得に失敗しました");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  const onNodesChange: OnNodesChange = (changes) =>
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  const onEdgesChange: OnEdgesChange = (changes) =>
    setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));

  return (
    <main className="relative h-screen w-screen bg-[#eef2f7] text-[#172033]">
      <div className="absolute left-5 top-5 z-10 rounded-lg border border-[#d9dee7] bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-[#2563eb]">TechGraph</p>
            <h1 className="mt-1 text-xl font-bold">技術グラフ</h1>
          </div>
          <Link
            href="/"
            className="rounded-md bg-[#172033] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#2c3850]"
          >
            戻る
          </Link>
        </div>
        {error ? (
          <p className="mt-3 rounded-md bg-[#fff4f1] px-3 py-2 text-sm text-[#9a3412]">
            {error}
          </p>
        ) : null}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        fitView
      >
        <Background color="#cbd3df" gap={24} size={1} />
        <Controls />
      </ReactFlow>
    </main>
  );
}
