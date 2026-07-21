'use client';

import { Monitor, Users, Play, Pause, RotateCcw, Trophy, Settings, Eye, BookOpen, Zap, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createTeam, createDomain, createQuestion, createBuzzerQuestion, startDomainRound, startBuzzerRound, resetQuiz, deleteTeam, deleteDomain, deleteQuestion, deleteBuzzerQuestion, updateTeam, updateDomain, updateQuestion, updateBuzzerQuestion, disconnectTeamCaptain } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';

export default function HostDashboard({ quiz }: { quiz: any }) {
  const { socket, isConnected, hasReconnected } = useSocket(quiz.id);
  
  useEffect(() => {
    if (!quiz.timerEndsAt) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(quiz.timerEndsAt).getTime() - Date.now()) / 1000));
      if (remaining === 0) {
        if (quiz.phase === 'showing_result' && quiz.round === 'domain') {
          fetch('/api/timer-expiry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizId: quiz.id })
          });
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [quiz.timerEndsAt, quiz.phase, quiz.round, quiz.id]);
  const [teamName, setTeamName] = useState('');
  const [domainName, setDomainName] = useState('');
  const [questionData, setQuestionData] = useState({ text: '', answer: '', options: ['', '', '', ''], correctIndex: -1, optionsDefault: false });
  const [buzzerData, setBuzzerData] = useState({ text: '', answer: '', options: ['', '', '', ''], correctIndex: -1 });
  const [selectedDomain, setSelectedDomain] = useState('');
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editingBuzzer, setEditingBuzzer] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});
  const router = useRouter();

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    await createTeam(quiz.id, teamName);
    setTeamName('');
    router.refresh();
  };

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    await createDomain(quiz.id, domainName);
    setDomainName('');
    router.refresh();
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDomain) return;
    const filteredOptions = questionData.options.filter(o => o.trim());
    const answer = questionData.correctIndex >= 0 ? questionData.options[questionData.correctIndex] : questionData.answer;
    await createQuestion(
      selectedDomain,
      questionData.text,
      answer,
      filteredOptions,
      questionData.optionsDefault
    );
    setQuestionData({ text: '', answer: '', options: ['', '', '', ''], correctIndex: -1, optionsDefault: false });
    router.refresh();
  };

  return (
    <div className="min-h-screen p-4">
      <div className="w-full space-y-6">
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <div className="mb-4">
            <h1 className="text-3xl font-bold"> Host Dashboard</h1>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-blue-500/20 border border-blue-500 rounded-lg p-4">
              <p className="text-sm font-medium">Share Quiz ID with teams:</p>
              <p className="text-2xl font-mono mt-2 break-all">{quiz.id}</p>
            </div>
            <div className="bg-orange-500/20 border border-orange-500 rounded-lg p-4">
              <p className="text-sm font-medium">Spectator View:</p>
              <a href={`/quiz/${quiz.id}/spectator`} target="_blank" className="text-lg font-semibold text-orange-300 hover:text-orange-200 underline mt-2 block">
                 Open Spectator Mode
              </a>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Game Status</p>
              <div className="space-y-1 text-sm">
                <div>Status: <span className="font-semibold">{quiz.status}</span></div>
                <div>Round: <span className="font-semibold">{quiz.round}</span></div>
                {quiz.currentTeamId && (
                  <div className="mt-2 p-2 bg-green-500/20 border border-green-500 rounded">
                    <span className="font-semibold">Turn: </span>
                    {quiz.teams.find((t: any) => t.id === quiz.currentTeamId)?.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Teams ({quiz.teams.length})</h2>
            <form onSubmit={handleCreateTeam} className="mb-4 flex gap-2">
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 focus:outline-none focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Team name"
                required
              />
              <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">
                Add
              </button>
            </form>
            <div className="space-y-2">
              {quiz.teams.map((team: any) => (
                <div key={team.id} className="bg-slate-800/50 rounded-lg p-3 flex justify-between items-center">
                  {editingTeam === team.id ? (
                    <input
                      type="text"
                      value={editValues[team.id] || team.name}
                      onChange={(e) => setEditValues({ ...editValues, [team.id]: e.target.value })}
                      className="flex-1 px-2 py-1 rounded bg-slate-900/50 border border-slate-700"
                      autoFocus
                    />
                  ) : (
                    <div>
                      <div className="font-semibold">{team.name}</div>
                      <div className="text-sm text-slate-400">Score: {team.score} | Captain: {team.captainName || 'Not joined'}</div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {editingTeam === team.id ? (
                      <>
                        <button
                          onClick={async () => {
                            await updateTeam(team.id, editValues[team.id]);
                            setEditingTeam(null);
                            router.refresh();
                          }}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTeam(null)}
                          className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {team.captainName && (
                          <button
                            onClick={async () => {
                              if (confirm(`Disconnect ${team.captainName} from ${team.name}?`)) {
                                await disconnectTeamCaptain(team.id);
                                router.refresh();
                              }
                            }}
                            className="px-3 py-1 bg-orange-600 hover:bg-orange-700 rounded text-sm"
                            title="Disconnect captain"
                          >
                            Kick
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingTeam(team.id);
                            setEditValues({ ...editValues, [team.id]: team.name });
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm(`Delete ${team.name}?`)) {
                              await deleteTeam(team.id);
                              router.refresh();
                            }
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Domains ({quiz.domains.length})</h2>
            <form onSubmit={handleCreateDomain} className="mb-4 flex gap-2">
              <input
                type="text"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 focus:outline-none focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Domain name"
                required
              />
              <button type="submit" className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold">
                Add
              </button>
            </form>
            <div className="space-y-2">
              {quiz.domains.map((domain: any) => (
                <div key={domain.id} className="bg-slate-800/50 rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    {editingDomain === domain.id ? (
                      <input
                        type="text"
                        value={editValues[domain.id] || domain.name}
                        onChange={(e) => setEditValues({ ...editValues, [domain.id]: e.target.value })}
                        className="flex-1 px-2 py-1 rounded bg-slate-900/50 border border-slate-700"
                        autoFocus
                      />
                    ) : (
                      <div className="font-semibold">{domain.name}</div>
                    )}
                    <div className="flex gap-2">
                      {editingDomain === domain.id ? (
                        <>
                          <button
                            onClick={async () => {
                              await updateDomain(domain.id, editValues[domain.id]);
                              setEditingDomain(null);
                              router.refresh();
                            }}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingDomain(null)}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingDomain(domain.id);
                              setEditValues({ ...editValues, [domain.id]: domain.name });
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete ${domain.name}?`)) {
                                await deleteDomain(domain.id);
                                router.refresh();
                              }
                            }}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-slate-400">Questions: {domain.questions.length}</div>
                  {domain.questions.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {domain.questions.map((q: any) => (
                        <div key={q.id} className="flex justify-between items-center text-xs bg-slate-900/30 rounded p-2">
                          <span>
                            Q{q.number}: {q.text.substring(0, 30)}...
                            {q.optionsDefault && <span className="ml-2 px-2 py-1 bg-blue-500/30 text-blue-300 rounded text-xs">MC</span>}
                          </span>
                          <button
                            onClick={async () => {
                              await deleteQuestion(q.id);
                              router.refresh();
                            }}
                            className="px-2 py-1 bg-red-500 hover:bg-red-600 rounded"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Add Question</h2>
          <form onSubmit={handleCreateQuestion} className="space-y-4">
            <select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 focus:outline-none focus:outline-none focus:border-indigo-500 transition-colors"
              required
            >
              <option value="">Select Domain</option>
              {quiz.domains.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>

            <input
              type="text"
              value={questionData.text}
              onChange={(e) => setQuestionData({ ...questionData, text: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 focus:outline-none focus:outline-none focus:border-indigo-500 transition-colors"
              placeholder="Question text"
              required
            />
            <div className="space-y-2">
              <p className="text-sm font-medium">Options (select correct answer):</p>
              {questionData.options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={questionData.correctIndex === i}
                    onChange={() => setQuestionData({ ...questionData, correctIndex: i })}
                    className="w-5 h-5"
                  />
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...questionData.options];
                      newOpts[i] = e.target.value;
                      setQuestionData({ ...questionData, options: newOpts });
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 focus:outline-none focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder={`Option ${i + 1}`}
                    required
                  />
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <input
                type="checkbox"
                id="optionsDefault"
                checked={questionData.optionsDefault}
                onChange={(e) => setQuestionData({ ...questionData, optionsDefault: e.target.checked })}
                className="w-5 h-5 text-blue-600"
              />
              <label htmlFor="optionsDefault" className="text-sm font-medium">
                <span className="text-blue-300">Options enabled by default</span>
                <div className="text-xs text-slate-400 mt-1">
                  Multiple choice question: Shows options automatically, cannot be passed, +10 correct / 0 incorrect
                </div>
              </label>
            </div>
            <button type="submit" className="w-full py-3 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold">
              Add Question
            </button>
          </form>
        </div>

        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Add Buzzer Question</h2>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const filteredOptions = buzzerData.options.filter((o: string) => o.trim());
            const answer = buzzerData.correctIndex >= 0 ? buzzerData.options[buzzerData.correctIndex] : buzzerData.answer;
            await createBuzzerQuestion(
              quiz.id,
              buzzerData.text,
              answer,
              filteredOptions
            );
            setBuzzerData({ text: '', answer: '', options: ['', '', '', ''], correctIndex: -1 });
          }} className="space-y-4">
            <input
              type="text"
              value={buzzerData.text}
              onChange={(e) => setBuzzerData({ ...buzzerData, text: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 focus:outline-none focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="Question text"
              required
            />
            <p className="text-sm text-slate-400">Note: Buzzer questions don't use options</p>
            <input
              type="text"
              value={buzzerData.answer}
              onChange={(e) => setBuzzerData({ ...buzzerData, answer: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-slate-900/50 border border-slate-700 focus:outline-none focus:outline-none focus:border-amber-500 transition-colors"
              placeholder="Answer"
              required
            />
            <button type="submit" className="w-full py-3 bg-orange-600 hover:bg-orange-700 rounded-lg font-semibold">
              Add Buzzer Question
            </button>
          </form>
          {quiz.buzzerQuestions && quiz.buzzerQuestions.length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-sm font-medium mb-2">Buzzer Questions ({quiz.buzzerQuestions.length}):</p>
              {quiz.buzzerQuestions.map((q: any) => (
                <div key={q.id} className="flex justify-between items-center text-xs bg-slate-900/30 rounded p-2">
                  <span>Q{q.number}: {q.text.substring(0, 40)}...</span>
                  <button
                    onClick={async () => {
                      await deleteBuzzerQuestion(q.id);
                      router.refresh();
                    }}
                    className="px-2 py-1 bg-red-500 hover:bg-red-600 rounded"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <button
            onClick={async () => {
              await startDomainRound(quiz.id);
            }}
            className="py-4 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold text-lg"
          >
            Start Domain Round
          </button>
          <button
            onClick={async () => {
              await startBuzzerRound(quiz.id);
            }}
            className="py-4 bg-amber-600 hover:from-orange-700 hover:to-red-700 rounded-lg font-semibold text-lg"
          >
            Start Buzzer Round
          </button>
          {quiz.status === 'active' && (quiz.round === 'domain' || quiz.round === 'buzzer') && (
            <button
              onClick={async () => {
                // Use direct import instead of dynamic import
                const response = await fetch('/api/pause-quiz', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ quizId: quiz.id })
                });
              }}
              className="py-4 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold text-lg"
            >
              Pause
            </button>
          )}
          {quiz.status === 'paused' && (quiz.round === 'domain' || quiz.round === 'buzzer') && (
            <button
              onClick={async () => {
                // Use direct import instead of dynamic import
                const response = await fetch('/api/resume-quiz', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ quizId: quiz.id })
                });
              }}
              className="py-4 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-lg"
            >
              Resume
            </button>
          )}
          <button
            onClick={async () => {
              if (confirm('Reset quiz? This will clear all scores and progress.')) {
                await resetQuiz(quiz.id);
              }
            }}
            className="py-4 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-lg"
          >
            Reset Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
