import React, { useState, useEffect } from 'react';
import Login from './components/login';
import Dashboard from './components/dashboard';
import ChatView from './components/chat_view';
import Toast from './components/toast';

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [assistants, setAssistants] = useState([]);        
    const [activeAssistantId, setActiveAssistantId] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

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
        } catch (error) { console.error("Error:", error); }
    };

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
        setActiveAssistantId(null);
    };
    
    const handleEnterChat = (data) => {
        if (!data) {
            setActiveAssistantId(null);
        } else if (typeof data === 'string') {
            setActiveAssistantId(data);
        } else if (data.id) {
            setActiveAssistantId(data.id);
        }
    };

    if (isLoading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-blue-500">Cargando...</div>;

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">            
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {!isAuthenticated ? (
                <Login onLogin={() => { setIsAuthenticated(true); fetchAssistants(); }} />
            ) : activeAssistantId ? (
                <div className="flex flex-col h-screen">
                    <nav className="h-[65px] bg-gray-900 border-b border-gray-800 flex items-center px-8 shrink-0">
                        <h1 className="text-xl font-bold text-white tracking-wide">Contexta</h1>
                    </nav>
                    <ChatView
                        activeAssistantId={activeAssistantId}
                        assistants={assistants}
                        onSelectAssistant={handleEnterChat}
                        onBack={() => setActiveAssistantId(null)}
                    />
                </div>
            ) : (
                <Dashboard
                    assistants={assistants}
                    onRefresh={fetchAssistants}
                    onLogout={handleLogout}
                    onEnterChat={handleEnterChat}
                    showToast={showToast}
                />
            )}
        </div>
    );
}