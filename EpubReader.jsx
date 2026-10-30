import React, { useEffect, useState, useRef } from 'react';
import ePub from 'epubjs';

export default function CompleteEpubReader({ bookUrl, bookId, lastCfi, theme: globalTheme, token }) {
  const viewerRef = useRef(null);
  const [rendition, setRendition] = useState(null);
  const [book, setBook] = useState(null);
  
  const [fontSize, setFontSize] = useState(100);
  const [fontFamily, setFontFamily] = useState('sans-serif');
  const [readingTheme, setReadingTheme] = useState(globalTheme || 'dark');
  const [toc, setToc] = useState([]);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [highlights, setHighlights] = useState([]);

  useEffect(() => {
    if (!token) return;
    const timer = setInterval(() => {
      fetch('http://localhost:3000/api/reading-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ book_id: bookId, minutes: 1 })
      }).catch(err => console.error("Erro no temporizador:", err));
    }, 60000);
    return () => clearInterval(timer);
  }, [bookId, token]);

  const fetchHighlights = async () => {
    if (!token) return [];
    try {
      const res = await fetch(`https://my-books-backend.onrender.com/api/books/${bookId}/highlights`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHighlights(data);
        return data;
      }
    } catch (err) { console.error(err); }
    return [];
  };

  const fetchNotes = async () => {
    if (!token) return;
    try {
      const res = await fetch(`http://localhost:3000/api/books/${bookId}/notes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setNotes(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (!bookUrl || !viewerRef.current || !token) return;

    viewerRef.current.innerHTML = '';
    const localBook = ePub(bookUrl);
    setBook(localBook);

    const localRendition = localBook.renderTo(viewerRef.current, { width: "100%", height: "100%", spread: "auto" });

    localRendition.themes.register("light", { body: { background: "#ffffff !important", color: "#111827 !important" } });
    localRendition.themes.register("dark", { body: { background: "#111827 !important", color: "#f3f4f6 !important" } });
    localRendition.themes.register("sepia", { body: { background: "#fbf0d9 !important", color: "#5f4b32 !important" } });

    localBook.loaded.navigation.then((nav) => { if (nav && nav.toc) setToc(nav.toc); });

    fetchHighlights().then((dbHighlights) => {
      localRendition.display(lastCfi || undefined).then(() => {
        dbHighlights.forEach((hl) => {
          localRendition.annotations.add("highlight", hl.cfi_range, { id: hl.id }, null, "highlight-class", { fill: hl.color || "yellow", "fill-opacity": "0.3" });
        });
        localRendition.themes.select(readingTheme);
        localRendition.themes.fontSize(`${fontSize}%`);
        localRendition.themes.font(fontFamily);
      });
    });

    fetchNotes();
    localBook.ready.then(() => localBook.locations.generate(1600));

    let saveTimeout;
    localRendition.on("relocated", (location) => {
      const currentCfi = location.start.cfi;
      let percentage = 0;
      if (localBook.locations && typeof localBook.locations.percentageFromCfi === 'function') {
        const rawPct = localBook.locations.percentageFromCfi(currentCfi);
        if (!isNaN(rawPct) && rawPct !== null) percentage = rawPct * 100;
      }
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        fetch(`http://localhost:3000/api/books/${bookId}/progress`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ cfi: currentCfi, percentage: percentage })
        }).catch(err => console.error(err));
      }, 2000);
    });

    localRendition.on("selected", async (cfiRange) => {
      const selectedText = rendition ? rendition.getRange(cfiRange)?.toString() : '';
      try {
        const res = await fetch(`http://localhost:3000/api/books/${bookId}/highlights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ cfi_range: cfiRange, text_content: selectedText, color: 'yellow' })
        });
        if (res.ok) {
          const newHl = await res.json();
          localRendition.annotations.add("highlight", cfiRange, { id: newHl.id }, null, "highlight-class", { fill: "yellow", "fill-opacity": "0.3" });
          setHighlights(prev => [...prev, newHl]);
        }
      } catch (err) { console.error(err); }
    });

    setRendition(localRendition);

    return () => {
      localBook.destroy();
      clearTimeout(saveTimeout);
      if (viewerRef.current) viewerRef.current.innerHTML = '';
    };
  }, [bookUrl, bookId, token]);

  useEffect(() => {
    if (rendition) {
      rendition.themes.select(readingTheme);
      rendition.themes.fontSize(`${fontSize}%`);
      rendition.themes.font(fontFamily);
    }
  }, [readingTheme, fontSize, fontFamily, rendition]);

  const nextPage = () => { if (rendition) rendition.next(); };
  const prevPage = () => { if (rendition) rendition.prev(); };
  const goToChapter = (target) => { if (rendition) { rendition.display(target); setIsTocOpen(false); } };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNoteText.trim() || !token) return;
    try {
      const res = await fetch(`http://localhost:3000/api/books/${bookId}/notes`, {
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
      const res = await fetch(`http://localhost:3000/api/notes/${noteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) { console.error(err); }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true); } 
    else { if (document.exitFullscreen) { document.exitFullscreen(); setIsFullscreen(false); } }
  };

  return (
    <div className={`flex flex-col h-full relative transition-colors duration-300 ${
      readingTheme === 'dark' ? 'bg-gray-950 text-white' : readingTheme === 'sepia' ? 'bg-[#f4ecd8] text-[#423121]' : 'bg-slate-100 text-slate-800'
    }`}>
      <div className={`flex flex-wrap justify-between items-center px-4 md:px-6 py-2.5 shadow-md z-10 gap-3 text-xs md:text-sm ${readingTheme === 'dark' ? 'bg-gray-900 border-gray-800' : readingTheme === 'sepia' ? 'bg-[#e8dcbe] border-[#d8c8a8]' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <button onClick={() => { setIsTocOpen(!isTocOpen); setIsNotesOpen(false); }} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium cursor-pointer">📋 Sumário</button>
          <button onClick={() => { setIsNotesOpen(!isNotesOpen); setIsTocOpen(false); }} className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium cursor-pointer flex items-center gap-1">📝 Caderno ({notes.length})</button>
          <button onClick={prevPage} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium cursor-pointer">⬅️</button>
          <button onClick={nextPage} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium cursor-pointer">➡️</button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-black/10 p-1 rounded-lg">
            <button onClick={() => setFontSize(prev => Math.max(prev - 10, 70))} className="px-2 py-0.5 font-bold hover:bg-black/20 rounded cursor-pointer">A-</button>
            <span className="text-xs px-1 font-semibold">{fontSize}%</span>
            <button onClick={() => setFontSize(prev => Math.min(prev + 10, 180))} className="px-2 py-0.5 font-bold hover:bg-black/20 rounded cursor-pointer">A+</button>
          </div>
          <select value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} className="px-2 py-1 rounded bg-black/10 text-xs font-medium cursor-pointer focus:outline-none">
            <option value="sans-serif">Sans-Serif</option>
            <option value="serif">Georgia / Serif</option>
            <option value="monospace">Monospace</option>
          </select>
          <div className="flex items-center gap-1 bg-black/10 p-1 rounded-lg">
            <button onClick={() => setReadingTheme('light')} className={`w-5 h-5 rounded-full bg-white border cursor-pointer ${readingTheme === 'light' ? 'ring-2 ring-blue-500' : ''}`} />
            <button onClick={() => setReadingTheme('sepia')} className={`w-5 h-5 rounded-full bg-[#fbf0d9] border border-[#d8c8a8] cursor-pointer ${readingTheme === 'sepia' ? 'ring-2 ring-amber-600' : ''}`} />
            <button onClick={() => setReadingTheme('dark')} className={`w-5 h-5 rounded-full bg-gray-900 border border-gray-700 cursor-pointer ${readingTheme === 'dark' ? 'ring-2 ring-blue-400' : ''}`} />
          </div>
          <button onClick={toggleFullscreen} className="px-2.5 py-1.5 bg-black/10 hover:bg-black/20 rounded-lg text-xs font-medium cursor-pointer">{isFullscreen ? '📉 Sair' : '🖥️ Ecrã Inteiro'}</button>
        </div>
      </div>

      <div className="flex-1 flex justify-center items-center p-2 md:p-6 overflow-hidden relative">
        {isTocOpen && (
          <div className="absolute top-0 left-0 h-full w-72 bg-gray-900/95 text-white z-30 p-4 shadow-2xl backdrop-blur-md overflow-y-auto border-r border-gray-800">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-2">
              <h3 className="font-bold text-sm text-blue-400">Sumário</h3>
              <button onClick={() => setIsTocOpen(false)} className="text-gray-400 hover:text-white font-bold text-sm">✕</button>
            </div>
            {toc.length === 0 ? <p className="text-xs text-gray-500">Sem índice.</p> : (
              <ul className="space-y-2 text-xs">
                {toc.map((item, idx) => (
                  <li key={idx} onClick={() => goToChapter(item.href)} className="p-2 hover:bg-blue-600/30 rounded cursor-pointer transition truncate border-b border-gray-800/40 text-gray-300 hover:text-white">{item.label?.trim() || `Capítulo ${idx + 1}`}</li>
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

        <div ref={viewerRef} className={`w-full max-w-4xl h-full rounded-xl shadow-2xl overflow-hidden p-2 transition-colors duration-300 ${readingTheme === 'dark' ? 'bg-gray-900' : readingTheme === 'sepia' ? 'bg-[#fbf0d9]' : 'bg-white'}`} />
      </div>
    </div>
  );
}