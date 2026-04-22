import React, { useState, useEffect, useRef } from 'react';

export default function AssistantModal({ assistant, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        systemPrompt: '',
    });
    
    // Archivos que el usuario selecciona para subir ahora
    const [newFiles, setNewFiles] = useState([]);
    // Archivos que ya están en el servidor (solo en modo edición)
    const [existingFiles, setExistingFiles] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (assistant) {
            setFormData({
                name: assistant.name || '',
                description: assistant.description || '',
                systemPrompt: assistant.systemPrompt || '',
            });
            setExistingFiles(assistant.files || []);
        }
    }, [assistant]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileInput = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setNewFiles(prev => [...prev, ...selectedFiles]);
        e.target.value = null;
    };

    // BORRAR UN DOCUMENTO ESPECÍFICO (Ya guardado en Azure)
    const handleDeleteExistingFile = async (docId) => {
        if (!window.confirm("¿Seguro que quieres borrar este documento de la nube?")) return;
        
        try {
            const token = localStorage.getItem('contexta_token');
            const response = await fetch(`http://localhost:8000/api/asistentes/${assistant.id}/documentos/${docId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setExistingFiles(prev => prev.filter(f => f.id !== docId));
                onSave(); // Refresca el estado global
            }
        } catch (error) {
            console.error("Error al borrar documento:", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const data = new FormData();
        data.append('name', formData.name);
        data.append('description', formData.description);
        data.append('systemPrompt', formData.systemPrompt);
        
        newFiles.forEach(file => {
            data.append('files', file);
        });

        try {
            const token = localStorage.getItem('contexta_token');
            
            // LA MAGIA: Si hay 'assistant', es edición (PUT). Si no, es creación (POST).
            const isEditing = Boolean(assistant);
            const url = isEditing 
                ? `http://localhost:8000/api/asistentes/${assistant.id}` 
                : "http://localhost:8000/api/asistentes";
            
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
                body: data
            });

            if (response.ok) {
                if (onSave) {
                    await Promise.resolve(onSave()); 
                }
                onClose();
            } else {
                alert("Error al guardar el asistente");
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl text-white">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900 z-10">
                    <h2 className="text-xl font-bold">{assistant ? 'Editar Asistente' : 'Nuevo Asistente'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre</label>
                            <input name="name" required value={formData.name} onChange={handleChange} className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Descripción</label>
                            <input name="description" value={formData.description} onChange={handleChange} className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">System Prompt</label>
                        <textarea name="systemPrompt" required rows="4" value={formData.systemPrompt} onChange={handleChange} className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Conocimiento (Documentos)</label>
                        <div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-gray-700 bg-gray-950/50 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-all">
                            <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileInput} />
                            <p className="text-gray-400 text-sm">Clic para subir PDFs o documentos</p>
                        </div>

                        {/* LISTA DE ARCHIVOS NUEVOS (POR SUBIR) */}
                        {newFiles.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <p className="text-xs font-bold text-blue-400 uppercase">Para subir:</p>
                                {newFiles.map((file, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-blue-900/20 px-3 py-2 rounded-md border border-blue-800/50 text-sm">
                                        <span className="truncate">📄 {file.name}</span>
                                        <button type="button" onClick={() => setNewFiles(newFiles.filter((_, i) => i !== idx))} className="text-red-400">Quitar</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* LISTA DE ARCHIVOS EXISTENTES (EN AZURE) */}
                        {existingFiles.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <p className="text-xs font-bold text-green-400 uppercase">En la nube:</p>
                                {existingFiles.map((file) => (
                                    <div key={file.id} className="flex justify-between items-center bg-gray-800 px-3 py-2 rounded-md border border-gray-700 text-sm">
                                        <span className="truncate text-gray-300">✅ {file.name}</span>
                                        <button type="button" onClick={() => handleDeleteExistingFile(file.id)} className="text-red-400 hover:underline">Borrar</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-gray-800 flex justify-end gap-3 sticky bottom-0 bg-gray-900">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-800 rounded-lg">Cancelar</button>
                        <button type="submit" disabled={isSaving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md disabled:opacity-50">
                            {isSaving ? 'Guardando...' : (assistant ? 'Actualizar' : 'Crear Asistente')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}