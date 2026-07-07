import { prisma } from "@/lib/db";

export const accounts = async (
  _: unknown,
  { clientId }: { clientId: number }
) => {
  return prisma.account.findMany({
    where: { clientId },
    orderBy: { name: "asc" },
  });
};

export const transactions = async (
  _: unknown,
  { clientId, accountId }: { clientId: number; accountId?: number }
) => {
  const rows = await prisma.transaction.findMany({
    where: {
      clientId,
      ...(accountId != null ? { accountId } : {}),
    },
    include: {
      account: true,
      labels: {
        where: { correctedLabelId: null },
        include: {
          payee: true,
          categorization: { include: { qbCategory: true } },
          txPair: true,
        },
      },
    },
    orderBy: { date: "desc" },
  });

  return rows.map((tx) => ({
    ...tx,
    date: tx.date.toISOString(),
    activeLabel: tx.labels[0]
      ? {
          ...tx.labels[0],
          categorization: tx.labels[0].categorization.map((cl) => ({
            ...cl,
            category: cl.qbCategory,
          })),
        }
      : null,
  }));
};

export const payees = async (
  _: unknown,
  { clientId }: { clientId: number }
) => {
  return prisma.qbPayee.findMany({
    where: { clientId },
    orderBy: { name: "asc" },
  });
};

export const categories = async (
  _: unknown,
  { clientId }: { clientId: number }
) => {
  return prisma.qbCategory.findMany({
    where: { clientId },
    orderBy: { name: "asc" },
  });
};

export const bulkApproveLabels = async (
  _: unknown,
  { labelIds }: { labelIds: number[] }
) => {
  const result = await prisma.transactionLabel.updateMany({
    where: { id: { in: labelIds } },
    data: { isCorrect: true },
  });
  return result.count;
};

export const correctLabel = async (
  _: unknown,
  args: {
    labelId: number;
    payeeId?: number;
    categories?: Array<{ qbCategoryId: number; amount: number }>;
    txPairId?: number;
  }
) => {
  const { labelId, payeeId, categories: cats, txPairId } = args;

  return prisma.$transaction(async (tx) => {
    const oldLabel = await tx.transactionLabel.findUniqueOrThrow({
      where: { id: labelId },
    });

    const newLabel = await tx.transactionLabel.create({
      data: {
        transactionId: oldLabel.transactionId,
        payeeId: txPairId ? null : (payeeId ?? null),
        txPairId: txPairId ?? null,
        categorization: cats?.length
          ? {
              create: cats.map((c) => ({
                qbCategoryId: c.qbCategoryId,
                amount: c.amount,
              })),
            }
          : undefined,
      },
      include: {
        payee: true,
        categorization: { include: { qbCategory: true } },
        txPair: true,
      },
    });

    await tx.transactionLabel.update({
      where: { id: labelId },
      data: { isCorrect: false, correctedLabelId: newLabel.id },
    });

    return {
      ...newLabel,
      categorization: newLabel.categorization.map((cl) => ({
        ...cl,
        category: cl.qbCategory,
      })),
    };
  });
};
