import React, { useState } from 'react';

export default function AuthView({ setToken, theme, onToggleTheme }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isDark = theme === 'dark';
  const API_URL = 'https://my-books-backend.onrender.com';

  // Imagem de fundo em 4K
  const LOGIN_IMAGE_URL = 'https://s2.best-wallpaper.net/wallpaper/3840x2160/1805/Magic-ball-library-books_3840x2160.jpg';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro na autenticação');
      }

      setToken(data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="flex flex-col h-screen justify-center items-center p-6 transition-colors duration-300 relative bg-cover bg-center"
      style={{ backgroundImage: `url(${LOGIN_IMAGE_URL})` }}
    >
      {/* Camada escura por cima da imagem para garantir contraste (Overlay) */}
      <div className={`absolute inset-0 z-0 ${isDark ? 'bg-black/60' : 'bg-white/40 backdrop-blur-sm'}`}></div>
      
      {/* Botão de Tema Topo (Por cima da imagem) */}
      <div className="absolute top-6 right-6 z-10">
        <button 
          onClick={onToggleTheme}
          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-2 ${
            isDark ? 'bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-amber-300 shadow-sm backdrop-blur-md' : 'bg-white/80 hover:bg-slate-50 border-slate-300 text-indigo-600 shadow-sm backdrop-blur-md'
          }`}
        >
          {isDark ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
        </button>
      </div>

      <div className={`w-full max-w-md p-8 rounded-2xl border shadow-2xl backdrop-blur-md relative z-10 ${
        isDark ? 'bg-gray-900/80 border-gray-700' : 'bg-white/90 border-slate-200'
      }`}>
        
        <div className="text-center mb-8">
          <span className="text-5xl block mb-4 drop-shadow-md">📚</span>
          <h1 className={`text-3xl font-extrabold tracking-tight ${
            isDark ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent'
          }`}>
            My Books
          </h1>
          <p className={`text-sm mt-2 font-medium ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
            {isLogin ? 'Bem-vindo de volta à sua estante.' : 'Crie a sua biblioteca pessoal.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400 text-sm font-medium text-center backdrop-blur-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
              Usuário
            </label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition ${
                isDark ? 'bg-gray-800/80 border border-gray-600 focus:border-blue-500 focus:ring-blue-500/30 text-white placeholder-gray-500' : 'bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 text-slate-800'
              }`}
              placeholder="Ex: Nome"
            />
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
              Senha
            </label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition ${
                isDark ? 'bg-gray-800/80 border border-gray-600 focus:border-blue-500 focus:ring-blue-500/30 text-white placeholder-gray-500' : 'bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 text-slate-800'
              }`}
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'A Carregar...' : (isLogin ? 'Entrar na Biblioteca ➡️' : 'Registar Conta 🚀')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className={`text-sm font-semibold transition hover:underline cursor-pointer ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
          >
            {isLogin ? 'Ainda não tem conta? Registe-se aqui.' : 'Já tem uma conta? Faça Login.'}
          </button>
        </div>
      </div>
    </div>
  );
}