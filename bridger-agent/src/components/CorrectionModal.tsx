"use client";

import { useQuery, useMutation, gql } from "@apollo/client";
import { useState } from "react";

const PAYEES_QUERY = gql`
  query Payees($clientId: Int!) {
    payees(clientId: $clientId) {
      id
      name
    }
  }
`;

const CATEGORIES_QUERY = gql`
  query Categories($clientId: Int!) {
    categories(clientId: $clientId) {
      id
      name
    }
  }
`;

const ACCOUNTS_FOR_PAIR_QUERY = gql`
  query AccountsForPair($clientId: Int!) {
    accounts(clientId: $clientId) {
      id
      name
    }
  }
`;

const TRANSACTIONS_FOR_PAIR_QUERY = gql`
  query TransactionsForPair($clientId: Int!, $accountId: Int) {
    transactions(clientId: $clientId, accountId: $accountId) {
      id
      bankDescription
      amount
      date
    }
  }
`;

const CORRECT_LABEL_MUTATION = gql`
  mutation CorrectLabel(
    $labelId: Int!
    $payeeId: Int
    $categories: [CategoryInput!]
    $txPairId: Int
  ) {
    correctLabel(
      labelId: $labelId
      payeeId: $payeeId
      categories: $categories
      txPairId: $txPairId
    ) {
      id
    }
  }
`;

interface ActiveLabel {
  id: number;
  isCorrect: boolean | null;
  payee: { id: number; name: string } | null;
  categorization: Array<{
    id: number;
    category: { id: number; name: string };
    amount: number;
  }>;
  txPair: { id: number; bankDescription: string; amount: number } | null;
}

interface Props {
  labelId: number;
  currentLabel: ActiveLabel;
  clientId: number;
  transactionId: number;
  transactionAccountId: number;
  transactionAmount: number;
  onClose: () => void;
  onCorrected: () => void;
}

interface CategoryRow {
  qbCategoryId: number | null;
  amount: string;
}

