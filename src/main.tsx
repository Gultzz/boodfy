import ReactDOM from 'react-dom/client';
import { pdfjs } from 'react-pdf';
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import App from './App';
import './styles/global.css';

// Configure pdfjs worker once globally at root with Vite's bundled worker asset URL
pdfjs.GlobalWorkerOptions.workerSrc = worker;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />,
);
