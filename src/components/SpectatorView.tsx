'use client';

import { Clock, Award, Trophy, Eye, BookOpen, HelpCircle, GripVertical } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface Quiz {
  id: string;
  status: string;
  round: string;
  phase: string;
  currentTeamId: string | null;
  currentQuestionId: string | null;
  selectedDomainId: string | null;
  timerEndsAt: string | null;
  buzzSequence: string[];
  teams: Team[];
  domains: Domain[];
  buzzerQuestions: BuzzerQuestion[];
  lastRoundResults?: any;
  lastDomainAnswer?: any;
}

interface Team {
  id: string;
  name: string;
  captainName: string | null;
  score: number;
  sequence: number;
}

interface Domain {
  id: string;
  name: string;
  questions: Question[];
}

interface Question {
  id: string;
  number: number;
  text: string;
  answer: string;
  options: string[];
  isAnswered: boolean;
  selectedBy: string | null;
  correctAnswer: string | null;
  passedFrom: string | null;
  optionsViewed?: boolean;
  optionsDefault?: boolean;
}

interface BuzzerQuestion {
  id: string;
  number: number;
  text: string;
  answer: string;
  options: string[];
  isAnswered: boolean;
}

export default function SpectatorView({ quiz: initialQuiz }: { quiz: Quiz }) {
  const [quiz, setQuiz] = useState<Quiz>(initialQuiz);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [commentaryEnabled, setCommentaryEnabled] = useState(false);
  const [lastCommentary, setLastCommentary] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('en-US');
  const [dividerPosition, setDividerPosition] = useState(75); // percentage for main content
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const router = useRouter();

  // Handle divider drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    const container = document.getElementById('spectator-grid');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
    setDividerPosition(Math.min(Math.max(newPosition, 30), 90)); // Clamp between 30% and 90%
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const voices = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'en-GB', name: 'English (UK)' },
    { code: 'en-AU', name: 'English (Australia)' },
    { code: 'en-IN', name: 'English (India)' },
    { code: 'en-CA', name: 'English (Canada)' },
    { code: 'en-IE', name: 'English (Ireland)' },
    { code: 'en-ZA', name: 'English (South Africa)' },
    { code: 'en-NZ', name: 'English (New Zealand)' },
    { code: 'en-SG', name: 'English (Singapore)' },
  ];

  const speakText = async (text: string) => {
    if (!commentaryEnabled) {
      console.log('Commentary disabled');
      return;
    }
    if (text === lastCommentary) {
      console.log('Duplicate commentary:', text);
      return;
    }
    setLastCommentary(text);
    
    console.log('Speaking:', text);
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    try {
      const audioUrl = `/api/tts?text=${encodeURIComponent(text)}&lang=${selectedVoice}`;
      console.log('Audio URL:', audioUrl);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      await audio.play();
      console.log('Audio playing');
    } catch (error) {
      console.error('TTS error:', error);
    }
  };

  useEffect(() => {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    const socketPath = process.env.NEXT_PUBLIC_SOCKET_PATH || '/socket.io';
    const socketInstance = io(socketUrl, { 
      path: socketPath,
      transports: ['websocket', 'polling']
    });
    console.log('Spectator socket initialized:', socketUrl, socketPath);
    
    socketInstance.emit('join-quiz', quiz.id);
    console.log('Spectator joined quiz:', quiz.id);
    
    const handleUpdate = () => {
      console.log('Spectator received quiz-update, refreshing...');
      router.refresh();
    };
    
    socketInstance.on('quiz-update', handleUpdate);
    
    return () => {
      socketInstance.off('quiz-update', handleUpdate);
      socketInstance.disconnect();
    };
  }, [quiz.id, router]);

  // Periodic check for domain round timer expiry (server-side)
  useEffect(() => {
    if (quiz.round === 'domain' && (quiz.phase === 'answering' || quiz.phase === 'answering_with_options')) {
      const interval = setInterval(() => {
        fetch('/api/check-domain-timers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId: quiz.id })
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [quiz.round, quiz.phase, quiz.id]);

  useEffect(() => {
    const prevQuiz = quiz;
    setQuiz(initialQuiz);

    if (!commentaryEnabled) return;

    // Domain selection (Step 1)
    if (initialQuiz.round === 'domain' && initialQuiz.phase === 'selecting_domain') {
      const team = initialQuiz.teams.find(t => t.id === initialQuiz.currentTeamId);
      if (team && (prevQuiz.phase !== 'selecting_domain' || prevQuiz.currentTeamId !== initialQuiz.currentTeamId)) {
        speakText(`${team.name}, select a domain`);
      }
    }

    // Question selection (Step 2)
    if (initialQuiz.round === 'domain' && initialQuiz.phase === 'selecting_question') {
      const team = initialQuiz.teams.find(t => t.id === initialQuiz.currentTeamId);
      const domain = initialQuiz.domains.find(d => d.id === initialQuiz.selectedDomainId);
      if (team && domain && (prevQuiz.phase !== 'selecting_question' || prevQuiz.currentTeamId !== initialQuiz.currentTeamId)) {
        speakText(`${team.name}, select a question from ${domain.name}`);
      }
    }

    // Question selected
    if (initialQuiz.round === 'domain' && (initialQuiz.phase === 'answering' || initialQuiz.phase === 'answering_with_options') && (prevQuiz.phase === 'selecting_question' || prevQuiz.phase === 'selecting_domain')) {
      const domain = initialQuiz.domains.find(d => d.id === initialQuiz.selectedDomainId);
      const question = domain?.questions.find(q => q.id === initialQuiz.currentQuestionId);
      const team = initialQuiz.teams.find(t => t.id === initialQuiz.currentTeamId);
      if (domain && question && team) {
        speakText(`${team.name} selected ${domain.name} question ${question.number}`);
      }
    }

    // Options shown
    if (initialQuiz.round === 'domain' && initialQuiz.phase === 'answering_with_options' && prevQuiz.phase === 'answering') {
      const team = initialQuiz.teams.find(t => t.id === initialQuiz.currentTeamId);
      if (team) {
        speakText(`${team.name} viewed options`);
      }
    }

    // Answer result
    if (initialQuiz.round === 'domain' && initialQuiz.phase === 'showing_result' && initialQuiz.lastDomainAnswer?.questionCompleted) {
      const team = initialQuiz.teams.find(t => t.id === initialQuiz.lastDomainAnswer.teamId);
      if (team) {
        if (initialQuiz.lastDomainAnswer.isCorrect) {
          const withOptions = initialQuiz.lastDomainAnswer.withOptions ? 'with options' : 'without options';
          speakText(`Correct by ${team.name} ${withOptions}! ${initialQuiz.lastDomainAnswer.points} points`);
        } else {
          speakText(`No correct answer`);
        }
      }
    }

    // Question passed
    if (initialQuiz.round === 'domain' && initialQuiz.phase === 'answering' && prevQuiz.currentTeamId !== initialQuiz.currentTeamId && prevQuiz.phase === 'answering') {
      const team = initialQuiz.teams.find(t => t.id === initialQuiz.currentTeamId);
      if (team) {
        speakText(`Passed to ${team.name}`);
      }
    }

    // Buzzer round
    if (initialQuiz.round === 'buzzer' && initialQuiz.phase === 'buzzing' && prevQuiz.round !== 'buzzer') {
      speakText('Buzzer round started');
    }

    // Team buzzed
    if (initialQuiz.round === 'buzzer' && initialQuiz.buzzSequence.length > prevQuiz.buzzSequence?.length) {
      const newTeamId = initialQuiz.buzzSequence[initialQuiz.buzzSequence.length - 1];
      const team = initialQuiz.teams.find(t => t.id === newTeamId);
      if (team) {
        speakText(`${team.name} buzzed!`);
      }
    }

    // Buzzer answer results
    if (initialQuiz.round === 'buzzer' && initialQuiz.phase === 'showing_answer' && prevQuiz.phase !== 'showing_answer') {
      const results = initialQuiz.lastRoundResults || {};
      const correctTeam = Object.entries(results).find(([_, result]: [string, any]) => result.isCorrect);
      if (correctTeam) {
        const team = initialQuiz.teams.find(t => t.id === correctTeam[0]);
        if (team) {
          speakText(`Correct by ${team.name}!`);
        }
      } else {
        speakText('No correct answers');
      }
    }

    // Quiz complete
    if (initialQuiz.phase === 'completed' && prevQuiz.phase !== 'completed') {
      const winner = [...initialQuiz.teams].sort((a, b) => b.score - a.score)[0];
      if (winner) {
        speakText(`Quiz complete! ${winner.name} wins with ${winner.score} points!`);
      }
    }
  }, [initialQuiz, commentaryEnabled]);

  useEffect(() => {
    if (!quiz.timerEndsAt) {
      setTimeLeft(null);
      return;
    }
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((new Date(quiz.timerEndsAt!).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && quiz.phase === 'showing_result' && quiz.round === 'domain') {
        console.log('Timer expired, calling API');
        fetch('/api/timer-expiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId: quiz.id })
        }).then(() => console.log('Timer expiry handled'));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [quiz.timerEndsAt, quiz.phase, quiz.round, quiz.id]);

  const currentTeam = quiz.teams.find(t => t.id === quiz.currentTeamId);
  const currentDomain = quiz.domains.find(d => d.id === quiz.selectedDomainId);
  const currentQuestion = currentDomain?.questions.find(q => q.id === quiz.currentQuestionId);
  const currentBuzzerQuestion = quiz.buzzerQuestions.find(q => q.id === quiz.currentQuestionId);
  const sortedTeams = [...quiz.teams].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="w-full">
        <Card variant="elevated" className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">🎯 Quiz Spectator</h1>
              <p className="text-slate-400">
                {quiz.round === 'domain' ? '📚 Domain Round' : quiz.round === 'buzzer' ? '⚡ Buzzer Round' : '⏳ Waiting'}
                {quiz.phase && ` • ${quiz.phase.replace(/_/g, ' ')}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {commentaryEnabled && (
                <select
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-slate-700 text-white text-sm border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {voices.map(voice => (
                    <option key={voice.code} value={voice.code}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              )}
              <Button
                onClick={() => setCommentaryEnabled(!commentaryEnabled)}
                variant={commentaryEnabled ? 'success' : 'secondary'}
              >
                {commentaryEnabled ? '🔊 Commentary ON' : '🔇 Commentary OFF'}
              </Button>
            </div>
            <div className="text-right">
              <Badge variant={quiz.status === 'active' ? 'success' : 'warning'} className="text-base px-4 py-2">
                {quiz.status === 'active' ? '🔴 Live' : '⏸ Paused'}
              </Badge>
              {timeLeft !== null && timeLeft > 0 && (
                <div className="mt-2 text-2xl font-bold">
                  <Clock className="inline w-6 h-6 mr-1" />{timeLeft}s
                </div>
              )}
            </div>
          </div>
        </Card>

        <div id="spectator-grid" className="flex gap-0">
          <div className="space-y-6" style={{ width: `${dividerPosition}%` }}>
            {/* Domain Round - Selecting Domain */}
            {quiz.round === 'domain' && quiz.phase === 'selecting_domain' && (
              <div className="space-y-4">
                {quiz.lastDomainAnswer && quiz.lastDomainAnswer.teamId && quiz.lastDomainAnswer.questionCompleted && (
                  <Card variant={quiz.lastDomainAnswer.isCorrect ? 'success' : 'error'}>
                    <div className="text-slate-300 text-sm mb-2">Last Answer:</div>
                    {quiz.lastDomainAnswer.questionText && (
                      <div className="text-slate-200 text-sm mb-2 italic">"{quiz.lastDomainAnswer.questionText}"</div>
                    )}
                    <div className="flex justify-between items-center">
                      <div>
                        {quiz.lastDomainAnswer.isCorrect ? (
                          <>
                            <span className="font-bold text-lg">
                              {quiz.teams.find((t: Team) => t.id === quiz.lastDomainAnswer.teamId)?.name}:
                            </span>
                            <span className="text-emerald-300 ml-2 font-semibold">
                              {quiz.lastDomainAnswer.correctAnswer}
                            </span>
                          </>
                        ) : (
                          <span className="text-emerald-300 font-semibold">
                            Correct Answer: {quiz.lastDomainAnswer.correctAnswer}
                          </span>
                        )}
                      </div>
                      <Badge variant={quiz.lastDomainAnswer.isCorrect ? 'success' : 'error'} className="text-xl px-4 py-2">
                        {quiz.lastDomainAnswer.points > 0 ? '+' : ''}{quiz.lastDomainAnswer.points} pts
                      </Badge>
                    </div>
                  </Card>
                )}
                <Card variant="elevated" className="text-center">
                  <BookOpen className="w-16 h-16 mx-auto mb-4 text-blue-400" />
                  <h2 className="text-3xl font-bold mb-4">Selecting Domain</h2>
                  <Badge variant="warning" className="text-xl px-6 py-3 mb-6">
                    {currentTeam?.name} is choosing a domain...
                  </Badge>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    {quiz.domains.filter(d => d.questions.some(q => !q.isAnswered)).map(domain => (
                      <Card key={domain.id} variant="interactive">
                        <div className="text-lg font-semibold">{domain.name}</div>
                        <Badge variant="info" className="mt-2">{domain.questions.filter(q => !q.isAnswered).length} questions</Badge>
                      </Card>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Domain Round - Selecting Question */}
            {quiz.round === 'domain' && quiz.phase === 'selecting_question' && currentDomain && (
              <div className="space-y-4">
                {quiz.lastDomainAnswer && quiz.lastDomainAnswer.teamId && quiz.lastDomainAnswer.questionCompleted && (
                  <Card variant={quiz.lastDomainAnswer.isCorrect ? 'success' : 'error'}>
                    <div className="text-slate-300 text-sm mb-2">Last Answer:</div>
                    {quiz.lastDomainAnswer.questionText && (
                      <div className="text-slate-200 text-sm mb-2 italic">"{quiz.lastDomainAnswer.questionText}"</div>
                    )}
                    <div className="flex justify-between items-center">
                      <div>
                        {quiz.lastDomainAnswer.isCorrect ? (
                          <>
                            <span className="font-bold text-lg">
                              {quiz.teams.find((t: Team) => t.id === quiz.lastDomainAnswer.teamId)?.name}:
                            </span>
                            <span className="text-emerald-300 ml-2 font-semibold">
                              {quiz.lastDomainAnswer.correctAnswer}
                            </span>
                          </>
                        ) : (
                          <span className="text-emerald-300 font-semibold">
                            Correct Answer: {quiz.lastDomainAnswer.correctAnswer}
                          </span>
                        )}
                      </div>
                      <Badge variant={quiz.lastDomainAnswer.isCorrect ? 'success' : 'error'} className="text-xl px-4 py-2">
                        {quiz.lastDomainAnswer.points > 0 ? '+' : ''}{quiz.lastDomainAnswer.points} pts
                      </Badge>
                    </div>
                  </Card>
                )}
                <Card variant="elevated" className="text-center">
                  <HelpCircle className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                  <h2 className="text-3xl font-bold mb-2">Selecting Question</h2>
                  <p className="text-lg text-slate-400 mb-4">
                    Domain: <Badge variant="info" className="text-lg px-4 py-2">{currentDomain.name}</Badge>
                  </p>
                  <Badge variant="warning" className="text-xl px-6 py-3 mb-6">
                    {currentTeam?.name} is choosing a question...
                  </Badge>
                  <div className="grid grid-cols-5 gap-3 mt-6">
                    {currentDomain.questions.map(q => (
                      <div key={q.id} className={`p-4 rounded-lg font-bold text-xl ${
                        q.isAnswered ? 'bg-slate-600 text-slate-400' : 'bg-blue-500 text-white'
                      }`}>
                        {q.number}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Domain Round - Answering */}
            {quiz.round === 'domain' && (quiz.phase === 'answering' || quiz.phase === 'answering_with_options') && currentQuestion && (
              <div className="space-y-4">
                <Card variant="elevated">
                  <div className="mb-4 flex justify-between items-center">
                    <div>
                      <Badge variant="info" className="mr-2">Domain: {currentDomain?.name}</Badge>
                      <Badge variant="neutral">Question #{currentQuestion.number}</Badge>
                    </div>
                  </div>
                  <Card variant="warning" className="mb-4">
                    <div className="font-bold text-lg mb-2">Current Turn: {currentTeam?.name}</div>
                  </Card>
                  <Card className="bg-slate-900/50">
                    {/* Question - always show, larger text for long content */}
                    <div className="mb-6">
                      <p className="text-sm text-slate-400 mb-2">Question:</p>
                      <div className="text-2xl md:text-3xl font-bold leading-relaxed">{currentQuestion.text}</div>
                    </div>
                    
                    {/* Options - always show for domain round */}
                    {currentQuestion.options && currentQuestion.options.length > 0 && (
                      <div>
                        <p className="text-sm text-slate-400 mb-3">Options:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {currentQuestion.options.map((option: string, idx: number) => (
                            <Card key={idx} variant="info" className="p-4">
                              <span className="font-bold text-lg text-blue-400 mr-2">{String.fromCharCode(65 + idx)}.</span>
                              <span className="text-lg">{option}</span>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                </Card>
              </div>
            )}

            {/* Buzzer Round - Buzzing */}
            {quiz.round === 'buzzer' && quiz.phase === 'buzzing' && currentBuzzerQuestion && (
              <Card variant="elevated">
                <Card className="bg-slate-900/50 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant="neutral">Buzzer Question #{currentBuzzerQuestion.number}</Badge>
                    <Badge variant="info">
                      {quiz.buzzerQuestions.filter((q: any) => !q.isAnswered).length} questions remaining
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold mb-4">{currentBuzzerQuestion.text}</div>
                </Card>
                <Card variant="warning" className="text-center">
                  <div className="text-2xl font-bold">⏱ Waiting for buzzes...</div>
                </Card>
                {quiz.buzzSequence.length > 0 && (
                  <Card variant="info" className="mt-4">
                    <div className="font-semibold mb-2">Buzzed:</div>
                    <div className="flex gap-2 flex-wrap">
                      {quiz.buzzSequence.map((teamId, idx) => {
                        const team = quiz.teams.find(t => t.id === teamId);
                        return (
                          <Badge key={idx} variant="warning" className="text-lg px-4 py-2">
                            {idx + 1}. {team?.name}
                          </Badge>
                        );
                      })}
                    </div>
                  </Card>
                )}
              </Card>
            )}

            {/* Buzzer Round - Answering */}
            {quiz.round === 'buzzer' && quiz.phase === 'answering' && currentBuzzerQuestion && (
              <Card variant="elevated">
                <Card className="bg-slate-900/50 mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant="neutral">Buzzer Question #{currentBuzzerQuestion.number}</Badge>
                    <Badge variant="info">
                      {quiz.buzzerQuestions.filter((q: any) => !q.isAnswered).length} questions remaining
                    </Badge>
                  </div>
                  <div className="text-3xl font-bold mb-4">{currentBuzzerQuestion.text}</div>
                </Card>
                <Card variant="warning" className="mb-4">
                  <div className="font-bold text-2xl text-center mb-4">
                    Teams Answering
                  </div>
                  <div className="text-center">
                    <div className="flex justify-center gap-3 flex-wrap">
                      {quiz.buzzSequence.map((teamId, idx) => {
                        const team = quiz.teams.find(t => t.id === teamId);
                        return (
                          <Badge 
                            key={idx} 
                            variant="warning"
                            className="text-lg px-4 py-2 animate-pulse"
                          >
                            {idx + 1}. {team?.name}
                          </Badge>
                        );
                      })}
                    </div>
                    <Badge variant="info" className="mt-3">
                      15 seconds each
                    </Badge>
                  </div>
                </Card>
              </Card>
            )}

            {/* Buzzer Round - Showing Answer */}
            {quiz.round === 'buzzer' && quiz.phase === 'showing_answer' && currentBuzzerQuestion && (
              <Card variant="elevated">
                <Card className="bg-slate-900/50 mb-4">
                  <Badge variant="neutral" className="mb-2">Buzzer Question #{currentBuzzerQuestion.number}</Badge>
                  <div className="text-3xl font-bold mb-4">{currentBuzzerQuestion.text}</div>
                  <Card variant="success" className="mt-4">
                    <div className="text-emerald-300 font-semibold mb-1">Correct Answer:</div>
                    <div className="text-xl font-bold">{currentBuzzerQuestion.answer}</div>
                  </Card>
                </Card>
                {quiz.lastRoundResults && Object.keys(quiz.lastRoundResults).length > 0 && (
                  <div className="space-y-2">
                    <div className="font-semibold mb-2">Results (in buzz order):</div>
                    {(quiz.lastRoundResults._buzzOrder || quiz.buzzSequence || Object.keys(quiz.lastRoundResults)).filter((k: string) => k !== '_buzzOrder').map((teamId: string) => {
                      const result = quiz.lastRoundResults[teamId] as any;
                      if (!result) return null;
                      const team = quiz.teams.find(t => t.id === teamId);
                      return (
                        <Card key={teamId} variant={result.isCorrect ? 'success' : result.notReached ? 'default' : 'error'}>
                          <div className="flex justify-between items-center">
                            <div>
                              <span className="font-semibold text-lg">{team?.name}:</span>
                              {result.notReached ? (
                                <span className="ml-2 text-slate-400">Not reached</span>
                              ) : result.timeout ? (
                                <span className="ml-2 text-amber-400">TIMEOUT</span>
                              ) : result.answer ? (
                                <span className="ml-2">"{result.answer}"</span>
                              ) : (
                                <span className="ml-2 text-slate-400">No answer</span>
                              )}
                            </div>
                            <Badge variant={result.points > 0 ? 'success' : result.points < 0 ? 'error' : 'neutral'} className="text-lg px-3 py-1">
                              {result.points > 0 ? '+' : ''}{result.points} pts
                            </Badge>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}

            {/* Awaiting Evaluation */}
            {quiz.round === 'domain' && quiz.phase === 'awaiting_evaluation' && (
              <Card variant="elevated">
                <div className="text-center mb-6">
                  <div className="inline-block p-6 bg-purple-500/20 rounded-full mb-6">
                    <svg className="w-20 h-20 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-4xl font-bold mb-4">⚖️ Host is Evaluating...</h2>
                  <p className="text-slate-400 text-xl">Please wait while the host reviews the answer</p>
                </div>

                {/* Show the question */}
                {currentQuestion && (
                  <div className="space-y-4 mt-8">
                    <Card className="bg-slate-900/50">
                      <p className="text-sm text-slate-400 mb-3">Question:</p>
                      <p className="text-2xl font-semibold">{currentQuestion.text}</p>
                    </Card>

                    {/* Show options ONLY if they were viewed */}
                    {currentQuestion.optionsViewed && currentQuestion.options && currentQuestion.options.length > 0 && (
                      <Card className="bg-slate-900/50">
                        <p className="text-sm text-slate-400 mb-4">Options:</p>
                        <div className="grid grid-cols-2 gap-3">
                          {currentQuestion.options.map((opt: string, idx: number) => (
                            <Card key={idx} variant="info">
                              <span className="font-semibold text-blue-400">{String.fromCharCode(65 + idx)}.</span> {opt}
                            </Card>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                )}
              </Card>
            )}

            {/* Showing Result */}
            {quiz.round === 'domain' && quiz.phase === 'showing_result' && quiz.lastDomainAnswer && quiz.lastDomainAnswer.questionCompleted && (
              <Card variant="elevated">
                <div className="space-y-8">
                  {/* Question */}
                  <div className="text-center">
                    <h2 className="text-4xl font-bold mb-6">Question</h2>
                    <Card variant="info" className="text-3xl">
                      {quiz.lastDomainAnswer.questionText}
                    </Card>
                  </div>

                  {/* Correct Answer */}
                  <div className="text-center">
                    <h3 className="text-3xl font-bold mb-4 text-emerald-400">Correct Answer</h3>
                    {(() => {
                      const correctAnswerText = quiz.lastDomainAnswer.correctAnswer;
                      const options = quiz.lastDomainAnswer.options || [];
                      // Try to find by exact match first
                      let correctIndex = options.findIndex((opt: string) => opt === correctAnswerText);
                      // If not found, try case-insensitive match
                      if (correctIndex < 0) {
                        correctIndex = options.findIndex((opt: string) => opt?.toLowerCase() === correctAnswerText?.toLowerCase());
                      }
                      const optionLabel = correctIndex >= 0 ? `${String.fromCharCode(65 + correctIndex)}.` : '';
                      return (
                        <Card variant="success" className="text-2xl text-emerald-300">
                          <span className="font-bold text-emerald-200 mr-2">{optionLabel}</span>
                          {correctAnswerText}
                        </Card>
                      );
                    })()}
                  </div>

                  {/* All Team Answers */}
                  {quiz.lastDomainAnswer.allAnswers && quiz.lastDomainAnswer.allAnswers.length > 0 && quiz.lastDomainAnswer.questionCompleted && (
                    <div className="text-center">
                      <h3 className="text-2xl font-bold mb-6">Team Answers</h3>
                      <div className="space-y-3">
                        {quiz.lastDomainAnswer.allAnswers.map((teamAnswer: any) => {
                          const domain = quiz.domains.find((d: Domain) => d.questions.some((q: Question) => q.text === quiz.lastDomainAnswer.questionText));
                          const question = domain?.questions.find((q: Question) => q.text === quiz.lastDomainAnswer.questionText);
                          const options = question?.options || [];
                          // Try exact match first, then case-insensitive
                          let answerIndex = teamAnswer.answer ? options.findIndex((opt: string) => opt === teamAnswer.answer) : -1;
                          if (answerIndex < 0 && teamAnswer.answer) {
                            answerIndex = options.findIndex((opt: string) => opt?.toLowerCase() === teamAnswer.answer?.toLowerCase());
                          }
                          const answerLabel = answerIndex >= 0 ? `${String.fromCharCode(65 + answerIndex)}.` : '';
                          return (
                          <Card 
                            key={teamAnswer.teamId}
                            variant={teamAnswer.isCorrect ? 'success' : 'error'}
                          >
                            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                              <div className="text-xl">
                                <span className="font-bold">{teamAnswer.teamName}:</span>
                                {teamAnswer.isPassed ? (
                                  <span className="ml-2 text-red-300">PASSED</span>
                                ) : teamAnswer.isTimeout ? (
                                  <span className="ml-2 text-amber-400">TIMEOUT</span>
                                ) : teamAnswer.answer ? (
                                  <span className="ml-2">
                                    <span className="font-bold text-blue-300">{answerLabel}</span>
                                    "{teamAnswer.answer}"
                                  </span>
                                ) : (
                                  <span className="ml-2">No answer</span>
                                )}
                                {!teamAnswer.wasTabActive && (
                                  <Badge variant="warning" className="ml-3">⚠ Tab inactive</Badge>
                                )}
                              </div>
                              <Badge variant={teamAnswer.points > 0 ? 'success' : 'error'} className="text-lg px-3 py-1">
                                ({teamAnswer.points > 0 ? '+' : ''}{teamAnswer.points} pts)
                              </Badge>
                            </div>
                          </Card>
                        )})}
                      </div>
                    </div>
                  )}

                  {/* Timer */}
                  {timeLeft !== null && timeLeft > 0 && (
                    <div className="text-center">
                      <Badge variant="info" className="text-xl px-6 py-3">
                        Next in {timeLeft}s...
                      </Badge>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Round Ended */}
            {quiz.phase === 'domain_round_ended' && (
              <Card variant="elevated" className="text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
                <div className="text-2xl font-semibold">Domain Round Complete!</div>
              </Card>
            )}

            {quiz.phase === 'completed' && (
              <Card variant="success" className="text-center">
                <Trophy className="w-20 h-20 mx-auto mb-4 text-yellow-400" />
                <div className="text-3xl font-bold mb-4">🎉 Quiz Complete!</div>
                <Badge variant="warning" className="text-2xl px-6 py-3">
                  Winner: {sortedTeams[0]?.name}
                </Badge>
              </Card>
            )}

            {quiz.status === 'setup' && (
              <Card variant="elevated" className="text-center">
                <Eye className="w-16 h-16 mx-auto mb-4 text-indigo-400" />
                <div className="text-2xl font-semibold">Waiting for quiz to start...</div>
              </Card>
            )}
          </div>

          {/* Resizable Divider */}
          <div 
            className={`w-2 cursor-col-resize flex-shrink-0 bg-slate-700 hover:bg-indigo-500 transition-colors ${
              isDragging ? 'bg-indigo-500' : ''
            } flex items-center justify-center`}
            onMouseDown={handleMouseDown}
          >
            <GripVertical className={`w-4 h-4 text-slate-400 ${isDragging ? 'text-white' : ''}`} />
          </div>

          {/* Leaderboard Sidebar */}
          <div style={{ width: `${100 - dividerPosition}%` }}>
            <Card variant="elevated" className="sticky top-4">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-400" />
                Leaderboard
              </h2>
              <div className="space-y-3">
                {sortedTeams.map((team, index) => (
                  <Card
                    key={team.id}
                    variant={team.id === quiz.currentTeamId ? 'warning' : 'default'}
                    className={team.id === quiz.currentTeamId ? 'border-2 border-yellow-400' : ''}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Award className={`w-5 h-5 ${
                          index === 0 ? 'text-yellow-400' :
                          index === 1 ? 'text-slate-400' :
                          index === 2 ? 'text-orange-400' :
                          'text-slate-500'
                        }`} />
                        <Badge variant={
                          index === 0 ? 'warning' :
                          index === 1 ? 'neutral' :
                          index === 2 ? 'warning' :
                          'neutral'
                        } className="text-lg px-3 py-1">
                          #{index + 1}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold">{team.score}</div>
                    </div>
                    <div className="text-lg font-bold">{team.name}</div>
                    {team.captainName && (
                      <div className="text-xs text-slate-400">{team.captainName}</div>
                    )}
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
