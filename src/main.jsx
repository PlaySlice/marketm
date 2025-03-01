import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { WalletContextProvider } from './contexts/WalletContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletContextProvider>
        <App />
        <ToastContainer position="bottom-right" theme="dark" />
      </WalletContextProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
