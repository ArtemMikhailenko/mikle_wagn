import React, { useState } from 'react';
import LottieLoader from './LottieLoader';
import { Search, Database, Eye } from 'lucide-react';

const MondayBoardAnalyzer: React.FC = () => {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const analyzeBoard = async () => {
    setLoading(true);
    setError('');
    
    try {
      const MONDAY_API_TOKEN = import.meta.env.VITE_MONDAY_API_TOKEN;
      const BOARD_ID = '1923600883'; // Ваша клиентская доска
      
      if (!MONDAY_API_TOKEN) {
        throw new Error('Monday.com API token не найден в переменных окружения');
      }

      const query = `
        query {
          boards(ids: [${BOARD_ID}]) {
            name
            description
            columns {
              id
              title
              type
              settings_str
            }
            items_page(limit: 10) {
              items {
                id
                name
                column_values {
                  id
                  title
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
          'Authorization': MONDAY_API_TOKEN,
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`Monday.com API ошибка: ${response.status}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`Monday.com GraphQL ошибки: ${JSON.stringify(data.errors)}`);
      }

      const board = data.data.boards[0];
      setAnalysis(board);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center">
            <Search className="w-8 h-8 mr-3" />
            Monday.com Board Analyzer
          </h1>
          <p className="text-gray-400">Анализ структуры доски клиентов (ID: 1923600883)</p>
        </div>

        <div className="mb-6">
          <button
            onClick={analyzeBoard}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2"
          >
            {loading ? (
              <>
                <LottieLoader size={16} label="" />
                <span>Анализирую...</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>Анализировать доску</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-600 text-red-200 p-4 rounded-lg mb-6">
            <strong>Ошибка:</strong> {error}
          </div>
        )}

        {analysis && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Информация о доске</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-sm">Название:</label>
                  <p className="font-medium">{analysis.name}</p>
                </div>
                <div>
                  <label className="text-gray-400 text-sm">Всего колонок:</label>
                  <p className="font-medium">{analysis.columns.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Структура колонок</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left py-2">ID</th>
                      <th className="text-left py-2">Название</th>
                      <th className="text-left py-2">Тип</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.columns.map((column: any) => (
                      <tr key={column.id} className="border-b border-gray-700/50">
                        <td className="py-2 font-mono text-blue-300">{column.id}</td>
                        <td className="py-2">{column.title}</td>
                        <td className="py-2">
                          <span className="bg-gray-700 px-2 py-1 rounded text-xs">
                            {column.type}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-4">Образцы данных (первые 10 записей)</h2>
              <div className="space-y-4">
                {analysis.items_page.items.map((item: any) => (
                  <div key={item.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <Eye className="w-4 h-4 mr-2" />
                      <strong>{item.name}</strong>
                      <span className="ml-2 text-gray-400 font-mono text-sm">(ID: {item.id})</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                      {item.column_values.filter((cv: any) => cv.text).map((cv: any) => (
                        <div key={cv.id} className="bg-gray-600 p-2 rounded">
                          <div className="text-gray-300 text-xs">{cv.title}:</div>
                          <div className="font-medium">{cv.text}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-900 border border-blue-600 text-blue-200 p-4 rounded-lg">
              <h3 className="font-bold mb-2">📋 Следующие шаги:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Определите какие колонки содержат: email клиента, имя, название проекта, статус</li>
                <li>Скопируйте ID нужных колонок из таблицы выше</li>
                <li>Настройте маппинг колонок в CRM сервисе</li>
                <li>Протестируйте синхронизацию данных</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MondayBoardAnalyzer;
