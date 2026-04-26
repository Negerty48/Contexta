import React from 'react';

export default function ConfirmModal({ title, message, onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in">
                <div className="text-red-400 text-4xl mb-4 text-center">⚠️</div>
                <h3 className="text-lg font-bold text-white text-center mb-2">{title}</h3>
                <p className="text-sm text-gray-400 text-center mb-6">{message}</p>
                
                <div className="flex gap-3">
                    <button 
                        onClick={onCancel}
                        className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                    >
                        No
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                        Sí
                    </button>
                </div>
            </div>
        </div>
    );
}