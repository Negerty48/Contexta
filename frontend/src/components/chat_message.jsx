import React from 'react';

export default function ChatMessage({ role, content }) {
    const isUser = role === 'user';

    return (
        <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-tl-none'
                }`}>
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">
                        {isUser ? 'Tú' : 'Asistente'}
                    </span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
            </div>
        </div>
    );
}