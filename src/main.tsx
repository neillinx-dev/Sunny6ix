import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import LandingPage from './components/Landing/LandingPage'

const isAppRoute = window.location.pathname.startsWith('/app')
document.body.dataset.route = isAppRoute ? 'app' : 'landing'

createRoot(document.getElementById('root')!).render(isAppRoute ? <App /> : <LandingPage />)
