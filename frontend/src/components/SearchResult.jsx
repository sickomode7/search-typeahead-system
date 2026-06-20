import React from 'react';

export default function SearchResult({ result }) {
  return (
    <div className="mt-4 p-4 bg-[#1a1a24] border border-green-500/30 rounded-lg text-green-400 text-center animate-pulse">
      {result.message || JSON.stringify(result)}
    </div>
  );
}
