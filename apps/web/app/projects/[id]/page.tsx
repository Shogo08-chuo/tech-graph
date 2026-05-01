"use client";

import "@xyflow/react/dist/style.css";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeMouseHandler,
  type Node,
  type OnConnect,
  type OnEdgesChange,
  type OnNodeDrag,
  type OnNodesChange,
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

const categories = ["Frontend", "Backend", "Infrastructure", "Tool"];

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);

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

async function postJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  return requestJson<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function deleteJson<T>(path: string): Promise<T> {
  return requestJson<T>(path, {
    method: "DELETE",
  });
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

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [allTechnologies, setAllTechnologies] = useState<Technology[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [isEditingProjectInfo, setIsEditingProjectInfo] = useState(false);
  const [projectTitleInput, setProjectTitleInput] = useState("");
  const [projectDescriptionInput, setProjectDescriptionInput] = useState("");
  const [projectPeriodInput, setProjectPeriodInput] = useState("");
  const [projectGithubUrlInput, setProjectGithubUrlInput] = useState("");
  const [updatingProjectInfo, setUpdatingProjectInfo] = useState(false);
  const [selectedTechnologyId, setSelectedTechnologyId] = useState("");
  const [newTechnologyName, setNewTechnologyName] = useState("");
  const [newTechnologyCategory, setNewTechnologyCategory] = useState(categories[0]);
  const [creatingTechnology, setCreatingTechnology] = useState(false);
  const [deletingTechnologyId, setDeletingTechnologyId] = useState("");
  const [fromTechId, setFromTechId] = useState("");
  const [toTechId, setToTechId] = useState("");
  const [connectionLabel, setConnectionLabel] = useState("");
  const [connectionDescription, setConnectionDescription] = useState("");
  const [deletingConnectionId, setDeletingConnectionId] = useState("");
  const [editingConnectionId, setEditingConnectionId] = useState("");
  const [editingConnectionLabel, setEditingConnectionLabel] = useState("");
  const [editingConnectionDescription, setEditingConnectionDescription] = useState("");
  const [updatingConnectionId, setUpdatingConnectionId] = useState("");
  const [updatingProjectVisibility, setUpdatingProjectVisibility] = useState(false);
  const [savingNodeId, setSavingNodeId] = useState("");
  const [focusedTechnologyId, setFocusedTechnologyId] = useState("");
  const [focusedConnectionId, setFocusedConnectionId] = useState("");

  const applyProject = (data: ProjectDetail) => {
    setProject(data);
    setNodes(toFlowNodes(data.technologies));
    setEdges(toFlowEdges(data.connections));
    setProjectTitleInput(data.title);
    setProjectDescriptionInput(data.description ?? "");
    setProjectPeriodInput(data.period ?? "");
    setProjectGithubUrlInput(data.githubUrl ?? "");
  };

  const refreshProject = async () => {
    const nextProject = await requestJson<ProjectDetail>(`/projects/${params.id}`);
    applyProject(nextProject);
  };

  useEffect(() => {
    let ignore = false;

    Promise.all([
      requestJson<ProjectDetail>(`/projects/${params.id}`),
      requestJson<Technology[]>("/technologies"),
    ])
      .then(([projectData, technologies]) => {
        if (ignore) return;

        setLoadError("");
        applyProject(projectData);
        setAllTechnologies(technologies);
      })
      .catch((e: unknown) => {
        if (!ignore) {
          setLoadError(e instanceof Error ? e.message : "プロジェクトを取得できませんでした");
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

  const availableTechnologies = useMemo(() => {
    const usedTechnologyIds = new Set(technologies.map((technology) => technology.id));

    return allTechnologies.filter((technology) => !usedTechnologyIds.has(technology.id));
  }, [allTechnologies, technologies]);

  const focusedTechnology = useMemo(() => {
    return technologies.find((technology) => technology.id === focusedTechnologyId) ?? null;
  }, [focusedTechnologyId, technologies]);

  const focusedConnection = useMemo(() => {
    return (
      project?.connections.find((connection) => connection.id === focusedConnectionId) ?? null
    );
  }, [focusedConnectionId, project]);

  const handleTechnologySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedTechnologyId) return;

    setActionError("");
    setNotice("");

    try {
      await postJson<ProjectTechnology>(`/projects/${params.id}/technologies`, {
        technologyId: selectedTechnologyId,
      });

      await refreshProject();
      setSelectedTechnologyId("");
      setNotice("技術をプロジェクトに追加しました");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "技術の追加に失敗しました");
    }
  };

  const handleNewTechnologySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newTechnologyName.trim()) return;

    setActionError("");
    setNotice("");
    setCreatingTechnology(true);

    try {
      const technology = await postJson<Technology>("/technologies", {
        name: newTechnologyName.trim(),
        category: newTechnologyCategory,
      });

      await postJson<ProjectTechnology>(`/projects/${params.id}/technologies`, {
        technologyId: technology.id,
      });

      const [nextProject, nextTechnologies] = await Promise.all([
        requestJson<ProjectDetail>(`/projects/${params.id}`),
        requestJson<Technology[]>("/technologies"),
      ]);
      applyProject(nextProject);
      setAllTechnologies(nextTechnologies);
      setNewTechnologyName("");
      setNewTechnologyCategory(categories[0]);
      setSelectedTechnologyId("");
      setNotice("技術を登録してプロジェクトに追加しました");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "技術の登録に失敗しました");
    } finally {
      setCreatingTechnology(false);
    }
  };

  const handleTechnologyDelete = async (technologyId: string) => {
    setActionError("");
    setNotice("");
    setDeletingTechnologyId(technologyId);

    try {
      await deleteJson<{ message: string; deletedConnections: number }>(
        `/projects/${params.id}/technologies/${technologyId}`,
      );
      await refreshProject();

      if (fromTechId === technologyId) setFromTechId("");
      if (toTechId === technologyId) setToTechId("");
      if (focusedTechnologyId === technologyId) setFocusedTechnologyId("");
      cancelConnectionEdit();
      setNotice("技術をプロジェクトから削除しました");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "技術の削除に失敗しました");
    } finally {
      setDeletingTechnologyId("");
    }
  };

  const handleConnectionSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fromTechId || !toTechId) return;

    setActionError("");
    setNotice("");

    try {
      await postJson<Connection>(`/projects/${params.id}/connections`, {
        fromTechId,
        toTechId,
        label: connectionLabel.trim() || null,
        description: connectionDescription.trim() || null,
      });

      await refreshProject();
      setFromTechId("");
      setToTechId("");
      setConnectionLabel("");
      setConnectionDescription("");
      setNotice("接続を追加しました");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "接続の追加に失敗しました");
    }
  };

  const handleConnectionDelete = async (connectionId: string) => {
    setActionError("");
    setNotice("");
    setDeletingConnectionId(connectionId);

    try {
      await deleteJson<{ message: string }>(
        `/projects/${params.id}/connections/${connectionId}`,
      );
      await refreshProject();
      if (focusedConnectionId === connectionId) setFocusedConnectionId("");
      setNotice("接続を削除しました");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "接続の削除に失敗しました");
    } finally {
      setDeletingConnectionId("");
    }
  };

  const startConnectionEdit = (connection: Connection) => {
    setActionError("");
    setNotice("");
    setEditingConnectionId(connection.id);
    setEditingConnectionLabel(connection.label);
    setEditingConnectionDescription(connection.description ?? "");
  };

  const cancelConnectionEdit = () => {
    setEditingConnectionId("");
    setEditingConnectionLabel("");
    setEditingConnectionDescription("");
  };

  const handleConnectionUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingConnectionId) return;

    setActionError("");
    setNotice("");
    setUpdatingConnectionId(editingConnectionId);

    try {
      await patchJson<Connection>(
        `/projects/${params.id}/connections/${editingConnectionId}`,
        {
          label: editingConnectionLabel.trim() || null,
          description: editingConnectionDescription.trim() || null,
        },
      );
      await refreshProject();
      cancelConnectionEdit();
      setNotice("接続を更新しました");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "接続の更新に失敗しました");
    } finally {
      setUpdatingConnectionId("");
    }
  };

  const startProjectInfoEdit = () => {
    if (!project) return;

    setActionError("");
    setNotice("");
    setProjectTitleInput(project.title);
    setProjectDescriptionInput(project.description ?? "");
    setProjectPeriodInput(project.period ?? "");
    setProjectGithubUrlInput(project.githubUrl ?? "");
    setIsEditingProjectInfo(true);
  };

  const cancelProjectInfoEdit = () => {
    if (project) {
      setProjectTitleInput(project.title);
      setProjectDescriptionInput(project.description ?? "");
      setProjectPeriodInput(project.period ?? "");
      setProjectGithubUrlInput(project.githubUrl ?? "");
    }

    setIsEditingProjectInfo(false);
  };

  const handleProjectInfoUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!projectTitleInput.trim()) {
      setActionError("プロジェクト名を入力してください");
      return;
    }

    setActionError("");
    setNotice("");
    setUpdatingProjectInfo(true);

    try {
      const updatedProject = await patchJson<ProjectDetail>(`/projects/${params.id}`, {
        title: projectTitleInput.trim(),
        description: projectDescriptionInput.trim() || null,
        period: projectPeriodInput.trim() || null,
        githubUrl: projectGithubUrlInput.trim() || null,
      });
      applyProject(updatedProject);
      setIsEditingProjectInfo(false);
      setNotice("プロジェクト情報を更新しました");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "プロジェクト情報の更新に失敗しました");
    } finally {
      setUpdatingProjectInfo(false);
    }
  };

  const handleProjectVisibilityToggle = async () => {
    if (!project) return;

    setActionError("");
    setNotice("");
    setUpdatingProjectVisibility(true);

    try {
      const updatedProject = await patchJson<ProjectDetail>(`/projects/${params.id}`, {
        isPublic: !project.isPublic,
      });
      applyProject(updatedProject);
      setNotice(updatedProject.isPublic ? "プロジェクトを公開しました" : "プロジェクトを非公開にしました");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "公開設定の更新に失敗しました");
    } finally {
      setUpdatingProjectVisibility(false);
    }
  };

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

  const onNodesChange: OnNodesChange = (changes) =>
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));
  const onEdgesChange: OnEdgesChange = (changes) =>
    setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));
  const handleNodeDragStop: OnNodeDrag = async (_event, node) => {
    if (!Number.isFinite(node.position.x) || !Number.isFinite(node.position.y)) {
      setActionError("ノード位置が不正なため保存できませんでした");
      return;
    }

    setActionError("");
    setNotice("");
    setSavingNodeId(node.id);

    try {
      const updatedProjectTechnology = await patchJson<ProjectTechnology>(
        `/projects/${params.id}/technologies/${node.id}/position`,
        {
          positionX: node.position.x,
          positionY: node.position.y,
        },
      );

      setProject((currentProject) => {
        if (!currentProject) return currentProject;

        return {
          ...currentProject,
          technologies: currentProject.technologies.map((projectTechnology) =>
            projectTechnology.technologyId === updatedProjectTechnology.technologyId
              ? {
                  ...projectTechnology,
                  positionX: updatedProjectTechnology.positionX,
                  positionY: updatedProjectTechnology.positionY,
                }
              : projectTechnology,
          ),
        };
      });
      setNotice("ノード位置を保存しました");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "ノード位置の保存に失敗しました");
    } finally {
      setSavingNodeId("");
    }
  };
  const onConnect: OnConnect = (connection) => {
    if (!connection.source || !connection.target) return;

    if (connection.source === connection.target) {
      setActionError("異なる技術同士を接続してください");
      return;
    }

    setActionError("");
    setNotice("接続ラベルと理由を入力して保存してください");
    setFromTechId(connection.source);
    setToTechId(connection.target);
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

  if (loadError || !project) {
    return (
      <main className="min-h-screen bg-[#f6f7f9] px-5 py-8 text-[#172033]">
        <div className="mx-auto max-w-6xl rounded-lg border border-[#f0b4a8] bg-[#fff4f1] p-5 text-[#9a3412]">
          {loadError || "プロジェクトが見つかりません"}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-5 py-8 text-[#172033]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-[#d9dee7] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/" className="text-sm font-semibold text-[#2563eb] hover:underline">
              開発パネルへ戻る
            </Link>
            <h1 className="mt-2 text-3xl font-bold tracking-normal">{project.title}</h1>
            <p className="mt-2 text-sm text-[#536174]">
              作成者: {project.user.name || project.user.email || "未設定"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {project.isPublic ? (
              <Link
                href={`/public/projects/${project.id}`}
                className="rounded-md border border-[#cbd3df] bg-white px-3 py-2 text-sm font-semibold text-[#172033] transition hover:bg-[#eef2f7]"
              >
                公開ページを見る
              </Link>
            ) : null}
            <button
              type="button"
              onClick={handleProjectVisibilityToggle}
              className="rounded-md bg-[#172033] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#2c3850] disabled:cursor-not-allowed disabled:bg-[#9ba5b4]"
              disabled={updatingProjectVisibility}
            >
              {updatingProjectVisibility
                ? "更新中"
                : project.isPublic
                  ? "非公開にする"
                  : "公開する"}
            </button>
            <div className="rounded-full bg-white px-3 py-2 text-sm text-[#536174] ring-1 ring-[#d9dee7]">
              {project.isPublic ? "公開中" : "非公開"}
            </div>
          </div>
        </header>

        <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">基本情報</h2>
            {!isEditingProjectInfo ? (
              <button
                type="button"
                onClick={startProjectInfoEdit}
                className="rounded-md border border-[#cbd3df] px-3 py-2 text-sm font-semibold text-[#172033] transition hover:bg-[#eef2f7]"
              >
                編集
              </button>
            ) : null}
          </div>

          {isEditingProjectInfo ? (
            <form onSubmit={handleProjectInfoUpdate} className="mt-4 grid gap-3">
              <input
                value={projectTitleInput}
                onChange={(e) => setProjectTitleInput(e.target.value)}
                placeholder="プロジェクト名"
                className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  value={projectPeriodInput}
                  onChange={(e) => setProjectPeriodInput(e.target.value)}
                  placeholder="期間"
                  className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
                />
                <input
                  type="url"
                  value={projectGithubUrlInput}
                  onChange={(e) => setProjectGithubUrlInput(e.target.value)}
                  placeholder="GitHub URL"
                  className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
                />
              </div>
              <textarea
                value={projectDescriptionInput}
                onChange={(e) => setProjectDescriptionInput(e.target.value)}
                placeholder="概要"
                className="min-h-28 resize-y rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-md bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#9fb7e8]"
                  disabled={updatingProjectInfo || !projectTitleInput.trim()}
                >
                  {updatingProjectInfo ? "保存中" : "保存"}
                </button>
                <button
                  type="button"
                  onClick={cancelProjectInfoEdit}
                  className="rounded-md border border-[#cbd3df] px-4 py-2 text-sm font-semibold text-[#172033] transition hover:bg-[#eef2f7]"
                >
                  キャンセル
                </button>
              </div>
            </form>
          ) : (
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
          )}
        </section>

        {notice ? (
          <div className="rounded-md border border-[#bbd7c4] bg-[#f0fdf4] px-4 py-3 text-sm text-[#166534]">
            {notice}
          </div>
        ) : null}

        {actionError ? (
          <div className="rounded-md border border-[#f0b4a8] bg-[#fff4f1] px-4 py-3 text-sm text-[#9a3412]">
            {actionError}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="relative h-[560px] overflow-hidden rounded-lg border border-[#d9dee7] bg-white shadow-sm">
            {nodes.length === 0 ? (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[#536174]">
                まだこのプロジェクトに表示できる技術や接続がありません。
              </div>
            ) : (
              <>
                {savingNodeId ? (
                  <div className="absolute left-3 top-3 z-10 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#536174] shadow-sm ring-1 ring-[#d9dee7]">
                    位置を保存中
                  </div>
                ) : null}
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={handleFlowNodeClick}
                  onEdgeClick={handleFlowEdgeClick}
                  onNodeDragStop={handleNodeDragStop}
                  onConnect={onConnect}
                  onPaneClick={clearFlowFocus}
                  fitView
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
              <form onSubmit={handleTechnologySubmit} className="mt-4 grid gap-2">
                <select
                  value={selectedTechnologyId}
                  onChange={(e) => setSelectedTechnologyId(e.target.value)}
                  className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
                >
                  <option value="">技術を選択</option>
                  {availableTechnologies.map((technology) => (
                    <option key={technology.id} value={technology.id}>
                      {technology.name} / {technology.category}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-md bg-[#2563eb] px-4 py-2 font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#9fb7e8]"
                  disabled={!selectedTechnologyId}
                >
                  技術を追加
                </button>
              </form>
              <form
                onSubmit={handleNewTechnologySubmit}
                className="mt-4 grid gap-2 border-t border-[#d9dee7] pt-4"
              >
                <input
                  value={newTechnologyName}
                  onChange={(e) => setNewTechnologyName(e.target.value)}
                  placeholder="新しい技術名"
                  className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
                />
                <select
                  value={newTechnologyCategory}
                  onChange={(e) => setNewTechnologyCategory(e.target.value)}
                  className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <button
                  className="rounded-md bg-[#059669] px-4 py-2 font-semibold text-white transition hover:bg-[#047857] disabled:cursor-not-allowed disabled:bg-[#9ed6c0]"
                  disabled={creatingTechnology || !newTechnologyName.trim()}
                >
                  {creatingTechnology ? "追加中" : "登録して追加"}
                </button>
              </form>
              <ul className="mt-4 grid gap-2">
                {technologies.length === 0 ? (
                  <li className="rounded-md bg-[#f6f7f9] px-3 py-3 text-sm text-[#536174]">
                    技術がありません
                  </li>
                ) : (
                  technologies.map((technology) => (
                    <li
                      key={technology.id}
                      className="flex items-center justify-between gap-3 rounded-md bg-[#f6f7f9] px-3 py-2"
                    >
                      <div>
                        <strong>{technology.name}</strong>
                        <span className="ml-2 rounded-full bg-white px-2 py-1 text-xs text-[#536174] ring-1 ring-[#d9dee7]">
                          {technology.category}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTechnologyDelete(technology.id)}
                        className="rounded-md border border-[#f0b4a8] px-2 py-1 text-xs font-semibold text-[#9a3412] transition hover:bg-[#fff4f1] disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={deletingTechnologyId === technology.id}
                      >
                        {deletingTechnologyId === technology.id ? "削除中" : "削除"}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">接続</h2>
                <span className="text-sm text-[#536174]">{project.connections.length}件</span>
              </div>
              <form onSubmit={handleConnectionSubmit} className="mt-4 grid gap-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    value={fromTechId}
                    onChange={(e) => setFromTechId(e.target.value)}
                    className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
                  >
                    <option value="">From</option>
                    {technologies.map((technology) => (
                      <option key={technology.id} value={technology.id}>
                        {technology.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={toTechId}
                    onChange={(e) => setToTechId(e.target.value)}
                    className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
                  >
                    <option value="">To</option>
                    {technologies.map((technology) => (
                      <option key={technology.id} value={technology.id}>
                        {technology.name}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  value={connectionLabel}
                  onChange={(e) => setConnectionLabel(e.target.value)}
                  placeholder="ラベル（任意）"
                  className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
                />
                <textarea
                  value={connectionDescription}
                  onChange={(e) => setConnectionDescription(e.target.value)}
                  placeholder="理由（任意）"
                  className="min-h-24 resize-y rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
                />
                <button
                  className="rounded-md bg-[#172033] px-4 py-2 font-semibold text-white transition hover:bg-[#2c3850] disabled:cursor-not-allowed disabled:bg-[#9ba5b4]"
                  disabled={
                    technologies.length < 2 ||
                    !fromTechId ||
                    !toTechId
                  }
                >
                  接続を追加
                </button>
              </form>
              <ul className="mt-4 grid gap-2">
                {project.connections.length === 0 ? (
                  <li className="rounded-md bg-[#f6f7f9] px-3 py-3 text-sm text-[#536174]">
                    接続がありません
                  </li>
                ) : (
                  project.connections.map((connection) => (
                    <li key={connection.id} className="rounded-md bg-[#f6f7f9] px-3 py-3">
                      {editingConnectionId === connection.id ? (
                        <form onSubmit={handleConnectionUpdate} className="grid gap-2">
                          <p className="text-sm font-semibold">
                            {connection.fromTech.name} → {connection.toTech.name}
                          </p>
                          <input
                            value={editingConnectionLabel}
                            onChange={(e) => setEditingConnectionLabel(e.target.value)}
                            placeholder="ラベル（任意）"
                            className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
                          />
                          <textarea
                            value={editingConnectionDescription}
                            onChange={(e) => setEditingConnectionDescription(e.target.value)}
                            placeholder="理由（任意）"
                            className="min-h-24 resize-y rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
                          />
                          <div className="grid gap-2 sm:grid-cols-2">
                            <button
                              className="rounded-md bg-[#2563eb] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-[#9fb7e8]"
                              disabled={updatingConnectionId === connection.id}
                            >
                              {updatingConnectionId === connection.id ? "保存中" : "保存"}
                            </button>
                            <button
                              type="button"
                              onClick={cancelConnectionEdit}
                              className="rounded-md border border-[#cbd3df] px-3 py-2 text-sm font-semibold text-[#172033] transition hover:bg-white"
                            >
                              キャンセル
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold">
                              {connection.fromTech.name} → {connection.toTech.name}
                            </p>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => startConnectionEdit(connection)}
                                className="rounded-md border border-[#cbd3df] px-2 py-1 text-xs font-semibold text-[#172033] transition hover:bg-white"
                              >
                                編集
                              </button>
                              <button
                                type="button"
                                onClick={() => handleConnectionDelete(connection.id)}
                                className="rounded-md border border-[#f0b4a8] px-2 py-1 text-xs font-semibold text-[#9a3412] transition hover:bg-[#fff4f1] disabled:cursor-not-allowed disabled:opacity-60"
                                disabled={deletingConnectionId === connection.id}
                              >
                                {deletingConnectionId === connection.id ? "削除中" : "削除"}
                              </button>
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-[#536174]">{connection.label}</p>
                          {connection.description ? (
                            <p className="mt-2 text-sm leading-6 text-[#536174]">
                              {connection.description}
                            </p>
                          ) : null}
                        </>
                      )}
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
