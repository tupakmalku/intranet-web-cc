import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { initBrand } from './brand/index.ts'
import InsecureConnection from './components/InsecureConnection.tsx'
import './styles/index.css'

// La versión publicada solo funciona por HTTPS (o en localhost): sin cifrado, la
// aplicación podría alterarse en el camino. En desarrollo se permite, para
// probar desde un teléfono por la IP de la red.
const insecure = import.meta.env.PROD && !window.isSecureContext

// La identidad de la institución (compilada o de brand.json) se aplica antes de dibujar, para que no parpadee otra.
initBrand().finally(() => {
  createRoot(document.getElementById('root')!).render(<StrictMode>{insecure ? <InsecureConnection /> : <App />}</StrictMode>)
})
