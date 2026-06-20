import React, { useState, useEffect, useRef } from 'react';
import SuggestionDropdown from './SuggestionDropdown';
import SearchResult from './SearchResult';

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searchResult, setSearchResult] = useState(null);
  
  const abortControllerRef = useRef(null);

  useEffect(() => {
    const handleFillSearch = (e) => {
      setQuery(e.detail);
      executeSearch(e.detail);
    };
    window.addEventListener('fill-search', handleFillSearch);
    return () => window.removeEventListener('fill-search', handleFillSearch);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(() => {
      fetchSuggestions(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const fetchSuggestions = async (q) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Set a timeout of 2 seconds
    const timeoutId = setTimeout(() => abortControllerRef.current.abort(), 2000);
    
    setIsLoading(true);
    setError(null);
    setShowDropdown(true);

    try {
      const response = await fetch(`/suggest?q=${encodeURIComponent(q)}`, {
        signal: abortControllerRef.current.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError("Couldn't load suggestions");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const executeSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;
    
    setQuery(searchQuery);
    setShowDropdown(false);
    setSearchResult(null);
    
    try {
      const response = await fetch('/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery })
      });
      const data = await response.json();
      setSearchResult(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || suggestions.length === 0) {
        if (e.key === 'Enter') executeSearch(query);
        return;
    }
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        executeSearch(suggestions[activeIndex].query);
      } else {
        executeSearch(query);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center bg-[#1a1a24] rounded-lg border border-gray-700 focus-within:border-neonAccent overflow-hidden shadow-lg transition-colors">
        <input
          type="text"
          className="flex-grow bg-transparent text-white px-4 py-3 outline-none placeholder-gray-500"
          placeholder="Search games, genres, publishers..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
            setSearchResult(null);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (query.trim()) setShowDropdown(true); }}
          onBlur={() => { setTimeout(() => setShowDropdown(false), 200); }}
        />
        <button
          onClick={() => executeSearch(query)}
          className="bg-neonAccent text-black font-bold px-6 py-3 hover:bg-[#00b0d4] transition-colors"
        >
          SEARCH
        </button>
      </div>

      {showDropdown && (
        <SuggestionDropdown
          suggestions={suggestions}
          isLoading={isLoading}
          error={error}
          activeIndex={activeIndex}
          prefix={query}
          onSelect={(q) => executeSearch(q)}
        />
      )}

      {searchResult && <SearchResult result={searchResult} />}
    </div>
  );
}
