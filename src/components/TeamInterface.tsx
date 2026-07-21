'use client';

import { Clock, CheckCircle, XCircle, Award, Pause, Zap, Trophy, Timer, AlertCircle, Info, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import * as React from 'react';
import { joinTeam, selectDomain, selectQuestion, selectDomainAndQuestion, submitDomainAnswer, showOptions, passQuestion, buzz, submitBuzzerAnswer } from '@/lib/actions';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input, { Select, Textarea } from '@/components/ui/Input';
import Badge from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';

export default function TeamInterface({ quiz: initialQuiz }: { quiz: any }) {
  const router = useRouter();
  // Use the quiz prop directly - router.refresh() will cause Next.js to re-fetch and pass new props
  const quiz = {
    ...initialQuiz,
    domains: initialQuiz.domains || [],
    buzzerQuestions: initialQuiz.buzzerQuestions || [],
    teams: initialQuiz.teams || [],
    usedDomains: initialQuiz.usedDomains || [],
  };
  const { isConnected, hasReconnected } = useSocket(quiz.id);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [joined, setJoined] = useState(false);
  const [answer, setAnswer] = useState('');

  const [timeLeft, setTimeLeft] = useState(0);
  const [buzzTimeLeft, setBuzzTimeLeft] = useState(0);
  const [buzzTimerStart, setBuzzTimerStart] = useState<number | null>(null);
  const [myAnswerTimeLeft, setMyAnswerTimeLeft] = useState(0);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const isMyTurn = quiz.currentTeamId === selectedTeam;
  const hasBuzzed = quiz.buzzSequence?.includes(selectedTeam);

  useEffect(() => {
    const teamId = localStorage.getItem('teamId');
    const playerName = localStorage.getItem('playerName');
    
    if (teamId && playerName) {
      // First try to find by exact team ID
      let team = quiz.teams.find((t: any) => t.id === teamId);
      
      if (team) {
        // Team ID exists - check if player is still captain
        if (team.captainName === playerName) {
          setSelectedTeam(teamId);
          setJoined(true);
        } else {
          // Player is no longer captain of this team - clear team but keep player name
          localStorage.removeItem('teamId');
          setSelectedTeam('');
          setJoined(false);
          setPlayerName(playerName);
        }
      } else {
        // Team ID doesn't exist (might be reset) - try to find by team name and player name
        const storedTeamName = localStorage.getItem('teamName');
        if (storedTeamName) {
          team = quiz.teams.find((t: any) => t.name === storedTeamName && t.captainName === playerName);
          if (team) {
            // Found matching team by name and player - update stored team ID
            localStorage.setItem('teamId', team.id);
            setSelectedTeam(team.id);
            setJoined(true);
            setToast({
              message: 'Reconnected to your team after quiz reset.',
              type: 'success'
            });
          } else {
            // No matching team found - clear team but keep player name
            localStorage.removeItem('teamId');
            localStorage.removeItem('teamName');
            setSelectedTeam('');
            setJoined(false);
            setPlayerName(playerName);
          }
        } else {
          // No team name stored - clear team but keep player name
          localStorage.removeItem('teamId');
          setSelectedTeam('');
          setJoined(false);
          setPlayerName(playerName);
        }
      }
    } else if (playerName) {
      // Player name exists but no team - restore player name for easy team selection
      setPlayerName(playerName);
    }
  }, [quiz.teams, quiz.status, quiz.phase]);

  // Handle reconnection - validate localStorage against server state
  useEffect(() => {
    if (hasReconnected) {
      console.log('Reconnected - validating localStorage against server state');
      const teamId = localStorage.getItem('teamId');
      const playerName = localStorage.getItem('playerName');
      const teamName = localStorage.getItem('teamName');
      
      if (teamId && playerName) {
        let team = quiz.teams.find((t: any) => t.id === teamId);
        
        if (!team && teamName) {
          // Try to find by team name if ID doesn't match (quiz might have been reset)
          team = quiz.teams.find((t: any) => t.name === teamName && t.captainName === playerName);
          if (team) {
            // Update stored team ID
            localStorage.setItem('teamId', team.id);
            setSelectedTeam(team.id);
            setJoined(true);
            setToast({
              message: 'Reconnected to your team.',
              type: 'success'
            });
            return;
          }
        }
        
        if (!team || team.captainName !== playerName) {
          // Server state doesn't match localStorage - clear team but keep player name
          localStorage.removeItem('teamId');
          localStorage.removeItem('teamName');
          setSelectedTeam('');
          setJoined(false);
          setPlayerName(playerName); // Keep the player name
          setToast({
            message: 'Connection restored. Please select your team again.',
            type: 'error'
          });
        }
      }
    }
  }, [hasReconnected, quiz.teams]);

  // Reset client state when quiz is reset or restarted
  useEffect(() => {
    // If quiz status changes to 'setup' or teams are empty, it likely means quiz was reset
    if (quiz.status === 'setup' || quiz.teams.length === 0) {
      // Keep team and player info, just reset quiz-specific state
      setHasSubmitted(false);
      setIsSubmitting(false);
      setAnswer('');
      
      // Show friendly message that quiz was reset but they're still in their team
      const teamId = localStorage.getItem('teamId');
      const playerName = localStorage.getItem('playerName');
      if (teamId && playerName) {
        setToast({
          message: 'Quiz was reset. You remain in your team.',
          type: 'success'
        });
      }
    }
  }, [quiz.status, quiz.teams.length]);

  // Track when buzzing phase starts for 10-second buzz timer
  useEffect(() => {
    if (quiz.round === 'buzzer' && quiz.phase === 'buzzing' && quiz.currentQuestionId) {
      setBuzzTimerStart(Date.now());
      setBuzzTimeLeft(15);
      setHasSubmitted(false);
      setIsSubmitting(false);
      setAnswer('');
    } else if (quiz.phase === 'answering' && buzzTimerStart) {
      // Keep buzz timer running during answering phase
      const elapsed = Math.floor((Date.now() - buzzTimerStart) / 1000);
      setBuzzTimeLeft(Math.max(0, 15 - elapsed));
    } else {
      setBuzzTimerStart(null);
      setBuzzTimeLeft(0);
      setIsSubmitting(false);
    }
  }, [quiz.phase, quiz.currentQuestionId, quiz.round]);

  // Track individual team's 20-second answer timer
  useEffect(() => {
    if (hasBuzzed && quiz.buzzTimers && quiz.buzzTimers[selectedTeam]) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((quiz.buzzTimers[selectedTeam] - Date.now()) / 1000));
        setMyAnswerTimeLeft(remaining);
        
        // Show timeout toast and disable submit when timer expires
        if (remaining === 0 && !hasSubmitted) {
          setHasSubmitted(true);
          if (quiz.phase === 'answering') {
            setToast({
              message: 'Timeout! You did not submit an answer.',
              type: 'error'
            });
          }
        }
      }, 100);
      return () => clearInterval(interval);
    } else {
      setMyAnswerTimeLeft(0);
    }
  }, [hasBuzzed, quiz.buzzTimers, selectedTeam, hasSubmitted, quiz.phase]);

  // Buzz timer countdown
  useEffect(() => {
    if (buzzTimerStart && buzzTimeLeft > 0) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - buzzTimerStart) / 1000);
        const remaining = Math.max(0, 15 - elapsed);
        setBuzzTimeLeft(remaining);
        
        // Only trigger expiry if still in buzzing phase and no one has buzzed
        if (remaining === 0 && quiz.phase === 'buzzing' && quiz.buzzSequence.length === 0) {
          // Let the server handle buzz timer expiry through the periodic check
          // No need to manually trigger it from client
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [buzzTimerStart, buzzTimeLeft, quiz.phase, quiz.id, quiz.buzzSequence]);

  // Check buzzer timers periodically
  useEffect(() => {
    if (quiz.round === 'buzzer' && (quiz.phase === 'buzzing' || quiz.phase === 'answering' || quiz.phase === 'processing_answers')) {
      const interval = setInterval(() => {
        // Use API endpoint instead of dynamic import
        fetch('/api/check-buzzer-timers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId: quiz.id })
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [quiz.round, quiz.phase, quiz.id]);

  // Show results when moving to showing_answer phase
  useEffect(() => {
    if (quiz.round === 'buzzer' && quiz.phase === 'showing_answer' && quiz.lastRoundResults) {
      const myResult = quiz.lastRoundResults[selectedTeam];
      if (myResult && hasBuzzed) {
        if (myResult.timeout) {
          setToast({
            message: `Timeout! ${myResult.points} points`,
            type: 'error'
          });
        } else if (myResult.isCorrect) {
          setToast({
            message: `Correct! +${myResult.points} points`,
            type: 'success'
          });
        } else {
          setToast({
            message: `Wrong! ${myResult.points} points`,
            type: 'error'
          });
        }
      }
    }
  }, [quiz.phase, quiz.lastRoundResults, selectedTeam, hasBuzzed, quiz.round]);

  useEffect(() => {
    if (quiz.timerEndsAt) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((new Date(quiz.timerEndsAt).getTime() - Date.now()) / 1000));
        setTimeLeft(remaining);
        
        // Show toast when timer expires for current team
        if (remaining === 0 && isMyTurn && (quiz.phase === 'answering' || quiz.phase === 'answering_with_options') && quiz.round === 'domain') {
          setToast({
            message: 'Timeout! Question passed.',
            type: 'error'
          });
        }
        
        // Handle showing_result timer (domain round)
        if (remaining === 0 && quiz.phase === 'showing_result' && quiz.round === 'domain') {
          fetch('/api/timer-expiry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizId: quiz.id })
          });
        }
        
        // Handle buzzer showing answer timer
        if (remaining === 0 && quiz.phase === 'showing_answer' && quiz.round === 'buzzer') {
          // Let the server handle this through periodic checks
          fetch('/api/buzzer-timer-expiry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizId: quiz.id })
          });
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [quiz.timerEndsAt, isMyTurn, quiz.phase, quiz.round, quiz.id]);

  // Periodic check for domain round timer expiry (server-side) - works regardless of whose turn it is
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
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleJoinTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await joinTeam(quiz.id, selectedTeam, playerName);
    if (result.success) {
      const team = quiz.teams.find((t: any) => t.id === selectedTeam);
      localStorage.setItem('teamId', selectedTeam);
      localStorage.setItem('playerName', playerName);
      if (team) {
        localStorage.setItem('teamName', team.name); // Store team name for reset recovery
      }
      setJoined(true);
    }
  };



  if (!joined) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <div className="text-center mb-6">
            <Users className="w-16 h-16 mx-auto mb-4 text-indigo-400" />
            <h1 className="text-3xl md:text-4xl font-bold">Join Team</h1>
            <p className="text-slate-400 mt-2">Select your team and enter your name</p>
          </div>
          <form onSubmit={handleJoinTeam} className="space-y-4">
            <Select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              label="Select Team"
              required
            >
              <option value="">Choose a team...</option>
              {quiz.teams.map((team: any) => (
                <option key={team.id} value={team.id}>
                  {team.name} {team.captainName ? '(Joined)' : '(Available)'}
                </option>
              ))}
            </Select>
            
            <Input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              label="Your Name"
              placeholder="Enter your name"
              required
            />
            
            <Button type="submit" variant="success" size="lg" className="w-full">
              Join Team
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  const team = quiz.teams.find((t: any) => t.id === selectedTeam);
  const currentQuestion = quiz.round === 'domain' && quiz.currentQuestionId
    ? quiz.domains?.flatMap((d: any) => d.questions || []).find((q: any) => q.id === quiz.currentQuestionId)
    : quiz.buzzerQuestions?.find((q: any) => q.id === quiz.currentQuestionId);
  const availableDomains = (quiz.domains || []).filter((d: any) => (quiz.usedDomains || []).includes(d.id) === false);
  const currentDomain = quiz.selectedDomainId ? (quiz.domains || []).find((d: any) => d.id === quiz.selectedDomainId) : null;

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {toast && (
        <div className={`fixed top-4 right-4 px-6 py-4 rounded-lg font-semibold shadow-lg z-50 animate-slide-in ${
          toast.type === 'success' ? 'bg-emerald-500/90 backdrop-blur-sm' : 'bg-red-500/90 backdrop-blur-sm'
        }`}>
          {toast.message}
        </div>
      )}
      
      <div className="w-full space-y-6">
        <Card variant="elevated">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold">{team?.name}</h1>
              <p className="text-slate-400 mt-1">Captain: {team?.captainName || 'Not joined'}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-sm text-slate-400">Score</p>
                <p className="text-3xl md:text-4xl font-bold text-indigo-400">{team?.score}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* QUIZ COMPLETED */}
        {quiz.status === 'active' && quiz.phase === 'completed' && (
          <Card variant="success">
            <div className="text-center py-12">
              <div className="text-6xl mb-6">🎉</div>
              <h2 className="text-4xl font-bold mb-4">Quiz Completed!</h2>
              <p className="text-slate-300 text-lg mb-4">Thank you for participating!</p>
              <Badge variant="info" className="text-lg px-6 py-3">
                📺 Check the main screen for final results
              </Badge>
            </div>
          </Card>
        )}

        {/* AWAITING EVALUATION */}
        {quiz.round === 'domain' && quiz.status === 'active' && quiz.phase === 'awaiting_evaluation' && (
          <Card variant="elevated">
            <div className="text-center py-12">
              <div className="inline-block p-4 bg-purple-500/20 rounded-full mb-6">
                <svg className="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-3">⚖️ Host is Evaluating...</h2>
              <p className="text-slate-400 text-lg mb-4">Please wait while the host reviews the answer</p>
            </div>
          </Card>
        )}

        {/* SHOWING RESULT */}
        {quiz.round === 'domain' && quiz.status === 'active' && quiz.phase === 'showing_result' && (
          <Card variant="elevated">
            <div className="text-center py-8">
              <Clock className="w-16 h-16 mx-auto mb-4 text-indigo-400 animate-pulse" />
              <h2 className="text-2xl font-bold mb-3">Waiting for next question...</h2>
              <p className="text-slate-400">The host will advance shortly</p>
            </div>
          </Card>
        )}

        {/* DOMAIN ROUND ENDED */}
        {quiz.round === 'domain' && quiz.status === 'active' && quiz.phase === 'domain_round_ended' && (
          <Card variant="elevated">
            <div className="text-center py-8">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
              <h2 className="text-3xl font-bold mb-4">Domain Round Ended!</h2>
              <p className="text-slate-400 text-lg">Waiting for host to start Buzzer Round...</p>
            </div>
          </Card>
        )}

        {/* DOMAIN ROUND - SELECTING DOMAIN (Step 1) */}
        {quiz.round === 'domain' && quiz.status === 'active' && quiz.phase === 'selecting_domain' && (
          <Card variant="elevated">
            {!isMyTurn ? (
              <div className="text-center py-8">
                <Clock className="w-16 h-16 mx-auto mb-4 text-indigo-400 animate-pulse" />
                <h2 className="text-2xl font-bold mb-4">Waiting...</h2>
                <p className="text-slate-400">
                  {quiz.teams.find((t: any) => t.id === quiz.currentTeamId)?.name} is selecting domain
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Award className="w-6 h-6 text-indigo-400" />
                  Select Domain
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableDomains?.map((domain: any) => {
                    const unansweredCount = domain.questions.filter((q: any) => !q.isAnswered).length;
                    if (unansweredCount === 0) return null;
                    
                    return (
                      <Button
                        key={domain.id}
                        onClick={() => selectDomain(quiz.id, domain.id)}
                        variant="primary"
                        size="lg"
                        className="h-auto py-6"
                      >
                        <div className="text-center">
                          <div className="font-semibold text-lg">{domain.name}</div>
                          <div className="text-sm text-slate-300 mt-2">
                            {unansweredCount} questions available
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </>
            )}
          </Card>
        )}

        {/* DOMAIN ROUND - SELECTING QUESTION (Step 2) */}
        {quiz.round === 'domain' && quiz.status === 'active' && quiz.phase === 'selecting_question' && (
          <Card variant="elevated">
            {!isMyTurn ? (
              <div className="text-center py-8">
                <Clock className="w-16 h-16 mx-auto mb-4 text-indigo-400 animate-pulse" />
                <h2 className="text-2xl font-bold mb-4">Waiting...</h2>
                <p className="text-slate-400">
                  {quiz.teams.find((t: any) => t.id === quiz.currentTeamId)?.name} is selecting question
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  Select Question
                </h2>
                
                {/* Show selected domain */}
                {currentDomain && (
                  <div className="mb-6 p-4 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
                    <div className="text-sm text-slate-400 mb-1">Selected Domain:</div>
                    <div className="text-xl font-semibold text-indigo-300">{currentDomain.name}</div>
                  </div>
                )}
                
                {/* Question number grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {currentDomain?.questions.map((q: any) => {
                    const isSelected = quiz.currentQuestionId === q.id;
                    return (
                      <button
                        key={q.id}
                        onClick={() => !q.isAnswered && !isSelected && selectQuestion(quiz.id, q.id, selectedTeam)}
                        disabled={q.isAnswered || isSelected}
                        className={`
                          h-16 text-2xl font-bold rounded-lg transition-all
                          ${isSelected 
                            ? 'bg-yellow-500 text-white border-4 border-yellow-300 cursor-not-allowed opacity-100' 
                            : q.isAnswered 
                              ? 'bg-slate-600 text-slate-400 cursor-not-allowed opacity-50'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-white'
                          }
                        `}
                      >
                        {q.number}
                      </button>
                    );
                  })}
                </div>
                
                {/* Back button to change domain */}
                <button
                  onClick={() => selectDomain(quiz.id, '')}
                  className="mt-4 text-sm text-slate-400 hover:text-slate-300 underline"
                >
                  ← Change Domain
                </button>
              </>
            )}
          </Card>
        )}

        {/* DOMAIN ROUND - ANSWERING */}
        {quiz.round === 'domain' && quiz.status === 'active' && (quiz.phase === 'answering' || quiz.phase === 'answering_with_options') && currentQuestion && (
          <Card variant="elevated">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-yellow-400" />
                Question #{currentQuestion.number}
              </h2>
              {isMyTurn && timeLeft > 0 && (
                <Badge variant={timeLeft < 10 ? 'error' : 'success'} className="text-2xl px-4 py-2">
                  <Clock className="w-5 h-5 inline mr-1" />
                  {timeLeft}s
                </Badge>
              )}
            </div>
            
            {/* Current turn indicator */}
            {!isMyTurn ? (
              <Card variant="info" className="text-center">
                <Info className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                <p className="text-lg font-semibold">
                  {quiz.teams.find((t: any) => t.id === quiz.currentTeamId)?.name} is answering currently
                </p>
                {currentQuestion.passedFrom && (
                  <Badge variant="warning" className="mt-2">⚠️ Passed question</Badge>
                )}
              </Card>
            ) : (
              <>
              <Card variant="success" className="mb-4 text-center">
                <p className="text-lg font-semibold">🎯 It's your turn to answer!</p>
                {currentQuestion.passedFrom && (
                  <Badge variant="warning" className="mt-2">⚠️ Passed question</Badge>
                )}
              </Card>
            
            {/* Options - show letters only, teams see options in SpectatorView */}
            {currentQuestion.options && currentQuestion.options.length > 0 && (
              <div className="space-y-3">
                <p className="text-lg font-semibold text-center">Select your answer:</p>
                <div className={`grid gap-4 ${currentQuestion.options.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {currentQuestion.options.map((opt: string, i: number) => (
                    <Button
                      key={i}
                      type="button"
                      disabled={isSubmitting}
                      onClick={async () => {
                        if (isSubmitting) return;
                        setIsSubmitting(true);
                        try {
                          const result = await submitDomainAnswer(quiz.id, selectedTeam, currentQuestion.id, opt, true);
                          if (result.success) {
                            if (result.needsEvaluation) {
                              setToast({
                                message: 'Answer submitted! Waiting for host evaluation...',
                                type: 'success'
                              });
                            }
                          } else if (result.error) {
                            setToast({
                              message: ` ${result.error}`,
                              type: 'error'
                            });
                          }
                        } finally {
                          setIsSubmitting(false);
                        }
                      }}
                      variant="success"
                      size="lg"
                      className="h-20 text-5xl font-bold"
                    >
                      {String.fromCharCode(65 + i)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            </>
            )}
          </Card>
        )}

        {/* QUIZ PAUSED */}
        {quiz.status === 'paused' && (quiz.round === 'domain' || quiz.round === 'buzzer') && (
          <Card variant="warning">
            <div className="text-center py-8">
              <Pause className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
              <h2 className="text-3xl font-bold mb-4">Quiz Paused</h2>
              <p className="text-slate-400 text-lg">Waiting for host to resume...</p>
            </div>
          </Card>
        )}

        {/* BUZZER ROUND */}
        {quiz.round === 'buzzer' && quiz.status === 'active' && quiz.phase !== 'completed' && currentQuestion && (
          <Card variant="elevated">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Zap className="w-6 h-6 text-orange-400" />
                Question #{currentQuestion.number}
              </h2>
            </div>

            {hasBuzzed && quiz.buzzSequence && quiz.buzzSequence.length > 0 && (
              <Card className="mb-4">
                <p className="text-sm font-medium mb-2">Buzz Sequence:</p>
                <div className="flex gap-2 flex-wrap">
                  {quiz.buzzSequence.map((teamId: string, i: number) => (
                    <Badge key={i} variant="info" className="text-base px-4 py-2">
                      {i + 1}. {quiz.teams.find((t: any) => t.id === teamId)?.name}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {(quiz.phase === 'buzzing' || quiz.phase === 'answering') && !hasBuzzed && buzzTimeLeft > 0 && (
              <>
                <Badge variant="warning" className="w-full text-center text-xl py-3 mb-4">
                  <Clock className="w-5 h-5 inline mr-2" />
                  Buzz Time: {buzzTimeLeft}s
                </Badge>
                <Button
                  onClick={() => buzz(quiz.id, selectedTeam)}
                  variant="danger"
                  size="lg"
                  className="w-full h-24 text-3xl font-bold"
                >
                  <Zap className="w-8 h-8 inline mr-2" />
                  BUZZ!
                </Button>
              </>
            )}
            
            {(quiz.phase === 'buzzing' || quiz.phase === 'answering') && !hasBuzzed && buzzTimeLeft === 0 && (
              <EmptyState
                icon={<Clock className="w-16 h-16" />}
                title="Buzz time expired"
                description="You didn't buzz in time for this question"
              />
            )}

            {quiz.phase === 'showing_answer' && (
              <Card variant="elevated" className="text-center">
                <Clock className="w-16 h-16 mx-auto mb-4 text-indigo-400 animate-pulse" />
                <h2 className="text-2xl font-bold mb-3">Waiting for next question...</h2>
                <p className="text-slate-400">The host will advance shortly</p>
              </Card>
            )}

            {hasBuzzed && (quiz.phase === 'buzzing' || quiz.phase === 'answering') && !hasSubmitted && myAnswerTimeLeft > 0 && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (hasSubmitted || isSubmitting) return;
                
                setIsSubmitting(true);
                try {
                  const result = await submitBuzzerAnswer(quiz.id, selectedTeam, currentQuestion.id, answer);
                  if (result.success && result.queued) {
                    setHasSubmitted(true);
                    setToast({
                      message: 'Answer queued! Results will be shown after all answers are processed.',
                      type: 'success'
                    });
                    setAnswer('');
                  } else if (result.error) {
                    setToast({
                      message: result.error,
                      type: 'error'
                    });
                  }
                } finally {
                  setIsSubmitting(false);
                }
              }} className="space-y-4">
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer..."
                  rows={4}
                />
                <Badge variant="success" className="w-full text-center py-2">
                  ✓ You buzzed! Submit your answer ({myAnswerTimeLeft}s left)
                </Badge>
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  variant="warning"
                  size="lg"
                  className="w-full"
                  loading={isSubmitting}
                >
                  Submit Answer
                </Button>
              </form>
            )}

            {/* Show status after buzzing - submitted or timed out */}
            {hasBuzzed && (hasSubmitted || myAnswerTimeLeft === 0) && quiz.phase !== 'showing_answer' && (
              <Card variant="info" className="text-center">
                {hasSubmitted ? (
                  <>
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-emerald-400" />
                    <p className="text-lg font-semibold">Answer submitted! Waiting for results...</p>
                  </>
                ) : (
                  <>
                    <Clock className="w-12 h-12 mx-auto mb-2 text-amber-400" />
                    <p className="text-lg font-semibold">Time expired</p>
                  </>
                )}
              </Card>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
