import React, { useState, useEffect } from 'react';

const CATEGORIES_LIST = [
  'Geral', 'Ficção', 'Não-Ficção', 'Tecnologia & Programação',
  'Desenvolvimento Pessoal', 'Negócios & Finanças', 'Ciência & Filosofia',
  'História & Biografia', 'Estudos & Acadêmico', 'Trabalho',
  'Romance & Poesia', 'Fantasia & Sci-Fi', 'Terror', 'Outros'
];

const QUOTES_LIST = [
  "Ler é viajar sem sair do lugar.",
  "Um livro pode mudar seu dia; muitos livros podem mudar sua vida.",
  "A leitura te leva a lugares onde seus pés nunca chegaram.",
  "Cada livro é uma oportunidade de aprender, sonhar e enxergar a vida com outros olhos.",
  "Quem lê enriquece o vocabulário e a alma.",
  "O espírito que não lê emagrece como o corpo que não come — Victor Hugo",
  "A leitura é o maior presente que podemos dar a nós mesmos.",
  "Viver sem ler é perigoso; te obriga a crer no que te dizem.",
  "Apenas deveríamos ler os livros que nos picam e que nos mordem — Franz Kafka",
  "Quem gosta de ler não morre só — Ariano Suassuna",
  "Leia por você, pelo seu crescimento e pela pessoa que você deseja se tornar.",
  "Nunca subestime o poder de um livro!"
];

