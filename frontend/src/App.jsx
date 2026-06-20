import React from 'react';
import SearchBox from './components/SearchBox';
import TrendingSection from './components/TrendingSection';

function App() {
  return (
    <div className="min-h-screen bg-darkBg text-white flex flex-col items-center py-20 px-4">
      <div className="w-full max-w-2xl text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 tracking-wide text-neonAccent">Nexus Store</h1>
        <p className="text-gray-400">Discover your next adventure</p>
      </div>
      
      <div className="w-full max-w-2xl">
        <SearchBox />
        <TrendingSection />
      </div>
    </div>
  );
}

export default App;
