import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import ErrorBoundary from './components/common/ErrorBoundary';
import { AuthProvider } from './features/auth/context/AuthContext';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
