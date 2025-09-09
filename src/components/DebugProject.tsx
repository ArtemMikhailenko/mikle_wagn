import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function DebugProject() {
  const { projectId } = useParams<{ projectId: string }>();
  const [rawData, setRawData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRawData = async () => {
      if (!projectId) return;
      
      setIsLoading(true);
      try {
        // Загружаем raw данные из Monday.com для отладки
        const query = `
          query {
            boards(ids: [1923600883]) {
              items_page(limit: 100) {
                items {
                  id
                  name
                  column_values {
                    id
                    text
                    value
                    type
                  }
                }
              }
            }
          }
        `;

        const response = await fetch('https://api.monday.com/v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': import.meta.env.VITE_MONDAY_TOKEN || ''
          },
          body: JSON.stringify({ query })
        });

        const result = await response.json();
        const items = result.data?.boards?.[0]?.items_page?.items || [];
        const targetItem = items.find((item: any) => item.id === projectId);
        
        setRawData(targetItem);
      } catch (error) {
        console.error('Error loading raw data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadRawData();
  }, [projectId]);

  if (isLoading) {
    return <div className="p-8">Loading raw project data...</div>;
  }

  if (!rawData) {
    return <div className="p-8">Project not found: {projectId}</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Debug Project: {rawData.name}</h1>
      <p className="text-gray-600 mb-4">ID: {rawData.id}</p>
      
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">All Column Values</h2>
        </div>
        
        <div className="p-6">
          <div className="grid gap-4">
            {rawData.column_values.map((col: any, index: number) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="font-semibold text-blue-600">ID:</span>
                    <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded">{col.id}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-green-600">Type:</span>
                    <span className="ml-2">{col.type || 'unknown'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-purple-600">Text:</span>
                    <span className="ml-2">{col.text || 'null'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-orange-600">Has Value:</span>
                    <span className="ml-2">{col.value ? '✅' : '❌'}</span>
                  </div>
                </div>
                
                {col.value && (
                  <div className="mt-3">
                    <span className="font-semibold text-red-600">Value:</span>
                    <pre className="mt-1 bg-gray-100 p-2 rounded text-xs overflow-auto max-h-32">
                      {typeof col.value === 'string' ? col.value : JSON.stringify(col.value, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
