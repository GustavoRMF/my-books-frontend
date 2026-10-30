import React, { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString();

export default function PdfReader({ bookUrl, bookId, lastCfi, theme: globalTheme, token }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(parseInt(lastCfi) || 1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.8);
  const [readingTheme, setReadingTheme] = useState(globalTheme || 'dark');
  const [toc, setToc] = useState([]);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');

  const API_URL = 'https://my-books-backend.onrender.com';

  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      fetch(`${API_URL}/api/reading-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ book_id: bookId, minutes: 1 })
      }).catch(err => console.error(err));
    }, 60000);
    return () => clearInterval(timer);
  }, [bookId, token]);

  const fetchNotes = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/books/${bookId}/notes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setNotes(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!bookUrl) return;
    setLoading(true); setError(null);

    // Garante que o URL do PDF aponta para o Render caso seja um caminho relativo (ex: /uploads/...)
    const fullBookUrl = bookUrl.startsWith('http') ? bookUrl : `${API_URL}${bookUrl}`;

    const loadingTask = pdfjsLib.getDocument({ url: fullBookUrl, cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/', cMapPacked: true });
    loadingTask.promise
      .then((pdf) => {
        setPdfDoc(pdf); setTotalPages(pdf.numPages);
        const initialPage = parseInt(lastCfi) || 1;
        setCurrentPage(initialPage <= pdf.numPages && initialPage > 0 ? initialPage : 1);
        setLoading(false);
        pdf.getOutline().then((outline) => { if (outline) setToc(outline); });
      })
      .catch((err) => { console.error(err); setError("Erro ao carregar o PDF."); setLoading(false); });

    fetchNotes();
  }, [bookUrl, lastCfi, token]);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !token) return;

    let renderTask = null;
    pdfDoc.getPage(currentPage).then((page) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const context = canvas.getContext('2d');
      const outputScale = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale });

      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      renderTask = page.render({ canvasContext: context, transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null, viewport: viewport });
      renderTask.promise.catch((err) => { if (err.name !== 'RenderingCancelledException') console.error(err); });
    });

    const saveTimeout = setTimeout(() => {
      fetch(`${API_URL}/api/books/${bookId}/progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ cfi: currentPage.toString(), percentage: totalPages > 0 ? (currentPage / totalPages) * 100 : 0 })
      }).catch(err => console.error(err));
    }, 2000);

    return () => { if (renderTask) renderTask.cancel(); clearTimeout(saveTimeout); };
  }, [pdfDoc, currentPage, totalPages, scale, bookId, token]);

  const nextPage = () => { if (currentPage < totalPages) { setCurrentPage(prev => prev + 1); if (containerRef.current) containerRef.current.scrollTop = 0; } };
  const prevPage = () => { if (currentPage > 1) { setCurrentPage(prev => prev - 1); if (containerRef.current) containerRef.current.scrollTop = 0; } };
  const zoomIn = () => setScale(prev => Math.min(prev + 0.3, 3.5));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.3, 0.8));
  const resetZoom = () => setScale(1.8);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || !token) return;
    try {
      const res = await fetch(`${API_URL}/api/books/${bookId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ content: newNoteText })
      });
      if (res.ok) {
        const newNote = await res.json();
        setNotes(prev => [newNote, ...prev]);
        setNewNoteText('');
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteNote = async (noteId) => {
    try {
      const res = await fetch(`${API_URL}/api/notes/${noteId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      if (res.ok) setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) { console.error(err); }
  };

  const goToTocItem = async (dest) => {
    if (!pdfDoc || !dest) return;
    try {
      let destArray = typeof dest === 'string' ? await pdfDoc.getDestination(dest) : dest;
      if (Array.isArray(destArray)) {
        setCurrentPage(await pdfDoc.getPageIndex(destArray[0]) + 1);
        setIsTocOpen(false);
      }
    } catch (err) { console.warn(err); }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true); } 
    else { if (document.exitFullscreen) { document.exitFullscreen(); setIsFullscreen(false); } }
  };

  return (
    <div className={`flex flex-col h-full relative transition-colors duration-300 ${readingTheme === 'dark' ? 'bg-gray-950 text-white' : readingTheme === 'sepia' ? 'bg-[#f4ecd8] text-[#423121]' : 'bg-slate-200 text-slate-800'}`}>
      <div className={`flex flex-wrap justify-between items-center px-4 md:px-6 py-2.5 shadow-md z-10 gap-3 text-xs md:text-sm ${readingTheme === 'dark' ? 'bg-gray-900 border-gray-800' : readingTheme === 'sepia' ? 'bg-[#e8dcbe] border-[#d8c8a8]' : 'bg-white border-slate-300'}`}>
        <div className="flex items-center gap-2">
          <button onClick={() => { setIsTocOpen(!isTocOpen); setIsNotesOpen(false); }} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer">📋 Sumário</button>
          <button onClick={() => { setIsNotesOpen(!isNotesOpen); setIsTocOpen(false); }} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium cursor-pointer flex items-center gap-1">📝 Caderno ({notes.length})</button>
          <button onClick={prevPage} disabled={currentPage <= 1} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 rounded-lg font-semibold cursor-pointer">⬅️</button>
          <span className="font-medium min-w-[90px] text-center">Pág. {currentPage} / {totalPages || '...'}</span>
          <button onClick={nextPage} disabled={currentPage >= totalPages} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 rounded-lg font-semibold cursor-pointer">➡️</button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-black/10 p-1 rounded-lg">
            <button onClick={zoomOut} className="px-2 py-0.5 font-bold hover:bg-black/20 rounded cursor-pointer">🔍 -</button>
            <button onClick={resetZoom} className="px-1.5 py-0.5 text-xs font-medium hover:bg-black/20 rounded cursor-pointer">{Math.round(scale * 100)}%</button>
            <button onClick={zoomIn} className="px-2 py-0.5 font-bold hover:bg-black/20 rounded cursor-pointer">🔍 +</button>
          </div>
          <div className="flex items-center gap-1 bg-black/10 p-1 rounded-lg">
            <button onClick={() => setReadingTheme('light')} className={`w-5 h-5 rounded-full bg-white border cursor-pointer ${readingTheme === 'light' ? 'ring-2 ring-blue-500' : ''}`} />
            <button onClick={() => setReadingTheme('sepia')} className={`w-5 h-5 rounded-full bg-[#fbf0d9] border border-[#d8c8a8] cursor-pointer ${readingTheme === 'sepia' ? 'ring-2 ring-amber-600' : ''}`} />
            <button onClick={() => setReadingTheme('dark')} className={`w-5 h-5 rounded-full bg-gray-900 border border-gray-700 cursor-pointer ${readingTheme === 'dark' ? 'ring-2 ring-blue-400' : ''}`} />
          </div>
          <button onClick={toggleFullscreen} className="px-2.5 py-1.5 bg-black/10 hover:bg-black/20 rounded-lg text-xs font-medium cursor-pointer">{isFullscreen ? '📉 Sair' : '🖥️ Ecrã Inteiro'}</button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 flex justify-center items-start p-4 md:p-6 overflow-auto relative">
        {isTocOpen && (
          <div className="absolute top-0 left-0 h-full w-72 bg-gray-900/95 text-white z-30 p-4 shadow-2xl backdrop-blur-md overflow-y-auto border-r border-gray-800">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
              <h3 className="font-bold text-sm text-blue-400">Sumário do PDF</h3>
              <button onClick={() => setIsTocOpen(false)} className="text-gray-400 hover:text-white font-bold text-sm">✕</button>
            </div>
            {toc.length === 0 ? <p className="text-xs text-gray-500">Sem marcadores no PDF.</p> : (
              <ul className="space-y-2 text-xs">
                {toc.map((item, idx) => (
                  <li key={idx} onClick={() => goToTocItem(item.dest)} className="p-2 hover:bg-blue-600/30 rounded cursor-pointer transition truncate border-b border-gray-800/40 text-gray-300 hover:text-white">{item.title || `Secção ${idx + 1}`}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {isNotesOpen && (
          <div className="absolute top-0 right-0 h-full w-80 bg-gray-900/95 text-white z-30 p-4 shadow-2xl backdrop-blur-md overflow-y-auto border-l border-gray-800 flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
              <h3 className="font-bold text-sm text-indigo-400">📝 Caderno de Notas</h3>
              <button onClick={() => setIsNotesOpen(false)} className="text-gray-400 hover:text-white font-bold text-sm">✕</button>
            </div>
            <form onSubmit={handleAddNote} className="mb-4">
              <textarea value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} placeholder="Escreva uma reflexão..." className="w-full p-2.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white h-20 resize-none focus:outline-none" />
              <button type="submit" className="w-full mt-2 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-semibold cursor-pointer">+ Guardar Nota</button>
            </form>
            <div className="flex-1 overflow-y-auto space-y-3">
              <h4 className="text-[11px] font-bold text-gray-400 uppercase">Notas Salvas</h4>
              {notes.length === 0 ? <p className="text-xs text-gray-500 italic">Sem notas.</p> : (
                notes.map((note) => (
                  <div key={note.id} className="p-3 bg-gray-800/80 rounded-lg border border-gray-700/60 relative group">
                    <button onClick={() => handleDeleteNote(note.id)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400 text-xs transition opacity-0 group-hover:opacity-100">🗑️</button>
                    <p className="text-xs text-gray-200 whitespace-pre-wrap">{note.content}</p>
                    <span className="text-[9px] text-gray-500 block mt-2">{new Date(note.created_at).toLocaleDateString()}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {loading && <div className="opacity-70 font-medium my-auto">A carregar documento PDF...</div>}
        {error && <div className="text-red-500 font-medium my-auto">{error}</div>}
        <div className={`rounded-xl shadow-2xl overflow-hidden p-2 my-auto transition-all duration-300 ${readingTheme === 'sepia' ? 'bg-[#fbf0d9] filter sepia-[0.15]' : readingTheme === 'dark' ? 'bg-gray-900' : 'bg-white'} ${loading || error ? 'hidden' : 'block'}`}>
          <canvas ref={canvasRef} className="block mx-auto shadow-sm rounded-lg" />
        </div>
      </div>
    </div>
  );
}