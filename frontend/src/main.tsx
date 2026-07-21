import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './app/store'
import { I18nProvider } from './shared/i18n/I18nProvider'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </Provider>
  </StrictMode>,
)
