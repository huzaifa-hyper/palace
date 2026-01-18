"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { sendMessageToArbiter, initializeChatSession } from '../services/geminiService';
import { ChatMessage } from '../types';

export const Arbiter: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'I am the Arbiter. I know all rules of this game. Ask me about card interactions, hierarchy, or special cases.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (process.env.API_KEY) {
      initializeChatSession(process.env.API_KEY);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      const responseText = await sendMessageToArbiter(userText);
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: "The connection to the Arbiter is severed. Please check your configuration.", isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden">
      <div className="bg-slate-900 p-4 border-b border-slate-700 flex items-center gap-3">
        <div className="bg-amber-500/20 p-2 rounded-full">
          <Sparkles className="w-5 h-5 text-amber-400" />
        </div>
        <div>
          <h3 className="font-playfair font-bold text-lg text-amber-50">The Arbiter</h3>
          <p className="text-xs text-slate-400">AI Rules Engine</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-5 h-5 text-amber-400" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl p-3 text-sm leading-relaxed ${msg.role === 'user' ? 'bg-amber-600 text-white rounded-tr-none' : 'bg-slate-700 text-slate-200 rounded-tl-none'}`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-xs text-slate-500 italic">Thinking...</div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 bg-slate-900 border-t border-slate-700 flex gap-2">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a rule..." className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-slate-200" />
        <button type="submit" disabled={!input.trim() || isLoading} className="bg-amber-600 p-3 rounded-lg"><Send className="w-5 h-5" /></button>
      </form>
    </div>
  );
};
