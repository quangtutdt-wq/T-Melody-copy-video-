
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { analyzeVideo } from './geminiService';
import { AnalysisResult, SceneJson, Character } from './types';

const STYLES = [
  "Phân tích theo video gốc (Original Style)",
  "Synthwave, neon sunset, 80s retro",
  "Steampunk, victorian machinery",
  "Dark fantasy, dramatic lighting",
  "Kawaii chibi cute style",
  "Hyper-realistic portrait",
  "Low poly 3D game style",
  "Pixel art 16-bit retro game",
  "Tim Burton gothic quirky style",
  "Wes Anderson symmetric pastel",
  "Noir film, black & white, dramatic",
  "Horror dark moody atmosphere",
  "Sci-fi futuristic spaceship",
  "Disney classic 2D animation"
];

const MODELS = [
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Nhanh)" },
  { id: "gemini-3-pro-preview", name: "Gemini 3 Pro (Mạnh mẽ)" },
  { id: "gemini-2.5-flash-lite-latest", name: "Gemini 2.5 Flash Lite" }
];

const Header: React.FC = () => (
  <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50 py-4 shadow-xl">
    <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-500 p-2 rounded-lg shadow-indigo-500/20 shadow-lg">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-black text-white tracking-tighter uppercase leading-none">VeoPrompt <span className="text-indigo-400">Master</span></h1>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">AI Video Engine v3.0</p>
        </div>
      </div>
      <div className="hidden sm:block text-[10px] font-black text-indigo-400 bg-indigo-500/5 border border-indigo-500/20 px-4 py-2 rounded-full tracking-widest uppercase">
        Local Environment
      </div>
    </div>
  </header>
);

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [continuing, setContinuing] = useState(false);
  const [scenes, setScenes] = useState<SceneJson[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]);
  const [isCustomStyle, setIsCustomStyle] = useState(false);
  const [customStyleText, setCustomStyleText] = useState("");
  
  // AI Config States
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('veoprompt_api_key') || '');
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);

  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem('veoprompt_api_key', apiKey);
  }, [apiKey]);

  const currentStyle = isCustomStyle ? customStyleText : selectedStyle;

  const formattedText = useMemo(() => {
    return scenes.map(s => JSON.stringify(s)).join('\n\n');
  }, [scenes]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
      setScenes([]);
      setError(null);
    }
  };

  const startAnalysis = async () => {
    if (!apiKey) {
      setError("Vui lòng nhập Gemini API Key để tiếp tục.");
      return;
    }
    if (!file || (isCustomStyle && !customStyleText)) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeVideo(file, currentStyle, apiKey, selectedModel, 0);
      setScenes(result.scenes);
    } catch (err: any) {
      console.error(err);
      setError("Lỗi kết nối API. Kiểm tra lại API Key hoặc quota của bạn.");
    } finally {
      setLoading(false);
    }
  };

  const continueAnalysis = async () => {
    if (!apiKey) return;
    if (!file || scenes.length === 0) return;
    setContinuing(true);
    try {
      const lastId = parseInt(scenes[scenes.length - 1].scene_id);
      const result = await analyzeVideo(file, currentStyle, apiKey, selectedModel, isNaN(lastId) ? scenes.length : lastId);
      if (result.scenes.length > 0) {
        setScenes(prev => [...prev, ...result.scenes]);
      } else {
        alert("Không tìm thấy thêm scene mới.");
      }
    } catch (err: any) {
      setError("Lỗi khi tiếp tục phân tích.");
    } finally {
      setContinuing(false);
    }
  };

  const downloadTxt = () => {
    if (scenes.length === 0) return;
    const blob = new Blob([formattedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `veo_prompts_${file?.name || 'export'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    if (textAreaRef.current) {
      textAreaRef.current.select();
      document.execCommand('copy');
      alert('Đã copy toàn bộ prompt!');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200">
      <Header />
      
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Input Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
              
              {/* AI CONFIGURATION */}
              <div className="space-y-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
                <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Cấu hình AI
                </h2>
                
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Gemini API Key</label>
                  <input 
                    type="password"
                    placeholder="Nhập API Key của bạn..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 outline-none transition-all shadow-inner"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Chọn Model</label>
                  <select 
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-xs font-medium text-slate-300 focus:border-indigo-500 outline-none transition-all"
                  >
                    {MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Chọn Video
                </h2>
                <div className="relative group border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all cursor-pointer">
                  <input type="file" accept="video/*" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase">{file ? file.name : "Kéo thả file video"}</p>
                </div>
              </div>

              <div>
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Phong cách Video
                </h2>
                <div className="space-y-3">
                  <select 
                    value={isCustomStyle ? "custom" : selectedStyle}
                    onChange={(e) => {
                      if (e.target.value === "custom") {
                        setIsCustomStyle(true);
                      } else {
                        setIsCustomStyle(false);
                        setSelectedStyle(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs font-bold text-slate-300 focus:border-indigo-500 focus:outline-none transition-all"
                  >
                    {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="custom">Tùy chỉnh...</option>
                  </select>

                  {isCustomStyle && (
                    <input 
                      type="text"
                      placeholder="Nhập phong cách riêng..."
                      value={customStyleText}
                      onChange={(e) => setCustomStyleText(e.target.value)}
                      className="w-full bg-slate-950 border border-indigo-500/30 rounded-xl px-4 py-3 text-xs font-medium text-white focus:border-indigo-500 outline-none transition-all"
                    />
                  )}
                </div>
              </div>

              {previewUrl && (
                <div className="rounded-2xl overflow-hidden border border-slate-800 aspect-video bg-black shadow-2xl">
                  <video src={previewUrl} controls className="w-full h-full object-contain" />
                </div>
              )}

              <button
                onClick={startAnalysis}
                disabled={!file || loading || continuing || !apiKey || (isCustomStyle && !customStyleText)}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 shadow-xl shadow-indigo-600/20 active:scale-[0.98] transition-all"
              >
                {loading ? "Đang xử lý dữ liệu..." : "Phân tích Video"}
              </button>
            </div>

            <div className="bg-indigo-600/5 border border-indigo-500/20 p-6 rounded-3xl">
              <h3 className="text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-2 italic underline">Hướng dẫn</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                1. Lấy API Key tại <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-400 hover:underline">Google AI Studio</a>.<br/>
                2. Nhập Key vào mục "Cấu hình AI".<br/>
                3. Chọn Model và Video để bắt đầu.
              </p>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-8 flex flex-col">
            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl flex flex-col h-full min-h-[600px] overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${scenes.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Veo Prompt Output</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={copyToClipboard} className="text-[10px] font-bold text-slate-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all">COPY</button>
                  <button onClick={downloadTxt} className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-all">SAVE .TXT</button>
                </div>
              </div>

              <div className="flex-grow p-6 flex flex-col">
                {scenes.length > 0 ? (
                  <>
                    <textarea
                      ref={textAreaRef}
                      readOnly
                      value={formattedText}
                      className="flex-grow w-full bg-slate-950 border border-slate-800 rounded-2xl p-6 font-mono text-[11px] text-indigo-300 focus:outline-none resize-none leading-relaxed shadow-inner scrollbar-thin scrollbar-thumb-slate-800"
                    />
                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={continueAnalysis}
                        disabled={continuing || loading}
                        className="group flex items-center gap-3 bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                      >
                        {continuing ? (
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                          <svg className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                        )}
                        Tiếp tục phân tích
                      </button>
                    </div>
                  </>
                ) : loading ? (
                  <div className="flex-grow flex flex-col items-center justify-center space-y-4">
                    <div className="w-12 h-12 border-4 border-slate-800 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Đang kiến tạo thế giới {currentStyle}...</p>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center text-slate-700 space-y-4">
                    <svg className="w-16 h-16 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-20">No output detected</p>
                  </div>
                )}
              </div>
              
              {error && (
                <div className="mx-6 mb-6 p-4 bg-red-900/20 border border-red-500/20 rounded-2xl text-red-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="py-8 text-center border-t border-slate-900 bg-slate-950">
        <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em]">Engineered for Veo 3 • Local Distribution Core</p>
      </footer>
    </div>
  );
}
