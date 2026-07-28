import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Bot, Loader2 } from 'lucide-react';
import { get } from 'idb-keyval';

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
}

export function AIChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Xin chào! Tôi là **Trợ Lý Văn Phòng Kim** 🤖\nTôi có thể giúp bạn tra cứu nhanh hợp đồng, tìm kiếm công việc cần làm, hoặc hỗ trợ các thủ tục thuế/BHXH. Hôm nay bạn cần trợ giúp gì?'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    'Hôm nay có công việc gì?',
    'Tóm tắt các hợp đồng hiện có',
    'Kiểm tra hạn nộp thuế/BHXH'
  ];

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: textToSend
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Fetch latest state from IndexedDB
      const contracts = await get('ai_contracts_idb') || [];
      const tasks = await get('ai_tasks_idb') || [];
      const complianceData = await get('ai_compliance_data') || {};

      // Map history for API
      const history = messages
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role,
          text: m.text
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: textToSend, 
          history,
          contracts,
          tasks,
          compliance: complianceData
        })
      });

      const data = await response.json();

      if (response.ok && data.text) {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: data.text
          }
        ]);
      } else {
        throw new Error(data.error || 'Lỗi không xác định');
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: '❌ Có lỗi kết nối xảy ra. Vui lòng kiểm tra lại cấu hình API hoặc kết nối mạng của bạn.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Simple custom parser for formatting markdown tags
  const renderMessageText = (text: string) => {
    // Escape HTML first to prevent XSS
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Parse Bold: **text** -> <strong>text</strong>
    let html = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Parse Code block: `code` -> <code>code</code>
    html = html.replace(/`(.*?)`/g, '<code class="bg-slate-950 px-1 py-0.5 rounded text-indigo-300 font-mono text-xs border border-slate-800">$1</code>');

    // Parse List item: \n* item -> <li>item</li>
    // Split lines
    const lines = html.split('\n');
    let inList = false;
    const formattedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const itemText = trimmed.substring(2);
        let listPrefix = '';
        if (!inList) {
          inList = true;
          listPrefix = '<ul class="list-disc pl-4 space-y-1 my-1">';
        }
        return `${listPrefix}<li class="text-sm">${itemText}</li>`;
      } else {
        let listSuffix = '';
        if (inList) {
          inList = false;
          listSuffix = '</ul>';
        }
        return `${listSuffix}${line}`;
      }
    });

    if (inList) {
      formattedLines.push('</ul>');
    }

    html = formattedLines.join('<br />');
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end font-sans">
      {/* Chat Window Panel */}
      {isOpen && (
        <div className="mb-4 w-[380px] h-[550px] max-h-[80vh] bg-slate-900/95 border border-slate-800/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-fade-in origin-bottom-right">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 to-indigo-950 border-b border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Bot size={22} className="animate-pulse" />
                </div>
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm tracking-wide">Trợ Lý Văn Phòng Kim</h3>
                <p className="text-[10px] text-slate-400 font-medium">Hỗ trợ quản trị 24/7</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {msg.role === 'model' && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-900/50 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                    <Bot size={15} />
                  </div>
                )}
                <div
                  className={`p-3.5 rounded-2xl text-sm leading-relaxed border ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 border-indigo-500 text-white rounded-tr-none'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {renderMessageText(msg.text)}
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex gap-3 max-w-[85%] animate-pulse">
                <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-900/50 flex items-center justify-center text-indigo-400 shrink-0">
                  <Bot size={15} />
                </div>
                <div className="p-3 bg-slate-950/40 border border-slate-800/80 text-slate-400 rounded-2xl rounded-tl-none flex items-center gap-1">
                  <Loader2 size={14} className="animate-spin text-indigo-400" />
                  <span className="text-xs font-medium">Kim đang suy nghĩ...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips */}
          {messages.length === 1 && !isLoading && (
            <div className="px-4 py-2 border-t border-slate-800/40 bg-slate-900/40 flex flex-wrap gap-2 shrink-0">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSend(suggestion)}
                  className="text-xs bg-slate-950/60 hover:bg-indigo-950/50 text-indigo-300/90 border border-slate-800 hover:border-indigo-800/50 px-3 py-1.5 rounded-full transition-all cursor-pointer font-medium"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Form Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(inputValue);
            }}
            className="p-3 bg-slate-950/65 border-t border-slate-800 flex gap-2 shrink-0 items-center"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-slate-900/80 border border-slate-800/70 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
              placeholder="Nhập câu hỏi của bạn..."
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white rounded-xl flex items-center justify-center transition-all shrink-0 shadow-lg shadow-indigo-500/10 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-110 active:scale-95 transition-all cursor-pointer border border-indigo-500/20 relative group overflow-hidden"
      >
        {/* Hover light wave effect */}
        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        {isOpen ? (
          <X size={24} className="rotate-0 transition-transform duration-300" />
        ) : (
          <div className="relative">
            <Sparkles size={24} className="text-white" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border border-indigo-600 rounded-full animate-ping" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 border border-indigo-600 rounded-full" />
          </div>
        )}
      </button>
    </div>
  );
}
