export default function Logo({ active = false }: { active?: boolean }) {
                              // 普段の自転アニメーション（検索中もゆっくり回し続けることで、ベースの空間を維持する）
                              const planetSpinClass = "animate-planet-spin-slow";
                              const hueShiftClass = "animate-hue-shift-slow";

                              return (
                                                            <svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                                                                                          <defs>
                                                                                                                        <mask id="sphereMask">
                                                                                                                                                      <circle cx="100" cy="100" r="75" fill="#ffffff" />
                                                                                                                        </mask>
                                                                                                                        <filter id="cloudBlur" x="-50%" y="-50%" width="200%" height="200%">
                                                                                                                                                      <feGaussianBlur stdDeviation="18" />
                                                                                                                        </filter>
                                                                                                                        <clipPath id="backHalf">
                                                                                                                                                      <rect x="0" y="0" width="200" height="100" />
                                                                                                                        </clipPath>
                                                                                                                        <clipPath id="frontHalf">
                                                                                                                                                      <rect x="0" y="100" width="200" height="100" />
                                                                                                                        </clipPath>

                                                                                                                        <g id="outerOrbit">
                                                                                                                                                      <ellipse cx="100" cy="100" rx="95" ry="32.5" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3" />
                                                                                                                                                      <circle r="3.5" fill="#ffffff">
                                                                                                                                                                                    <animateMotion dur="8s" repeatCount="indefinite" path="M 5,100 a 95,32.5 0 1,0 190,0 a 95,32.5 0 1,0 -190,0" />
                                                                                                                                                      </circle>
                                                                                                                                                      <circle r="2.5" fill="#ffffff" opacity="0.8">
                                                                                                                                                                                    <animateMotion dur="8s" begin="-4s" repeatCount="indefinite" path="M 5,100 a 95,32.5 0 1,0 190,0 a 95,32.5 0 1,0 -190,0" />
                                                                                                                                                      </circle>
                                                                                                                                                      <circle r="1.5" fill="#d8b4fe" opacity="0.9">
                                                                                                                                                                                    <animateMotion dur="8s" begin="-2s" repeatCount="indefinite" path="M 5,100 a 95,32.5 0 1,0 190,0 a 95,32.5 0 1,0 -190,0" />
                                                                                                                                                      </circle>
                                                                                                                        </g>

                                                                                                                        <g id="innerOrbit">
                                                                                                                                                      <ellipse cx="100" cy="100" rx="85" ry="42.5" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeOpacity="0.4" />
                                                                                                                                                      <circle r="2" fill="#ffffff">
                                                                                                                                                                                    <animateMotion dur="12s" repeatCount="indefinite" path="M 15,100 a 85,42.5 0 1,1 170,0 a 85,42.5 0 1,1 -170,0" />
                                                                                                                                                      </circle>
                                                                                                                        </g>

                                                                                                                        <style>
                                                                                                                                                      {`
            .animate-planet-spin-slow { animation: planetSpin 20s linear infinite; }
            @keyframes planetSpin {
              0% { transform: translateX(0); }
              100% { transform: translateX(-200px); }
            }

            .animate-hue-shift-slow { animation: hueShift 20s linear infinite; }
            @keyframes hueShift {
              0% { filter: hue-rotate(0deg); }
              100% { filter: hue-rotate(360deg); }
            }

            /* 普段の雲の混ざり合い */
            .animate-cloud-mix-1 { animation: cloudMix1 7s ease-in-out infinite alternate; }
            .animate-cloud-mix-2 { animation: cloudMix2 11s ease-in-out infinite alternate; }
            .animate-cloud-mix-3 { animation: cloudMix3 13s ease-in-out infinite alternate; }
            @keyframes cloudMix1 {
              0% { transform: translateY(-15px) scale(0.9); }
              100% { transform: translateY(20px) scale(1.3); }
            }
            @keyframes cloudMix2 {
              0% { transform: translateY(25px) scale(1.2); }
              100% { transform: translateY(-15px) scale(0.8); }
            }
            @keyframes cloudMix3 {
              0% { transform: translateY(-10px) scale(1); }
              100% { transform: translateY(15px) scale(1.4); }
            }

            /* 【新規追加】裏側から湧き上がる新しい雲のZ軸アニメーション */
            .animate-surge-1 { transform-origin: 100px 100px; animation: surge 3s ease-in-out infinite; }
            .animate-surge-2 { transform-origin: 100px 100px; animation: surge 4s ease-in-out infinite 1.2s; }
            .animate-surge-3 { transform-origin: 100px 100px; animation: surge 3.5s ease-in-out infinite 2.4s; }

            @keyframes surge {
              0% { transform: scale(0.1) translateY(40px); opacity: 0; }
              40% { opacity: 0.95; }
              70% { opacity: 0.95; }
              100% { transform: scale(1.8) translateY(-40px); opacity: 0; }
            }
          `}
                                                                                                                        </style>
                                                                                          </defs>

                                                                                          {/* --- レイヤー1：奥の軌道 --- */}
                                                                                          <g transform="rotate(-20 100 100)" clipPath="url(#backHalf)">
                                                                                                                        <use href="#outerOrbit" />
                                                                                          </g>
                                                                                          <g transform="rotate(30 100 100)" clipPath="url(#backHalf)">
                                                                                                                        <use href="#innerOrbit" />
                                                                                          </g>

                                                                                          {/* --- レイヤー2：恒星本体とガス --- */}
                                                                                          <circle cx="100" cy="100" r="75" fill="#0f0c29" />

                                                                                          <g mask="url(#sphereMask)">
                                                                                                                        {/* 1. 普段の雲（検索中はスーッと暗転し、奥の宇宙空間を見せる） */}
                                                                                                                        <g style={{ opacity: active ? 0.2 : 1, transition: 'opacity 1s ease-in-out' }}>
                                                                                                                                                      <g className={`${planetSpinClass} ${hueShiftClass}`}>
                                                                                                                                                                                    <g>
                                                                                                                                                                                                                  <circle cx="0" cy="100" r="70" fill="#7e22ce" filter="url(#cloudBlur)" className="animate-cloud-mix-1" />
                                                                                                                                                                                                                  <circle cx="80" cy="50" r="60" fill="#ec4899" filter="url(#cloudBlur)" className="animate-cloud-mix-2" />
                                                                                                                                                                                                                  <circle cx="140" cy="150" r="65" fill="#3b82f6" filter="url(#cloudBlur)" className="animate-cloud-mix-3" />
                                                                                                                                                                                                                  <circle cx="200" cy="100" r="70" fill="#7e22ce" filter="url(#cloudBlur)" className="animate-cloud-mix-1" />
                                                                                                                                                                                    </g>
                                                                                                                                                                                    <g transform="translate(200, 0)">
                                                                                                                                                                                                                  <circle cx="0" cy="100" r="70" fill="#7e22ce" filter="url(#cloudBlur)" className="animate-cloud-mix-1" />
                                                                                                                                                                                                                  <circle cx="80" cy="50" r="60" fill="#ec4899" filter="url(#cloudBlur)" className="animate-cloud-mix-2" />
                                                                                                                                                                                                                  <circle cx="140" cy="150" r="65" fill="#3b82f6" filter="url(#cloudBlur)" className="animate-cloud-mix-3" />
                                                                                                                                                                                                                  <circle cx="200" cy="100" r="70" fill="#7e22ce" filter="url(#cloudBlur)" className="animate-cloud-mix-1" />
                                                                                                                                                                                    </g>
                                                                                                                                                      </g>
                                                                                                                        </g>

                                                                                                                        {/* 2. 【新規追加】検索中のみ出現する、裏側から迫り来るデータ雲 */}
                                                                                                                        <g style={{ opacity: active ? 1 : 0, transition: 'opacity 0.5s ease-in-out' }}>
                                                                                                                                                      <circle cx="100" cy="120" r="50" fill="#22d3ee" filter="url(#cloudBlur)" className="animate-surge-1" /> {/* シアン（水色） */}
                                                                                                                                                      <circle cx="80" cy="140" r="60" fill="#a3e635" filter="url(#cloudBlur)" className="animate-surge-2" /> {/* ライムグリーン */}
                                                                                                                                                      <circle cx="120" cy="130" r="55" fill="#fbbf24" filter="url(#cloudBlur)" className="animate-surge-3" /> {/* ネオンイエロー */}
                                                                                                                        </g>
                                                                                          </g>

                                                                                          {/* ガラスの反射と輪郭線 */}
                                                                                          <ellipse cx="75" cy="45" rx="55" ry="25" fill="#ffffff" opacity="0.2" transform="rotate(-25 75 45)" mask="url(#sphereMask)" />
                                                                                          <path d="M 40 140 Q 100 185 160 140 Q 100 160 40 140 Z" fill="#ffffff" opacity="0.1" mask="url(#sphereMask)" />
                                                                                          <circle cx="100" cy="100" r="74" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.15" />

                                                                                          {/* --- レイヤー3：手前の軌道 --- */}
                                                                                          <g transform="rotate(-20 100 100)" clipPath="url(#frontHalf)">
                                                                                                                        <use href="#outerOrbit" />
                                                                                          </g>
                                                                                          <g transform="rotate(30 100 100)" clipPath="url(#frontHalf)">
                                                                                                                        <use href="#innerOrbit" />
                                                                                          </g>
                                                            </svg>
                              );
}