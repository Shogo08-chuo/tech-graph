import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

const DEFAULT_CONNECTION_LABEL = "関連";

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function connectionLabel(value: unknown) {
  return optionalText(value) ?? DEFAULT_CONNECTION_LABEL;
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const connections = await prisma.connection.findMany({
    where: {
      project: { userId },
    },
    include: {
      fromTech: true,
      toTech: true,
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json(connections);
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();
  const projectId = optionalText(body.projectId);
  const fromTechId = optionalText(body.fromTechId);
  const toTechId = optionalText(body.toTechId);

  if (!projectId || !fromTechId || !toTechId) {
    return NextResponse.json(
      { error: "projectId, fromTechId, toTechId が必要です" },
      { status: 400 },
    );
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
  });

  if (!project) {
    return NextResponse.json(
      { error: "自分のプロジェクトを選択してください" },
      { status: 404 },
    );
  }

  const connection = await prisma.connection.create({
    data: {
      projectId,
      fromTechId,
      toTechId,
      label: connectionLabel(body.label),
      description: optionalText(body.description),
    },
    include: {
      fromTech: true,
      toTech: true,
    },
  });

  return NextResponse.json(connection, { status: 201 });
}
