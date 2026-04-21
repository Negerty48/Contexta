import React, { useState } from 'react';
import Login from './components/login';
import Dashboard from './components/dashboard';
import ChatView from './components/chat_view';

const MOCK_DATA = [
    { id: '1', name: 'Analista Financiero', description: 'Experto en leer balances de Q3 y Q4.', systemPrompt: 'Eres un analista financiero...', files: ['balance_q3.pdf'] },
    { id: '2', name: 'Soporte Técnico L1', description: 'Responde dudas frecuentes usando la base de conocimiento.', systemPrompt: 'Eres soporte técnico...', files: ['faq_2026.docx'] }
];

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Estado global para compartir entre vistas
    const [activeAssistant, setActiveAssistant] = useState(null);
    const [assistants, setAssistants] = useState(MOCK_DATA);

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
            {!isAuthenticated ? (
                <Login onLogin={() => setIsAuthenticated(true)} />
            ) : activeAssistant ? (
                /* Vista de Chat */
                <div className="flex flex-col h-screen">
                    <nav className="h-[65px] bg-gray-900 border-b border-gray-800 flex items-center px-8 shrink-0">
                        <h1 className="text-xl font-bold text-white tracking-wide">Contexta</h1>
                    </nav>
                    <ChatView
                        activeAssistant={activeAssistant}
                        assistants={assistants}
                        onSelectAssistant={setActiveAssistant}
                        onBack={() => setActiveAssistant(null)}
                    />
                </div>
            ) : (
                /* Vista de Cuadrícula Principal */
                <Dashboard
                    assistants={assistants}
                    setAssistants={setAssistants}
                    onLogout={() => setIsAuthenticated(false)}
                    onEnterChat={setActiveAssistant}
                />
            )}
        </div>
    );
}