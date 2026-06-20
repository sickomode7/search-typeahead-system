import React from 'react';

export default function SuggestionDropdown({ suggestions, isLoading, error, activeIndex, prefix, onSelect }) {
  if (error) {
    return (
      <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a24] border border-red-500 rounded-lg shadow-xl z-50 p-4 text-center text-red-400">
        {error}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a24] border border-gray-700 rounded-lg shadow-xl z-50 p-4 text-center text-gray-400 flex justify-center items-center">
        <svg className="animate-spin h-5 w-5 text-neonAccent mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Loading...
      </div>
    );
  }

  if (suggestions.length === 0) {
    return (
      <div className="absolute top-full left-0 w-full mt-2 bg-[#1a1a24] border border-gray-700 rounded-lg shadow-xl z-50 p-4 text-center text-gray-400">
        No suggestions found
      </div>
    );
  }

  const formatCount = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M searches';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k searches';
    return num + ' searches';
  };

  const highlightPrefix = (text, pre) => {
    const lowerText = text.toLowerCase();
    const lowerPre = pre.toLowerCase();
    const idx = lowerText.indexOf(lowerPre);
    
    if (idx === -1) return <span>{text}</span>;
    
    const before = text.substring(0, idx);
    const match = text.substring(idx, idx + pre.length);
    const after = text.substring(idx + pre.length);
    
    return (
      <span>
        {before}
        <span className="font-bold text-neonAccent">{match}</span>
        {after}
      </span>
    );
  };

  return (
    <ul className="absolute top-full left-0 w-full mt-2 bg-[#1a1a24] border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-gray-800">
      {suggestions.map((item, index) => {
        const isActive = index === activeIndex;
        return (
          <li
            key={item.query}
            className={`px-4 py-3 cursor-pointer flex justify-between items-center transition-colors ${
              isActive ? 'bg-[#2a2a36]' : 'hover:bg-[#2a2a36]'
            }`}
            onClick={() => onSelect(item.query)}
            onMouseDown={(e) => e.preventDefault()}
          >
            <div className="text-white">
              {highlightPrefix(item.query, prefix)}
            </div>
            <div className="text-xs text-gray-500">
              {formatCount(item.count)}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
