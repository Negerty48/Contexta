import React, { useState } from 'react';
import AssistantCard from './assistant_card';
import AssistantModal from './assistant_modal';
import ConfirmModal from './confirm_modal';

export default function Dashboard({ assistants, onRefresh, onLogout, onEnterChat, showToast, isFetching }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssistant, setEditingAssistant] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState(null);

    const userName = localStorage.getItem('contexta_user') || 'Usuario';

    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem('contexta_token');
            const response = await fetch(`https://contexta.azurewebsites.net/api/asistentes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                onRefresh();
                setConfirmDialog(null);
                showToast("Asistente y documentos eliminados de la IA correctamente.", "success");
            } else {
                throw new Error("No se pudo eliminar en el servidor");
            }
        } catch (error) { 
            console.error(error);
            setConfirmDialog(null);
            showToast("Error al eliminar el asistente. Inténtalo de nuevo.", "error");
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-950">
            <header className="flex items-center justify-between px-8 py-4 bg-gray-900 border-b border-gray-800 shrink-0">
                <h1 className="text-xl font-bold text-white">
                    Contexta <span className="text-blue-500 font-normal">| Platform</span>
                </h1>
                <div className="flex items-center gap-6">
                    <span className="text-sm text-gray-400">
                        Hola, <span className="font-semibold text-white">{userName}</span>
                    </span>
                    <button 
                        onClick={() => { setEditingAssistant(null); setIsModalOpen(true); }} 
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-900/20"
                    >
                        + Nuevo Asistente
                    </button>
                    <button 
                        onClick={onLogout} 
                        className="px-4 py-2 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            </header>

            <main className="flex-1 p-8 overflow-y-auto">
                {isFetching ? (
                    /* ESTADO 1: CARGANDO DATOS (Spinner) */
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
                        <div className="w-10 h-10 border-4 border-gray-800 border-t-blue-500 rounded-full animate-spin"></div>
                        <p className="text-sm">Sincronizando agentes...</p>
                    </div>
                ) : assistants.length === 0 ? (
                    /* ESTADO 2: CERO AGENTES (Con el botón circular funcionando) */
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <button 
                            onClick={() => { setEditingAssistant(null); setIsModalOpen(true); }}
                            className="w-20 h-20 mb-6 bg-gray-900 hover:bg-gray-800 rounded-full flex items-center justify-center border border-gray-700 cursor-pointer transition-all shadow-lg shadow-blue-900/10 group transform hover:scale-105"
                            title="Crear nuevo asistente"
                        >
                            <svg className="w-10 h-10 text-gray-500 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                        </button>
                        <h2 className="text-xl font-semibold text-gray-300 mb-2">No tienes ningún asistente</h2>
                        <p className="text-sm">Haz clic en el botón superior para crear tu primer agente.</p>
                    </div>
                ) : (
                    /* ESTADO 3: MOSTRAR AGENTES (Grid normal) */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {assistants.map((assistant) => (
                            <AssistantCard
                                key={assistant.id}
                                assistant={assistant}
                                onEdit={() => { setEditingAssistant(assistant); setIsModalOpen(true); }}
                                onDelete={() => setConfirmDialog({ id: assistant.id, name: assistant.name })}
                                onClick={() => onEnterChat(assistant)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {confirmDialog && (
                <ConfirmModal 
                    title="¿Eliminar asistente?"
                    message={`Vas a eliminar permanentemente a "${confirmDialog.name}" y todos sus documentos de la base de datos de IA. Esta acción no se puede deshacer.`}
                    onConfirm={() => handleDelete(confirmDialog.id)}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}

            {isModalOpen && (
                <AssistantModal 
                    assistant={editingAssistant} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={() => {
                        onRefresh();
                        setIsModalOpen(false);
                        showToast(editingAssistant ? "Asistente actualizado" : "Asistente creado con éxito", "success");
                    }} 
                    showToast={showToast}
                />
            )}
        </div>
    );
}