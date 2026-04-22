import React, { useEffect } from 'react';

export default function Toast({ message, type = 'success', onClose }) {
    // Autocierre después de 3 segundos
    useEffect(() => {
        const timer = setTimeout(() => onClose(), 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const isError = type === 'error';

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in-up">
            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${
                isError 
                    ? 'bg-red-900/90 border-red-700 text-red-100 shadow-red-900/20' 
                    : 'bg-green-900/90 border-green-700 text-green-100 shadow-green-900/20'
            }`}>
                {isError ? '❌' : '✅'}
                <p className="text-sm font-medium">{message}</p>
                <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">✕</button>
            </div>
        </div>
    );
}