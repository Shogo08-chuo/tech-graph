"use client";

import "@xyflow/react/dist/style.css";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Edge,
  type EdgeMouseHandler,
  type Node,
  type NodeMouseHandler,
} from "@xyflow/react";
import { API_BASE } from "@/app/lib/api";

type User = {
  id: string;
  name: string | null;
  email: string | null;
};

type Technology = {
  id: string;
  name: string;
  category: string;
};

type ProjectTechnology = {
  projectId: string;
  technologyId: string;
  positionX: number;
  positionY: number;
  technology: Technology;
};

type Connection = {
  id: string;
  label: string;
  description: string | null;
  fromTechId: string;
  toTechId: string;
  fromTech: Technology;
  toTech: Technology;
};

type ProjectDetail = {
  id: string;
  title: string;
  description: string | null;
  period: string | null;
  githubUrl: string | null;
  isPublic: boolean;
  user: User;
  technologies: ProjectTechnology[];
  connections: Connection[];
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
    const data = await res.json().catch(() => null);
    const message =
      data && typeof data === "object" && "error" in data
        ? String(data.error)
        : "APIリクエストに失敗しました";
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

function fallbackNodePosition(index: number) {
  const columns = 3;

  return {
    x: (index % columns) * 230,
    y: Math.floor(index / columns) * 160,
  };
}

function safeCoordinate(value: unknown, fallback: number) {
  const numberValue = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function projectTechnologies(project: ProjectDetail) {
  return project.technologies.map((item) => item.technology);
}

function toFlowNodes(projectTechnologies: ProjectTechnology[]): Node[] {
  return projectTechnologies.map((projectTechnology, index) => {
    const technology = projectTechnology.technology;
    const fallbackPosition = fallbackNodePosition(index);

    return {
      id: technology.id,
      data: { label: technology.name },
      position: {
        x: safeCoordinate(projectTechnology.positionX, fallbackPosition.x),
        y: safeCoordinate(projectTechnology.positionY, fallbackPosition.y),
      },
      style: {
        background: categoryColor[technology.category] ?? "#172033",
        border: "1px solid rgba(255, 255, 255, 0.28)",
        borderRadius: 8,
        color: "#fff",
        fontWeight: 700,
        padding: 10,
        textAlign: "center",
        width: 170,
      },
    };
  });
}

function toFlowEdges(connections: Connection[]): Edge[] {
  return connections.map((connection) => ({
    id: connection.id,
    source: connection.fromTechId,
    target: connection.toTechId,
    label: connection.label,
    animated: true,
    style: { stroke: "#536174", strokeWidth: 2 },
  }));
}

export default function PublicProjectPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [focusedTechnologyId, setFocusedTechnologyId] = useState("");
  const [focusedConnectionId, setFocusedConnectionId] = useState("");

  useEffect(() => {
    let ignore = false;

    requestJson<ProjectDetail>(`/public/projects/${params.id}`)
      .then((data) => {
        if (!ignore) setProject(data);
      })
      .catch((e: unknown) => {
        if (!ignore) {
          setError(e instanceof Error ? e.message : "公開ページを取得できませんでした");
        }
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [params.id]);

  const technologies = useMemo(() => {
    return project ? projectTechnologies(project) : [];
  }, [project]);

  const nodes = useMemo(() => {
    return project ? toFlowNodes(project.technologies) : [];
  }, [project]);
  const edges = useMemo(() => {
    return project ? toFlowEdges(project.connections) : [];
  }, [project]);

  const focusedTechnology = useMemo(() => {
    return technologies.find((technology) => technology.id === focusedTechnologyId) ?? null;
  }, [focusedTechnologyId, technologies]);

  const focusedConnection = useMemo(() => {
    return (
      project?.connections.find((connection) => connection.id === focusedConnectionId) ?? null
    );
  }, [focusedConnectionId, project]);

  const handleFlowNodeClick: NodeMouseHandler = (_event, node) => {
    setFocusedTechnologyId(node.id);
    setFocusedConnectionId("");
  };

  const handleFlowEdgeClick: EdgeMouseHandler = (_event, edge) => {
    setFocusedConnectionId(edge.id);
    setFocusedTechnologyId("");
  };

  const clearFlowFocus = () => {
    setFocusedTechnologyId("");
    setFocusedConnectionId("");
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#f6f7f9] px-5 py-8 text-[#172033]">
        <div className="mx-auto max-w-6xl rounded-lg border border-[#d9dee7] bg-white p-5">
          読み込み中です
        </div>
      </main>
    );
  }

  if (error || !project) {
    return (
      <main className="min-h-screen bg-[#f6f7f9] px-5 py-8 text-[#172033]">
        <div className="mx-auto max-w-6xl rounded-lg border border-[#f0b4a8] bg-[#fff4f1] p-5 text-[#9a3412]">
          {error || "公開中のプロジェクトが見つかりません"}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-5 py-8 text-[#172033]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-[#d9dee7] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#2563eb]">TechGraph Portfolio</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal">{project.title}</h1>
            <p className="mt-2 text-sm text-[#536174]">
              作成者: {project.user.name || project.user.email || "未設定"}
            </p>
          </div>
          <Link
            href="/"
            className="rounded-md border border-[#cbd3df] bg-white px-3 py-2 text-sm font-semibold text-[#172033] transition hover:bg-[#eef2f7]"
          >
            TechGraphへ
          </Link>
        </header>

        <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">基本情報</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(180px,1fr)_minmax(220px,1fr)]">
            <div>
              <p className="text-xs font-semibold text-[#536174]">概要</p>
              <p className="mt-2 text-sm leading-6 text-[#536174]">
                {project.description || "未設定"}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#536174]">期間</p>
              <p className="mt-2 text-sm text-[#536174]">{project.period || "未設定"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#536174]">GitHub</p>
              {project.githubUrl ? (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 block break-all text-sm font-semibold text-[#2563eb] hover:underline"
                >
                  {project.githubUrl}
                </a>
              ) : (
                <p className="mt-2 text-sm text-[#536174]">未設定</p>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="relative h-[560px] overflow-hidden rounded-lg border border-[#d9dee7] bg-white shadow-sm">
            {nodes.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#536174]">
                表示できる技術がまだありません。
              </div>
            ) : (
              <>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  fitView
                  nodesDraggable={false}
                  nodesConnectable={false}
                  onNodeClick={handleFlowNodeClick}
                  onEdgeClick={handleFlowEdgeClick}
                  onPaneClick={clearFlowFocus}
                >
                  <Background color="#cbd3df" gap={24} size={1} />
                  <Controls />
                </ReactFlow>
                {focusedConnection ? (
                  <div className="absolute right-3 top-3 z-10 w-[min(320px,calc(100%-24px))] rounded-md border border-[#d9dee7] bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[#536174]">接続</p>
                        <h3 className="mt-1 text-sm font-bold">
                          {focusedConnection.fromTech.name} → {focusedConnection.toTech.name}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={clearFlowFocus}
                        className="rounded-md border border-[#cbd3df] px-2 py-1 text-xs font-semibold text-[#172033] transition hover:bg-[#eef2f7]"
                      >
                        閉じる
                      </button>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[#172033]">
                      {focusedConnection.label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#536174]">
                      {focusedConnection.description || "理由は未設定"}
                    </p>
                  </div>
                ) : focusedTechnology ? (
                  <div className="absolute right-3 top-3 z-10 w-[min(280px,calc(100%-24px))] rounded-md border border-[#d9dee7] bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold text-[#536174]">技術</p>
                        <h3 className="mt-1 text-sm font-bold">{focusedTechnology.name}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={clearFlowFocus}
                        className="rounded-md border border-[#cbd3df] px-2 py-1 text-xs font-semibold text-[#172033] transition hover:bg-[#eef2f7]"
                      >
                        閉じる
                      </button>
                    </div>
                    <span className="mt-3 inline-flex rounded-full bg-[#f6f7f9] px-2 py-1 text-xs text-[#536174] ring-1 ring-[#d9dee7]">
                      {focusedTechnology.category}
                    </span>
                  </div>
                ) : null}
              </>
            )}
          </div>

          <aside className="grid gap-4">
            <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">技術</h2>
                <span className="text-sm text-[#536174]">{technologies.length}件</span>
              </div>
              <ul className="mt-4 grid gap-2">
                {technologies.map((technology) => (
                  <li
                    key={technology.id}
                    className="flex items-center justify-between gap-3 rounded-md bg-[#f6f7f9] px-3 py-2"
                  >
                    <strong>{technology.name}</strong>
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-[#536174] ring-1 ring-[#d9dee7]">
                      {technology.category}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">接続理由</h2>
                <span className="text-sm text-[#536174]">{project.connections.length}件</span>
              </div>
              <ul className="mt-4 grid gap-2">
                {project.connections.length === 0 ? (
                  <li className="rounded-md bg-[#f6f7f9] px-3 py-3 text-sm text-[#536174]">
                    接続がありません
                  </li>
                ) : (
                  project.connections.map((connection) => (
                    <li key={connection.id} className="rounded-md bg-[#f6f7f9] px-3 py-3">
                      <p className="text-sm font-semibold">
                        {connection.fromTech.name} → {connection.toTech.name}
                      </p>
                      <p className="mt-1 text-sm text-[#536174]">{connection.label}</p>
                      {connection.description ? (
                        <p className="mt-2 text-sm leading-6 text-[#536174]">
                          {connection.description}
                        </p>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
