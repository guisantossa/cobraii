import { BrowserRouter } from 'react-router-dom'
import { AuthProvider, useAuth } from './auth/AuthContext'
import AppRoutes from './routes'
import Sidebar from './components/Sidebar'
import Navbar from './components/Navbar'

function Layout() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="font-sans bg-white text-text min-h-screen">
      {isAuthenticated && <Sidebar />}

      <div className={isAuthenticated ? 'ml-64' : ''}>
        {isAuthenticated && <Navbar />}
        <main className="p-10 mt-16">
          <AppRoutes />
        </main>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
