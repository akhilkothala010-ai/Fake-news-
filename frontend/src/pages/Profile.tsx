import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Clock, Activity, AlertCircle, CheckCircle } from 'lucide-react';

interface HistoryItem {
  text: string;
  result: string;
  confidence: number;
  timestamp: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      try {
        const res = await fetch(`${API_URL}/history?user_id=${user.id}`);
        const data = await res.json();
        if (res.ok) {
          setHistory(data);
        }
      } catch (err) {
        console.error('Failed to fetch history', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 animate-fadeIn">
      
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 mb-8 transition-colors duration-300 flex items-center gap-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg">
          {user?.username.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize drop-shadow-sm">
            {user?.username}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {user?.email}
          </p>
        </div>
      </div>

      {/* History Section */}
      <div className="flex items-center gap-2 mb-6">
        <Activity className="text-blue-500 w-5 h-5" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Analysis History</h2>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <Clock className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">No history found. Try analyzing some articles!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((item, index) => {
            const isFake = item.result.includes('Fake');
            const date = new Date(item.timestamp).toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short'
            });

            return (
              <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold ${
                    isFake ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  }`}>
                    {isFake ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                    {isFake ? 'FAKE NEWS' : 'REAL NEWS'}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {date}
                  </span>
                </div>
                
                <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 mb-3 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg border border-gray-100 dark:border-gray-800 italic">
                  "{item.text}"
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Confidence</span>
                  <div className="flex items-center gap-2 w-1/2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 flex-1">
                      <div
                        className={`h-full rounded-full ${isFake ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${item.confidence}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 min-w-[32px] text-right">
                      {Math.round(item.confidence)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
