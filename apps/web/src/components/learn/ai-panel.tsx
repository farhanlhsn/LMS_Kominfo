'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Brain, Sparkles, ChevronRight, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SourceChunk {
  id: string;
  content: string;
  score: number;
  lessonTitle: string;
  chunkIndex: number;
}

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources?: SourceChunk[];
  isStreaming?: boolean;
}

interface AiPanelProps {
  lessonId: string;
}

/**
 * AI Tutor panel dengan streaming via Server-Sent Events.
 *
 * Endpoint: POST /ai/chat/stream
 * Event types: session | sources | token | done | error
 */
export function AiPanel({ lessonId }: AiPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [isPending, setIsPending] = useState(false);
  const [activeSources, setActiveSources] = useState<SourceChunk[] | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const presets = [
    { label: 'Ringkas Materi', prompt: 'Tolong buatkan ringkasan materi pelajaran ini secara singkat dan jelas.' },
    { label: 'Jelaskan Lebih Sederhana', prompt: 'Bisakah Anda menjelaskan materi ini dengan bahasa yang lebih sederhana untuk pemula?' },
    { label: 'Buat Kuis Latihan', prompt: 'Buatkan 3 soal latihan pilihan ganda berdasarkan materi ini untuk menguji pemahaman saya.' },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isPending) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'USER',
      content: textToSend,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsPending(true);
    setActiveSources(null);

    // Create placeholder AI message for streaming
    const aiMsgId = `a-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: aiMsgId, role: 'ASSISTANT', content: '', isStreaming: true },
    ]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      const res = await fetch(`${baseUrl}/ai/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: textToSend, lessonId, sessionId }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Parse SSE frames
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';

        for (const frame of frames) {
          const lines = frame.split('\n');
          let eventName = 'message';
          let dataStr = '';
          for (const line of lines) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
          }
          if (!dataStr) continue;

          let data: any = dataStr;
          try { data = JSON.parse(dataStr); } catch { /* keep string */ }

          if (eventName === 'session' && data?.sessionId) {
            setSessionId(data.sessionId);
          } else if (eventName === 'sources' && Array.isArray(data)) {
            setActiveSources(data);
            setMessages((prev) =>
              prev.map((m) => (m.id === aiMsgId ? { ...m, sources: data } : m)),
            );
          } else if (eventName === 'token' && data?.delta) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === aiMsgId ? { ...m, content: m.content + data.delta } : m,
              ),
            );
          } else if (eventName === 'done') {
            setMessages((prev) =>
              prev.map((m) => (m.id === aiMsgId ? { ...m, isStreaming: false } : m)),
            );
          } else if (eventName === 'error') {
            throw new Error(data?.message || 'AI stream error');
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, isStreaming: false } : m)),
      );
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('Failed to chat with AI:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, isStreaming: false, content: m.content || 'Maaf, terjadi kesalahan saat menghubungi asisten AI. Silakan coba lagi.' }
            : m,
        ),
      );
    } finally {
      setIsPending(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="w-80 border-l bg-card flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-yellow-300 animate-pulse" />
          <div>
            <h2 className="text-sm font-bold leading-none">AI Tutor</h2>
            <span className="text-[10px] text-blue-200 mt-1 block">Aktif menjawab pertanyaan Anda</span>
          </div>
        </div>
        {isPending && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => abortRef.current?.abort()}
            className="h-7 w-7 text-white hover:bg-white/20"
            title="Hentikan"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
            <div className="p-4 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400">
              <Brain className="h-10 w-10 animate-bounce" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Tanyakan materi apa saja!</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                Asisten AI dapat membantu meringkas materi, menjelaskan lebih sederhana, atau memberi kuis.
              </p>
            </div>
            <div className="w-full pt-4 space-y-2">
              {presets.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(preset.prompt)}
                  disabled={isPending}
                  className="w-full text-left px-3 py-2 text-xs border rounded-md hover:bg-accent hover:border-accent-foreground/30 transition-all flex items-center justify-between group disabled:opacity-50"
                >
                  <span className="truncate pr-2 font-medium">{preset.label}</span>
                  <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col max-w-[90%] rounded-lg p-3 text-sm leading-relaxed transition-all duration-300',
                  msg.role === 'USER'
                    ? 'ml-auto bg-primary text-primary-foreground rounded-br-none shadow-sm'
                    : 'bg-muted text-foreground rounded-bl-none border shadow-sm',
                )}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] opacity-75 font-semibold">
                  {msg.role === 'USER' ? <span>Anda</span> : (
                    <>
                      <Sparkles className="h-3 w-3 text-yellow-500 shrink-0" />
                      <span>AI Tutor{msg.isStreaming ? ' (mengetik...)' : ''}</span>
                    </>
                  )}
                </div>
                <p className="text-xs whitespace-pre-wrap break-words">
                  {msg.content || (msg.isStreaming ? '...' : '')}
                </p>

                {msg.sources && msg.sources.length > 0 && (
                  <details className="mt-2 text-[10px]">
                    <summary className="cursor-pointer font-semibold opacity-75 hover:opacity-100 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {msg.sources.length} sumber materi
                    </summary>
                    <div className="mt-1.5 space-y-1">
                      {msg.sources.slice(0, 3).map((s, i) => (
                        <div key={s.id} className="p-1.5 rounded bg-background/50 text-[10px]">
                          <span className="font-semibold">[{i + 1}] {s.lessonTitle}</span>
                          <span className="ml-1 text-muted-foreground">
                            (skor {(s.score * 100).toFixed(0)}%)
                          </span>
                          <p className="line-clamp-2 text-muted-foreground mt-0.5">
                            {s.content.substring(0, 120)}...
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-card">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(inputValue);
          }}
          className="flex items-center gap-2"
        >
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Tanya AI..."
            className="flex-1 text-xs"
            disabled={isPending}
          />
          <Button type="submit" size="icon" disabled={isPending || !inputValue.trim()} className="shrink-0 h-9 w-9">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
