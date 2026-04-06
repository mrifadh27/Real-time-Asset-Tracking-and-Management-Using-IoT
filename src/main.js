/**
 * src/main.js
 * Application entry point.
 * Imports styles and boots the App after DOM is ready.
 */

import './styles/globals.css';
import './styles/components.css';
import './styles/pages.css';

import { app } from './App.js';

// Boot after DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.mount());
} else {
  app.mount();
}
