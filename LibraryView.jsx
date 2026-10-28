import React, { useState, useEffect } from 'react';

const CATEGORIES_LIST = [
  'Geral', 'Ficção', 'Não-Ficção', 'Tecnologia & Programação',
  'Desenvolvimento Pessoal', 'Negócios & Finanças', 'Ciência & Filosofia',
  'História & Biografia', 'Estudos & Acadêmico', 'Trabalho',
  'Romance & Poesia', 'Fantasia & Sci-Fi', 'Outros'
];

export default function LibraryView({ 
  books = [], onSelectBook, onAddBook, onDeleteBook, onUpdateCategory,
  theme, onToggleTheme, onLogout, token 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [editingCategoryBookId, setEditingCategoryBookId] = useState(null);

  const [stats, setStats] = useState({ todayMinutes: 0, totalMinutes: 0, streakDays: 0 });
  const DAILY_GOAL_MINUTES = 20;

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:3000/api/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error("Erro ao carregar estatísticas:", err));
  }, [token]);

  const isDark = theme === 'dark';
  const totalBooks = books.length;
  const inProgressBooks = books.filter(b => b.progress > 0 && b.progress < 100).length;
  const completedBooks = books.filter(b => b.progress >= 100).length;

  const processedBooks = books
    .filter(book => {
      const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            book.author.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = fileTypeFilter === 'all' || book.fileType === fileTypeFilter;
      const matchesCategory = categoryFilter === 'all' || (book.category || 'Geral') === categoryFilter;

      let matchesStatus = true;
      if (statusFilter === 'unread') matchesStatus = (book.progress || 0) === 0;
      if (statusFilter === 'reading') matchesStatus = book.progress > 0 && book.progress < 100;
      if (statusFilter === 'completed') matchesStatus = book.progress >= 100;

      return matchesSearch && matchesType && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'author') return a.author.localeCompare(b.author);
      if (sortBy === 'progress') return (b.progress || 0) - (a.progress || 0);
      return b.id - a.id;
    });

  return (
    <div className={`flex flex-col h-screen p-6 md:p-10 overflow-y-auto transition-colors duration-300 ${
      isDark ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white' : 'bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-slate-800'
    }`}>
      
      {/* Cabeçalho */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b pb-6 ${
        isDark ? 'border-gray-800/80' : 'border-slate-300/80'
      }`}>
        <div>
          <h1 className={`text-3xl md:text-4xl font-extrabold tracking-tight ${
            isDark ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent'
          }`}>
            Minha Biblioteca
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
            Gira e acompanhe o seu ritmo de leitura na nuvem
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={onToggleTheme}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-2 ${
              isDark ? 'bg-gray-800/80 hover:bg-gray-700 border-gray-700 text-amber-300 shadow-sm' : 'bg-white hover:bg-slate-50 border-slate-300 text-indigo-600 shadow-sm'
            }`}
          >
            {isDark ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
          </button>

          {/* NOVO BOTÃO DE SAIR */}
          <button 
            onClick={onLogout}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-2 ${
              isDark ? 'bg-red-900/40 hover:bg-red-900/60 border-red-800/60 text-red-300 shadow-sm' : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600 shadow-sm'
            }`}
          >
            🚪 Sair
          </button>

          <label className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-blue-500/20 text-white cursor-pointer whitespace-nowrap flex items-center gap-2 border border-blue-400/30">
            <span className="text-base">✨</span> Adicionar Livro
            <input type="file" accept=".epub,.pdf" className="hidden" onChange={onAddBook} />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={`border p-4 rounded-xl flex items-center gap-3 ${isDark ? 'bg-gray-800/40 border-gray-800' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
          <span className="text-3xl">🔥</span>
          <div>
            <span className={`text-xs font-medium block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Sequência</span>
            <span className="text-xl font-bold text-amber-500">{stats.streakDays} dias seguidos</span>
          </div>
        </div>
        <div className={`border p-4 rounded-xl flex flex-col justify-between ${isDark ? 'bg-gray-800/40 border-gray-800' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
          <div className="flex justify-between items-center">
            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Lido Hoje</span>
            <span className="text-xs font-bold text-blue-500">{stats.todayMinutes} / {DAILY_GOAL_MINUTES} min</span>
          </div>
          <div className="w-full bg-gray-700/40 h-2 rounded-full overflow-hidden mt-2">
            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${Math.min((stats.todayMinutes / DAILY_GOAL_MINUTES) * 100, 100)}%` }} />
          </div>
        </div>
        <div className={`border p-4 rounded-xl flex items-center gap-3 ${isDark ? 'bg-gray-800/40 border-gray-800' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
          <span className="text-3xl">⏱️</span>
          <div>
            <span className={`text-xs font-medium block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Tempo Acumulado</span>
            <span className="text-xl font-bold text-indigo-400">{Math.round(stats.totalMinutes / 60 * 10) / 10} horas</span>
          </div>
        </div>
        <div className={`border p-4 rounded-xl flex items-center gap-3 ${isDark ? 'bg-gray-800/40 border-gray-800' : 'bg-white/80 border-slate-200 shadow-sm'}`}>
          <span className="text-3xl">🏆</span>
          <div>
            <span className={`text-xs font-medium block ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Livros Finalizados</span>
            <span className="text-xl font-bold text-emerald-500">{completedBooks} de {totalBooks}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-wrap gap-2 border-b border-gray-700/30 pb-3">
          {[ { id: 'all', label: 'Todos os Livros' }, { id: 'reading', label: '📖 Em Leitura' }, { id: 'completed', label: '✅ Concluídos' }, { id: 'unread', label: '⏳ Não Iniciados' } ].map(tab => (
            <button key={tab.id} onClick={() => setStatusFilter(tab.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${statusFilter === tab.id ? 'bg-blue-600 text-white shadow-md' : isDark ? 'bg-gray-800/60 hover:bg-gray-800 text-gray-300' : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400 text-sm">🔍</span>
              <input type="text" placeholder="Buscar por título ou autor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 transition ${isDark ? 'bg-gray-800/60 border-gray-700/60 focus:border-blue-500/80 focus:ring-blue-500/20 text-white placeholder-gray-500' : 'bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 text-slate-800 placeholder-slate-400 shadow-sm'}`} />
            </div>
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`px-3 py-2 border rounded-xl text-xs font-medium cursor-pointer focus:outline-none ${isDark ? 'bg-gray-800/60 border-gray-700/60 text-gray-200' : 'bg-white border-slate-300 text-slate-700 shadow-sm'}`}>
              <option value="all">Todas as Categorias ({CATEGORIES_LIST.length})</option>
              {CATEGORIES_LIST.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 self-end lg:self-auto">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Ordenar por:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`px-3 py-1.5 border rounded-xl text-xs font-semibold cursor-pointer focus:outline-none ${isDark ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-slate-300 text-slate-800 shadow-sm'}`}>
                <option value="recent">Mais Recentes</option>
                <option value="title">Título (A-Z)</option>
                <option value="author">Autor (A-Z)</option>
                <option value="progress">Maior Progresso</option>
              </select>
            </div>
            <div className={`flex p-1 rounded-xl border ${isDark ? 'bg-gray-800/60 border-gray-700/60' : 'bg-white border-slate-300 shadow-sm'}`}>
              {['all', 'epub', 'pdf'].map(type => (
                <button key={type} onClick={() => setFileTypeFilter(type)} className={`px-2.5 py-1 rounded-lg text-xs font-medium uppercase transition ${fileTypeFilter === type ? 'bg-blue-600 text-white shadow-sm' : isDark ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>
                  {type === 'all' ? 'Todos' : type}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {processedBooks.length === 0 ? (
        <div className={`flex flex-col items-center justify-center flex-1 border-2 border-dashed rounded-2xl p-12 ${isDark ? 'border-gray-800/80 bg-gray-900/20 text-gray-400' : 'border-slate-300 bg-white/40 text-slate-500'}`}>
          <span className="text-5xl mb-4">📚</span>
          <p className="text-lg font-medium mb-1">Nenhum livro encontrado.</p>
          <p className="text-sm opacity-70">Ajuste os filtros ou adicione novos livros.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {processedBooks.map((book) => (
            <div key={book.id} onClick={() => onSelectBook(book)} className={`rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer flex flex-col group shadow-lg hover:shadow-2xl hover:-translate-y-1 relative ${isDark ? 'bg-gray-800/40 hover:bg-gray-800/80 border-gray-800 hover:border-blue-500/40 hover:shadow-blue-500/10' : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-400 hover:shadow-slate-300'}`}>
              <button onClick={(e) => { e.stopPropagation(); if (confirm(`Deseja remover "${book.title}"?`)) onDeleteBook(book.id); }} className="absolute top-3 right-3 bg-red-600/90 hover:bg-red-600 text-white p-1.5 rounded-xl z-20 transition opacity-0 group-hover:opacity-100 shadow-lg backdrop-blur-sm" title="Excluir livro">🗑️</button>
              <span className={`absolute top-3 left-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md z-10 backdrop-blur-md border ${book.fileType === 'pdf' ? isDark ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300' : isDark ? 'bg-blue-950/80 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                {book.fileType || 'epub'}
              </span>
              <div className={`h-64 flex items-center justify-center overflow-hidden relative ${isDark ? 'bg-gray-900/80' : 'bg-slate-100'}`}>
                {book.coverUrl ? <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="text-center p-4"><span className="text-4xl opacity-80">{book.fileType === 'pdf' ? '📄' : '📖'}</span><span className={`text-xs block mt-2 font-medium ${isDark ? 'text-gray-500' : 'text-slate-400'}`}>Sem Capa</span></div>}
              </div>
              <div className={`p-4 flex flex-col flex-1 justify-between border-t ${isDark ? 'border-gray-800/60 bg-gray-900/40' : 'border-slate-100 bg-white'}`}>
                <div>
                  <h3 className={`font-semibold text-sm line-clamp-2 transition-colors ${isDark ? 'text-gray-100 group-hover:text-blue-400' : 'text-slate-800 group-hover:text-blue-600'}`}>{book.title}</h3>
                  <p className={`text-xs mt-1 truncate font-normal ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>{book.author}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span onClick={(e) => { e.stopPropagation(); setEditingCategoryBookId(editingCategoryBookId === book.id ? null : book.id); }} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border cursor-pointer hover:border-blue-400 transition ${isDark ? 'bg-gray-800 text-gray-300 border-gray-700' : 'bg-slate-100 text-slate-600 border-slate-200'}`} title="Alterar categoria">🏷️ {book.category || 'Geral'} ✏️</span>
                  </div>
                  {editingCategoryBookId === book.id && (
                    <div onClick={(e) => e.stopPropagation()} className={`mt-2 p-2 rounded-xl border shadow-xl z-30 max-h-48 overflow-y-auto ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-300'}`}>
                      <span className="text-[10px] font-bold block mb-1">Selecionar Categoria:</span>
                      <div className="flex flex-col gap-1">
                        {CATEGORIES_LIST.map(cat => <button key={cat} onClick={() => { onUpdateCategory(book.id, cat); setEditingCategoryBookId(null); }} className="text-[10px] p-1.5 rounded hover:bg-blue-600 hover:text-white transition text-left truncate">{cat}</button>)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <div className={`w-full h-1.5 rounded-full overflow-hidden border ${isDark ? 'bg-gray-800 border-gray-700/30' : 'bg-slate-100 border-slate-200'}`}>
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-500" style={{ width: `${book.progress || 0}%` }}></div>
                  </div>
                  <div className={`flex justify-between items-center mt-1.5 text-[10px] ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>
                    <span>{book.progress >= 100 ? '✅ Concluído' : 'Progresso'}</span>
                    <span className={`font-semibold ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>{book.progress ? `${Math.round(book.progress)}%` : '0%'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}