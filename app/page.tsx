"use client";

import { useState } from "react";
import Logo, { SphereParameters } from "../components/Logo";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [generatedData, setGeneratedData] = useState<{ parameters: SphereParameters; critique: string[] } | null>(null);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    setSelectedTrack(null);
    setGeneratedData(null);

    try {
      // 本物のRender URL（h抜けスペル）に統合
      const response = await fetch(`https://songspere-api.onrender.com/search?q=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error("APIリクエストに失敗しました");

      const data = await response.json();
      const tracks = data.tracks || data.results || data || [];
      setSearchResults(Array.isArray(tracks) ? tracks : []);
    } catch (error) {
      console.error("検索エラー:", error);
      alert("検索中にエラーが発生しました。");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTrack) return;
    setIsGenerating(true);
    setGeneratedData(null);

    const trackId = selectedTrack.id || selectedTrack.trackId;
    const trackName = selectedTrack.name || selectedTrack.trackName;
    const artistName = selectedTrack.artist || selectedTrack.artistName;

    try {
      // 本物のRender URL（h抜けスペル）に統合
      const response = await fetch("https://songspere-api.onrender.com/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track_name: trackName,
          artist_name: artistName,
          itunes_track_id: String(trackId)
        }),
      });

      if (!response.ok) throw new Error("生成リクエストに失敗しました");

      const data = await response.json();
      setGeneratedData({
        parameters: data.parameters,
        critique: data.critique
      });

      setSearchResults([]);

    } catch (error) {
      console.error("生成エラー:", error);
      alert("スフィアの生成中にエラーが発生しました。");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-black">
      <div className="relative w-full max-w-2xl p-10 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col items-center">

        {!generatedData && (
          <>
            <div className="w-40 h-40 mb-6 drop-shadow-2xl">
              <Logo active={isSearching || isGenerating} />
            </div>

            <h1 className="text-4xl font-bold mb-3 tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-300">
              Songsphere
            </h1>
            <p className="text-white/60 text-sm mb-8 text-center leading-relaxed">
              楽曲の音響データを解析し、<br />音楽の結晶を生成します。
            </p>

            <div className="w-full space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="曲名やアーティスト名を入力"
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-sm disabled:opacity-50"
                  disabled={isSearching || isGenerating}
                />
                <button
                  onClick={handleSearch}
                  disabled={!searchQuery || isSearching || isGenerating}
                  className="bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl px-4 py-3 font-bold text-white transition-all active:scale-[0.95] disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
                >
                  {isSearching ? "検索中..." : "検索"}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="w-full bg-black/60 border border-white/10 rounded-xl overflow-hidden mt-2 max-h-48 overflow-y-auto custom-scrollbar">
                  {searchResults.map((track, index) => {
                    const trackId = track.id || track.trackId || index;
                    const trackName = track.name || track.trackName || "不明な曲名";
                    const artistName = track.artist || track.artistName || "不明なアーティスト";
                    const isSelected = selectedTrack && ((selectedTrack.id && selectedTrack.id === trackId) || (selectedTrack.trackId && selectedTrack.trackId === trackId));

                    return (
                      <button
                        key={trackId}
                        onClick={() => setSelectedTrack(track)}
                        className={`w-full text-left px-4 py-3 border-b border-white/5 last:border-b-0 hover:bg-white/10 transition-colors ${isSelected ? 'bg-purple-500/30' : ''}`}
                      >
                        <div className="text-white text-sm font-bold truncate">{trackName}</div>
                        <div className="text-white/50 text-xs truncate">{artistName}</div>
                      </button>
                    )
                  })}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={!selectedTrack || isGenerating}
                className="w-full mt-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-purple-800 disabled:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-5 py-4 font-bold text-white shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98]"
              >
                {isGenerating ? "スフィアを生成中..." : selectedTrack ? "この曲でスフィアを生成" : "曲を選択してください"}
              </button>
            </div>
          </>
        )}

        {generatedData && (
          <div className="w-full flex flex-col items-center animate-fade-in">
            <div className="w-64 h-64 md:w-80 md:h-80 mb-8 drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]">
              <Logo parameters={generatedData.parameters} />
            </div>

            <div className="w-full space-y-4">
              <h3 className="text-xl font-bold text-white mb-4 border-b border-white/20 pb-2">
                {selectedTrack?.name || selectedTrack?.trackName} / {selectedTrack?.artist || selectedTrack?.artistName}
              </h3>
              {generatedData.critique.map((text, idx) => (
                <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-white/90 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setGeneratedData(null);
                setSelectedTrack(null);
                setSearchQuery("");
              }}
              className="mt-8 text-white/50 hover:text-white transition-colors text-sm underline underline-offset-4"
            >
              新しく生成する
            </button>
          </div>
        )}

      </div>
    </main>
  );
}