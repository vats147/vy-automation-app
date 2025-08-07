import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Get the root element
const container = document.getElementById('root');
const root = createRoot(container);

// Render the app
root.render(<App />);

// Hide loading screen when React is ready
setTimeout(() => {
    document.body.classList.add('app-ready');
    if (window.hideLoadingScreen) {
        window.hideLoadingScreen();
    }
}, 100);
