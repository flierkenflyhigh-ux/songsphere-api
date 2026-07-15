"use client";

import { useState, useEffect } from "react";
import Logo, { SphereParameters } from "../components/Logo";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState<{ parameters: SphereParameters; critique: string[] } | null>(null);

  // 認証状態の監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // 現在のページのURLをリダイレクト先に指定
        redirectTo: `${window.location.origin}`
      }
    });
    if (error) alert("ログインに失敗しました: " + error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSearch = async () => {
    if (!searchQuery) return;
    setIsSearching(true);
    setSelectedTrack(null);
    setGeneratedData(null);

    try {
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

  // ログインしていない場合の画面（ランディング）
  if (!session) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-black">
        <div className="relative w-full max-w-md p-10 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col items-center">
          <div className="w-32 h-32 mb-6 drop-shadow-2xl">
            <Logo active={true} />
          </div>
          <h1 className="text-3xl font-bold mb-3 tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-300">
            Songsphere
          </h1>
          <p className="text-white/60 text-sm mb-8 text-center leading-relaxed">
            音楽の結晶を生成し、<br />新たな解釈をアンロックする。
          </p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-black rounded-xl px-5 py-4 font-bold transition-all hover:bg-gray-200 active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Googleでログイン
          </button>
        </div>
      </main>
    );
  }

  // ログイン済みの画面
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-black relative">
      {/* ヘッダーエリア（ログアウトボタン等） */}
      <div className="absolute top-4 right-4 flex items-center gap-4">
        <span className="text-white/50 text-xs">{session.user.email}</span>
        <button onClick={handleLogout} className="text-white/50 text-xs hover:text-white underline underline-offset-4">
          ログアウト
        </button>
      </div>

      <div className="relative w-full max-w-2xl p-10 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col items-center mt-12">
        {!generatedData && (
          <>
            <div className="w-40 h-40 mb-6 drop-shadow-2xl">
              <Logo active={isSearching || isGenerating} />
            </div>

            <h1 className="text-4xl font-bold mb-3 tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-300">
              Songsphere
            </h1>

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