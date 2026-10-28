import React, { useState, useEffect } from 'react';
import LibraryView from './LibraryView';
import CompleteEpubReader from './EpubReader';
import PdfReader from './PdfReader';
import AuthView from './AuthView';
import ePub from 'epubjs';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
  const [currentScreen, setCurrentScreen] = useState('library');
  const [selectedBook, setSelectedBook] = useState(null);
  const [books, setBooks] = useState([]);
  
  const [theme, setTheme] = useState(() => localStorage.getItem('app-theme') || 'dark');

  // Guardar token e tema
  useEffect(() => {
    if (token) localStorage.setItem('auth_token', token);
    else localStorage.removeItem('auth_token');
  }, [token]);

  useEffect(() => { localStorage.setItem('app-theme', theme); }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  const handleLogout = () => {
    setToken(null);
    setBooks([]);
    setCurrentScreen('library');
  };

  const fetchBooks = () => {
    if (!token) return;
    fetch('http://localhost:3000/api/books', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => {
        if (res.status === 401 || res.status === 403) throw new Error('Sessão expirada');
        return res.json();
      })
      .then(data => {
        const formattedBooks = data.map(book => ({
          id: book.id,
          title: book.title,
          author: book.author,
          coverUrl: book.cover_url,
          bookUrl: book.book_url,
          fileType: book.file_type || (book.book_url?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'epub'),
          category: book.category || 'Geral',
          lastCfi: book.last_cfi,
          progress: parseFloat(book.progress_percent) || 0
        }));
        setBooks(formattedBooks);
      })
      .catch(err => {
        console.error("Erro ao carregar livros:", err);
        handleLogout();
      });
  };

  useEffect(() => {
    if (token) fetchBooks();
  }, [token]);

  const handleSelectBook = (book) => {
    setSelectedBook(book);
    setCurrentScreen('reader'); 
  };

  const handleBackToLibrary = () => {
    setSelectedBook(null);
    setCurrentScreen('library');
    fetchBooks();
  };

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const handleAddBook = async (event) => {
    const file = event.target.files[0];
    if (!file || !token) return;

    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    let extractedTitle = file.name.replace(/\.[^/.]+$/, "");
    let extractedAuthor = isPdf ? 'Documento PDF' : 'Autor Desconhecido';
    let extractedCoverBase64 = '';

    if (isPdf) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.8 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;
        extractedCoverBase64 = canvas.toDataURL('image/jpeg', 0.85);
      } catch (err) {
        console.warn("Não foi possível gerar a capa do PDF:", err);
      }
    } else {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const tempBook = ePub(arrayBuffer);
        await tempBook.ready;
        
        const metadata = await tempBook.loaded.metadata;
        if (metadata.title) extractedTitle = metadata.title;
        if (metadata.creator) extractedAuthor = metadata.creator;

        const coverUrl = await tempBook.coverUrl();
        if (coverUrl) {
          const res = await fetch(coverUrl);
          const blob = await res.blob();
          extractedCoverBase64 = await blobToBase64(blob);
        }
        tempBook.destroy();
      } catch (err) {
        console.warn("Não foi possível extrair metadados do EPUB:", err);
      }
    }

    const formData = new FormData();
    formData.append('epub_file', file);
    formData.append('title', extractedTitle);
    formData.append('author', extractedAuthor);
    formData.append('cover_url', extractedCoverBase64);
    formData.append('category', 'Geral');

    try {
      const response = await fetch('http://localhost:3000/api/books', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        const newBookData = await response.json();
        const newBook = {
          id: newBookData.id,
          title: newBookData.title,
          author: newBookData.author,
          coverUrl: newBookData.cover_url,
          bookUrl: newBookData.book_url,
          fileType: newBookData.file_type || (isPdf ? 'pdf' : 'epub'),
          category: newBookData.category || 'Geral',
          lastCfi: newBookData.last_cfi,
          progress: parseFloat(newBookData.progress_percent) || 0
        };
        setBooks(prev => [newBook, ...prev]);
      }
    } catch (error) {
      console.error("Erro ao enviar o livro:", error);
    }
    event.target.value = '';
  };

  const handleUpdateCategory = async (bookId, newCategory) => {
    try {
      const response = await fetch(`http://localhost:3000/api/books/${bookId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ category: newCategory })
      });

      if (response.ok) {
        setBooks(prev => prev.map(b => b.id === bookId ? { ...b, category: newCategory } : b));
      }
    } catch (error) {
      console.error("Erro ao atualizar categoria:", error);
    }
  };

  const handleDeleteBook = async (bookId) => {
    try {
      const response = await fetch(`http://localhost:3000/api/books/${bookId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setBooks(prev => prev.filter(b => b.id !== bookId));
      }
    } catch (error) {
      console.error("Erro ao excluir livro:", error);
    }
  };

  const isDark = theme === 'dark';

  // Se não houver token, exibe a página de Login/Registo
  if (!token) {
    return <AuthView setToken={setToken} theme={theme} onToggleTheme={toggleTheme} />;
  }

  return (
    <div className={`w-screen h-screen overflow-hidden select-none transition-colors duration-300 ${
      isDark ? 'bg-gray-950 text-white' : 'bg-slate-100 text-slate-800'
    }`}>
      {currentScreen === 'library' ? (
        <LibraryView 
          books={books} 
          onSelectBook={handleSelectBook} 
          onAddBook={handleAddBook} 
          onDeleteBook={handleDeleteBook}
          onUpdateCategory={handleUpdateCategory}
          theme={theme}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
          token={token}
        />
      ) : (
        <div className="flex flex-col h-full">
          <div className={`px-6 py-3 flex items-center justify-between border-b shadow-lg z-20 transition-colors duration-300 ${
            isDark ? 'bg-gray-900/80 backdrop-blur-md border-gray-800' : 'bg-white/80 backdrop-blur-md border-slate-200'
          }`}>
            <button 
              onClick={handleBackToLibrary}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 cursor-pointer border shadow-sm ${
                isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700/60' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              ⬅️ Sair da Leitura
            </button>
            
            <div className="flex items-center gap-2 max-w-md truncate">
              <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase border ${
                isDark ? 'bg-gray-800 text-blue-400 border-gray-700' : 'bg-blue-50 text-blue-600 border-blue-200'
              }`}>
                {selectedBook?.fileType}
              </span>
              <span className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-slate-800'}`}>
                {selectedBook?.title}
              </span>
            </div>

            <button 
              onClick={toggleTheme}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition cursor-pointer flex items-center gap-1.5 ${
                isDark ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-amber-300' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-indigo-600'
              }`}
              title="Alternar Modo Escuro / Claro"
            >
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