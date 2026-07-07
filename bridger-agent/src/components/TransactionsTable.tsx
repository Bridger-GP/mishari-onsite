"use client";

import { useQuery, gql } from "@apollo/client";
import { useState, useMemo } from "react";
import { BulkApproveBar } from "./BulkApproveBar";
import { CorrectionModal } from "./CorrectionModal";

const TRANSACTIONS_QUERY = gql`
  query Transactions($clientId: Int!, $accountId: Int) {
    transactions(clientId: $clientId, accountId: $accountId) {
      id
      amount
      date
      bankDescription
      account {
        id
        name
      }
      activeLabel {
        id
        isCorrect
        payee {
          id
          name
        }
        categorization {
          id
          category {
            id
            name
          }
          amount
        }
        txPair {
          id
          bankDescription
          amount
        }
      }
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

interface Transaction {
  id: number;
  amount: number;
  date: string;
  bankDescription: string;
  account: { id: number; name: string };
  activeLabel: ActiveLabel | null;
}

interface Props {
  clientId: number;
  accountId: number | null;
}

function formatAmount(cents: number): string {
  const abs = Math.abs(cents);
  const formatted = `$${(abs / 100).toFixed(2)}`;
  return cents < 0 ? `-${formatted}` : formatted;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ label }: { label: ActiveLabel | null }) {
  if (!label) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Unlabeled
      </span>
    );
  }
  if (label.isCorrect === true) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Approved
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      Pending
    </span>
  );
}

export function TransactionsTable({ clientId, accountId }: Props) {
  const { data, loading, refetch } = useQuery(TRANSACTIONS_QUERY, {
    variables: { clientId, accountId },
  });
  const [selectedTxIds, setSelectedTxIds] = useState<Set<number>>(new Set());
  const [correctingTx, setCorrectingTx] = useState<Transaction | null>(null);

  const transactions: Transaction[] = data?.transactions ?? [];

  const approvableTxs = useMemo(
    () =>
      transactions.filter(
        (tx) => tx.activeLabel && tx.activeLabel.isCorrect !== true
      ),
    [transactions]
  );

  const selectedLabelIds = useMemo(
    () =>
      transactions
        .filter(
          (tx) =>
            selectedTxIds.has(tx.id) &&
            tx.activeLabel &&
            tx.activeLabel.isCorrect !== true
        )
        .map((tx) => tx.activeLabel!.id),
    [transactions, selectedTxIds]
  );

  const allSelected =
    approvableTxs.length > 0 &&
    approvableTxs.every((tx) => selectedTxIds.has(tx.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedTxIds(new Set());
    } else {
      setSelectedTxIds(new Set(approvableTxs.map((tx) => tx.id)));
    }
  };

  const toggleOne = (id: number) => {
    setSelectedTxIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApproved = () => {
    setSelectedTxIds(new Set());
    refetch();
  };

  const handleCorrected = () => {
    setCorrectingTx(null);
    refetch();
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500 py-8 text-center">
        Loading transactions...
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-8 text-center">
        No transactions found.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <BulkApproveBar
        selectedLabelIds={selectedLabelIds}
        onApproved={handleApproved}
      />

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  className="rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Payee
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categories
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.map((tx) => {
              const label = tx.activeLabel;
              const isApprovable = label && label.isCorrect !== true;

              return (
                <tr
                  key={tx.id}
                  className={
                    selectedTxIds.has(tx.id) ? "bg-blue-50" : "hover:bg-gray-50"
                  }
                >
                  <td className="px-3 py-3 text-center">
                    {isApprovable ? (
                      <input
                        type="checkbox"
                        checked={selectedTxIds.has(tx.id)}
                        onChange={() => toggleOne(tx.id)}
                        className="rounded border-gray-300"
                      />
                    ) : (
                      <input
                        type="checkbox"
                        disabled
                        className="rounded border-gray-200 opacity-40"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {formatDate(tx.date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                    {tx.bankDescription}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-mono whitespace-nowrap">
                    <span className={tx.amount < 0 ? "text-red-600" : "text-green-700"}>
                      {formatAmount(tx.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {label?.txPair ? (
                      <span className="text-purple-600 italic">
                        Pair: {label.txPair.bankDescription}
                      </span>
                    ) : (
                      label?.payee?.name ?? (
                        <span className="text-gray-400">—</span>
                      )
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {label?.txPair ? (
                      <span className="text-gray-400">—</span>
                    ) : label?.categorization.length ? (
                      <div className="flex flex-wrap gap-1">
                        {label.categorization.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700"
                          >
                            {c.category.name}{" "}
                            <span className="ml-1 text-gray-400">
                              {formatAmount(c.amount)}
                            </span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge label={label} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {label && (
                      <button
                        onClick={() => setCorrectingTx(tx)}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Correct
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {correctingTx?.activeLabel && (
        <CorrectionModal
          labelId={correctingTx.activeLabel.id}
          currentLabel={correctingTx.activeLabel}
          clientId={clientId}
          transactionId={correctingTx.id}
          onClose={() => setCorrectingTx(null)}
          onCorrected={handleCorrected}
        />
      )}
    </div>
  );
}
