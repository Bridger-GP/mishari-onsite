"use client";

import { useQuery, gql } from "@apollo/client";

const ACCOUNTS_QUERY = gql`
  query Accounts($clientId: Int!) {
    accounts(clientId: $clientId) {
      id
      name
    }
  }
`;

interface Props {
  clientId: number;
  selectedAccountId: number | null;
  onSelect: (id: number | null) => void;
}

export function AccountSelector({
  clientId,
  selectedAccountId,
  onSelect,
}: Props) {
  const { data } = useQuery(ACCOUNTS_QUERY, { variables: { clientId } });

  const accounts: Array<{ id: number; name: string }> = data?.accounts ?? [];

  return (
    <div className="max-w-xs">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Account
      </label>
      <select
        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
        value={selectedAccountId ?? ""}
        onChange={(e) =>
          onSelect(e.target.value ? Number(e.target.value) : null)
        }
      >
        <option value="">All Accounts</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
    </div>
  );
}
