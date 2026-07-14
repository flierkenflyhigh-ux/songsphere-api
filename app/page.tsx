"use client";

import { useState } from "react";
import Logo from "../components/Logo";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    setSelectedTrack(null);

    try {
      // 【修正箇所】Vercel内部の相対パスから、Renderの本番APIへの絶対パスに変更
      // ※もしRenderのURLスペルが本当に "songspere"（h抜け）であれば、適宜 'h' を抜いてください。
      const response = await fetch(`https://songsphere-api.onrender.com/search?q=${encodeURIComponent(searchQuery)}`);

      if (!response.ok) throw new Error("APIリクエストに失敗しました");

      const data = await response.json();

      // バックエンドのレスポンス形式（Spotify/iTunesなど）の違いを吸収して配列を取得
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

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // データ構造の違いを吸収して曲名とアーティスト名を表示
    const trackName = selectedTrack.name || selectedTrack.trackName;
    const artistName = selectedTrack.artist || selectedTrack.artistName;

    alert(`【システムテスト完了】\n選択曲: ${trackName} (${artistName})\n※次のステップで、この曲のAudio Features（音響特徴データ）を取得します。`);

    setIsGenerating(false);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-md p-10 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col items-center">

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
            <div className="w-full bg-black/60 border border-white/10 rounded-xl overflow-hidden mt-2">
              {searchResults.map((track, index) => {
                // APIによるキーの違い（id/trackId, name/trackName）を吸収
                const trackId = track.id || track.trackId || index;
                const trackName = track.name || track.trackName || "不明な曲名";
                const artistName = track.artist || track.artistName || "不明なアーティスト";

                // 現在選択されている曲かどうかを判定
                const isSelected = selectedTrack && (
                  (selectedTrack.id && selectedTrack.id === trackId) ||
                  (selectedTrack.trackId && selectedTrack.trackId === trackId)
                );

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

      </div>
    </main>
  );
}