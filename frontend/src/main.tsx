import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.tsx'
import store from './app/store'
import './index.css'
import { initDB } from './database/indexedDB'

// ✅ تهيئة قاعدة بيانات IndexedDB فور بدء التطبيق
initDB().catch(console.error);

// ✅ تطبيق الثيم المحفوظ قبل أي رندر لتجنب وميض الألوان
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </HelmetProvider>
  </StrictMode>,
)
