"use client";

import { useMutation, gql } from "@apollo/client";

const BULK_APPROVE_MUTATION = gql`
  mutation BulkApproveLabels($labelIds: [Int!]!) {
    bulkApproveLabels(labelIds: $labelIds)
  }
`;

interface Props {
  selectedLabelIds: number[];
  onApproved: () => void;
}

export function BulkApproveBar({ selectedLabelIds, onApproved }: Props) {
  const [bulkApprove, { loading }] = useMutation(BULK_APPROVE_MUTATION);

  if (selectedLabelIds.length === 0) return null;

  const handleApprove = async () => {
    await bulkApprove({ variables: { labelIds: selectedLabelIds } });
    onApproved();
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
      <span className="text-sm text-blue-800">
        {selectedLabelIds.length} transaction
        {selectedLabelIds.length !== 1 ? "s" : ""} selected
      </span>
      <button
        onClick={handleApprove}
        disabled={loading}
        className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Approving..." : "Approve Selected"}
      </button>
    </div>
  );
}
