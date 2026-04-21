import React, { useState } from 'react';
import AssistantCard from './assistant_card';
import AssistantModal from './assistant_modal';

export default function Dashboard({ assistants, setAssistants, onLogout, onEnterChat }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssistant, setEditingAssistant] = useState(null);
    const [toastMessage, setToastMessage] = useState(null);

    const showToast = (message) => {
        setToastMessage(message);
        setTimeout(() => {
            setToastMessage(null);
        }, 2000);
    };

    const handleOpenModal = (assistant = null) => {
        setEditingAssistant(assistant);
        setIsModalOpen(true);
    };

    const handleSave = (assistantData) => {
        if (editingAssistant) {
            setAssistants(assistants.map(a => a.id === editingAssistant.id ? { ...assistantData, id: a.id } : a));
        } else {
            setAssistants([...assistants, { ...assistantData, id: Date.now().toString() }]);
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id) => {
        setAssistants(assistants.filter(a => a.id !== id));
        showToast('Asistente eliminado correctamente');
    };

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between px-8 py-4 bg-gray-900 border-b border-gray-800">
                <h1 className="text-xl font-bold text-white tracking-wide">Contexta <span className="text-blue-500 font-normal">| Platform</span></h1>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => handleOpenModal()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-sm font-medium rounded-lg transition-colors"
                    >
                        + Nuevo Asistente
                    </button>
                    <button onClick={onLogout} className="px-4 py-2 text-sm text-red-400 hover:bg-gray-800 rounded-lg transition-colors">
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            {/* Grid */}
            <main className="flex-1 p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {assistants.map((assistant) => (
                        <AssistantCard
                            key={assistant.id}
                            assistant={assistant}
                            onEdit={() => handleOpenModal(assistant)}
                            onDelete={() => handleDelete(assistant.id)}
                            onClick={() => onEnterChat(assistant)}
                        />
                    ))}
                </div>
            </main>

            {/* Modal */}
            {isModalOpen && (
                <AssistantModal
                    assistant={editingAssistant}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSave}
                />
            )}

            {/* Componente Toast (Popup inferior) */}
            {toastMessage && (
                <div className="fixed bottom-8 right-8 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden min-w-[300px] animate-slideIn z-50">
                    <div className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                            <span className="text-green-400 text-sm font-bold">✓</span>
                        </div>
                        <p className="text-sm font-medium text-gray-100">{toastMessage}</p>
                    </div>
                    <div className="h-1 bg-gray-700 w-full relative">
                        <div className="absolute top-0 left-0 h-full bg-blue-500 animate-shrink"></div>
                    </div>
                </div>
            )}
        </div>
    );
}