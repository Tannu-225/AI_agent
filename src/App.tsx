import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Send, Play, Bug, FileText, ChevronRight, Info, AlertCircle, Loader2, Code2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI, Type } from "@google/genai";

interface LogEntry {
  type: 'info' | 'thought' | 'call' | 'result' | 'error' | 'final' | 'iteration' | 'user';
  content: string | any;
  timestamp: string;
}

const SYSTEM_PROMPT = `
You are a helpful and autonomous AI coding agent.
Your goal is to solve the task provided by the user by exploring, analyzing, and modifying the codebase.
You have access to several tools.
Think step-by-step.
Only use relative paths within the working directory (which is 'calculator').
Continue iterating until the task is solved.
`;

const TOOLS = [
  {
    functionDeclarations: [
      {
        name: "get_files_info",
        description: "List files and directories.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            directory: { type: Type.STRING, description: "The directory to list." }
          }
        }
      },
      {
        name: "get_file_content",
        description: "Read file content.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            file_path: { type: Type.STRING }
          },
          required: ["file_path"]
        }
      },
      {
        name: "write_file",
        description: "Write content to a file.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            file_path: { type: Type.STRING },
            content: { type: Type.STRING }
          },
          required: ["file_path", "content"]
        }
      },
      {
        name: "run_python_file",
        description: "Execute a Python file.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            file_path: { type: Type.STRING },
            args: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["file_path"]
        }
      }
    ]
  }
];

