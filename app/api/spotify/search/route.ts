import { NextResponse } from 'next/server';

export async function GET(request: Request) {
                              const { searchParams } = new URL(request.url);
                              const query = searchParams.get('q');

                              if (!query) {
                                                            return NextResponse.json({ error: '検索キーワードが必要です' }, { status: 400 });
                              }

                              // 外部API（Spotify）の課金制約を回避するためのダミーデータ（モック）生成ロジック
                              // ※入力された検索キーワード（query）を名前に組み込むことで、システムが連動していることを証明します
                              const mockTracks = [
                                                            { id: "mock1", name: `${query}のテーマ`, artist: "アーティスト A" },
                                                            { id: "mock2", name: `${query}に捧ぐ夜`, artist: "アーティスト B" },
                                                            { id: "mock3", name: `The Best of ${query}`, artist: "アーティスト C" },
                              ];

                              // 1秒間の通信遅延（ローディング状態）を意図的にシミュレーション
                              await new Promise((resolve) => setTimeout(resolve, 1000));

                              // 成功したテイでフロントエンドにデータを返却
                              return NextResponse.json({ tracks: mockTracks });
}