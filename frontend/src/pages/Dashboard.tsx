import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, Globe, Target, Link as LinkIcon, Languages } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const [inputText, setInputText] = useState('');
  const [language, setLanguage] = useState('en');
  const [sourceUrl, setSourceUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<{
    prediction: string;
    confidence: number;
    source_status: string;
    suspicious_words: string[];
    credible_words: string[];
    translated_text: string | null;
  } | null>(null);

  const { user } = useAuth();
  const maxChars = 5000;
  
  const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000';

  const handleVerify = async () => {
    if (!inputText.trim()) return;

    setIsVerifying(true);
    setResult(null);

    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          news: inputText, 
          language: language,
          source_url: sourceUrl,
          user_id: user?.id 
        })
      });
      
      const data = await res.json();
      if(!res.ok) throw new Error(data.error);

      setResult({
        prediction: data.prediction,
        confidence: data.confidence,
        source_status: data.source_status,
        suspicious_words: data.suspicious_words,
        credible_words: data.credible_words,
        translated_text: data.translated_text
      });
    } catch (error) {
      console.error(error);
      alert('Failed to analyze the text. Is the backend running?');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReset = () => {
    setInputText('');
    setSourceUrl('');
    setResult(null);
  };

  const isFake = result?.prediction?.includes('Fake');
  const resultTitle = isFake ? 'Potentially Fake News' : 'Appears to be Real News';

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 animate-fadeIn">
      
      <div className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4 transition-colors">
          Analyze Article
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Paste context & URLs below, and our model will determine its authenticity.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8 mb-8 transition-colors duration-300">
        
        {/* Top Controls: Language & URL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-semibold mb-2">
              <Languages className="w-4 h-4 text-blue-500" /> Language Format
            </label>
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-100 transition-all font-medium"
            >
              <option value="en">English (Default)</option>
              <option value="hi">Hindi (हिंदी)</option>
              <option value="te">Telugu (తెలుగు)</option>
            </select>
          </div>
          <div>
            <label className="flex items-center gap-2 text-gray-800 dark:text-gray-200 font-semibold mb-2">
              <LinkIcon className="w-4 h-4 text-blue-500" /> Source URL <span className="text-xs font-normal text-gray-400">(Optional)</span>
            </label>
            <input 
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="e.g., https://bbc.com/news/123"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 transition-all"
            />
          </div>
        </div>

        <div className="mb-4">
          <label htmlFor="article-input" className="block text-gray-800 dark:text-gray-200 font-semibold mb-3">
            Article Content
          </label>
          <div className="relative">
            <textarea
              id="article-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, maxChars))}
              placeholder="Paste the raw text of the news article or headline here..."
              className="w-full h-40 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-800 dark:text-gray-100 placeholder-gray-400 transition-all outline-none leading-relaxed"
            />
            <div className="absolute bottom-3 right-4 text-xs text-gray-400 font-medium">
              {inputText.length} / {maxChars}
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-6">
          <button
            onClick={handleVerify}
            disabled={!inputText.trim() || isVerifying}
            className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center gap-3 min-w-[220px] justify-center"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Scanning AI Logic...
              </>
            ) : (
              'Analyze Authenticity'
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 sm:p-8 animate-fadeIn transition-colors duration-300">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Analysis Results</h2>

          <div className={`p-6 rounded-xl border ${
            isFake
              ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/50'
              : 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/50'
          }`}>
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {isFake ? (
                <AlertCircle className="w-10 h-10 text-red-500 flex-shrink-0 mt-1" />
              ) : (
                <CheckCircle className="w-10 h-10 text-green-500 flex-shrink-0 mt-1" />
              )}

              <div className="flex-1 w-full">
                <h3 className={`text-xl font-bold mb-4 ${
                  isFake ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'
                }`}>
                  {resultTitle}
                </h3>

                <div className="mb-4 bg-white/60 dark:bg-black/20 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Net Confidence Score</span>
                    <span className={`text-lg font-bold ${
                      isFake ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {result.confidence}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        isFake ? 'bg-red-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${result.confidence}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  
                  {/* Domain Credibility Widget */}
                  <div className="bg-white/60 dark:bg-black/20 p-4 rounded-lg border border-gray-100 dark:border-gray-700/50">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                      <Globe className="w-4 h-4 text-blue-500" />
                      Domain Credibility Module
                    </h4>
                    {sourceUrl ? (
                      <span className={`inline-block px-3 py-1.5 text-xs font-bold rounded-lg border ${
                        result.source_status === 'Trusted' 
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' 
                          : result.source_status === 'Suspicious' 
                            ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800'
                            : 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
                      }`}>
                        {result.source_status.toUpperCase()} DOMAIN
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400 italic">No URL provided</span>
                    )}
                  </div>

                  {/* Translations Status Widget */}
                  <div className="bg-white/60 dark:bg-black/20 p-4 rounded-lg border border-gray-100 dark:border-gray-700/50">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-2">
                      <Languages className="w-4 h-4 text-blue-500" />
                      Translation Protocol
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {result.translated_text 
                        ? 'Input successfully transformed to English globally for analytical compatibility.' 
                        : 'Natively processed in English baseline routing.'}
                    </p>
                  </div>

                  {/* XAI Explainability Widget */}
                  <div className="bg-white/60 dark:bg-black/20 p-4 rounded-lg border border-gray-100 dark:border-gray-700/50 md:col-span-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4 text-purple-500" />
                      Traceability: Why did the AI yield this score?
                    </h4>
                    
                    {result.suspicious_words.length > 0 && (
                      <div className="mb-3">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Clickbait / Suspicious Terms Extracted:</span>
                        <div className="flex flex-wrap gap-2">
                          {result.suspicious_words.map(w => (
                            <span key={w} className="px-2.5 py-1 bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-xs font-medium rounded-md border border-red-200 dark:border-red-800/50">
                              "{w}"
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {result.credible_words.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Standard / Authentic Terms Extracted:</span>
                        <div className="flex flex-wrap gap-2">
                          {result.credible_words.map(w => (
                            <span key={w} className="px-2.5 py-1 bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 text-xs font-medium rounded-md border border-green-200 dark:border-green-800/50">
                              "{w}"
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button
              onClick={handleReset}
              className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
            >
              Scan Another Article
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
