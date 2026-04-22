import React, { useState, useEffect } from 'react';
import AssistantCard from './assistant_card';
import AssistantModal from './assistant_modal';

export default function Dashboard({ assistants = [], onLogout, onEnterChat, onRefresh }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssistant, setEditingAssistant] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);
    const userName = localStorage.getItem('contexta_user') || 'Usuario';

    const showToast = (message) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 2000);
    };

    const handleOpenModal = (assistant = null) => {
        setEditingAssistant(assistant);
        setIsModalOpen(true);
    };

    // BORRAR ASISTENTE DE LA BBDD Y AZURE
    const handleDelete = async (id) => {
        if (!window.confirm("¿Estás seguro? Se borrarán todos los documentos asociados en Azure.")) return;
        
        try {
            const token = localStorage.getItem('contexta_token');
            const response = await fetch(`http://localhost:8000/api/asistentes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                showToast('Asistente eliminado correctamente');
                onRefresh();
            }
        } catch (error) {
            console.error("Error al eliminar:", error);
        }
    };

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-gray-950">            
            <header className="flex items-center justify-between px-8 py-4 bg-gray-900 border-b border-gray-800">
                <h1 className="text-xl font-bold text-white tracking-wide">
                    Contexta <span className="text-blue-500 font-normal">| Platform</span>
                </h1>
                <div className="flex items-center gap-6">
                    <span className="text-sm text-gray-400">Hola, <span className="font-semibold text-white">{userName}</span></span>
                    <button onClick={() => handleOpenModal()} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-sm font-medium rounded-lg text-white">+ Nuevo Asistente</button>
                    <button onClick={onLogout} className="px-4 py-2 text-sm text-red-400 hover:bg-gray-800 rounded-lg">Cerrar Sesión</button>
                </div>
            </header>

            <main className="flex-1 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {assistants.length === 0 ? (
                        <div className="col-span-full text-center py-20 text-gray-500">No tienes asistentes. ¡Crea el primero!</div>
                    ) : (
                        assistants.map((assistant) => (
                            <AssistantCard
                                key={assistant.id}
                                assistant={assistant}
                                onEdit={() => handleOpenModal(assistant)}
                                onDelete={() => handleDelete(assistant.id)}
                                onClick={() => onEnterChat(assistant)}
                            />
                        ))
                    )}
                </div>
            </main>

            {isModalOpen && (
                <AssistantModal
                    assistant={editingAssistant}
                    onClose={() => setIsModalOpen(false)}
                    onSave={async () => {
                        await onRefresh();
                        setIsModalOpen(false);
                    }}
                />
            )}

            {toastMessage && (
                <div className="fixed bottom-8 right-8 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl p-4 text-white animate-slideIn">
                    {toastMessage}
                </div>
            )}
        </div>
    );
}