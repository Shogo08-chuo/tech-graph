"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
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

type Project = {
  id: string;
  title: string;
  description: string | null;
  period: string | null;
  githubUrl: string | null;
  userId: string;
  user: User;
};

type Connection = {
  id: string;
  projectId: string;
  label: string;
  fromTechId: string;
  toTechId: string;
  fromTech: Technology;
  toTech: Technology;
};

type DashboardData = {
  techs: Technology[];
  projects: Project[];
  connections: Connection[];
};

const categories = ["Frontend", "Backend", "Infrastructure", "Tool"];

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = path.startsWith("/api/") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, init);

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

async function fetchDashboardData(
  includePrivateData: boolean,
): Promise<DashboardData> {
  const [techs, projects, connections] = await Promise.all([
    requestJson<Technology[]>("/technologies"),
    includePrivateData
      ? requestJson<Project[]>("/api/me/projects")
      : Promise.resolve([]),
    includePrivateData
      ? requestJson<Connection[]>("/api/me/connections")
      : Promise.resolve([]),
  ]);

  return { techs, projects, connections };
}

export default function Home() {
  const { data: session, status } = useSession();
  const [techs, setTechs] = useState<Technology[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState("APIに接続中です");
  const [error, setError] = useState("");

  const [techName, setTechName] = useState("");
  const [techCategory, setTechCategory] = useState(categories[0]);
  const [projectTitle, setProjectTitle] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectPeriod, setProjectPeriod] = useState("");
  const [projectGithubUrl, setProjectGithubUrl] = useState("");
  const [connProjectId, setConnProjectId] = useState("");
  const [fromTechId, setFromTechId] = useState("");
  const [toTechId, setToTechId] = useState("");
  const [connLabel, setConnLabel] = useState("");

  const sessionUser = session?.user;
  const sessionUserId = sessionUser?.id ?? "";
  const isAuthenticated = status === "authenticated" && Boolean(sessionUserId);
  const visibleProjects = isAuthenticated
    ? projects
    : [];
  const visibleProjectIds = new Set(
    visibleProjects.map((project) => project.id),
  );
  const visibleConnections = isAuthenticated
    ? connections
    : [];

  const applyData = (data: DashboardData) => {
    setTechs(data.techs);
    setProjects(data.projects);
    setConnections(data.connections);
  };

  const refreshData = async (successMessage = "最新データを読み込みました") => {
    setIsLoading(true);
    setError("");

    try {
      const data = await fetchDashboardData(isAuthenticated);
      applyData(data);
      setNotice(successMessage);
    } catch (e) {
      setError(e instanceof Error ? e.message : "データの取得に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;

    let ignore = false;

    fetchDashboardData(isAuthenticated)
      .then((data) => {
        if (ignore) return;
        applyData(data);
        setNotice("最新データを読み込みました");
      })
      .catch((e: unknown) => {
        if (ignore) return;
        setError(e instanceof Error ? e.message : "データの取得に失敗しました");
      })
      .finally(() => {
        if (!ignore) setIsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isAuthenticated, status]);

  const handleTechSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!techName.trim()) return;

    try {
      await postJson<Technology>("/technologies", {
        name: techName.trim(),
        category: techCategory,
      });

      setTechName("");
      await refreshData("技術を登録しました");
    } catch (e) {
      setError(e instanceof Error ? e.message : "技術の登録に失敗しました");
    }
  };

  const handleProjectSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!projectTitle.trim()) return;
    if (!isAuthenticated) {
      setError("ログインしてからプロジェクトを登録してください");
      return;
    }

    try {
      await postJson<Project>("/api/me/projects", {
        title: projectTitle.trim(),
        description: projectDescription.trim() || null,
        period: projectPeriod.trim() || null,
        githubUrl: projectGithubUrl.trim() || null,
      });

      setProjectTitle("");
      setProjectDescription("");
      setProjectPeriod("");
      setProjectGithubUrl("");
      await refreshData("プロジェクトを登録しました");
    } catch (e) {
      setError(e instanceof Error ? e.message : "プロジェクトの登録に失敗しました");
    }
  };

  const handleConnSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!connProjectId || !fromTechId || !toTechId) return;
    if (!isAuthenticated || !visibleProjectIds.has(connProjectId)) {
      setError("ログインしてから自分のプロジェクトを選択してください");
      return;
    }

    try {
      await postJson<Connection>("/api/me/connections", {
        projectId: connProjectId,
        fromTechId,
        toTechId,
        label: connLabel.trim() || null,
      });

      setConnLabel("");
      await refreshData("接続を登録しました");
    } catch (e) {
      setError(e instanceof Error ? e.message : "接続の登録に失敗しました");
    }
  };

  const handleSeedTechs = async () => {
    try {
      await postJson<{ message: string; count: number }>("/seed-techs", {});
      await refreshData("よく使う技術を追加しました");
    } catch (e) {
      setError(e instanceof Error ? e.message : "技術の追加に失敗しました");
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f7f9] px-5 py-8 text-[#172033]">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-[#d9dee7] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#2563eb]">TechGraph</p>
            <h1 className="mt-1 text-3xl font-bold tracking-normal">
              開発パネル
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-white px-3 py-2 text-sm text-[#536174] ring-1 ring-[#d9dee7]">
              {isLoading ? "読み込み中" : notice}
            </span>
            <Link
              href="/graph"
              className="rounded-md bg-[#172033] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2c3850]"
            >
              グラフを見る
            </Link>
          </div>
        </header>

        {error ? (
          <div className="rounded-md border border-[#f0b4a8] bg-[#fff4f1] px-4 py-3 text-sm text-[#9a3412]">
            {error}
          </div>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-3">
          <section
            className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold">アカウント</h2>
            <div className="mt-4 grid gap-3">
              {status === "loading" ? (
                <p className="rounded-md bg-[#f6f7f9] px-3 py-3 text-sm text-[#536174]">
                  ログイン確認中
                </p>
              ) : isAuthenticated ? (
                <>
                  <div className="rounded-md bg-[#f6f7f9] px-3 py-3">
                    <p className="font-semibold">
                      {sessionUser?.name || "名前未設定"}
                    </p>
                    <p className="text-sm text-[#536174]">
                      {sessionUser?.email || "メール未設定"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void signOut({ callbackUrl: "/" })}
                    className="rounded-md border border-[#cbd3df] px-4 py-2 font-semibold text-[#172033] transition hover:bg-[#eef2f7]"
                  >
                    ログアウト
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => void signIn("github")}
                    className="rounded-md bg-[#172033] px-4 py-2 font-semibold text-white transition hover:bg-[#2c3850]"
                  >
                    GitHubでログイン
                  </button>
                </>
              )}
            </div>
          </section>

          <form
            onSubmit={handleTechSubmit}
            className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">技術</h2>
              <button
                type="button"
                onClick={handleSeedTechs}
                className="rounded-md border border-[#cbd3df] px-3 py-1.5 text-sm font-semibold text-[#172033] transition hover:bg-[#eef2f7]"
              >
                定番を追加
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <input
                value={techName}
                onChange={(e) => setTechName(e.target.value)}
                placeholder="React"
                className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
              />
              <select
                value={techCategory}
                onChange={(e) => setTechCategory(e.target.value)}
                className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              <button className="rounded-md bg-[#059669] px-4 py-2 font-semibold text-white transition hover:bg-[#047857]">
                追加
              </button>
            </div>
          </form>

          <form
            onSubmit={handleProjectSubmit}
            className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm"
          >
            <h2 className="text-lg font-bold">プロジェクト</h2>
            <div className="mt-4 grid gap-3">
              <input
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="プロジェクト名"
                className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
              />
              <input
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                placeholder="説明"
                className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
              />
              <input
                value={projectPeriod}
                onChange={(e) => setProjectPeriod(e.target.value)}
                placeholder="期間"
                className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
              />
              <input
                type="url"
                value={projectGithubUrl}
                onChange={(e) => setProjectGithubUrl(e.target.value)}
                placeholder="GitHub URL"
                className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
              />
              <button
                disabled={!isAuthenticated}
                className="rounded-md bg-[#7c3aed] px-4 py-2 font-semibold text-white transition hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:bg-[#9aa4b2]"
              >
                追加
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold">接続</h2>
          <form
            onSubmit={handleConnSubmit}
            className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
          >
            <select
              value={connProjectId}
              onChange={(e) => setConnProjectId(e.target.value)}
              className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
            >
              <option value="">プロジェクト</option>
              {visibleProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            <select
              value={fromTechId}
              onChange={(e) => setFromTechId(e.target.value)}
              className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
            >
              <option value="">From</option>
              {techs.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </select>
            <select
              value={toTechId}
              onChange={(e) => setToTechId(e.target.value)}
              className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
            >
              <option value="">To</option>
              {techs.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </select>
            <input
              value={connLabel}
              onChange={(e) => setConnLabel(e.target.value)}
              placeholder="ラベル（任意）"
              className="rounded-md border border-[#cbd3df] px-3 py-2 outline-none focus:border-[#2563eb]"
            />
            <button
              disabled={!isAuthenticated}
              className="rounded-md bg-[#172033] px-4 py-2 font-semibold text-white transition hover:bg-[#2c3850] disabled:cursor-not-allowed disabled:bg-[#9aa4b2]"
            >
              追加
            </button>
          </form>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <DataList title="プロジェクト" count={visibleProjects.length}>
            {visibleProjects.map((project) => (
              <li key={project.id} className="rounded-md bg-[#f6f7f9] px-3 py-2">
                <Link
                  href={`/projects/${project.id}`}
                  className="font-semibold text-[#2563eb] hover:underline"
                >
                  {project.title}
                </Link>
                <p className="text-sm text-[#536174]">
                  {project.user.name || project.user.email || "作成者未設定"}
                </p>
                {project.period ? (
                  <p className="text-sm text-[#536174]">{project.period}</p>
                ) : null}
              </li>
            ))}
          </DataList>

          <DataList title="技術" count={techs.length}>
            {techs.map((tech) => (
              <li
                key={tech.id}
                className="flex items-center justify-between gap-3 rounded-md bg-[#f6f7f9] px-3 py-2"
              >
                <span className="font-semibold">{tech.name}</span>
                <span className="rounded-full bg-white px-2 py-1 text-xs text-[#536174] ring-1 ring-[#d9dee7]">
                  {tech.category}
                </span>
              </li>
            ))}
          </DataList>
        </section>

        <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">接続一覧</h2>
            <span className="text-sm text-[#536174]">
              {visibleConnections.length}件
            </span>
          </div>
          <ul className="mt-4 grid gap-2">
            {visibleConnections.length === 0 ? (
              <li className="rounded-md bg-[#f6f7f9] px-3 py-3 text-sm text-[#536174]">
                まだ接続がありません
              </li>
            ) : (
              visibleConnections.map((connection) => (
                <li
                  key={connection.id}
                  className="grid gap-2 rounded-md bg-[#f6f7f9] px-3 py-3 md:grid-cols-[1fr_auto_1fr]"
                >
                  <strong>{connection.fromTech.name}</strong>
                  <span className="text-sm text-[#536174]">{connection.label}</span>
                  <strong>{connection.toTech.name}</strong>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}

function DataList({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[#d9dee7] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-sm text-[#536174]">{count}件</span>
      </div>
      <ul className="mt-4 grid max-h-72 gap-2 overflow-auto">
        {count === 0 ? (
          <li className="rounded-md bg-[#f6f7f9] px-3 py-3 text-sm text-[#536174]">
            データがありません
          </li>
        ) : (
          children
        )}
      </ul>
    </section>
  );
}
