import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Site from './screens/Site';
import './index.css';

// "/" é a página pública. A aplicação vive em "/app" (e "/?demo" continua a abrir a demonstração).
// Os links dos emails do Supabase (recuperar password) podem cair em "/": nesse caso também abrimos a aplicação.
const fromEmailLink = /type=recovery|error_code=/.test(location.hash + location.search);
const isApp = location.pathname !== '/' || new URLSearchParams(location.search).has('demo') || fromEmailLink;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{isApp ? <App /> : <Site />}</React.StrictMode>
);
