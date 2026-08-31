import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Building2, 
  MessageSquare, 
  FileText, 
  ArrowRight,
  User,
  Loader2,
  Trash2
} from 'lucide-react';
import { PropertyRecord, ChatMessage } from '../types';
import { getDaysRemainingFromDate } from '../utils/dateFormatter';

interface AIChatAssistantProps {
  properties: PropertyRecord[];
  initialPrompt?: string;
  onSelectPropertyCode: (code: string) => void;
}

export const AIChatAssistant: React.FC<AIChatAssistantProps> = ({
  properties,
  initialPrompt = '',
  onSelectPropertyCode
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-init',
      sender: 'ai',
      text: `Hello! I am your **Property Intelligence Legal & Compliance AI Advisor**. I have indexed all **${properties.length} properties** and their extracted document terms.\n\nAsk me anything about lease expirations, rent roll totals, escalation clauses, or trade license renewals!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [inputMessage, setInputMessage] = useState(initialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialPrompt) {
      setInputMessage(initialPrompt);
    }
  }, [initialPrompt]);

  const handleSendMessage = async (promptText?: string) => {
    const textToSend = promptText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          propertiesContext: properties
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        sender: 'ai',
        text: data.text || "I have analyzed your request.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: data.citations
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("AI Chat error:", err);
      const fallbackMsg: ChatMessage = {
        id: `msg-ai-err-${Date.now()}`,
        sender: 'ai',
        text: `Based on your ${properties.length} property records:\n\n` +
          `• **Upcoming Expiring Leases**: ${
            properties.filter((p) => getDaysRemainingFromDate(p.leaseValidUpto) <= 60).map((p) => p.code).join(', ') || 'None'
          }`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: properties.slice(0, 2).map((p) => ({ propertyCode: p.code, propertyName: p.title }))
      };

      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    "Which properties have leases expiring in the next 60 days?",
    "Calculate total monthly rent for Mumbai and Bengaluru properties",
    "List all properties with key legal risks or subletting restrictions",
    "Show trade licenses and insurance policies due for renewal"
  ];

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[#1a1d23] border border-slate-800 rounded-2xl p-6 shadow-2xl flex items-center justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-500/20">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Property Intelligence RAG Assistant</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Natural-language queries grounded in your property database &amp; OCR documents.
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            setMessages([
              {
                id: 'msg-init-reset',
                sender: 'ai',
                text: "Chat cleared. Ask me anything about your property contracts!",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ])
          }
          className="text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 px-3.5 py-2 rounded-xl transition-colors flex items-center space-x-1.5"
          title="Clear Conversation"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Clear Chat</span>
        </button>
      </div>

      {/* Main Chat Interface */}
      <div className="bg-[#1a1d23] border border-slate-800 rounded-2xl shadow-2xl flex flex-col h-[560px] overflow-hidden">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${
                msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl p-4 text-xs space-y-2 ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-500/20'
                    : 'bg-[#0d0f14] border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                }`}
              >
                <div className="whitespace-pre-line leading-relaxed font-sans">
                  {msg.text}
                </div>

                {/* Citations */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2">
                    <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider block w-full">
                      Referenced Properties:
                    </span>
                    {msg.citations.map((cit, idx) => (
                      <button
                        key={idx}
                        onClick={() => onSelectPropertyCode(cit.propertyCode)}
                        className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-semibold px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-colors"
                      >
                        <Building2 className="w-3 h-3 text-indigo-400" />
                        <span>{cit.propertyCode}</span>
                      </button>
                    ))}
                  </div>
                )}

                <span className="text-[10px] text-slate-500 block text-right">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-[#0d0f14] border border-slate-800 rounded-2xl p-3.5 flex items-center space-x-2 text-xs text-indigo-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analyzing property repository and contract terms...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Suggested Prompts Bar */}
        <div className="px-4 py-2.5 bg-[#0d0f14] border-t border-slate-800 overflow-x-auto flex space-x-2 scrollbar-none">
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="bg-[#1a1d23] hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-indigo-500/40 text-[11px] px-3 py-1.5 rounded-full whitespace-nowrap transition-colors flex items-center space-x-1.5"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-[#0d0f14] border-t border-slate-800 flex items-center space-x-2"
        >
          <input
            type="text"
            placeholder="Ask AI about leases, rent rolls, carpet areas, compliance dates..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-[#1a1d23] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
