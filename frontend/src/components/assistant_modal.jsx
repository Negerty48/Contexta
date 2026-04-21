import React, { useState, useEffect, useRef } from 'react';

export default function AssistantModal({ assistant, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        systemPrompt: '',
        files: []
    });

    // Referencia para el input de archivo oculto
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (assistant) setFormData(assistant);
    }, [assistant]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Función para manejar tanto el Drag&Drop como el Input manual
    const processFiles = (filesArray) => {
        if (filesArray.length > 0) {
            const newFileNames = filesArray.map(file => file.name);
            setFormData(prev => ({ ...prev, files: [...prev.files, ...newFileNames] }));
        }
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        processFiles(Array.from(e.dataTransfer.files));
    };

    const handleFileInput = (e) => {
        processFiles(Array.from(e.target.files));
        // Limpiamos el valor para poder subir el mismo archivo dos veces si lo borramos
        e.target.value = null;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center sticky top-0 bg-gray-900 z-10">
                    <h2 className="text-xl font-bold">{assistant ? 'Editar Asistente' : 'Nuevo Asistente'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-xl transition-colors">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Nombre del Agente</label>
                            <input
                                name="name" required value={formData.name} onChange={handleChange}
                                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Descripción Breve</label>
                            <input
                                name="description" value={formData.description} onChange={handleChange}
                                className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">System Prompt</label>
                        <textarea
                            name="systemPrompt" required rows="4" value={formData.systemPrompt} onChange={handleChange}
                            placeholder="Ej: Eres un asistente experto..."
                            className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none transition-all"
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Conocimiento (RAG Files)</label>

                        {/* Dropzone interactiva */}
                        <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleFileDrop}
                            onClick={() => fileInputRef.current.click()}
                            className="border-2 border-dashed border-gray-700 bg-gray-950/50 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-gray-800 transition-all duration-200 group"
                        >
                            {/* Input oculto real */}
                            <input
                                type="file"
                                multiple
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileInput}
                            />
                            <p className="text-gray-400 text-sm group-hover:text-blue-400 transition-colors">Arrastra tus archivos aquí o haz clic para abrir el explorador</p>
                            <p className="text-xs text-gray-600 mt-1">Soporta PDF, DOCX, TXT</p>
                        </div>

                        {formData.files.length > 0 && (
                            <div className="mt-4 space-y-2">
                                {formData.files.map((file, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-gray-800 px-3 py-2 rounded-md text-sm border border-gray-700">
                                        <span className="truncate pr-4 text-gray-300">📄 {file}</span>
                                        <button type="button" className="text-red-400 hover:text-red-300 text-xs p-1 rounded hover:bg-red-400/10 transition-colors" onClick={() => {
                                            setFormData(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }))
                                        }}>Eliminar</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-4 border-t border-gray-800 flex justify-end gap-3 sticky bottom-0 bg-gray-900 pb-2 z-10">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">Cancelar</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-colors">
                            {assistant ? 'Guardar Cambios' : 'Crear Asistente'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}