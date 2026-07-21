'use client';

import { Plus, Trash2, Edit2, Save, X, ArrowRight, Users, BookOpen, HelpCircle, Zap, Info } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input, { Select } from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { 
  createTeam, 
  createDomain, 
  createQuestion, 
  createBuzzerQuestion,
  deleteTeam, 
  deleteDomain, 
  deleteQuestion, 
  deleteBuzzerQuestion,
  updateTeam, 
  updateDomain, 
  updateQuestion, 
  updateBuzzerQuestion 
} from '@/lib/actions';

export default function SetupDashboard({ quiz }: { quiz: any }) {
  const { socket, isConnected, hasReconnected } = useSocket(quiz.id);
  const router = useRouter();
  const [teamName, setTeamName] = useState('');
  const [domainName, setDomainName] = useState('');
  const [questionData, setQuestionData] = useState({ 
    text: '', 
    answer: '', 
    options: ['', '', '', ''], 
    correctIndex: -1, 
    optionsDefault: true 
  });
  const [buzzerData, setBuzzerData] = useState({ 
    text: '', 
    answer: '', 
    options: ['', '', '', ''], 
    correctIndex: -1 
  });
  const [selectedDomain, setSelectedDomain] = useState('');
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editingBuzzer, setEditingBuzzer] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<any>({});

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
    setQuestionData({ text: '', answer: '', options: ['', '', '', ''], correctIndex: -1, optionsDefault: true });
    router.refresh();
  };

  const handleCreateBuzzerQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const filteredOptions = buzzerData.options.filter((o: string) => o.trim());
    const answer = buzzerData.correctIndex >= 0 ? buzzerData.options[buzzerData.correctIndex] : buzzerData.answer;
    await createBuzzerQuestion(quiz.id, buzzerData.text, answer, filteredOptions);
    setBuzzerData({ text: '', answer: '', options: ['', '', '', ''], correctIndex: -1 });
    router.refresh();
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="w-full space-y-6">
        {/* Header */}
        <Card variant="elevated">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">🎯 Setup Dashboard</h1>
              <p className="text-slate-400">Configure your quiz before starting</p>
            </div>
            <Button
              variant="success"
              size="lg"
              icon={<ArrowRight className="w-5 h-5" />}
              onClick={() => router.push(`/quiz/${quiz.id}/host/control`)}
            >
              Control Dashboard
            </Button>
          </div>
          <Card variant="info" className="mt-4">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-400">Quiz ID</p>
                <p className="text-xl md:text-2xl font-mono mt-1 break-all">{quiz.id}</p>
              </div>
            </div>
          </Card>
        </Card>

        {/* Teams Section */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-indigo-400" />
              <h2 className="text-2xl font-bold">Teams</h2>
              <Badge variant="neutral">{quiz.teams.length}</Badge>
            </div>
          </div>
          
          <form onSubmit={handleCreateTeam} className="mb-6">
            <div className="flex gap-2">
              <Input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name"
                required
              />
              <Button type="submit" variant="success" icon={<Plus className="w-5 h-5" />}>
                Add
              </Button>
            </div>
          </form>

          {quiz.teams.length === 0 ? (
            <EmptyState
              icon={<Users className="w-16 h-16" />}
              title="No teams yet"
              description="Add your first team to get started"
            />
          ) : (
            <div className="space-y-3">
              {quiz.teams.map((team: any) => (
                <Card key={team.id} variant="interactive">
                  {editingTeam === team.id ? (
                    <div className="flex gap-2">
                      <Input
                        value={editValues[team.id] || team.name}
                        onChange={(e) => setEditValues({ ...editValues, [team.id]: e.target.value })}
                        autoFocus
                      />
                      <Button
                        variant="success"
                        size="sm"
                        icon={<Save className="w-4 h-4" />}
                        onClick={async () => {
                          await updateTeam(team.id, editValues[team.id]);
                          setEditingTeam(null);
                          router.refresh();
                        }}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<X className="w-4 h-4" />}
                        onClick={() => setEditingTeam(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="font-semibold text-lg">{team.name}</div>
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Edit2 className="w-4 h-4" />}
                          onClick={() => {
                            setEditingTeam(team.id);
                            setEditValues({ ...editValues, [team.id]: team.name });
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Trash2 className="w-4 h-4" />}
                          onClick={async () => {
                            if (confirm(`Delete ${team.name}?`)) {
                              await deleteTeam(team.id);
                              router.refresh();
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* Domains Section */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-purple-400" />
              <h2 className="text-2xl font-bold">Domains</h2>
              <Badge variant="neutral">{quiz.domains.length}</Badge>
            </div>
          </div>
          
          <form onSubmit={handleCreateDomain} className="mb-6">
            <div className="flex gap-2">
              <Input
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder="Enter domain name"
                required
              />
              <Button type="submit" variant="success" icon={<Plus className="w-5 h-5" />}>
                Add
              </Button>
            </div>
          </form>

          {quiz.domains.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-16 h-16" />}
              title="No domains yet"
              description="Add knowledge domains to organize your questions"
            />
          ) : (
            <div className="space-y-4">
              {quiz.domains.map((domain: any) => (
                <Card key={domain.id} variant="elevated">
                  <div className="flex justify-between items-center mb-4">
                    {editingDomain === domain.id ? (
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={editValues[domain.id] || domain.name}
                          onChange={(e) => setEditValues({ ...editValues, [domain.id]: e.target.value })}
                          autoFocus
                        />
                        <Button
                          variant="success"
                          size="sm"
                          icon={<Save className="w-4 h-4" />}
                          onClick={async () => {
                            await updateDomain(domain.id, editValues[domain.id]);
                            setEditingDomain(null);
                            router.refresh();
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<X className="w-4 h-4" />}
                          onClick={() => setEditingDomain(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-bold">{domain.name}</h3>
                          <Badge variant="info">{domain.questions.length} questions</Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={<Edit2 className="w-4 h-4" />}
                            onClick={() => {
                              setEditingDomain(domain.id);
                              setEditValues({ ...editValues, [domain.id]: domain.name });
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            icon={<Trash2 className="w-4 h-4" />}
                            onClick={async () => {
                              if (confirm(`Delete ${domain.name}?`)) {
                                await deleteDomain(domain.id);
                                router.refresh();
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                  
                  {/* Questions List */}
                  {domain.questions.length > 0 && (
                    <div className="mt-4 space-y-2 border-t border-slate-700 pt-4">
                      {domain.questions.map((q: any) => (
                        <div key={q.id} className="bg-slate-800/50 rounded-lg p-3">
                          {editingQuestion === q.id ? (
                            <div className="space-y-3">
                              <Input
                                value={editValues[`${q.id}_text`] || q.text}
                                onChange={(e) => setEditValues({ ...editValues, [`${q.id}_text`]: e.target.value })}
                                placeholder="Question text"
                              />
                              <div className="space-y-2">
                                {(editValues[`${q.id}_options`] || q.options || []).map((opt: string, i: number) => (
                                  <div key={i} className="flex gap-2 items-center">
                                    <input
                                      type="radio"
                                      name={`correct_${q.id}`}
                                      checked={(editValues[`${q.id}_answer`] || q.answer) === opt}
                                      onChange={() => setEditValues({ ...editValues, [`${q.id}_answer`]: opt })}
                                      className="w-4 h-4 text-indigo-600"
                                    />
                                    <Input
                                      value={opt}
                                      onChange={(e) => {
                                        const newOpts = [...(editValues[`${q.id}_options`] || q.options || [])];
                                        newOpts[i] = e.target.value;
                                        setEditValues({ ...editValues, [`${q.id}_options`]: newOpts });
                                      }}
                                      placeholder={`Option ${i + 1}`}
                                    />
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="success"
                                  size="sm"
                                  onClick={async () => {
                                    await updateQuestion(
                                      q.id,
                                      editValues[`${q.id}_text`] || q.text,
                                      editValues[`${q.id}_answer`] || q.answer,
                                      editValues[`${q.id}_options`] || q.options || []
                                    );
                                    setEditingQuestion(null);
                                    router.refresh();
                                  }}
                                >
                                  Save
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingQuestion(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="neutral">Q{q.number}</Badge>
                                    {q.optionsDefault && (
                                      <Badge variant="info">Multiple Choice</Badge>
                                    )}
                                  </div>
                                  <p className="text-sm">{q.text}</p>
                                </div>
                                <div className="flex gap-1 ml-4">
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    icon={<Edit2 className="w-3 h-3" />}
                                    aria-label="Edit question"
                                    onClick={() => {
                                      setEditingQuestion(q.id);
                                      setEditValues({
                                        ...editValues,
                                        [`${q.id}_text`]: q.text,
                                        [`${q.id}_answer`]: q.answer,
                                        [`${q.id}_options`]: q.options || []
                                      });
                                    }}
                                  />
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    icon={<Trash2 className="w-3 h-3" />}
                                    aria-label="Delete question"
                                    onClick={async () => {
                                      if (confirm('Delete this question?')) {
                                        await deleteQuestion(q.id);
                                        router.refresh();
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                              {q.options && q.options.length > 0 && (
                                <div className="mt-3 space-y-1 pl-4 border-l-2 border-slate-700">
                                  {q.options.map((opt: string, i: number) => (
                                    <div key={i} className="text-xs flex items-center gap-2">
                                      <span className={opt === q.answer ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                                        {String.fromCharCode(65 + i)}. {opt}
                                        {opt === q.answer && ' ✓'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Card>

        {/* Add Question Form */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold">Add Domain Question</h2>
          </div>
          
          <form onSubmit={handleCreateQuestion} className="space-y-4">
            <Select
              value={selectedDomain}
              onChange={(e) => setSelectedDomain(e.target.value)}
              label="Select Domain"
              required
            >
              <option value="">Choose a domain...</option>
              {quiz.domains.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </Select>

            <Input
              value={questionData.text}
              onChange={(e) => setQuestionData({ ...questionData, text: e.target.value })}
              label="Question Text"
              placeholder="Enter your question"
              required
            />
            
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-300">
                Answer Options (select the correct one)
              </label>
              {questionData.options.map((opt, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={questionData.correctIndex === i}
                    onChange={() => setQuestionData({ ...questionData, correctIndex: i })}
                    className="w-5 h-5 text-indigo-600 bg-slate-900 border-slate-700 focus:ring-2 focus:ring-indigo-500"
                  />
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...questionData.options];
                      newOpts[i] = e.target.value;
                      setQuestionData({ ...questionData, options: newOpts });
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    required
                  />
                  {questionData.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        const newOpts = questionData.options.filter((_, idx) => idx !== i);
                        let newCorrectIndex = questionData.correctIndex;
                        if (i === questionData.correctIndex) newCorrectIndex = -1;
                        else if (i < questionData.correctIndex) newCorrectIndex--;
                        setQuestionData({ ...questionData, options: newOpts, correctIndex: newCorrectIndex });
                      }}
                      className="px-2 py-2 text-red-400 hover:text-red-300"
                      title="Remove option"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setQuestionData({ ...questionData, options: [...questionData.options, ''] })}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                + Add Option ({String.fromCharCode(65 + questionData.options.length)})
              </button>
            </div>
            
            <Card variant="info">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <span className="font-medium text-blue-300">Multiple Choice Question</span>
                  <p className="text-xs text-slate-400 mt-1">
                    Options shown by default • +10 correct / -5 incorrect
                  </p>
                </div>
              </div>
            </Card>
            
            <Button type="submit" variant="primary" size="lg" className="w-full">
              Add Question
            </Button>
          </form>
        </Card>

        {/* Buzzer Questions Section */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-6 h-6 text-amber-400" />
            <h2 className="text-2xl font-bold">Buzzer Questions</h2>
            {quiz.buzzerQuestions && quiz.buzzerQuestions.length > 0 && (
              <Badge variant="warning">{quiz.buzzerQuestions.length}</Badge>
            )}
          </div>
          
          {/* Buzzer Questions List */}
          {quiz.buzzerQuestions && quiz.buzzerQuestions.length > 0 && (
            <div className="mb-6 space-y-3">
              {quiz.buzzerQuestions.map((q: any) => (
                <Card key={q.id} variant="interactive">
                  {editingBuzzer === q.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editValues[`${q.id}_text`] || q.text}
                        onChange={(e) => setEditValues({ ...editValues, [`${q.id}_text`]: e.target.value })}
                        placeholder="Question text"
                      />
                      <Input
                        value={editValues[`${q.id}_answer`] || q.answer}
                        onChange={(e) => setEditValues({ ...editValues, [`${q.id}_answer`]: e.target.value })}
                        placeholder="Answer"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="success"
                          size="sm"
                          onClick={async () => {
                            await updateBuzzerQuestion(
                              q.id,
                              editValues[`${q.id}_text`] || q.text,
                              editValues[`${q.id}_answer`] || q.answer,
                              []
                            );
                            setEditingBuzzer(null);
                            router.refresh();
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingBuzzer(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="warning">Q{q.number}</Badge>
                        </div>
                        <p className="text-sm mb-2">{q.text}</p>
                        <p className="text-xs text-emerald-400">Answer: {q.answer}</p>
                      </div>
                      <div className="flex gap-1 ml-4">
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Edit2 className="w-3 h-3" />}
                          aria-label="Edit buzzer question"
                          onClick={() => {
                            setEditingBuzzer(q.id);
                            setEditValues({
                              ...editValues,
                              [`${q.id}_text`]: q.text,
                              [`${q.id}_answer`]: q.answer
                            });
                          }}
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          icon={<Trash2 className="w-3 h-3" />}
                          aria-label="Delete buzzer question"
                          onClick={async () => {
                            if (confirm('Delete this buzzer question?')) {
                              await deleteBuzzerQuestion(q.id);
                              router.refresh();
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}

          {/* Add Buzzer Question Form */}
          <form onSubmit={handleCreateBuzzerQuestion} className="space-y-4">
            <Input
              value={buzzerData.text}
              onChange={(e) => setBuzzerData({ ...buzzerData, text: e.target.value })}
              label="Question Text"
              placeholder="Enter buzzer question"
              required
            />
            <Input
              value={buzzerData.answer}
              onChange={(e) => setBuzzerData({ ...buzzerData, answer: e.target.value })}
              label="Answer"
              placeholder="Enter correct answer"
              required
            />
            <Button type="submit" variant="warning" size="lg" className="w-full">
              Add Buzzer Question
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
