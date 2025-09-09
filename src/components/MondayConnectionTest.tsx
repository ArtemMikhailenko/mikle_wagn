import React, { useState } from 'react';
import mondayDirectService from '../services/mondayDirectService';

const MondayConnectionTest: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);

  const testConnection = async () => {
    setConnectionStatus('testing');
    setErrorMessage('');
    
    try {
      console.log('🔄 Testing Monday.com connection...');
      const success = await mondayDirectService.testConnection();
      
      if (success) {
        setConnectionStatus('success');
        console.log('✅ Connection successful, loading projects...');
        
        const allProjects = await mondayDirectService.getAllProjects();
        setProjects(allProjects);
        console.log('✅ Projects loaded:', allProjects);
      } else {
        setConnectionStatus('error');
        setErrorMessage('Failed to connect to Monday.com');
      }
    } catch (error) {
      console.error('❌ Error testing connection:', error);
      setConnectionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const testSpecificProject = async () => {
    try {
      // Попробуем загрузить конкретный проект
      const projectId = '2098825105'; // ID из скриншота
      console.log(`🔄 Testing specific project: ${projectId}`);
      
      const project = await mondayDirectService.getProjectById(projectId);
      console.log('📋 Project data:', project);
      
      if (project) {
        const mockup = await mondayDirectService.getMockupForProject(projectId);
        console.log('🖼️ Mockup URL:', mockup);
      }
    } catch (error) {
      console.error('❌ Error testing specific project:', error);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-xl font-bold mb-4">Monday.com Connection Test</h2>
      
      <div className="space-y-4">
        <div>
          <button
            onClick={testConnection}
            disabled={connectionStatus === 'testing'}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:opacity-50"
          >
            {connectionStatus === 'testing' ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        <div>
          <button
            onClick={testSpecificProject}
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            Test Specific Project
          </button>
        </div>

        {connectionStatus === 'success' && (
          <div className="bg-green-800 p-3 rounded">
            <p>✅ Successfully connected to Monday.com!</p>
            <p>Found {projects.length} projects</p>
          </div>
        )}

        {connectionStatus === 'error' && (
          <div className="bg-red-800 p-3 rounded">
            <p>❌ Connection failed:</p>
            <p>{errorMessage}</p>
          </div>
        )}

        {projects.length > 0 && (
          <div className="bg-gray-800 p-3 rounded">
            <h3 className="font-bold mb-2">Projects:</h3>
            <ul className="space-y-1">
              {projects.map((project, index) => (
                <li key={index} className="text-sm">
                  <strong>{project.name}</strong> (ID: {(project as any).mondayId})
                  <br />
                  Client: {(project as any).clientName} • {(project as any).clientEmail}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-6 text-xs text-gray-400">
        <p>Check browser console for detailed logs</p>
        <p>API Token: {import.meta.env.VITE_MONDAY_API_TOKEN ? '✅ Present' : '❌ Missing'}</p>
        <p>Board ID: {import.meta.env.VITE_MONDAY_BOARD_ID || '1923600883'}</p>
      </div>
    </div>
  );
};

export default MondayConnectionTest;
