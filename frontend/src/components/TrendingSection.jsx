import React, { useState, useEffect } from 'react';

export default function TrendingSection() {
  const [trending, setTrending] = useState([]);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const res = await fetch('/trending');
        if (res.ok) {
          const data = await res.json();
          setTrending(data.trending || []);
        }
      } catch (err) {
        console.error('Failed to fetch trending', err);
      }
    };

    fetchTrending();
    const interval = setInterval(fetchTrending, 30000);
    return () => clearInterval(interval);
  }, []);

  if (trending.length === 0) return null;

  return (
    <div className="mt-8 text-left">
      <h2 className="text-lg text-gray-400 mb-4 flex items-center">
        <span className="text-orange-500 mr-2">🔥</span> Trending Searches
      </h2>
      <div className="flex flex-wrap gap-3">
        {trending.map((item) => (
          <button
            key={item.query}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('fill-search', { detail: item.query }));
            }}
            className="px-4 py-2 rounded-full bg-[#1a1a24] border border-gray-700 hover:border-neonAccent text-sm text-gray-300 transition-colors cursor-pointer"
          >
            {item.query}
          </button>
        ))}
      </div>
    </div>
  );
}