export default function LibraryView({ 
  books = [], onSelectBook, onAddBook, onDeleteBook, onUpdateCategory, 
  onUpdateDetails, onUpdateRating, theme, onToggleTheme, onLogout, token 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [editingCategoryBookId, setEditingCategoryBookId] = useState(null);
  const [editingBookDetails, setEditingBookDetails] = useState(null);

  // Estado para a frase dinâmica
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);

  const [stats, setStats] = useState({ todayMinutes: 0, totalMinutes: 0, streakDays: 0 });
  const DAILY_GOAL_MINUTES = 20;

  // Efeito para trocar a frase a cada 20 segundos
  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setCurrentQuoteIndex((prevIndex) => (prevIndex + 1) % QUOTES_LIST.length);
    }, 20000); // 20000ms = 20 segundos

    return () => clearInterval(quoteInterval);
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:3000/api/stats', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(data => setStats(data)).catch(err => console.error(err));
  }, [token]);

  const isDark = theme === 'dark';
  const totalBooks = books.length;
  const completedBooks = books.filter(b => b.progress >= 100).length;

  const processedBooks = books
    .filter(book => {
      const matchesSearch = book.title.toLowerCase().includes(searchTerm.toLowerCase()) || book.author.toLowerCase().includes(searchTerm.toLowerCase());
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
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return b.id - a.id;
    });

  return (
    <div className={`flex flex-col h-screen overflow-y-auto transition-colors duration-300 bg-cover bg-center bg-fixed relative ${isDark ? 'text-white' : 'text-slate-800'}`} style={{ backgroundImage: `url('/fundo-magico.jpg')` }}>
      <div className={`fixed inset-0 z-0 ${isDark ? 'bg-gray-950/40' : 'bg-white/40'}`}></div>

      <div className="relative z-10 flex flex-col min-h-full">
        <div className="w-full px-6 md:px-10 py-8 border-b border-gray-500/20">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className={`text-3xl md:text-4xl font-extrabold tracking-tight ${isDark ? 'bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent' : 'bg-gradient-to-r from-blue-600 to-indigo-800 bg-clip-text text-transparent'}`}>Minha Biblioteca</h1>
              {/* Frase dinâmica com transição suave */}
              <p className={`text-sm mt-1 font-medium transition-opacity duration-700 italic ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>
                "{QUOTES_LIST[currentQuoteIndex]}"
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={onToggleTheme} className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-2 ${isDark ? 'bg-gray-900/60 hover:bg-gray-800 border-gray-700 text-amber-300' : 'bg-white/80 hover:bg-white border-slate-300 text-indigo-600'}`}>
                {isDark ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
              </button>
              <button onClick={onLogout} className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-2 ${isDark ? 'bg-red-900/40 hover:bg-red-900/60 border-red-800/60 text-red-300' : 'bg-red-50/80 hover:bg-red-100 border-red-200 text-red-600'}`}>
                🚪 Sair
              </button>
              <label className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg shadow-blue-500/20 text-white cursor-pointer whitespace-nowrap flex items-center gap-2 border border-blue-400/30">
                <span className="text-base">✨</span> Adicionar Livro
                <input type="file" accept=".epub,.pdf" className="hidden" onChange={onAddBook} />
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 md:p-10 flex-1 flex flex-col">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className={`border p-4 rounded-xl flex items-center gap-3 backdrop-blur-md ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-white/60 border-slate-300 shadow-sm'}`}>
              <span className="text-3xl">🔥</span>
              <div><span className={`text-xs font-bold block ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Sequência</span><span className="text-xl font-bold text-amber-500">{stats.streakDays || 0} dias seguidos</span></div>
            </div>
            <div className={`border p-4 rounded-xl flex flex-col justify-between backdrop-blur-md ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-white/60 border-slate-300 shadow-sm'}`}>
              <div className="flex justify-between items-center"><span className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Lido Hoje</span><span className="text-xs font-bold text-blue-500">{stats.todayMinutes || 0} / {DAILY_GOAL_MINUTES} min</span></div>
              <div className="w-full bg-gray-700/40 h-2 rounded-full overflow-hidden mt-2"><div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${Math.min(((stats.todayMinutes || 0) / DAILY_GOAL_MINUTES) * 100, 100)}%` }} /></div>
            </div>
            <div className={`border p-4 rounded-xl flex items-center gap-3 backdrop-blur-md ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-white/60 border-slate-300 shadow-sm'}`}>
              <span className="text-3xl">⏱️</span>
              <div><span className={`text-xs font-bold block ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Tempo Acumulado</span><span className="text-xl font-bold text-indigo-400">{Math.round((stats.totalMinutes || 0) / 60 * 10) / 10} horas</span></div>
            </div>
            <div className={`border p-4 rounded-xl flex items-center gap-3 backdrop-blur-md ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-white/60 border-slate-300 shadow-sm'}`}>
              <span className="text-3xl">🏆</span>
              <div><span className={`text-xs font-bold block ${isDark ? 'text-gray-300' : 'text-slate-600'}`}>Livros Finalizados</span><span className="text-xl font-bold text-emerald-500">{completedBooks} de {totalBooks}</span></div>
            </div>
          </div>

          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-wrap gap-2 border-b border-gray-500/20 pb-3">
              {[ { id: 'all', label: 'Todos os Livros' }, { id: 'reading', label: '📖 Em Leitura' }, { id: 'completed', label: '✅ Concluídos' }, { id: 'unread', label: '⏳ Não Iniciados' } ].map(tab => (
                <button key={tab.id} onClick={() => setStatusFilter(tab.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer backdrop-blur-sm ${statusFilter === tab.id ? 'bg-blue-600 text-white shadow-md' : isDark ? 'bg-gray-900/60 hover:bg-gray-800 text-gray-200 border border-gray-700' : 'bg-white/70 hover:bg-white text-slate-800 border border-slate-300'}`}>{tab.label}</button>
              ))}
            </div>
            <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400 text-sm">🔍</span>
                  <input type="text" placeholder="Buscar por título ou autor..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full pl-10 pr-4 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 transition backdrop-blur-sm ${isDark ? 'bg-gray-900/60 border-gray-700 focus:border-blue-500/80 focus:ring-blue-500/20 text-white placeholder-gray-400' : 'bg-white/70 border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 text-slate-800 placeholder-slate-500 shadow-sm'}`} />
                </div>
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`px-3 py-2 border rounded-xl text-xs font-medium cursor-pointer focus:outline-none backdrop-blur-sm ${isDark ? 'bg-gray-900/60 border-gray-700 text-gray-200' : 'bg-white/70 border-slate-300 text-slate-800 shadow-sm'}`}>
                  <option value="all">Todas as Categorias ({CATEGORIES_LIST.length})</option>
                  {CATEGORIES_LIST.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3 self-end lg:self-auto">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-slate-700'}`}>Ordenar por:</span>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`px-3 py-1.5 border rounded-xl text-xs font-semibold cursor-pointer focus:outline-none backdrop-blur-sm ${isDark ? 'bg-gray-900/60 border-gray-700 text-gray-200' : 'bg-white/70 border-slate-300 text-slate-800 shadow-sm'}`}>
                    <option value="recent">Mais Recentes</option>
                    <option value="title">Título (A-Z)</option>
                    <option value="author">Autor (A-Z)</option>
                    <option value="progress">Maior Progresso</option>
                    <option value="rating">Melhor Avaliação (Estrelas)</option>
                  </select>
                </div>
                <div className={`flex p-1 rounded-xl border backdrop-blur-sm ${isDark ? 'bg-gray-900/60 border-gray-700' : 'bg-white/70 border-slate-300 shadow-sm'}`}>
                  {['all', 'epub', 'pdf'].map(type => (
                    <button key={type} onClick={() => setFileTypeFilter(type)} className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase transition ${fileTypeFilter === type ? 'bg-blue-600 text-white shadow-sm' : isDark ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}>{type === 'all' ? 'Todos' : type}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {processedBooks.length === 0 ? (
            <div className={`flex flex-col items-center justify-center flex-1 border-2 border-dashed rounded-2xl p-12 backdrop-blur-md ${isDark ? 'border-gray-700/50 bg-gray-900/40 text-gray-300' : 'border-slate-400/50 bg-white/40 text-slate-600'}`}>
              <span className="text-5xl mb-4">📚</span>
              <p className="text-lg font-bold mb-1">Nenhum livro encontrado.</p>
              <p className="text-sm opacity-80">Ajuste os filtros ou adicione novos livros.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {processedBooks.map((book) => (
                <div key={book.id} onClick={() => onSelectBook(book)} className={`rounded-2xl overflow-hidden border transition-all duration-300 cursor-pointer flex flex-col group shadow-lg hover:shadow-2xl hover:-translate-y-1 relative backdrop-blur-md ${isDark ? 'bg-gray-900/80 hover:bg-gray-900 border-gray-700 hover:border-blue-500/50 hover:shadow-blue-500/20' : 'bg-white/90 hover:bg-white border-slate-300 hover:border-blue-400 hover:shadow-slate-400'}`}>
                  <button onClick={(e) => { e.stopPropagation(); if (confirm(`Deseja remover "${book.title}"?`)) onDeleteBook(book.id); }} className="absolute top-3 right-3 bg-red-600/90 hover:bg-red-600 text-white p-1.5 rounded-xl z-20 transition opacity-0 group-hover:opacity-100 shadow-lg backdrop-blur-sm" title="Excluir livro">🗑️</button>
                  <span className={`absolute top-3 left-3 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md z-10 backdrop-blur-md border ${book.fileType === 'pdf' ? isDark ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300' : isDark ? 'bg-blue-950/80 text-blue-300 border-blue-500/30' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                    {book.fileType || 'epub'}
                  </span>
                  <div className={`h-64 flex items-center justify-center overflow-hidden relative ${isDark ? 'bg-gray-950/50' : 'bg-slate-200/50'}`}>
                    {book.coverUrl ? <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="text-center p-4"><span className="text-4xl opacity-80">{book.fileType === 'pdf' ? '📄' : '📖'}</span><span className={`text-xs block mt-2 font-bold ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Sem Capa</span></div>}
                  </div>
                  
                  <div className={`p-4 flex flex-col flex-1 justify-between border-t ${isDark ? 'border-gray-700/60 bg-gray-900/60' : 'border-slate-200/60 bg-white/70'}`}>
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-bold text-sm line-clamp-2 transition-colors ${isDark ? 'text-gray-100 group-hover:text-blue-400' : 'text-slate-900 group-hover:text-blue-700'}`}>{book.title}</h3>
                          <p className={`text-xs mt-1 truncate font-medium ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>{book.author}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setEditingBookDetails(book); }} className={`p-1.5 rounded-lg transition-colors cursor-pointer ${isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-blue-400' : 'hover:bg-slate-200 text-slate-400 hover:text-blue-600'}`} title="Editar Nome e Autor">
                          ✏️
                        </button>
                      </div>

                      <div className="flex items-center gap-1 mt-1 mb-2">
                        {[1, 2, 3, 4, 5].map(star => (
                          <button 
                            key={star} 
                            onClick={(e) => { e.stopPropagation(); onUpdateRating(book.id, star); }}
                            className={`text-lg transition-transform hover:scale-125 cursor-pointer ${star <= (book.rating || 0) ? 'text-yellow-400 drop-shadow-[0_0_2px_rgba(250,204,21,0.8)]' : isDark ? 'text-gray-700' : 'text-slate-300'}`}
                            title={`Avaliar com ${star} estrela${star > 1 ? 's' : ''}`}
                          >
                            ★
                          </button>
                        ))}
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <span onClick={(e) => { e.stopPropagation(); setEditingCategoryBookId(editingCategoryBookId === book.id ? null : book.id); }} className={`text-[10px] px-2 py-0.5 rounded-full font-bold border cursor-pointer hover:border-blue-400 transition ${isDark ? 'bg-gray-800 text-gray-200 border-gray-600' : 'bg-slate-200 text-slate-700 border-slate-300'}`} title="Alterar categoria">🏷️ {book.category || 'Geral'}</span>
                      </div>
                      {editingCategoryBookId === book.id && (
                        <div onClick={(e) => e.stopPropagation()} className={`mt-2 p-2 rounded-xl border shadow-xl z-30 max-h-48 overflow-y-auto ${isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-slate-300'}`}>
                          <span className="text-[10px] font-bold block mb-1">Selecionar Categoria:</span>
                          <div className="flex flex-col gap-1">
                            {CATEGORIES_LIST.map(cat => <button key={cat} onClick={() => { onUpdateCategory(book.id, cat); setEditingCategoryBookId(null); }} className="text-[10px] p-1.5 rounded hover:bg-blue-600 hover:text-white transition text-left truncate font-medium">{cat}</button>)}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-4">
                      <div className={`w-full h-1.5 rounded-full overflow-hidden border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-slate-200 border-slate-300'}`}>
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full transition-all duration-500" style={{ width: `${book.progress || 0}%` }}></div>
                      </div>
                      <div className={`flex justify-between items-center mt-1.5 text-[10px] font-bold ${isDark ? 'text-gray-400' : 'text-slate-600'}`}>
                        <span>{book.progress >= 100 ? '✅ Concluído' : 'Progresso'}</span>
                        <span className={isDark ? 'text-gray-200' : 'text-slate-800'}>{book.progress ? `${Math.round(book.progress)}%` : '0%'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {editingBookDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditingBookDetails(null)}>
          <div className={`w-full max-w-md p-6 rounded-2xl border shadow-2xl ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-slate-200 text-slate-800'}`} onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-extrabold mb-4">Editar Informações</h2>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Título do Livro</label>
                <input 
                  type="text" 
                  value={editingBookDetails.title} 
                  onChange={(e) => setEditingBookDetails({...editingBookDetails, title: e.target.value})}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition ${isDark ? 'bg-gray-800 border border-gray-700 focus:border-blue-500 text-white' : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-800'}`}
                />
              </div>
              
              <div>
                <label className={`block text-xs font-bold mb-1.5 uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-slate-500'}`}>Autor / Editor</label>
                <input 
                  type="text" 
                  value={editingBookDetails.author} 
                  onChange={(e) => setEditingBookDetails({...editingBookDetails, author: e.target.value})}
                  className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 transition ${isDark ? 'bg-gray-800 border border-gray-700 focus:border-blue-500 text-white' : 'bg-slate-50 border border-slate-300 focus:border-blue-500 text-slate-800'}`}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button onClick={() => setEditingBookDetails(null)} className={`px-4 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-slate-100 text-slate-600'}`}>
                Cancelar
              </button>
              <button 
                onClick={() => { onUpdateDetails(editingBookDetails.id, editingBookDetails.title, editingBookDetails.author); setEditingBookDetails(null); }} 
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/25 transition cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}