export function CorrectionModal({
  labelId,
  currentLabel,
  clientId,
  transactionId,
  transactionAccountId,
  transactionAmount,
  onClose,
  onCorrected,
}: Props) {
  const [type, setType] = useState<"standard" | "pair">(
    currentLabel.txPair ? "pair" : "standard"
  );
  const [payeeId, setPayeeId] = useState<number | null>(null);
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([
    { qbCategoryId: null, amount: "" },
  ]);
  const [pairAccountId, setPairAccountId] = useState<number | null>(null);
  const [txPairId, setTxPairId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { data: payeesData } = useQuery(PAYEES_QUERY, {
    variables: { clientId },
  });
  const { data: categoriesData } = useQuery(CATEGORIES_QUERY, {
    variables: { clientId },
  });
  const { data: accountsData } = useQuery(ACCOUNTS_FOR_PAIR_QUERY, {
    variables: { clientId },
    skip: type !== "pair",
  });
  const { data: txData } = useQuery(TRANSACTIONS_FOR_PAIR_QUERY, {
    variables: { clientId, accountId: pairAccountId },
    skip: type !== "pair" || !pairAccountId,
  });

  const [correctLabelMutation, { loading }] = useMutation(
    CORRECT_LABEL_MUTATION
  );

  const payeesList: Array<{ id: number; name: string }> =
    payeesData?.payees ?? [];
  const categoriesList: Array<{ id: number; name: string }> =
    categoriesData?.categories ?? [];
  const pairAccountsList: Array<{ id: number; name: string }> = (
    accountsData?.accounts ?? []
  ).filter((a: { id: number }) => a.id !== transactionAccountId);
  const transactionsList: Array<{
    id: number;
    bankDescription: string;
    amount: number;
    date: string;
  }> = (txData?.transactions ?? []).filter(
    (t: { id: number }) => t.id !== transactionId
  );

  const validCategories = categoryRows.filter(
    (r) => r.qbCategoryId != null && r.amount
  );
  const categorySum = validCategories.reduce(
    (sum, r) => sum + Math.round(parseFloat(r.amount) * 100),
    0
  );
  const hasSumMismatch =
    validCategories.length > 0 &&
    categorySum !== Math.abs(transactionAmount);

  const addCategoryRow = () => {
    setCategoryRows([...categoryRows, { qbCategoryId: null, amount: "" }]);
  };

  const removeCategoryRow = (index: number) => {
    setCategoryRows(categoryRows.filter((_, i) => i !== index));
  };

  const updateCategoryRow = (
    index: number,
    field: keyof CategoryRow,
    value: string | number | null
  ) => {
    setCategoryRows(
      categoryRows.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    );
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    let variables: Record<string, unknown>;

    if (type === "standard") {
      if (!payeeId) return;
      const validCategories = categoryRows
        .filter((r) => r.qbCategoryId != null && r.amount)
        .map((r) => ({
          qbCategoryId: r.qbCategoryId!,
          amount: Math.round(parseFloat(r.amount) * 100),
        }));

      if (validCategories.length > 0) {
        const sum = validCategories.reduce((s, c) => s + c.amount, 0);
        if (sum !== Math.abs(transactionAmount)) {
          setSubmitError(
            `Category amounts must sum to ${formatAmount(Math.abs(transactionAmount))}, but currently total ${formatAmount(sum)}.`
          );
          return;
        }
      }

      variables = {
        labelId,
        payeeId,
        categories: validCategories.length > 0 ? validCategories : null,
      };
    } else {
      if (!txPairId) return;
      variables = { labelId, txPairId };
    }

    try {
      const { errors } = await correctLabelMutation({
        variables,
        errorPolicy: "all",
      });

      if (errors && errors.length > 0) {
        setSubmitError(errors[0].message);
        return;
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      return;
    }

    onCorrected();
  };

  const formatAmount = (cents: number) =>
    `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Correct Label
          </h2>
        </div>

        <div className="px-6 py-4 space-y-5">
          {/* Current label summary */}
          <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900 space-y-1">
            <p className="font-medium text-gray-500 text-xs uppercase tracking-wide">
              Current Label
            </p>
            {currentLabel.payee && (
              <p>
                <span className="text-gray-500">Payee:</span>{" "}
                {currentLabel.payee.name}
              </p>
            )}
            {currentLabel.categorization.length > 0 && (
              <p>
                <span className="text-gray-500">Categories:</span>{" "}
                {currentLabel.categorization
                  .map(
                    (c) =>
                      `${c.category.name} (${formatAmount(c.amount)})`
                  )
                  .join(", ")}
              </p>
            )}
            {currentLabel.txPair && (
              <p>
                <span className="text-gray-500">Pair:</span>{" "}
                {currentLabel.txPair.bankDescription} (
                {formatAmount(currentLabel.txPair.amount)})
              </p>
            )}
          </div>

          {/* Type toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Label Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-gray-900 cursor-pointer">
                <input
                  type="radio"
                  name="labelType"
                  checked={type === "standard"}
                  onChange={() => setType("standard")}
                  className="text-blue-600"
                />
                Standard
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-900 cursor-pointer">
                <input
                  type="radio"
                  name="labelType"
                  checked={type === "pair"}
                  onChange={() => setType("pair")}
                  className="text-blue-600"
                />
                Pair
              </label>
            </div>
          </div>

          {type === "standard" ? (
            <>
              {/* Payee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payee
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={payeeId ?? ""}
                  onChange={(e) =>
                    setPayeeId(
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                >
                  <option value="">Select payee...</option>
                  {payeesList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Categories */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categories
                </label>
                <div className="space-y-2">
                  {categoryRows.map((row, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <select
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={row.qbCategoryId ?? ""}
                        onChange={(e) =>
                          updateCategoryRow(
                            i,
                            "qbCategoryId",
                            e.target.value
                              ? Number(e.target.value)
                              : null
                          )
                        }
                      >
                        <option value="">Select category...</option>
                        {categoriesList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          className="w-28 pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          value={row.amount}
                          onChange={(e) =>
                            updateCategoryRow(i, "amount", e.target.value)
                          }
                        />
                      </div>
                      {categoryRows.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCategoryRow(i)}
                          className="p-1.5 text-gray-400 hover:text-red-500"
                          title="Remove"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addCategoryRow}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add category
                </button>
                {hasSumMismatch && (
                  <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <svg
                      className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="text-sm">
                      <p className="font-medium text-red-800">
                        Amounts don&apos;t add up
                      </p>
                      <p className="text-red-700 mt-0.5">
                        Category amounts must sum to{" "}
                        <span className="font-semibold">
                          {formatAmount(Math.abs(transactionAmount))}
                        </span>
                        . Current total:{" "}
                        <span className="font-semibold">
                          {formatAmount(categorySum)}
                        </span>
                        .
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Pair: account then transaction selector */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={pairAccountId ?? ""}
                  onChange={(e) => {
                    setPairAccountId(
                      e.target.value ? Number(e.target.value) : null
                    );
                    setTxPairId(null);
                  }}
                >
                  <option value="">Select account...</option>
                  {pairAccountsList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                {accountsData && pairAccountsList.length === 0 && (
                  <p className="mt-1 text-xs text-gray-500">
                    No other accounts available to pair with.
                  </p>
                )}
              </div>

              {pairAccountId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Paired Transaction
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={txPairId ?? ""}
                    onChange={(e) =>
                      setTxPairId(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  >
                    <option value="">Select transaction...</option>
                    {transactionsList.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.bankDescription} — {formatAmount(t.amount)} —{" "}
                        {new Date(t.date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                  {txData && transactionsList.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">
                      No transactions in this account to pair with.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 space-y-3">
          {submitError && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <svg
                className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm text-red-700">{submitError}</p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={
                loading ||
                (type === "standard" && !payeeId) ||
                (type === "standard" && hasSumMismatch) ||
                (type === "pair" && !txPairId)
              }
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Submitting..." : "Submit Correction"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
