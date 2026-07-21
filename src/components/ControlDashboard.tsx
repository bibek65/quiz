'use client';

import { Play, Pause, RotateCcw, Eye, Users, ArrowRight, Check, X, Trophy, BarChart3 } from 'lucide-react';
import { useEffect } from 'react';
import { startDomainRound, startBuzzerRound, resetQuiz, disconnectTeamCaptain } from '@/lib/actions';
import { nextBuzzerQuestion, nextDomainQuestion } from '@/lib/manualProgression';
import { evaluateDomainAnswer, evaluateBuzzerAnswer, completeEvaluation } from '@/lib/answerEvaluation';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default function ControlDashboard({ quiz }: { quiz: any }) {
  const { socket, isConnected, hasReconnected } = useSocket(quiz.id);
  const router = useRouter();

  // Periodic check for domain round timer expiry (server-side)
  useEffect(() => {
    if (quiz.round === 'domain' && (quiz.phase === 'answering' || quiz.phase === 'answering_with_options')) {
      const interval = setInterval(() => {
        fetch('/api/check-domain-timers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId: quiz.id })
        });
      }, 1000); // Check every second
      return () => clearInterval(interval);
    }
  }, [quiz.round, quiz.phase, quiz.id]);

  // Note: Timer handling removed - showing_result and showing_answer phases 
  // are now controlled manually via "Next Question" button

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      <div className="w-full space-y-6">
        {/* Header */}
        <Card variant="elevated">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2">🎮 Control Dashboard</h1>
              <p className="text-slate-400">Manage quiz flow and evaluate answers</p>
            </div>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => router.push(`/quiz/${quiz.id}/host/setup`)}
            >
              ← Setup
            </Button>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <Card variant="info">
              <p className="text-sm font-medium text-slate-400">Quiz ID</p>
              <p className="text-lg md:text-xl font-mono mt-2 break-all">{quiz.id}</p>
            </Card>
            <Card variant="warning">
              <p className="text-sm font-medium text-slate-400">Spectator View</p>
              <a 
                href={`/quiz/${quiz.id}/spectator`} 
                target="_blank" 
                className="text-lg font-semibold text-amber-300 hover:text-amber-200 underline mt-2 flex items-center gap-2"
              >
                <Eye className="w-5 h-5" />
                Open View
              </a>
            </Card>
            <Card>
              <p className="text-sm font-medium text-slate-400 mb-2">Game Status</p>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={quiz.status === 'active' ? 'success' : 'neutral'}>
                    {quiz.status}
                  </Badge>
                  <Badge variant="info">{quiz.round.replace('_', ' ')}</Badge>
                </div>
                {quiz.currentTeamId && (
                  <div className="mt-2 p-2 bg-emerald-500/20 border border-emerald-500/30 rounded">
                    <span className="font-semibold text-emerald-300">
                      Turn: {quiz.teams.find((t: any) => t.id === quiz.currentTeamId)?.name}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </Card>

        {/* Answer Evaluation & Progression Panel - Always visible */}
        <Card variant="elevated" className="border-2 border-purple-500/50 bg-gradient-to-r from-purple-900/30 to-pink-900/30">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold">⚖️ Evaluation & Progression</h2>
          </div>
          
          {/* Domain Round - Awaiting Evaluation */}
          {quiz.phase === 'awaiting_evaluation' && quiz.round === 'domain' && quiz.lastDomainAnswer && (
            <div className="space-y-4">
              <Card>
                <p className="text-sm text-slate-400 mb-2">Question</p>
                <p className="text-lg md:text-xl font-semibold">{quiz.lastDomainAnswer.questionText}</p>
              </Card>
              
              <div className="grid md:grid-cols-2 gap-4">
                <Card variant="success">
                  <p className="text-sm text-slate-400 mb-2">Correct Answer</p>
                  {(() => {
                    const currentQ = quiz.domains?.flatMap((d: any) => d.questions || []).find((q: any) => q.id === quiz.currentQuestionId);
                    const correctOptionIndex = currentQ?.options?.findIndex((o: string) => o === quiz.lastDomainAnswer.correctAnswer);
                    return (
                      <p className="text-lg font-semibold text-emerald-300">
                        {correctOptionIndex !== undefined && correctOptionIndex >= 0 && (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white mr-2 text-base">
                            {String.fromCharCode(65 + correctOptionIndex)}
                          </span>
                        )}
                        {quiz.lastDomainAnswer.correctAnswer}
                      </p>
                    );
                  })()}
                </Card>
                
                <Card variant="info">
                  <p className="text-sm text-slate-400 mb-2">Team's Answer</p>
                  {(() => {
                    const currentQ = quiz.domains?.flatMap((d: any) => d.questions || []).find((q: any) => q.id === quiz.currentQuestionId);
                    const teamOptionIndex = currentQ?.options?.findIndex((o: string) => o === quiz.lastDomainAnswer.answer);
                    return (
                      <p className="text-lg font-semibold text-blue-300">
                        {teamOptionIndex !== undefined && teamOptionIndex >= 0 && (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white mr-2 text-base">
                            {String.fromCharCode(65 + teamOptionIndex)}
                          </span>
                        )}
                        {quiz.lastDomainAnswer.answer}
                      </p>
                    );
                  })()}
                  <p className="text-xs text-slate-500 mt-2">
                    Team: {quiz.teams.find((t: any) => t.id === quiz.lastDomainAnswer.teamId)?.name}
                  </p>
                </Card>
              </div>
              
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <>
                  <Button
                    variant="success"
                    size="lg"
                    icon={<Check className="w-5 h-5 md:w-6 md:h-6" />}
                    onClick={async () => {
                      await evaluateDomainAnswer(quiz.id, quiz.lastDomainAnswer.teamId, quiz.currentQuestionId, 'correct');
                      router.refresh();
                    }}
                    className="flex-col py-6"
                  >
                    <span className="text-sm md:text-base">Correct</span>
                    <span className="text-xs">+10</span>
                  </Button>
                  
                  <Button
                    variant="danger"
                    size="lg"
                    icon={<X className="w-5 h-5 md:w-6 md:h-6" />}
                    onClick={async () => {
                      await evaluateDomainAnswer(quiz.id, quiz.lastDomainAnswer.teamId, quiz.currentQuestionId, 'incorrect');
                      router.refresh();
                    }}
                    className="flex-col py-6"
                  >
                    <span className="text-sm md:text-base">Incorrect</span>
                    <span className="text-xs">0</span>
                  </Button>
                </>
              </div>
            </div>
          )}
          
          {/* Buzzer Round - Awaiting Evaluation */}
          {quiz.phase === 'awaiting_evaluation' && quiz.round === 'buzzer' && quiz.pendingBuzzerAnswers && (
            <div className="space-y-4">
              <Card>
                <p className="text-sm text-slate-400 mb-2">Question</p>
                <p className="text-lg md:text-xl font-semibold">
                  {quiz.buzzerQuestions?.find((q: any) => q.id === quiz.currentQuestionId)?.text}
                </p>
              </Card>
              
              <Card variant="success">
                <p className="text-sm text-slate-400 mb-2">Correct Answer</p>
                <p className="text-lg font-semibold text-emerald-300">
                  {quiz.buzzerQuestions?.find((q: any) => q.id === quiz.currentQuestionId)?.answer}
                </p>
              </Card>
              
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-300">Mark each answer (points calculated in buzz order on complete)</p>
                {quiz.buzzSequence.map((teamId: string, index: number) => {
                  const teamAnswer = quiz.pendingBuzzerAnswers[teamId];
                  const team = quiz.teams.find((t: any) => t.id === teamId);
                  const isFirstBuzzer = index === 0;
                  const isEvaluated = teamAnswer?.evaluated;
                  
                  return (
                    <Card key={teamId} variant={isEvaluated ? (teamAnswer.evaluation === 'correct' ? 'success' : 'error') : 'interactive'}>
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-lg">{team?.name}</p>
                            <Badge variant={isFirstBuzzer ? 'warning' : 'neutral'}>
                              {isFirstBuzzer ? '1st Buzzer' : `${index + 1}${index === 1 ? 'nd' : index === 2 ? 'rd' : 'th'}`}
                            </Badge>
                            {isEvaluated && (
                              <Badge variant={teamAnswer.evaluation === 'correct' ? 'success' : 'error'}>
                                {teamAnswer.evaluation === 'correct' ? '✓ Correct' : '✗ Incorrect'}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-2">
                            <p className="text-sm text-slate-400">Answer:</p>
                            <p className="text-lg font-semibold text-blue-300">{teamAnswer?.answer || 'No answer'}</p>
                          </div>
                        </div>
                      </div>
                      
                      {teamAnswer && (
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            icon={<Check className="w-4 h-4" />}
                            onClick={async () => {
                              await evaluateBuzzerAnswer(quiz.id, teamId, 'correct');
                              router.refresh();
                            }}
                            className={`flex-col py-3 ${isEvaluated && teamAnswer.evaluation === 'correct' ? 'ring-2 ring-emerald-400' : ''}`}
                          >
                            <span className="text-xs">Correct</span>
                          </Button>
                          
                          <Button
                            variant="danger"
                            size="sm"
                            icon={<X className="w-4 h-4" />}
                            onClick={async () => {
                              await evaluateBuzzerAnswer(quiz.id, teamId, 'incorrect');
                              router.refresh();
                            }}
                            className={`flex-col py-3 ${isEvaluated && teamAnswer.evaluation === 'incorrect' ? 'ring-2 ring-red-400' : ''}`}
                          >
                            <span className="text-xs">Incorrect</span>
                          </Button>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
              
              <Button
                variant="primary"
                size="lg"
                onClick={async () => {
                  await completeEvaluation(quiz.id);
                  router.refresh();
                }}
                disabled={quiz.buzzSequence.some((teamId: string) => {
                  const a = quiz.pendingBuzzerAnswers[teamId];
                  return a && !a.evaluated;
                })}
                className="w-full"
              >
                Complete Evaluation & Show Results
              </Button>
            </div>
          )}
          
          {/* Next Question Button - Shows in showing_answer or showing_result phase */}
          {quiz.round === 'buzzer' && quiz.phase === 'showing_answer' && (
            <div className="text-center space-y-4">
              <p className="text-slate-300 text-lg">✅ Results are being shown to participants</p>
              <Button
                variant="success"
                size="lg"
                icon={<ArrowRight className="w-5 h-5" />}
                onClick={async () => {
                  await nextBuzzerQuestion(quiz.id);
                  router.refresh();
                }}
                className="w-full"
              >
                Next Question
              </Button>
            </div>
          )}
          
          {quiz.round === 'domain' && quiz.phase === 'showing_result' && (
            <div className="text-center space-y-4">
              <p className="text-slate-300 text-lg">✅ Results are being shown to participants</p>
              <Button
                variant="success"
                size="lg"
                icon={<ArrowRight className="w-5 h-5" />}
                onClick={async () => {
                  await nextDomainQuestion(quiz.id);
                  router.refresh();
                }}
                className="w-full"
              >
                Next Question
              </Button>
            </div>
          )}
          
          {/* Nothing to evaluate - Idle state */}
          {quiz.phase !== 'awaiting_evaluation' && quiz.phase !== 'showing_result' && quiz.phase !== 'showing_answer' && (
            <div className="text-center py-12">
              <div className="text-slate-400 text-lg space-y-2">
                <p className="text-3xl mb-4">💤</p>
                <p className="font-medium">Nothing to evaluate right now</p>
                <p className="text-sm">Waiting for teams to submit answers...</p>
              </div>
            </div>
          )}
        </Card>

        {/* Teams Display (Read-only with kick functionality) */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <Users className="w-6 h-6 text-indigo-400" />
            <h2 className="text-2xl font-bold">Teams</h2>
            <Badge variant="neutral">{quiz.teams.length}</Badge>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {quiz.teams.map((team: any) => (
              <Card key={team.id} variant="interactive">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold">{team.name}</h3>
                    <div className="text-sm text-slate-400 mt-1">
                      Score: <span className="text-white font-semibold text-lg">{team.score}</span>
                    </div>
                  </div>
                  <Badge variant={team.captainName ? 'success' : 'neutral'}>
                    {team.captainName ? 'Connected' : 'Waiting'}
                  </Badge>
                </div>
                
                {team.captainName && (
                  <div className="mt-3 flex justify-between items-center bg-slate-900/50 rounded-lg p-3">
                    <div className="text-sm">
                      <span className="text-slate-400">Captain: </span>
                      <span className="font-semibold">{team.captainName}</span>
                    </div>
                    <Button
                      variant="warning"
                      size="sm"
                      onClick={async () => {
                        if (confirm(`Disconnect ${team.captainName} from ${team.name}?`)) {
                          await disconnectTeamCaptain(team.id);
                          router.refresh();
                        }
                      }}
                    >
                      Kick
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </Card>

        {/* Quiz Controls */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <Play className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold">Quiz Controls</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="primary"
              size="lg"
              icon={<Play className="w-5 h-5" />}
              onClick={async () => {
                await startDomainRound(quiz.id);
                router.refresh();
              }}
              className="flex-col py-6"
            >
              Start Domain Round
            </Button>
            
            <Button
              variant="warning"
              size="lg"
              icon={<Play className="w-5 h-5" />}
              onClick={async () => {
                await startBuzzerRound(quiz.id);
                router.refresh();
              }}
              className="flex-col py-6"
            >
              Start Buzzer Round
            </Button>
            
            {quiz.status === 'active' && (quiz.round === 'domain' || quiz.round === 'buzzer') && (
              <Button
                variant="warning"
                size="lg"
                icon={<Pause className="w-5 h-5" />}
                onClick={async () => {
                  await fetch('/api/pause-quiz', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quizId: quiz.id })
                  });
                  router.refresh();
                }}
                className="flex-col py-6"
              >
                Pause Quiz
              </Button>
            )}
            
            {quiz.status === 'paused' && (quiz.round === 'domain' || quiz.round === 'buzzer') && (
              <Button
                variant="success"
                size="lg"
                icon={<Play className="w-5 h-5" />}
                onClick={async () => {
                  await fetch('/api/resume-quiz', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ quizId: quiz.id })
                  });
                  router.refresh();
                }}
                className="flex-col py-6"
              >
                Resume Quiz
              </Button>
            )}
            
            <Button
              variant="danger"
              size="lg"
              icon={<RotateCcw className="w-5 h-5" />}
              onClick={async () => {
                if (confirm('Reset quiz? This will clear all scores and progress.')) {
                  await resetQuiz(quiz.id);
                  router.refresh();
                }
              }}
              className="flex-col py-6"
            >
              Reset Quiz
            </Button>
          </div>
        </Card>

        {/* Game Statistics */}
        <Card>
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="w-6 h-6 text-blue-400" />
            <h2 className="text-2xl font-bold">Game Statistics</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card variant="info">
              <p className="text-sm text-slate-400">Total Teams</p>
              <p className="text-3xl md:text-4xl font-bold mt-2">{quiz.teams.length}</p>
            </Card>
            <Card variant="success">
              <p className="text-sm text-slate-400">Connected Players</p>
              <p className="text-3xl md:text-4xl font-bold mt-2">
                {quiz.teams.filter((t: any) => t.captainName).length}
              </p>
            </Card>
            <Card variant="info">
              <p className="text-sm text-slate-400">Domains</p>
              <p className="text-3xl md:text-4xl font-bold mt-2">{quiz.domains.length}</p>
            </Card>
            <Card variant="warning">
              <p className="text-sm text-slate-400">Buzzer Questions</p>
              <p className="text-3xl md:text-4xl font-bold mt-2">{quiz.buzzerQuestions?.length || 0}</p>
            </Card>
          </div>
        </Card>

        {/* Leaderboard */}
        {quiz.teams.length > 0 && (
          <Card>
            <div className="flex items-center gap-3 mb-6">
              <Trophy className="w-6 h-6 text-amber-400" />
              <h2 className="text-2xl font-bold">Leaderboard</h2>
            </div>
            <div className="space-y-3">
              {[...quiz.teams]
                .sort((a: any, b: any) => b.score - a.score)
                .map((team: any, index: number) => (
                  <Card
                    key={team.id}
                    variant={index === 0 ? 'warning' : index === 1 || index === 2 ? 'elevated' : 'default'}
                    className={
                      index === 0 ? 'border-2 border-amber-500' :
                      index === 1 ? 'border-2 border-slate-400' :
                      index === 2 ? 'border-2 border-orange-500' :
                      ''
                    }
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-3xl font-bold w-12 text-center">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                        </div>
                        <div>
                          <div className="font-bold text-xl">{team.name}</div>
                          {team.captainName && (
                            <div className="text-sm text-slate-400">{team.captainName}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-3xl font-bold">{team.score}</div>
                    </div>
                  </Card>
                ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
