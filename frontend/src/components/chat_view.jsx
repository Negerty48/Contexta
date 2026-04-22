import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './chat_message';

export default function ChatView({ activeAssistantId, assistants = [], onSelectAssistant, onBack }) {
    // Extracción segura del ID
    const safeId = typeof activeAssistantId === 'object' ? activeAssistantId?.id : activeAssistantId;
    const currentAssistant = assistants.find(a => a.id === safeId);
    
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (currentAssistant) {
            setMessages([{ 
                role: 'ai', 
                content: `¡Hola! Soy ${currentAssistant.name}. He analizado mis documentos y estoy listo para ayudarte. ¿Qué necesitas saber?` 
            }]);
        }
    }, [safeId]);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages, isLoading]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        const newMessages = [...messages, { role: 'user', content: userMessage }];
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('contexta_token');
            const historialParaBackend = newMessages.map(msg => ({
                role: msg.role === 'ai' ? 'assistant' : 'user',
                content: msg.content
            }));

            const response = await fetch(`http://localhost:8000/api/asistentes/${currentAssistant.id}/chat`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pregunta: userMessage,
                    historial: historialParaBackend.slice(0, -1)
                })
            });

            if (!response.ok) throw new Error("Error en la respuesta del servidor");

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'ai', content: data.respuesta }]);

        } catch (error) {
            console.error("Error en el chat:", error);
            setMessages(prev => [...prev, { 
                role: 'ai', 
                content: "Lo siento, ha ocurrido un error al conectar con mis bases de datos. Por favor, inténtalo de nuevo." 
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const formatFileNames = (files) => {
        if (!files || files.length === 0) return "Sin documentos";
        return files.map(f => typeof f === 'object' ? f.name : f).join(', ');
    };

    // PANTALLA SALVAVIDAS: Si el asistente no se encuentra, mostramos un botón para huir.
    if (!currentAssistant) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-950 text-white gap-4">
                <div className="text-red-400 text-4xl mb-2">⚠️</div>
                <h2 className="text-xl font-bold">Error de sincronización</h2>
                <p className="text-gray-400">No se pudo cargar el agente seleccionado.</p>
                <button onClick={onBack} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors font-semibold">
                    Volver al Dashboard
                </button>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-65px)] overflow-hidden bg-gray-950">
            {/* SIDEBAR */}
            <aside className="w-72 border-r border-gray-800 bg-gray-900/50 flex flex-col">
                <div className="p-4 border-b border-gray-800 flex justify-between items-center">
                    <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tus Asistentes</h2>
                    <button onClick={onBack} className="text-xs text-blue-400 hover:underline">Volver</button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {assistants.map((ast) => {
                        const isActive = ast.id === safeId;
                        return (
                            <div
                                key={ast.id}
                                onClick={() => !isLoading && onSelectAssistant(ast.id)}
                                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                                    isActive
                                        ? 'bg-gray-800 border-blue-500 shadow-lg text-white'
                                        : 'hover:bg-gray-800/40 text-gray-400 border-transparent'
                                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
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

            {/* ÁREA DE CHAT */}
            <main className="flex-1 flex flex-col relative bg-gray-950">
                <div className="px-8 py-4 border-b border-gray-800 bg-gray-900/30 flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg shadow-blue-900/20">
                        {currentAssistant.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="font-bold text-gray-100">{currentAssistant.name}</h2>
                        <p className="text-xs text-green-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                            RAG Activo
                        </p>
                    </div>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-3xl mx-auto space-y-6">
                        {messages.map((msg, idx) => (
                            <ChatMessage key={idx} {...msg} />
                        ))}
                        
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-gray-900 border border-gray-800 text-gray-400 rounded-2xl rounded-tl-none p-4 max-w-[80%] flex items-center gap-2 shadow-sm">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                        <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                    </div>
                                    <span className="text-sm italic">Buscando en documentos...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6">
                    <form onSubmit={handleSend} className="max-w-3xl mx-auto relative">
                        <textarea
                            rows="1"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e); } }}
                            placeholder={isLoading ? "El asistente está escribiendo..." : `Pregunta a ${currentAssistant.name}...`}
                            disabled={isLoading}
                            className="w-full bg-gray-800 border border-gray-700 text-gray-100 rounded-2xl px-5 py-4 pr-16 focus:ring-2 focus:ring-blue-600 outline-none resize-none shadow-2xl disabled:opacity-50"
                        />
                        <button 
                            type="submit" 
                            disabled={!input.trim() || isLoading}
                            className="absolute right-3 top-4 p-2 bg-blue-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path>
                            </svg>
                        </button>
                    </form>
                    
                    <p className="text-[10px] text-center mt-3 text-gray-600 uppercase tracking-widest">
                        Contexto: {formatFileNames(currentAssistant.files)}
                    </p>
                </div>
            </main>
        </div>
    );
}