"use client";

import { useQuery, gql } from "@apollo/client";
import { useState, useRef, useEffect } from "react";

const CLIENTS_QUERY = gql`
  query Clients($search: String) {
    clients(search: $search) {
      id
      name
    }
  }
`;

interface Props {
  selectedClientId: number | null;
  onSelect: (id: number) => void;
}

export function ClientSelector({ selectedClientId, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedName, setSelectedName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery(CLIENTS_QUERY, {
    variables: { search: search || null },
  });

  const clients: Array<{ id: number; name: string }> = data?.clients ?? [];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative max-w-md">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Client
      </label>
      <input
        type="text"
        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
        placeholder="Search clients..."
        value={isOpen ? search : selectedName}
        onChange={(e) => {
          setSearch(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => {
          setSearch("");
          setIsOpen(true);
        }}
      />
      {isOpen && clients.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
          {clients.map((client) => (
            <li
              key={client.id}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 ${
                client.id === selectedClientId
                  ? "bg-blue-100 font-medium"
                  : ""
              }`}
              onClick={() => {
                onSelect(client.id);
                setSelectedName(client.name);
                setIsOpen(false);
              }}
            >
              {client.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
