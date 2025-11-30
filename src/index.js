import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { Provider } from 'react-redux';
import { BrowserRouter } from "react-router-dom";
import { store } from './store';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(

    <React.StrictMode>
        <Provider store={store}>
            <BrowserRouter>
            <App />
            </BrowserRouter>
        </Provider>
    </React.StrictMode>
);
// Enregistrement du Service Worker pour Pusher Beams
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
            .then((registration) => {
                console.log('ServiceWorker enregistré avec succès:', registration);
            })
            .catch((error) => {
                console.error('Erreur ServiceWorker:', error);
            });
    });
}


// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals(console.log);