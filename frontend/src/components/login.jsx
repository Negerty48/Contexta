import React, { useState } from 'react';

export default function Login({ onLogin }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState(null); // Estado para guardar errores

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null); // Limpiamos errores previos
    
    if (isSignUp) {
      if (!name) return;
      try {
        const response = await fetch("http://localhost:8000/auth/registro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: name, email, password })
        });
        
        if (response.ok) {
          // Te redirige al login tras registrarte
          setIsSignUp(false); 
          setPassword(''); 
          setErrorMsg("Cuenta creada. Ahora puedes iniciar sesión."); // Mensaje de éxito
        } else {
          const errorData = await response.json();
          setErrorMsg(errorData.detail || "Error al registrar");
        }
      } catch (error) {
        setErrorMsg("Error de conexión con el servidor");
      }
    } else {
      try {
        const formData = new URLSearchParams();
        formData.append("username", email);
        formData.append("password", password);

        const response = await fetch("http://localhost:8000/auth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          localStorage.setItem("contexta_token", data.access_token);
          localStorage.setItem("contexta_user", data.nombre); // Guardamos el nombre
          onLogin(); 
        } else {
          // Aquí capturamos los errores específicos (404 o 401)
          const errorData = await response.json();
          setErrorMsg(errorData.detail); 
        }
      } catch (error) {
        setErrorMsg("Error de conexión con el servidor");
      }
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 px-4">
      <div className="w-full max-w-md p-8 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl relative overflow-hidden">
        
        {/* Efectos visuales tipo SaaS */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-center text-white mb-2">Contexta</h2>
          <p className="text-gray-400 text-center mb-6">
            {isSignUp ? 'Crea tu espacio de trabajo' : 'Bienvenido de nuevo'}
          </p>

          {/* CAJA DE MENSAJES/ERRORES */}
          {errorMsg && (
            <div className={`mb-6 p-3 rounded-lg text-sm text-center font-medium ${errorMsg.includes("creada") ? "bg-green-900/50 text-green-400 border border-green-800" : "bg-red-900/50 text-red-400 border border-red-800"}`}>
              {errorMsg}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && (
              <div className="animate-slideIn">
                <label className="block text-sm font-medium text-gray-400 mb-1">Nombre completo</label>
                <input 
                  type="text" 
                  required={isSignUp}
                  className="w-full px-4 py-2.5 bg-gray-950 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-white transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
              <input 
                type="email" 
                required
                className="w-full px-4 py-2.5 bg-gray-950 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-white transition-all"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Contraseña</label>
              <input 
                type="password" 
                required
                className="w-full px-4 py-2.5 bg-gray-950 border border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-white transition-all"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all"
            >
              {isSignUp ? 'Crear Cuenta' : 'Entrar al Workspace'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-400">
            {isSignUp ? '¿Ya tienes una cuenta? ' : '¿No tienes cuenta? '}
            <button 
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setErrorMsg(null); }}
              className="text-blue-400 hover:text-blue-300 font-medium hover:underline"
            >
              {isSignUp ? 'Inicia sesión aquí' : 'Regístrate gratis'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}