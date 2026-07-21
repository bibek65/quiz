'use client';

import { Plus, Trash2, Edit2, Save, X, BookOpen, HelpCircle } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createQuiz } from '@/lib/actions';

export default function HostSessionManager({ quizzes }: { quizzes: any[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleCreateSession = async () => {
    const result = await createQuiz();
    if (result.success) {
      router.push(`/quiz/${result.quizId}/host/setup`);
    }
  };

  const handleDeleteSession = async (quizId: string) => {
    if (!confirm('Delete this quiz session? This cannot be undone.')) return;
    
    setDeleting(quizId);
    try {
      const response = await fetch(`/api/quiz/${quizId}`, { method: 'DELETE' });
      if (response.ok) {
        router.refresh();
      }
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen p-4">
      <div className="w-full space-y-6">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold"> Quiz Sessions</h1>
            <button
              onClick={handleCreateSession}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold"
            >
              + New Session
            </button>
          </div>

          {quizzes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <p className="text-lg mb-4">No quiz sessions yet</p>
              <button
                onClick={handleCreateSession}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold"
              >
                Create Your First Quiz
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="bg-slate-800/50 rounded-lg p-4 hover:bg-white/15 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="text-xs text-slate-500 mb-1">
                        {new Date(quiz.createdAt).toLocaleDateString()} {new Date(quiz.createdAt).toLocaleTimeString()}
                      </div>
                      <div className="font-mono text-sm text-blue-400">{quiz.id.substring(0, 8)}...</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-semibold ${
                      quiz.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      quiz.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-slate-500'
                    }`}>
                      {quiz.status}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Teams:</span>
                      <span className="font-semibold">{quiz.teams.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Domains:</span>
                      <span className="font-semibold">{quiz.domains.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Buzzer Qs:</span>
                      <span className="font-semibold">{quiz.buzzerQuestions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Round:</span>
                      <span className="font-semibold capitalize">{quiz.round.replace('_', ' ')}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/quiz/${quiz.id}/host/setup`)}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 rounded font-semibold text-sm"
                    >
                      Setup
                    </button>
                    <button
                      onClick={() => router.push(`/quiz/${quiz.id}/host/control`)}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 rounded font-semibold text-sm"
                    >
                      Control
                    </button>
                    <button
                      onClick={() => handleDeleteSession(quiz.id)}
                      disabled={deleting === quiz.id}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-semibold text-sm disabled:opacity-50"
                    >
                      {deleting === quiz.id ? '...' : '🗑️'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