export default function App() {
  const [prompt, setPrompt] = useState('fix the calculator app');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    // Initial fetch of file info for the UI sidebar
    fetch('/api/tools/get_files_info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ directory: '.' })
    }).catch(console.error);
  }, []);

  const addLog = (type: LogEntry['type'], content: any) => {
    setLogs(prev => [...prev, {
      type,
      content,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runAgent = async () => {
    if (!prompt.trim() || isProcessing) return;

    setIsProcessing(true);
    setLogs([]);
    addLog('user', prompt);

    try {
      const apiKey = (process.env as any).GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not found. Please ensure it is set in AI Studio Secrets.');
      }

      const ai = new GoogleGenAI({ apiKey });
      const modelName = "gemini-2.0-flash-001";
      
      let history: any[] = [];
      let currentPrompt = prompt;
      let iteration = 0;
      const maxIterations = 20;

      while (iteration < maxIterations) {
        iteration++;
        addLog('iteration', iteration);

        const response = await ai.models.generateContent({
          model: modelName,
          contents: [...history, { role: "user", parts: [{ text: currentPrompt }] }],
          config: {
            systemInstruction: SYSTEM_PROMPT,
            tools: TOOLS
          }
        });

        history.push({ role: "user", parts: [{ text: currentPrompt }] });
        
        const candidate = response.candidates?.[0];
        if (!candidate) break;
        
        const modelContent = candidate.content;
        history.push(modelContent);

        if (modelContent.parts?.[0]?.text) {
          addLog('thought', modelContent.parts[0].text);
        }

        const functionCalls = response.functionCalls;
        if (!functionCalls || functionCalls.length === 0) {
          addLog('final', modelContent.parts?.[0]?.text || "Task complete.");
          break;
        }

        const toolResults: any[] = [];
        for (const fc of functionCalls) {
          addLog('call', { name: fc.name, args: fc.args });
          
          let result = "";
          try {
            const toolResponse = await fetch(`/api/tools/${fc.name}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fc.args)
            });
            const data = await toolResponse.json();
            result = data.result || data.error || "Unknown error";
          } catch (err: any) {
            result = `Error: ${err.message}`;
          }
          
          addLog('result', result);
          toolResults.push({
            functionResponse: {
              name: fc.name,
              response: { result }
            }
          });
        }

        history.push({ role: "model", parts: toolResults });
        currentPrompt = "Please proceed based on the tool results above.";
      }
      
      if (iteration >= maxIterations) {
        addLog('error', 'Maximum iterations reached.');
      }

    } catch (err: any) {
      console.error(err);
      addLog('error', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden font-mono text-sm leading-tight text-[#E4E3E0] bg-[#0F1115]">
      {/* Top Header */}
      <header className="flex items-center justify-between h-14 px-6 border-b grid-border header-gradient shrink-0">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-[#00FF41] animate-pulse glow-green' : 'bg-[#404040]'}`}></div>
          <span className="text-lg font-bold tracking-tighter">GEMINI_AGENT_V2.0</span>
          <span className="px-2 py-0.5 text-[10px] border border-[#4FD1C5] text-[#4FD1C5] rounded">MODEL: FLASH-001</span>
        </div>
        <div className="flex gap-8 items-center">
          <div className="flex flex-col items-end">
            <span className="text-[10px] opacity-50 uppercase">System Status</span>
            <span className={`text-xs ${isProcessing ? 'text-[#00FF41] glow-green' : 'text-[#808080]'}`}>
              {isProcessing ? 'AUTONOMOUS_EXECUTION' : 'IDLE_READY'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: Project Explorer */}
        <aside className="w-64 border-r grid-border bg-[#15181E] flex flex-col hidden lg:flex">
          <div className="p-4 border-b grid-border">
            <p className="sidebar-label mb-3">Project Directory</p>
            <div className="space-y-1.5 text-xs opacity-80">
              <div className="flex items-center gap-2 text-[#4FD1C5]"><span>▼</span> <span>calculator/</span></div>
              <div className="pl-4 flex items-center gap-2"><span>📁</span> <span>pkg/</span></div>
              <div className="pl-8 flex items-center gap-2 opacity-60">📄 <span>calculator.py</span></div>
              <div className="pl-8 flex items-center gap-2 opacity-60">📄 <span>render.py</span></div>
              <div className="pl-4 flex items-center gap-2">📄 <span>main.py</span></div>
              <div className="pl-4 flex items-center gap-2">📄 <span>tests.py</span></div>
              <div className="mt-4 pt-4 border-t border-[#2A2D35]">
                 <div className="flex items-center gap-2 text-[#808080]"><span>📁</span> <span>ai_agent/</span></div>
              </div>
            </div>
          </div>
          <div className="p-4 mt-auto border-t grid-border bg-black/20">
            <p className="sidebar-label mb-2">Env Specs</p>
            <div className="text-[10px] space-y-1 uppercase">
              <div className="flex justify-between font-mono"><span className="opacity-40">Runtime</span><span>Python 3.x</span></div>
              <div className="flex justify-between font-mono"><span className="opacity-40">Sandbox</span><span>Isolated</span></div>
              <div className="flex justify-between font-mono"><span className="opacity-40">Max Iter</span><span>20</span></div>
            </div>
          </div>
        </aside>

        {/* Center: Agent Loop / Terminal */}
        <section className="flex-1 flex flex-col bg-[#0F1115] p-6 overflow-hidden">
          <div className="flex-1 border grid-border p-4 bg-black/40 relative flex flex-col overflow-hidden">
            <div className="absolute top-0 right-0 p-2 text-[10px] opacity-30 font-mono">REASONING_ENGINE_V2</div>
            
            {/* Terminal Body */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto space-y-4 font-mono scroll-smooth pr-2"
            >
              <AnimatePresence mode="popLayout">
                {logs.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-[#2A2D35] space-y-2">
                    <Code2 size={48} strokeWidth={1} />
                    <p className="text-xs uppercase tracking-widest font-bold">Awaiting deployment...</p>
                  </div>
                )}
                
                {logs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {log.type === 'iteration' && (
                      <div className="flex items-center gap-4 py-2 opacity-50">
                        <div className="h-px w-8 bg-[#2A2D35]" />
                        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Step_{log.content.toString().padStart(2, '0')}</span>
                        <div className="h-px flex-1 bg-[#2A2D35]" />
                      </div>
                    )}

                    {log.type === 'user' && (
                      <div className="flex gap-3">
                        <span className="text-[#4FD1C5] font-bold shrink-0">USER_PROMPT &gt;</span>
                        <span className="text-white font-medium">{log.content}</span>
                      </div>
                    )}

                    {log.type === 'thought' && (
                      <div className="p-3 bg-[#1A1D23] border-l-2 border-[#4FD1C5] my-2">
                        <p className="text-[#4FD1C5] text-[10px] mb-1 uppercase tracking-widest font-bold">Reasoning</p>
                        <p className="italic text-xs opacity-80 leading-relaxed text-[#E4E3E0]">"{log.content}"</p>
                      </div>
                    )}

                    {log.type === 'call' && (
                      <div className="flex gap-2 text-[#00FF41] text-xs font-bold py-1">
                        <span className="opacity-50">▶</span>
                        <span>CALL_TOOL:</span>
                        <span className="bg-[#00FF41]/10 px-1 border border-[#00FF41]/20">{log.content.name}({Object.keys(log.content.args || {}).length > 0 ? '...' : ''})</span>
                      </div>
                    )}

                    {log.type === 'result' && (
                      <div className="bg-[#050505] border grid-border p-3 ml-6 my-2 max-h-[400px] overflow-auto">
                        <pre className="text-[11px] text-[#808080] whitespace-pre-wrap">{log.content}</pre>
                      </div>
                    )}

                    {log.type === 'final' && (
                      <div className="bg-indigo-900/10 border border-indigo-500/30 p-4 my-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest">Process_Complete</span>
                        </div>
                        <p className="text-white text-xs leading-relaxed">{log.content}</p>
                      </div>
                    )}

                    {log.type === 'error' && (
                      <div className="bg-red-900/10 border border-red-500/30 p-4 my-4">
                        <div className="flex items-center gap-2 text-red-500 font-bold text-[10px] uppercase tracking-widest mb-2">
                          <AlertCircle size={14} />
                          Critical_Failure
                        </div>
                        <p className="text-red-200 text-xs font-mono">{log.content}</p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Input Terminal Bar */}
            <div className="mt-4 flex items-center gap-4 bg-black p-2 border grid-border shrink-0">
              <span className="text-[#4FD1C5] animate-pulse">█</span>
              <input 
                type="text" 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isProcessing && runAgent()}
                placeholder="Enter autonomous coding task..."
                className="bg-transparent border-none outline-none flex-1 text-white text-xs"
                disabled={isProcessing}
              />
              <button
                onClick={runAgent}
                disabled={isProcessing || !prompt.trim()}
                className="text-[10px] font-bold text-[#4FD1C5] hover:text-[#00FF41] transition-colors uppercase tracking-widest"
              >
                {isProcessing ? 'Executing...' : 'Deploy'}
              </button>
            </div>
          </div>
        </section>

        {/* Right Sidebar: Metrics & Memory */}
        <aside className="w-72 border-l grid-border bg-[#15181E] flex flex-col hidden lg:flex">
          <div className="p-4 border-b grid-border">
            <p className="sidebar-label mb-4">Resource Monitor</p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] mb-1"><span className="opacity-50 uppercase">Session Activity</span><span className="text-[#4FD1C5] font-bold">LIVE</span></div>
                <div className="h-1 bg-[#2A2D35] rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: isProcessing ? '100%' : '15%' }}
                    transition={{ duration: isProcessing ? 10 : 0.5 }}
                    className="h-full bg-[#4FD1C5]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-center font-mono">
                <div className="bg-black/40 p-2 border grid-border">
                  <p className="text-[9px] opacity-40 uppercase">Steps</p>
                  <p className="text-xl font-bold">{logs.filter(l => l.type === 'iteration').length}</p>
                </div>
                <div className="bg-black/40 p-2 border grid-border">
                  <p className="text-[9px] opacity-40 uppercase">Tools</p>
                  <p className="text-xl font-bold text-[#4FD1C5]">{logs.filter(l => l.type === 'call').length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 flex-1 overflow-hidden flex flex-col">
            <p className="sidebar-label mb-4">Memory Index</p>
            <div className="space-y-3 overflow-y-auto overflow-x-hidden pr-1 text-[11px]">
              {logs.filter(l => ['final', 'error', 'thought'].includes(l.type)).slice(-5).map((log, i) => (
                <div key={i} className="p-2 border-l-2 border-[#2A2D35] bg-white/5 group hover:bg-white/10 transition-colors">
                  <p className="text-[9px] font-bold text-[#4FD1C5] uppercase">ENTRY_{i.toString().padStart(2, '0')}</p>
                  <p className="text-[10px] opacity-60 leading-tight mt-1 truncate">{log.content.toString()}</p>
                </div>
              ))}
              {logs.filter(l => ['final', 'error', 'thought'].includes(l.type)).length === 0 && (
                <p className="text-[10px] opacity-30 italic text-center py-8">Buffer empty...</p>
              )}
            </div>
          </div>

          <div className="p-4 border-t grid-border bg-black/40">
            <p className="sidebar-label mb-3">Loaded Skills</p>
            <div className="flex flex-wrap gap-1">
              <span className="px-1.5 py-0.5 border border-[#4FD1C5]/30 text-[9px] bg-[#4FD1C5]/10 text-[#4FD1C5] tracking-tighter">FS_EXPLORER</span>
              <span className="px-1.5 py-0.5 border border-[#4FD1C5]/30 text-[9px] bg-[#4FD1C5]/10 text-[#4FD1C5] tracking-tighter">PY_ENGINE</span>
              <span className="px-1.5 py-0.5 border border-[#4FD1C5]/30 text-[9px] bg-[#4FD1C5]/10 text-[#4FD1C5] tracking-tighter">TOOL_CALLING</span>
              <span className="px-1.5 py-0.5 border border-[#2A2D35] text-[9px] opacity-30 tracking-tighter cursor-not-allowed">DB_SYNC</span>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer Bar */}
      <footer className="h-8 px-6 border-t grid-border flex items-center justify-between text-[10px] opacity-40 bg-[#15181E] shrink-0">
        <div className="flex gap-4 uppercase font-bold tracking-widest">
          <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-[#00FF41]"></div> SECURE_TUNNEL</span>
          <span>LATENCY: 450MS</span>
          <span>SESSION: ACTIVE_PREVIEW</span>
        </div>
        <div className="flex gap-4 italic font-serif">
          <span>&copy; 2026 GEMINI_CODER_CORE</span>
          <span>BUILD_X90_PRODUCTION</span>
        </div>
      </footer>
    </div>
  );
}
