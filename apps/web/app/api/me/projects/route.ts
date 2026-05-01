import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/app/lib/db";

function optionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const projects = await prisma.project.findMany({
    where: { userId },
    include: { user: true },
    orderBy: { title: "asc" },
  });

  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const body = await request.json();
  const title = optionalText(body.title);

  if (!title) {
    return NextResponse.json(
      { error: "プロジェクト名が必要です" },
      { status: 400 },
    );
  }

  const project = await prisma.project.create({
    data: {
      title,
      description: optionalText(body.description),
      period: optionalText(body.period),
      githubUrl: optionalText(body.githubUrl),
      userId,
    },
    include: { user: true },
  });

  return NextResponse.json(project, { status: 201 });
}
