import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './chat_message';

export default function ChatView({ activeAssistant, assistants = [], onSelectAssistant, onBack, onRefresh }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    // Reiniciar mensajes solo cuando cambiamos de ID de asistente
    useEffect(() => {
        setMessages([
            { role: 'ai', content: `Hola, soy ${activeAssistant.name}. ¿En qué puedo ayudarte hoy?` }
        ]);
    }, [activeAssistant.id]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        setMessages([...messages, { role: 'user', content: input }]);
        setInput('');
    };

    return (
        <div className="flex h-[calc(100vh-65px)] overflow-hidden bg-gray-950 text-white">
            {/* Sidebar Izquierda */}
            <aside className="w-72 border-r border-gray-800 bg-gray-900/50 flex flex-col shrink-0">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tus Asistentes</h2>
                    <div className="flex gap-2">
                        {onRefresh && (
                            <button 
                                onClick={onRefresh} 
                                className="text-xs text-gray-400 hover:text-blue-400 transition-colors p-1"
                                title="Actualizar lista"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                </svg>
                            </button>
                        )}
                        <button onClick={onBack} className="text-xs text-blue-400 hover:underline">Volver</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {assistants.map((ast) => {
                        const isActive = activeAssistant.id === ast.id;
                        return (
                            <div
                                key={ast.id}
                                onClick={() => onSelectAssistant(ast)}
                                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                                    isActive
                                        ? 'bg-gray-800 border-blue-500 shadow-lg text-white'
                                        : 'hover:bg-gray-800/40 text-gray-400 border-transparent'
                                }`}
                            >
                                <p className="font-medium text-sm truncate">{ast.name}</p>
                                <p className={`text-[10px] ${isActive ? 'text-gray-300' : 'opacity-60'}`}>
                                    {ast.files?.length || 0} documentos
                                </p>
                            </div>
                        );
                    })}
                </div>
            </aside>

            {/* Chat Principal */}
            <main className="flex-1 flex flex-col relative bg-gray-950">
                <div className="px-8 py-4 border-b border-gray-800 bg-gray-900/30 flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">
                        {activeAssistant.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-100">{activeAssistant.name}</h2>
                        <p className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            RAG Activo
                        </p>
                    </div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-3xl mx-auto">
                        {messages.map((msg, idx) => (
                            <ChatMessage key={idx} {...msg} />
                        ))}
                    </div>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSend} className="max-w-3xl mx-auto relative group">
                        <textarea
                            rows="1"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                            placeholder={`Pregunta a ${activeAssistant.name}...`}
                            className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-2xl px-5 py-4 pr-16 focus:ring-2 focus:ring-blue-600 outline-none resize-none shadow-2xl"
                        />
                        <button type="submit" className="absolute right-3 top-4 p-2 bg-blue-600 text-white rounded-xl">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                            </svg>
                        </button>
                    </form>
                    
                    {/* SOLUCIÓN AL [OBJECT OBJECT] */}
                    <p className="text-[10px] text-center mt-3 text-gray-600 uppercase tracking-widest">
                        Contexto: {activeAssistant.files?.length > 0 
                            ? activeAssistant.files.map(f => f.name).join(', ') 
                            : 'Sin documentos'}
                    </p>
                </div>
            </main>
        </div>
    );
}