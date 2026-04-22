import React, { useState } from 'react';
import AssistantCard from './assistant_card';
import AssistantModal from './assistant_modal';
import ConfirmModal from './confirm_modal';

export default function Dashboard({ assistants, onRefresh, onLogout, onEnterChat, showToast }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAssistant, setEditingAssistant] = useState(null);
    
    // Estado para controlar la ventanita de confirmación de borrado
    const [confirmDialog, setConfirmDialog] = useState(null);

    const userName = localStorage.getItem('contexta_user') || 'Usuario';

    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem('contexta_token');
            const response = await fetch(`http://localhost:8000/api/asistentes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                onRefresh(); // Recargamos la lista desde el backend
                setConfirmDialog(null); // Cerramos el modal
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
            {/* Header del Dashboard */}
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

            {/* Cuadrícula Principal */}
            <main className="flex-1 p-8 overflow-y-auto">
                {/* Pantalla amigable si no hay agentes */}
                {assistants.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500">
                        <div className="w-20 h-20 mb-6 bg-gray-900 rounded-full flex items-center justify-center border border-gray-800">
                            <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold text-gray-400 mb-2">No tienes ningún asistente</h2>
                        <p className="text-sm">Crea tu primer agente en la parte superior derecha para empezar.</p>
                    </div>
                ) : (
                    /* Grid de tarjetas de los asistentes */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {assistants.map((assistant) => (
                            <AssistantCard
                                key={assistant.id}
                                assistant={assistant}
                                onEdit={() => { setEditingAssistant(assistant); setIsModalOpen(true); }}
                                // Al pulsar el botón de borrar, no borramos directamente, abrimos el modal
                                onDelete={() => setConfirmDialog({ id: assistant.id, name: assistant.name })}
                                onClick={() => onEnterChat(assistant)}
                            />
                        ))}
                    </div>
                )}
            </main>

            {/* MODAL DE CONFIRMACIÓN PARA BORRAR ASISTENTE */}
            {confirmDialog && (
                <ConfirmModal 
                    title="¿Eliminar asistente?"
                    message={`Vas a eliminar permanentemente a "${confirmDialog.name}" y todos sus documentos de la base de datos de IA. Esta acción no se puede deshacer.`}
                    onConfirm={() => handleDelete(confirmDialog.id)}
                    onCancel={() => setConfirmDialog(null)}
                />
            )}

            {/* MODAL DE EDICIÓN/CREACIÓN DE ASISTENTE */}
            {isModalOpen && (
                <AssistantModal 
                    assistant={editingAssistant} 
                    onClose={() => setIsModalOpen(false)} 
                    onSave={() => {
                        onRefresh();
                        setIsModalOpen(false); // Cerramos el modal tras guardar
                        showToast(editingAssistant ? "Asistente actualizado" : "Asistente creado con éxito", "success");
                    }} 
                    showToast={showToast} // Le pasamos el control de toasts para que los use al subir PDFs
                />
            )}
        </div>
    );
}