import React, { useState, useEffect } from 'react';
import Login from './components/login';
import Dashboard from './components/dashboard';
import ChatView from './components/chat_view';

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const [assistants, setAssistants] = useState([]); 
    const [activeAssistant, setActiveAssistant] = useState(null);

    const fetchAssistants = async () => {
        const token = localStorage.getItem('contexta_token');
        if (!token) return;
        
        try {
            const response = await fetch("http://localhost:8000/api/asistentes", {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAssistants(data);
            }
        } catch (error) {
            console.error("Error cargando asistentes:", error);
        }
    };

    // --- MAGIA DE SINCRONIZACIÓN ---
    // Si la lista de asistentes cambia (por un refresh), actualizamos el objeto
    // del asistente activo para que el Chat vea los nuevos archivos/nombres.
    useEffect(() => {
        if (activeAssistant) {
            const updated = assistants.find(a => a.id === activeAssistant.id);
            if (updated) {
                setActiveAssistant(updated);
            }
        }
    }, [assistants]);

    useEffect(() => {
        const token = localStorage.getItem('contexta_token');
        if (token) {
            setIsAuthenticated(true);
            fetchAssistants();
        }
        setIsLoading(false);
    }, []);

    const handleLogout = () => {
        localStorage.clear();
        setIsAuthenticated(false);
        setAssistants([]);
        setActiveAssistant(null);
    };

    if (isLoading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-blue-500">Cargando...</div>;

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">
            {!isAuthenticated ? (
                <Login onLogin={() => { setIsAuthenticated(true); fetchAssistants(); }} />
            ) : activeAssistant ? (
                <div className="flex flex-col h-screen">
                    <nav className="h-[65px] bg-gray-900 border-b border-gray-800 flex items-center px-8 shrink-0">
                        <h1 className="text-xl font-bold text-white tracking-wide">Contexta</h1>
                    </nav>
                    <ChatView
                        activeAssistant={activeAssistant}
                        assistants={assistants}
                        onSelectAssistant={setActiveAssistant}
                        onBack={() => setActiveAssistant(null)}
                        onRefresh={fetchAssistants}
                    />
                </div>
            ) : (
                <Dashboard
                    assistants={assistants}
                    onLogout={handleLogout}
                    onEnterChat={setActiveAssistant}
                    onRefresh={fetchAssistants}
                />
            )}
        </div>
    );
}