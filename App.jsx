import React, { useState, useEffect } from 'react';
import LibraryView from './LibraryView';
import CompleteEpubReader from './EpubReader';
import PdfReader from './PdfReader';
import AuthView from './AuthView';
import ePub from 'epubjs';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [currentScreen, setCurrentScreen] = useState('library');
  const [selectedBook, setSelectedBook] = useState(null);
  const [books, setBooks] = useState([]);
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'dark');

  useEffect(() => {
    if (token) localStorage.setItem('auth_token', token);
    else localStorage.removeItem('auth_token');
  }, [token]);

  useEffect(() => { localStorage.setItem('app-theme', theme); }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  const handleLogout = () => { setToken(null); setBooks([]); setCurrentScreen('library'); };

  const fetchBooks = () => {
    if (!token) return;
    fetch('http://localhost:3000/api/books', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => { if (!res.ok) throw new Error('Sessão expirada'); return res.json(); })
      .then(data => {
        const formattedBooks = data.map(book => ({
          id: book.id, title: book.title, author: book.author, coverUrl: book.cover_url,
          bookUrl: book.book_url, fileType: book.file_type || (book.book_url?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'epub'),
          category: book.category || 'Geral', lastCfi: book.last_cfi, progress: parseFloat(book.progress_percent) || 0,
          rating: parseInt(book.rating) || 0
        }));
        setBooks(formattedBooks);
      })
      .catch(err => { console.error(err); handleLogout(); });
  };

  useEffect(() => { if (token) fetchBooks(); }, [token]);

  const handleSelectBook = (book) => { setSelectedBook(book); setCurrentScreen('reader'); };
  const handleBackToLibrary = () => { setSelectedBook(null); setCurrentScreen('library'); fetchBooks(); };

  const blobToBase64 = (blob) => new Promise((res, rej) => {
    const reader = new FileReader(); reader.onloadend = () => res(reader.result); reader.onerror = rej; reader.readAsDataURL(blob);
  });

  const handleAddBook = async (event) => {
    const file = event.target.files[0];
    if (!file || !token) return;
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    let extractedTitle = file.name.replace(/\.[^/.]+$/, "");
    let extractedAuthor = isPdf ? 'Documento PDF' : 'Autor Desconhecido';
    let extractedCoverBase64 = '';

    if (isPdf) {
      try {
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.8 });
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height; canvas.width = viewport.width;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
        extractedCoverBase64 = canvas.toDataURL('image/jpeg', 0.85);
      } catch (err) { console.warn(err); }
    } else {
      try {
        const tempBook = ePub(await file.arrayBuffer());
        await tempBook.ready;
        const metadata = await tempBook.loaded.metadata;
        if (metadata.title) extractedTitle = metadata.title;
        if (metadata.creator) extractedAuthor = metadata.creator;
        const coverUrl = await tempBook.coverUrl();
        if (coverUrl) extractedCoverBase64 = await blobToBase64(await (await fetch(coverUrl)).blob());
        tempBook.destroy();
      } catch (err) { console.warn(err); }
    }

    const formData = new FormData();
    formData.append('epub_file', file); formData.append('title', extractedTitle);
    formData.append('author', extractedAuthor); formData.append('cover_url', extractedCoverBase64);
    formData.append('category', 'Geral');

    try {
      const response = await fetch('http://localhost:3000/api/books', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
      if (response.ok) {
        const n = await response.json();
        setBooks(prev => [{
          id: n.id, title: n.title, author: n.author, coverUrl: n.cover_url, bookUrl: n.book_url,
          fileType: n.file_type || (isPdf ? 'pdf' : 'epub'), category: n.category || 'Geral',
          lastCfi: n.last_cfi, progress: parseFloat(n.progress_percent) || 0, rating: parseInt(n.rating) || 0
        }, ...prev]);
      }
    } catch (error) { console.error(error); }
    event.target.value = '';
  };

  const handleUpdateCategory = async (bookId, newCategory) => {
    try {
      if ((await fetch(`http://localhost:3000/api/books/${bookId}/category`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ category: newCategory }) })).ok) {
        setBooks(prev => prev.map(b => b.id === bookId ? { ...b, category: newCategory } : b));
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdateDetails = async (bookId, title, author) => {
    try {
      if ((await fetch(`http://localhost:3000/api/books/${bookId}/details`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ title, author }) })).ok) {
        setBooks(prev => prev.map(b => b.id === bookId ? { ...b, title, author } : b));
      }
    } catch (err) { console.error(err); }
  };

  const handleUpdateRating = async (bookId, rating) => {
    try {
      if ((await fetch(`http://localhost:3000/api/books/${bookId}/rating`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ rating }) })).ok) {
        setBooks(prev => prev.map(b => b.id === bookId ? { ...b, rating } : b));
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteBook = async (bookId) => {
    try {
      if ((await fetch(`http://localhost:3000/api/books/${bookId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })).ok) {
        setBooks(prev => prev.filter(b => b.id !== bookId));
      }
    } catch (err) { console.error(err); }
  };

  if (!token) return <AuthView setToken={setToken} theme={theme} onToggleTheme={toggleTheme} />;
  const isDark = theme === 'dark';

  return (
    <div className={`w-screen h-screen overflow-hidden select-none transition-colors duration-300 ${isDark ? 'bg-gray-950 text-white' : 'bg-slate-100 text-slate-800'}`}>
      {currentScreen === 'library' ? (
        <LibraryView 
          books={books} onSelectBook={handleSelectBook} onAddBook={handleAddBook} 
          onDeleteBook={handleDeleteBook} onUpdateCategory={handleUpdateCategory} 
          onUpdateDetails={handleUpdateDetails} onUpdateRating={handleUpdateRating}
          theme={theme} onToggleTheme={toggleTheme} onLogout={handleLogout} token={token}
        />
      ) : (
        <div className="flex flex-col h-full">
          <div className={`px-6 py-3 flex items-center justify-between border-b shadow-lg z-20 transition-colors duration-300 ${isDark ? 'bg-gray-900/80 backdrop-blur-md border-gray-800' : 'bg-white/80 backdrop-blur-md border-slate-200'}`}>
            <button onClick={handleBackToLibrary} className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer border shadow-sm ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700/60' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'}`}>⬅️ Sair da Leitura</button>
            <div className="flex items-center gap-2 max-w-md truncate">
              <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase border ${isDark ? 'bg-gray-800 text-blue-400 border-gray-700' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>{selectedBook?.fileType}</span>
              <span className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>{selectedBook?.title}</span>
            </div>
            <button onClick={toggleTheme} className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${isDark ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-amber-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-indigo-600'}`}>
              {isDark ? '☀️ Claro' : '🌙 Escuro'}
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {selectedBook?.fileType === 'pdf' ? (
              <PdfReader bookUrl={selectedBook?.bookUrl} bookId={selectedBook?.id} lastCfi={selectedBook?.lastCfi} theme={theme} token={token} />
            ) : (
              <CompleteEpubReader bookUrl={selectedBook?.bookUrl} bookId={selectedBook?.id} lastCfi={selectedBook?.lastCfi} theme={theme} token={token} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}