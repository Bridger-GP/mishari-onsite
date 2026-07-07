import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Amounts are stored as integer cents. Money leaving an account is negative
 * (expenses, bill payments); money arriving is positive (deposits, refunds).
 *
 * A TransactionLabel is about the bank Transaction referenced by `transaction`
 * (`transactionId`). When that transaction is part of a matched pair — two
 * transactions that offset each other, such as a transfer between the client's
 * own accounts — `txPair` points at the other transaction in the pair. A paired
 * label has no payee and no category: the pair nets to zero, so it books nothing
 * to the P&L and only records the match. Every label here has `isCorrect = null`
 * (not yet reviewed for correctness), so `incorrectReason` and `correctedLabel`
 * stay null as well.
 */

async function reset() {
  // Delete children before parents to satisfy foreign-key constraints.
  await prisma.categoryLabel.deleteMany();
  await prisma.transactionLabel.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.qbPayee.deleteMany();
  await prisma.qbCategory.deleteMany();
  await prisma.account.deleteMany();
  await prisma.client.deleteMany();
}

type CategorySpec = { key: string; name: string; qbId: string };
type PayeeSpec = { key: string; name: string; qbId: string | null };

async function createClient(spec: {
  name: string;
  qbId: string;
  accounts: { name: string; qbId: string }[];
  categories: CategorySpec[];
  payees: PayeeSpec[];
}) {
  const client = await prisma.client.create({
    data: { name: spec.name, qbId: spec.qbId },
  });

  const accounts = await Promise.all(
    spec.accounts.map((a) =>
      prisma.account.create({
        data: { name: a.name, qbId: a.qbId, clientId: client.id },
      })
    )
  );

  const categories: Record<string, number> = {};
  for (const c of spec.categories) {
    const created = await prisma.qbCategory.create({
      data: { name: c.name, qbId: c.qbId, clientId: client.id },
    });
    categories[c.key] = created.id;
  }

  const payees: Record<string, number> = {};
  for (const p of spec.payees) {
    const created = await prisma.qbPayee.create({
      data: { name: p.name, qbId: p.qbId, clientId: client.id },
    });
    payees[p.key] = created.id;
  }

  return { client, accounts, categories, payees };
}

