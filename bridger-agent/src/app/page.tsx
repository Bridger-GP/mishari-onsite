"use client";

import { apolloClient } from "@/client/graphql/apollo-client";
import { ApolloProvider } from "@apollo/client";
import { useState } from "react";
import { ClientSelector } from "@/components/ClientSelector";
import { AccountSelector } from "@/components/AccountSelector";
import { TransactionsTable } from "@/components/TransactionsTable";

export default function Home() {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(
    null
  );

  return (
    <ApolloProvider client={apolloClient}>
      <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-geist-sans)]">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">
            Transaction Review
          </h1>

          <div className="space-y-6">
            <ClientSelector
              selectedClientId={selectedClientId}
              onSelect={(id) => {
                setSelectedClientId(id);
                setSelectedAccountId(null);
              }}
            />

            {selectedClientId != null && (
              <>
                <AccountSelector
                  clientId={selectedClientId}
                  selectedAccountId={selectedAccountId}
                  onSelect={setSelectedAccountId}
                />

                <TransactionsTable
                  clientId={selectedClientId}
                  accountId={selectedAccountId}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </ApolloProvider>
  );
}
