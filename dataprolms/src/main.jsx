import { StrictMode } from 'react';
import { createRoot } from "react-dom/client";
import './index.css';
import App from "./app.jsx";
import { start_session_keep_alive } from "./session_keep_alive.js";

start_session_keep_alive();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
