import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/500.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
import { App } from './app/App';
import { SessionProvider } from './app/SessionProvider';
import { applyDocument, LanguageProvider } from './i18n';
import './styles/tokens.css';
import './styles/app.css';

applyDocument();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><SessionProvider><LanguageProvider><App /></LanguageProvider></SessionProvider></BrowserRouter></React.StrictMode>,
);
