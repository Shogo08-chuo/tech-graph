import { z } from "zod";

// 新しい相関（線）を保存する時のバリデーションルール 
export const CreateConnectionSchema = z.object({
  projectId: z.string().uuid(),
  fromTechId: z.string().uuid(),
  toTechId: z.string().uuid(),
  label: z.string().min(1).max(50),
  description: z.string().max(200).optional(),
});

// 型としてエクスポート（フロント・バック両方で使える）
export type CreateConnectionInput = z.infer<typeof CreateConnectionSchema>;