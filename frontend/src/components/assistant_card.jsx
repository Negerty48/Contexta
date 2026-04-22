import React from 'react';

export default function AssistantCard({ assistant, onEdit, onDelete, onClick }) {
    return (
        <div
            onClick={onClick}
            className="group relative bg-gray-900 border border-gray-800 rounded-2xl p-6 cursor-pointer hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all duration-300 flex flex-col h-56 overflow-hidden"
        >
            {/* Efecto de gradiente sutil de fondo */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600 opacity-50 group-hover:opacity-100 transition-opacity"></div>

            <div className="flex justify-between items-start mb-4 z-10">
                <div>
                    <h3 className="text-xl font-bold text-gray-100 group-hover:text-blue-400 transition-colors">
                        {assistant.name}
                    </h3>
                </div>

                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="p-2 bg-gray-800 hover:bg-gray-700 hover:text-white text-gray-400 rounded-lg transition-colors"
                        title="Editar"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-2 bg-gray-800 hover:bg-red-900/80 hover:text-red-300 text-gray-400 rounded-lg transition-colors"
                        title="Eliminar"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </div>

            <p className="text-gray-400 text-sm flex-1 line-clamp-3 z-10 leading-relaxed">
                {assistant.description || 'Asistente sin descripción configurada. Añade detalles para identificar su propósito.'}
            </p>

            <div className="mt-4 pt-4 border-t border-gray-800/80 flex items-center gap-2 text-xs text-gray-500 font-medium z-10">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <span>{assistant.files.length} {assistant.files.length === 1 ? 'Documento' : 'Documentos'}</span>
            </div>
        </div>
    );
}