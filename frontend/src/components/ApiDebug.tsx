import { useState } from 'react';
import { api } from '@/services/api';

export function ApiDebug() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testApi = async () => {
    setLoading(true);
    try {
      console.log('API Base URL:', api.defaults.baseURL);
      console.log('Environment:', import.meta.env);
      
      const response = await api.get('/debug');
      setResult({ success: true, data: response.data });
    } catch (error: any) {
      console.error('API Test Error:', error);
      setResult({ 
        success: false, 
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    } finally {
      setLoading(false);
    }
  };

  const testLogin = async () => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: 'buyer1@example.com',
        password: 'buyer123'
      });
      setResult({ success: true, data: response.data });
    } catch (error: any) {
      console.error('Login Test Error:', error);
      setResult({ 
        success: false, 
        error: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded">
      <h3 className="text-lg font-bold mb-4">API Debug</h3>
      
      <div className="space-y-2 mb-4">
        <p><strong>API Base URL:</strong> {api.defaults.baseURL}</p>
        <p><strong>Environment:</strong> {import.meta.env.MODE}</p>
        <p><strong>VITE_API_URL:</strong> {import.meta.env.VITE_API_URL}</p>
      </div>

      <div className="space-x-2 mb-4">
        <button 
          onClick={testApi} 
          disabled={loading}
          className="btn btn-primary"
        >
          Test Debug Endpoint
        </button>
        <button 
          onClick={testLogin} 
          disabled={loading}
          className="btn btn-secondary"
        >
          Test Login
        </button>
      </div>

      {loading && <p>Loading...</p>}
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}