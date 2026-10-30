import React, { useState } from 'react';

export default function AuthView({ setToken, theme, onToggleTheme }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isDark = theme === 'dark';
  const API_URL = 'https://my-books-backend.onrender.com';

  // Cole aqui o link direto da imagem que quer colocar na tela de login (ou deixe vazio se não quiser imagem extra)
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
    <div className={`flex flex-col h-screen justify-center items-center p-6 transition-colors duration-300 ${
      isDark ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white' : 'bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-slate-800'
    }`}>
      
      {/* Botão de Tema Topo */}
      <div className="absolute top-6 right-6">
        <button 
          onClick={onToggleTheme}
          className={`px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-2 ${
            isDark ? 'bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-amber-300 shadow-sm' : 'bg-white hover:bg-slate-50 border-slate-300 text-indigo-600 shadow-sm'
          }`}
        >
          {isDark ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
        </button>
      </div>

      <div className={`w-full max-w-md p-8 rounded-2xl border shadow-2xl backdrop-blur-sm ${
        isDark ? 'bg-gray-900/80 border-gray-800' : 'bg-white/90 border-slate-200'
      }`}>
        
        <div className="text-center mb-8">
          {/* Se preencher a variável LOGIN_IMAGE_URL acima, ela aparece aqui. Senão, mostra o emoji 📚 */}
          {LOGIN_IMAGE_URL ? (
            <img src={LOGIN_IMAGE_URL} alt="Login Banner" className="w-20 h-20 mx-auto mb-4 rounded-xl object-cover shadow-md" />
          ) : (
            <span className="text-5xl block mb-4">📚</span>
          )}

          <h1 className={`text-3xl font-extrabold tracking-tight ${
            isDark ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent'
          }`}>
            My Books
          </h1>
          <p className={`text-sm mt-2 font-medium ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            {isLogin ? 'Bem-vindo de volta à sua estante.' : 'Crie a sua biblioteca pessoal.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-500 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              Usuário
            </label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition ${
                isDark ? 'bg-gray-800/80 border border-gray-700 focus:border-blue-500 focus:ring-blue-500/20 text-white' : 'bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 text-slate-800'
              }`}
              placeholder="Ex: Nome"
            />
          </div>

          <div>
            <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
              Senha
            </label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition ${
                isDark ? 'bg-gray-800/80 border border-gray-700 focus:border-blue-500 focus:ring-blue-500/20 text-white' : 'bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 text-slate-800'
              }`}
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? 'Carregando...' : (isLogin ? 'Entrar na Biblioteca ➡️' : 'Registrar Conta 🚀')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className={`text-sm font-semibold transition hover:underline cursor-pointer ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
          >
            {isLogin ? 'Ainda não tem conta? Registre-se aqui.' : 'Já tem uma conta? Faça Login.'}
          </button>
        </div>
      </div>
    </div>
  );
}