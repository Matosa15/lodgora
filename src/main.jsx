import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Site from './screens/Site';
import './index.css';

// "/" é a página pública. A aplicação vive em "/app" (e "/?demo" continua a abrir a demonstração).
const isApp = location.pathname !== '/' || new URLSearchParams(location.search).has('demo');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>{isApp ? <App /> : <Site />}</React.StrictMode>
);
