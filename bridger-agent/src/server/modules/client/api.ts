import { prisma } from "@/lib/db";

export const clients = async (
  _: unknown,
  { search }: { search?: string }
) => {
  return prisma.client.findMany({
    where: search
      ? { name: { contains: search } }
      : undefined,
    orderBy: { name: "asc" },
  });
};
