import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './chat_message';

export default function ChatView({ activeAssistant, assistants, onSelectAssistant, onBack }) {
    const [messages, setMessages] = useState([
        { role: 'ai', content: `Hola, soy ${activeAssistant.name}. ¿En qué puedo ayudarte hoy con los documentos que has subido?` }
    ]);
    const [input, setInput] = useState('');
    const scrollRef = useRef(null);

    // Auto-scroll al final cuando hay mensajes nuevos
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Añadir mensaje del usuario
        const newMessages = [...messages, { role: 'user', content: input }];
        setMessages(newMessages);
        setInput('');

        // Aquí es donde en el futuro llamarías a tu API de Backend/LLM
        console.log("Enviando a la IA:", input);
    };

    return (
        <div className="flex h-[calc(100vh-65px)] overflow-hidden bg-gray-950">
            {/* Sidebar Izquierda: Lista de Asistentes */}
            <aside className="w-72 border-r border-gray-800 bg-gray-900/50 flex flex-col">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tus Asistentes</h2>
                    <button onClick={onBack} className="text-xs text-blue-400 hover:underline">Volver</button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {assistants.map((ast) => (
                        <div
                            key={ast.id}
                            onClick={() => onSelectAssistant(ast)}
                            className={`p-3 rounded-xl cursor-pointer transition-all ${activeAssistant.id === ast.id
                                    ? 'bg-blue-600/10 border border-blue-500/50 text-blue-400'
                                    : 'hover:bg-gray-800 text-gray-400 border border-transparent'
                                }`}
                        >
                            <p className="font-medium text-sm truncate">{ast.name}</p>
                            <p className="text-[10px] opacity-60 truncate">{ast.files.length} documentos</p>
                        </div>
                    ))}
                </div>
            </aside>

            {/* Ventana de Chat Derecha */}
            <main className="flex-1 flex flex-col relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-900 via-gray-950 to-gray-950">
                {/* Header del Chat */}
                <div className="px-8 py-4 border-b border-gray-800 bg-gray-900/30 backdrop-blur-md flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/20">
                        {activeAssistant.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-100">{activeAssistant.name}</h2>
                        <p className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            Aislado y listo (RAG Activo)
                        </p>
                    </div>
                </div>

                {/* Área de Mensajes */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto p-8 scroll-smooth"
                >
                    <div className="max-w-3xl mx-auto">
                        {messages.map((msg, idx) => (
                            <ChatMessage key={idx} {...msg} />
                        ))}
                    </div>
                </div>

                {/* Caja de Entrada (Input) */}
                <div className="p-6">
                    <form
                        onSubmit={handleSend}
                        className="max-w-3xl mx-auto relative group"
                    >
                        <textarea
                            rows="1"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) handleSend(e); }}
                            placeholder={`Pregunta a ${activeAssistant.name}...`}
                            className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-2xl px-5 py-4 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none shadow-2xl placeholder:text-gray-500"
                        />
                        <button
                            type="submit"
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:grayscale"
                            disabled={!input.trim()}
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                            </svg>
                        </button>
                    </form>
                    <p className="text-[10px] text-center mt-3 text-gray-600 uppercase tracking-widest">
                        Contexto: {activeAssistant.files.join(', ') || 'Sin documentos'}
                    </p>
                </div>
            </main>
        </div>
    );
}