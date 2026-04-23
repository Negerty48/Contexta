import React, { useState, useEffect, useRef } from 'react';

export default function ChatView({ activeAssistantId, assistants, onSelectAssistant, onBack }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');    
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);     
    const [isThinking, setIsThinking] = useState(false); 
    const messagesEndRef = useRef(null);
    const currentAssistant = assistants.find(a => a.id === activeAssistantId);
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isThinking]);

    // Cargar historial al cambiar de agente
    useEffect(() => {
        const cargarHistorial = async () => {
            if (!currentAssistant) return;
            
            setIsLoadingHistory(true);
            setMessages([]);
            
            try {
                const token = localStorage.getItem('contexta_token');
                const response = await fetch(`https://contexta.azurewebsites.net:8000/api/asistentes/${currentAssistant.id}/historial`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.length > 0) {
                        setMessages(data.map(m => ({
                            role: m.role === 'assistant' ? 'ai' : 'user',
                            content: m.content
                        })));
                    } else {                        
                        setMessages([{ 
                            role: 'ai', 
                            content: `¡Hola! Soy ${currentAssistant.name}. ¿En qué puedo ayudarte?` 
                        }]);
                    }
                }
            } catch (error) {
                console.error("Error cargando historial:", error);
            } finally {
                setIsLoadingHistory(false);
            }
        };

        cargarHistorial();
    }, [currentAssistant?.id]);

    // Enviar un mensaje nuevo
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isThinking || isLoadingHistory) return;

        const userMessage = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        
        setIsThinking(true);

        try {
            const token = localStorage.getItem('contexta_token');
            const response = await fetch(`https://contexta.azurewebsites.net:8000/api/asistentes/${currentAssistant.id}/chat`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' 
                },                
                body: JSON.stringify({ pregunta: userMessage, historial: [] }) 
            });

            if (response.ok) {
                const data = await response.json();
                setMessages(prev => [...prev, { role: 'ai', content: data.respuesta }]);
            } else {
                setMessages(prev => [...prev, { role: 'ai', content: "Error en el servidor. Inténtalo de nuevo." }]);
            }
        } catch (error) {
            setMessages(prev => [...prev, { role: 'ai', content: "Ocurrió un error inesperado de conexión." }]);
        } finally {
            setIsThinking(false);
        }
    };

    if (!currentAssistant) return null;

    return (
        <div className="flex h-full bg-gray-950 overflow-hidden">
            {/* SIDEBAR DE ASISTENTES */}
            <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Tus Agentes</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {assistants.map(a => (
                        <button
                            key={a.id}
                            onClick={() => onSelectAssistant(a)}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all text-sm truncate ${
                                a.id === currentAssistant.id 
                                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-transparent'
                            }`}
                        >
                            <span className="font-medium block truncate">{a.name}</span>
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-800">
                    <button 
                        onClick={onBack}
                        className="w-full py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                        Volver
                    </button>
                </div>
            </div>

            {/* ZONA PRINCIPAL DE CHAT */}
            <div className="flex-1 flex flex-col h-full relative">
                
                {/* CABECERA DEL CHAT */}
                <header className="h-[65px] bg-gray-900/50 backdrop-blur-md border-b border-gray-800 flex items-center px-6 shrink-0 z-10">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            {currentAssistant.name}
                        </h2>
                        <p className="text-xs text-gray-500 truncate max-w-md">{currentAssistant.description}</p>
                    </div>
                </header>

                {/* ÁREA DE MENSAJES */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {isLoadingHistory ? (                        
                        <div className="h-full flex flex-col items-center justify-center space-y-4">
                            <div className="flex space-x-2">
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                    ) : (                        
                        <>
                            {messages.map((msg, idx) => (
                                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] px-5 py-4 rounded-2xl shadow-sm text-sm whitespace-pre-wrap leading-relaxed ${
                                        msg.role === 'user' 
                                            ? 'bg-blue-600 text-white rounded-tr-sm' 
                                            : 'bg-gray-900 border border-gray-800 text-gray-100 rounded-tl-sm'
                                    }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}

                            {isThinking && (
                                <div className="flex justify-start">
                                    <div className="bg-gray-900 border border-gray-800 text-gray-100 rounded-2xl rounded-tl-sm px-5 py-4 flex items-center space-x-2 shadow-sm">
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* ÁREA DE INPUT */}
                <div className="p-4 bg-gray-950 border-t border-gray-800 shrink-0">
                    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto relative flex items-center">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isLoadingHistory || isThinking}
                            placeholder={isLoadingHistory ? "Cargando..." : "Escribe tu mensaje..."}
                            className="w-full bg-gray-900 border border-gray-800 text-white rounded-xl pl-5 pr-14 py-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all shadow-inner"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoadingHistory || isThinking}
                            className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-md"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                        </button>
                    </form>
                    <div className="text-center mt-2">
                        <span className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Contexta AI Platform</span>
                    </div>
                </div>

            </div>
        </div>
    );
}