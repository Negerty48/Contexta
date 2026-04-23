import React, { useState } from 'react';
import ConfirmModal from './confirm_modal';

export default function AssistantModal({ assistant, onClose, onSave, showToast }) {
    const isEditing = !!assistant;
    
    // Estados del formulario
    const [name, setName] = useState(assistant ? assistant.name : '');
    const [description, setDescription] = useState(assistant ? assistant.description || '' : '');
    const [systemPrompt, setSystemPrompt] = useState(assistant ? assistant.systemPrompt : '');
    
    const [newFiles, setNewFiles] = useState([]);
    const [existingFiles, setExistingFiles] = useState(assistant ? assistant.files : []);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmDeleteDoc, setConfirmDeleteDoc] = useState(null);

    // FUNCIÓN PARA ELIMINAR ARCHIVOS NUEVOS DE LA COLA
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const filesArray = Array.from(e.target.files);
            setNewFiles(prev => [...prev, ...filesArray]);
            e.target.value = ''; // Limpiamos el input
        }
    };

    const handleRemoveNewFile = (indexToRemove) => {
        setNewFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    // CORRECCIÓN: RUTA DE BORRADO DE DOCUMENTO
    const executeDeleteFile = async (docId) => {
        try {
            const token = localStorage.getItem('contexta_token');
            // Usamos la ruta correcta que tienes en tu backend
            const response = await fetch(`https://contexta.azurewebsites.net:8000/api/asistentes/${assistant.id}/documentos/${docId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setExistingFiles(prev => prev.filter(f => f.id !== docId));
                setConfirmDeleteDoc(null);
                showToast("Documento eliminado de la IA con éxito", "success");
            } else {
                throw new Error("Error del servidor al borrar");
            }
        } catch (error) {
            console.error(error);
            setConfirmDeleteDoc(null);
            showToast("Error al borrar el documento. Inténtalo de nuevo.", "error");
        }
    };

    // FUNCIÓN PARA GUARDAR / ACTUALIZAR
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('systemPrompt', systemPrompt);
        
        if (newFiles.length > 0) {
            newFiles.forEach(file => {
                formData.append('files', file); 
            });
        }

        try {
            const token = localStorage.getItem('contexta_token');
            const url = isEditing 
                ? `https://contexta.azurewebsites.net:8000/api/asistentes/${assistant.id}` 
                : 'https://contexta.azurewebsites.net:8000/api/asistentes';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` }, // NO enviar Content-Type, fetch lo hace automático con FormData
                body: formData
            });

            if (response.ok) {
                onSave();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Error al procesar la petición (422/500)");
            }
        } catch (error) {
            console.error("Error guardando:", error);
            showToast(error.message, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-40 p-4">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-fade-in-up">
                    
                    <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 rounded-t-2xl shrink-0">
                        <h2 className="text-xl font-bold text-white">
                            {isEditing ? 'Configurar Agente' : 'Crear Nuevo Agente'}
                        </h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Nombre del Agente</label>
                                <input 
                                    required
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder="Ej: Asistente Legal"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Descripción Breve</label>
                                <input 
                                    value={description} 
                                    onChange={e => setDescription(e.target.value)} 
                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                                    placeholder="Especialista en contratos..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-300">Instrucciones base</label>
                            <textarea 
                                required
                                rows="4" 
                                value={systemPrompt} 
                                onChange={e => setSystemPrompt(e.target.value)} 
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none font-mono text-sm" 
                                placeholder="Eres un experto en..."
                            />
                        </div>

                        <div className="space-y-4 pt-4 border-t border-gray-800">
                            <div>
                                <h3 className="text-sm font-bold text-gray-200">Base de Conocimiento (RAG)</h3>
                                <p className="text-xs text-gray-500">Sube PDFs, DOCX, PPTX, TXT o MD para entrenar a tu agente.</p>
                            </div>
                            
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-800 border-dashed rounded-xl cursor-pointer bg-gray-950/50 hover:bg-gray-800/50 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <svg className="w-8 h-8 mb-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                        <p className="mb-2 text-sm text-gray-400"><span className="font-semibold text-blue-500">Haz clic para subir</span> o arrastra y suelta</p>
                                    </div>
                                    <input type="file" multiple onChange={handleFileChange} className="hidden" />
                                </label>
                            </div>

                            {newFiles.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Archivos listos para procesar:</p>
                                    {newFiles.map((file, i) => (
                                        <div key={i} className="flex justify-between items-center text-xs text-gray-300 bg-blue-900/20 border border-blue-800/50 px-3 py-2 rounded-lg">
                                            <span className="flex items-center gap-2">📄 {file.name}</span>
                                            <button 
                                                type="button" 
                                                onClick={() => handleRemoveNewFile(i)}
                                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1 rounded transition-colors"
                                                title="Descartar archivo"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {isEditing && existingFiles?.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold text-green-500 uppercase tracking-wider">Documentos en la base de datos IA:</p>
                                    {existingFiles.map(file => {
                                        const fileName = typeof file === 'object' ? file.name : file;
                                        const fileId = typeof file === 'object' ? file.id : null;

                                        return (
                                            <div key={fileId || fileName} className="flex justify-between items-center bg-gray-950 border border-gray-800 p-3 rounded-lg group hover:border-gray-700 transition-colors">
                                                <span className="text-sm text-gray-300 flex items-center gap-2">
                                                    <span className="text-green-500 font-bold">✓</span> {fileName}
                                                </span>
                                                
                                                {fileId && (
                                                    <button 
                                                        type="button" 
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setConfirmDeleteDoc({ id: fileId, name: fileName });
                                                        }} 
                                                        className="text-red-500 hover:bg-red-500/10 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                                        title="Eliminar documento de la IA"
                                                    >
                                                        <svg className="w-5 h-5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </form>

                    <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50 rounded-b-2xl flex justify-end gap-3 shrink-0">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-400 hover:bg-gray-800 rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            disabled={isSubmitting}
                            className="px-5 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-blue-900/20"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                    Guardando...
                                </>
                            ) : 'Guardar Agente'}
                        </button>
                    </div>
                </div>
            </div>

            {confirmDeleteDoc && (
                <ConfirmModal 
                    title="¿Eliminar documento de la IA?"
                    message={`Vas a borrar permanentemente "${confirmDeleteDoc.name}". La inteligencia artificial olvidará toda la información que contenía este archivo.`}
                    onConfirm={() => executeDeleteFile(confirmDeleteDoc.id)}
                    onCancel={() => setConfirmDeleteDoc(null)}
                />
            )}
        </>
    );
}