async function main() {
  await reset();

  // ---------------------------------------------------------------------------
  // Client 1 — 2 accounts. Showcases a simple single-category label and a split
  // label (one transaction categorized across multiple categories), plus a
  // brand-new payee that has no QuickBooks id yet.
  // ---------------------------------------------------------------------------
  const acme = await createClient({
    name: "Acme Coffee Roasters",
    qbId: "QB-CLIENT-ACME",
    accounts: [
      { name: "Business Checking", qbId: "QB-ACCT-ACME-CHK" },
      { name: "Business Credit Card", qbId: "QB-ACCT-ACME-CC" },
    ],
    categories: [
      { key: "supplies", name: "Office Supplies", qbId: "QB-CAT-ACME-SUP" },
      { key: "cogs", name: "Cost of Goods Sold", qbId: "QB-CAT-ACME-COGS" },
      { key: "meals", name: "Meals & Entertainment", qbId: "QB-CAT-ACME-MEALS" },
    ],
    payees: [
      { key: "staples", name: "Staples", qbId: "QB-PAYEE-ACME-STAPLES" },
      { key: "greenmtn", name: "Green Mountain Beans", qbId: "QB-PAYEE-ACME-GMB" },
      // New payee: created locally, not yet synced to QuickBooks (no qbId).
      { key: "cornerbakery", name: "Corner Bakery", qbId: null },
    ],
  });

  // Simple label: one transaction, one category.
  const acmeSupplies = await prisma.transaction.create({
    data: {
      amount: -12500,
      date: new Date("2026-06-03"),
      bankDescription: "STAPLES #1234 PURCHASE",
      accountId: acme.accounts[1].id,
      clientId: acme.client.id,
      qbId: "QB-TXN-ACME-1",
    },
  });
  await prisma.transactionLabel.create({
    data: {
      payeeId: acme.payees.staples,
      transactionId: acmeSupplies.id,
      isCorrect: null,
      categorization: {
        create: [{ qbCategoryId: acme.categories.supplies, amount: -12500 }],
      },
    },
  });

  // Split label: a single Costco run split across two categories. The category
  // label amounts sum to the transaction amount.
  const acmeCostco = await prisma.transaction.create({
    data: {
      amount: -30000,
      date: new Date("2026-06-05"),
      bankDescription: "COSTCO WHOLESALE #55",
      accountId: acme.accounts[0].id,
      clientId: acme.client.id,
      qbId: "QB-TXN-ACME-2",
    },
  });
  await prisma.transactionLabel.create({
    data: {
      payeeId: acme.payees.cornerbakery, // labeled against the new (no-qbId) payee
      transactionId: acmeCostco.id,
      isCorrect: null,
      categorization: {
        create: [
          { qbCategoryId: acme.categories.cogs, amount: -20000 },
          { qbCategoryId: acme.categories.supplies, amount: -10000 },
        ],
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Client 2 — 3 accounts. Showcases a matched pair: a transfer between the
  // client's own accounts. The two transactions offset each other, so a paired
  // label has no payee and no category — it only links to the other side via
  // `txPair`.
  // ---------------------------------------------------------------------------
  const blueRidge = await createClient({
    name: "Blue Ridge Consulting",
    qbId: "QB-CLIENT-BLUERIDGE",
    accounts: [
      { name: "Operating Checking", qbId: "QB-ACCT-BR-CHK" },
      { name: "Payroll Checking", qbId: "QB-ACCT-BR-PAY" },
      { name: "Amex Corporate", qbId: "QB-ACCT-BR-AMEX" },
    ],
    categories: [
      { key: "software", name: "Software Subscriptions", qbId: "QB-CAT-BR-SW" },
      { key: "contractors", name: "Contractor Expense", qbId: "QB-CAT-BR-CONTRACT" },
    ],
    payees: [
      { key: "aws", name: "Amazon Web Services", qbId: "QB-PAYEE-BR-AWS" },
      { key: "acmedesign", name: "Acme Design Studio", qbId: "QB-PAYEE-BR-DESIGN" },
    ],
  });

  // The two bank transactions that form the matched pair: money leaving the
  // operating account and the same amount arriving in payroll. Both are created
  // first so each label can reference the other transaction via `txPair`.
  const brTransferOut = await prisma.transaction.create({
    data: {
      amount: -200000,
      date: new Date("2026-06-10"),
      bankDescription: "TRANSFER TO PAYROLL ACCT",
      accountId: blueRidge.accounts[0].id,
      clientId: blueRidge.client.id,
      qbId: "QB-TXN-BR-XFER-OUT",
    },
  });
  const brTransferIn = await prisma.transaction.create({
    data: {
      amount: 200000,
      date: new Date("2026-06-10"),
      bankDescription: "TRANSFER FROM OPERATING ACCT",
      accountId: blueRidge.accounts[1].id,
      clientId: blueRidge.client.id,
      qbId: "QB-TXN-BR-XFER-IN",
    },
  });

  // Each side's label: about its own transaction, paired with the other. A pair
  // is a self-offsetting transfer, so neither label has a payee or a category.
  await prisma.transactionLabel.create({
    data: {
      payeeId: null,
      transactionId: brTransferOut.id,
      txPairId: brTransferIn.id,
      isCorrect: null,
    },
  });
  await prisma.transactionLabel.create({
    data: {
      payeeId: null,
      transactionId: brTransferIn.id,
      txPairId: brTransferOut.id,
      isCorrect: null,
    },
  });

  // A plain software-subscription charge on the Amex.
  const brAws = await prisma.transaction.create({
    data: {
      amount: -8200,
      date: new Date("2026-06-15"),
      bankDescription: "AWS EMEA BILLING",
      accountId: blueRidge.accounts[2].id,
      clientId: blueRidge.client.id,
      qbId: "QB-TXN-BR-AWS",
    },
  });
  await prisma.transactionLabel.create({
    data: {
      payeeId: blueRidge.payees.aws,
      transactionId: brAws.id,
      isCorrect: null,
      categorization: {
        create: [{ qbCategoryId: blueRidge.categories.software, amount: -8200 }],
      },
    },
  });

  // ---------------------------------------------------------------------------
  // Client 3 — 4 accounts. Showcases a three-way split and a second new payee
  // that has no QuickBooks id.
  // ---------------------------------------------------------------------------
  const copperline = await createClient({
    name: "Copperline Construction",
    qbId: "QB-CLIENT-COPPERLINE",
    accounts: [
      { name: "Main Checking", qbId: "QB-ACCT-CL-CHK" },
      { name: "Equipment Loan", qbId: "QB-ACCT-CL-LOAN" },
      { name: "Fuel Card", qbId: "QB-ACCT-CL-FUEL" },
      { name: "Money Market", qbId: "QB-ACCT-CL-MM" },
    ],
    categories: [
      { key: "materials", name: "Job Materials", qbId: "QB-CAT-CL-MAT" },
      { key: "fuel", name: "Fuel", qbId: "QB-CAT-CL-FUEL" },
      { key: "equipment", name: "Equipment Rental", qbId: "QB-CAT-CL-EQUIP" },
      { key: "permits", name: "Permits & Fees", qbId: "QB-CAT-CL-PERMIT" },
    ],
    payees: [
      { key: "homedepot", name: "Home Depot", qbId: "QB-PAYEE-CL-HD" },
      { key: "sunbelt", name: "Sunbelt Rentals", qbId: "QB-PAYEE-CL-SUN" },
      // Second new payee with no QuickBooks id.
      { key: "citypermits", name: "City Permit Office", qbId: null },
    ],
  });

  // Three-way split: a big-box run covering materials, equipment, and permits.
  const clSupply = await prisma.transaction.create({
    data: {
      amount: -125000,
      date: new Date("2026-06-18"),
      bankDescription: "HOME DEPOT PRO #6620",
      accountId: copperline.accounts[0].id,
      clientId: copperline.client.id,
      qbId: "QB-TXN-CL-1",
    },
  });
  await prisma.transactionLabel.create({
    data: {
      payeeId: copperline.payees.homedepot,
      transactionId: clSupply.id,
      isCorrect: null,
      categorization: {
        create: [
          { qbCategoryId: copperline.categories.materials, amount: -80000 },
          { qbCategoryId: copperline.categories.equipment, amount: -30000 },
          { qbCategoryId: copperline.categories.permits, amount: -15000 },
        ],
      },
    },
  });

  // A permit fee labeled against the new (no-qbId) payee.
  const clPermit = await prisma.transaction.create({
    data: {
      amount: -9000,
      date: new Date("2026-06-20"),
      bankDescription: "CITY OF DURHAM PERMIT FEE",
      accountId: copperline.accounts[0].id,
      clientId: copperline.client.id,
      qbId: "QB-TXN-CL-2",
    },
  });
  await prisma.transactionLabel.create({
    data: {
      payeeId: copperline.payees.citypermits,
      transactionId: clPermit.id,
      isCorrect: null,
      categorization: {
        create: [{ qbCategoryId: copperline.categories.permits, amount: -9000 }],
      },
    },
  });

  // A fuel-card charge.
  const clFuel = await prisma.transaction.create({
    data: {
      amount: -14500,
      date: new Date("2026-06-22"),
      bankDescription: "SUNBELT EQUIP RENTAL",
      accountId: copperline.accounts[2].id,
      clientId: copperline.client.id,
      qbId: "QB-TXN-CL-3",
    },
  });
  await prisma.transactionLabel.create({
    data: {
      payeeId: copperline.payees.sunbelt,
      transactionId: clFuel.id,
      isCorrect: null,
      categorization: {
        create: [{ qbCategoryId: copperline.categories.fuel, amount: -14500 }],
      },
    },
  });

  const [clients, accounts, transactions, labels, categoryLabels, payees] =
    await Promise.all([
      prisma.client.count(),
      prisma.account.count(),
      prisma.transaction.count(),
      prisma.transactionLabel.count(),
      prisma.categoryLabel.count(),
      prisma.qbPayee.count(),
    ]);

  console.log("Seed complete:");
  console.log(`  clients:          ${clients}`);
  console.log(`  accounts:         ${accounts}`);
  console.log(`  transactions:     ${transactions}`);
  console.log(`  transactionLabels:${labels}`);
  console.log(`  categoryLabels:   ${categoryLabels}`);
  console.log(`  payees:           ${payees} (${await prisma.qbPayee.count({ where: { qbId: null } })} without qbId)`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
