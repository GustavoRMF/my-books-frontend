import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // <-- Esta linha tem de estar aqui para carregar o Tailwind!

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    </React.StrictMode>,
) 