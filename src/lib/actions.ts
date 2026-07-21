'use server';

import { prisma } from './db';
import { getSession } from './session';
import { revalidatePath } from 'next/cache';
import { emitUpdate } from './emitUpdate';

async function revalidateQuizPaths(quizId: string) {
  revalidatePath(`/quiz/${quizId}/host`);
  revalidatePath(`/quiz/${quizId}/host/setup`);
  revalidatePath(`/quiz/${quizId}/host/control`);
  revalidatePath(`/quiz/${quizId}/team`);
}

// Quiz Actions
export async function createQuiz() {
  const quiz = await prisma.quiz.create({ data: {} });
  const session = await getSession();
  session.quizId = quiz.id;
  session.isHost = true;
  await session.save();
  return { success: true, quizId: quiz.id };
}

export async function hostLogin(password: string) {
  if (password !== process.env.HOST_PASSWORD) {
    return { success: false, error: 'Invalid password' };
  }
  const session = await getSession();
  session.isHost = true;
  await session.save();
  return { success: true };
}

export async function getQuizData(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      teams: { orderBy: [{ sequence: 'asc' }, { id: 'asc' }] },
      domains: { include: { questions: { orderBy: { number: 'asc' } } } },
      buzzerQuestions: { orderBy: { number: 'asc' } },
    },
  });
  return quiz ? JSON.parse(JSON.stringify(quiz)) : null;
}

// Team Actions
export async function createTeam(quizId: string, teamName: string) {
  const existingCount = await prisma.team.count({ where: { quizId } });
  const team = await prisma.team.create({
    data: { name: teamName, quizId, sequence: existingCount },
  });
  revalidateQuizPaths(quizId);
  emitUpdate(quizId);
  return { success: true, teamId: team.id };
}

export async function joinTeam(quizId: string, teamId: string, captainName: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (team?.captainName) {
    return { success: false, error: 'Team already has a captain' };
  }
  
  await prisma.team.update({
    where: { id: teamId },
    data: { captainName },
  });
  
  const session = await getSession();
  session.quizId = quizId;
  session.teamId = teamId;
  await session.save();
  revalidateQuizPaths(quizId);
  emitUpdate(quizId);
  return { success: true };
}

// Domain Actions
export async function createDomain(quizId: string, domainName: string) {
  const domain = await prisma.domain.create({
    data: { name: domainName, quizId },
  });
  revalidatePath(`/quiz/${quizId}`);
  return { success: true, domainId: domain.id };
}

export async function createQuestion(
  domainId: string,
  text: string,
  answer: string,
  options: string[],
  optionsDefault: boolean = true // Always show options by default
) {
  const count = await prisma.question.count({ where: { domainId } });
  const question = await prisma.question.create({
    data: { domainId, number: count + 1, text, answer, options, optionsDefault },
  });
  const domain = await prisma.domain.findUnique({ where: { id: domainId }, include: { quiz: true } });
  if (domain) {
    revalidateQuizPaths(domain.quizId);
    emitUpdate(domain.quizId);
  }
  return { success: true, questionId: question.id };
}

export async function createBuzzerQuestion(
  quizId: string,
  text: string,
  answer: string,
  options: string[]
) {
  const count = await prisma.buzzerQuestion.count({ where: { quizId } });
  const question = await prisma.buzzerQuestion.create({
    data: { quizId, number: count + 1, text, answer, options },
  });
  revalidateQuizPaths(quizId);
  emitUpdate(quizId);
  return { success: true, questionId: question.id };
}

export async function deleteTeam(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  await prisma.team.delete({ where: { id: teamId } });
  if (team) {
    revalidateQuizPaths(team.quizId);
    emitUpdate(team.quizId);
  }
  return { success: true };
}

export async function disconnectTeamCaptain(teamId: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return { success: false, error: 'Team not found' };
  
  await prisma.team.update({
    where: { id: teamId },
    data: { captainName: null },
  });
  
  revalidateQuizPaths(team.quizId);
  emitUpdate(team.quizId);
  return { success: true };
}

export async function deleteDomain(domainId: string) {
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  await prisma.domain.delete({ where: { id: domainId } });
  if (domain) {
    revalidateQuizPaths(domain.quizId);
    emitUpdate(domain.quizId);
  }
  return { success: true };
}

export async function deleteQuestion(questionId: string) {
  const question = await prisma.question.findUnique({ 
    where: { id: questionId },
    include: { domain: true }
  });
  await prisma.question.delete({ where: { id: questionId } });
  if (question) {
    revalidateQuizPaths(question.domain.quizId);
    emitUpdate(question.domain.quizId);
  }
  return { success: true };
}

export async function deleteBuzzerQuestion(questionId: string) {
  const question = await prisma.buzzerQuestion.findUnique({ where: { id: questionId } });
  await prisma.buzzerQuestion.delete({ where: { id: questionId } });
  if (question) {
    revalidateQuizPaths(question.quizId);
    emitUpdate(question.quizId);
  }
  return { success: true };
}

export async function updateTeam(teamId: string, name: string) {
  const team = await prisma.team.update({
    where: { id: teamId },
    data: { name },
  });
  revalidateQuizPaths(team.quizId);
  emitUpdate(team.quizId);
  return { success: true };
}

export async function updateDomain(domainId: string, name: string) {
  const domain = await prisma.domain.update({
    where: { id: domainId },
    data: { name },
  });
  revalidateQuizPaths(domain.quizId);
  emitUpdate(domain.quizId);
  return { success: true };
}

export async function updateQuestion(
  questionId: string,
  text: string,
  answer: string,
  options: string[],
  optionsDefault: boolean = false
) {
  const question = await prisma.question.update({
    where: { id: questionId },
    data: { text, answer, options, optionsDefault },
    include: { domain: true },
  });
  revalidateQuizPaths(question.domain.quizId);
  emitUpdate(question.domain.quizId);
  return { success: true };
}

export async function updateBuzzerQuestion(
  questionId: string,
  text: string,
  answer: string,
  options: string[]
) {
  const question = await prisma.buzzerQuestion.update({
    where: { id: questionId },
    data: { text, answer, options },
  });
  revalidateQuizPaths(question.quizId);
  emitUpdate(question.quizId);
  return { success: true };
}

// Game Actions
export async function startDomainRound(quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { teams: { orderBy: [{ sequence: 'asc' }, { id: 'asc' }] }, domains: true },
  });
  const firstTeamId = quiz?.teams[0]?.id || null;
  
  await prisma.quiz.update({
    where: { id: quizId },
    data: { 
      status: 'active', 
      round: 'domain', 
      phase: 'selecting_domain', 
      currentTeamId: firstTeamId,
      currentQuestionId: null,
      selectedDomainId: null,
      timerEndsAt: null,
      questionsInDomain: 0,
      totalDomainRounds: 0,
      completedDomainRounds: 0,
      usedDomains: [],
      lastDomainAnswer: { allAnswers: [] }
    },
  });
  revalidateQuizPaths(quizId);
  emitUpdate(quizId);
  return { success: true };
}

export async function startBuzzerRound(quizId: string) {
  const firstQuestion = await prisma.buzzerQuestion.findFirst({
    where: { quizId, isAnswered: false },
    orderBy: { number: 'asc' },
  });
  
  await prisma.quiz.update({
    where: { id: quizId },
    data: { 
      status: 'active',
      round: 'buzzer', 
      phase: 'buzzing',
      currentQuestionId: firstQuestion?.id,
      buzzSequence: [],
      currentTeamId: null,
      timerEndsAt: firstQuestion ? new Date(Date.now() + 10000) : null,
      pendingBuzzerAnswers: {},
      buzzTimers: {},
      lastRoundResults: {}
    },
  });
  revalidateQuizPaths(quizId);
  // Team path revalidated by revalidateQuizPaths
  emitUpdate(quizId);
  return { success: true };
}

export async function pauseQuiz(quizId: string) {
  await prisma.quiz.update({
    where: { id: quizId },
    data: { status: 'paused', timerEndsAt: null },
  });
  revalidateQuizPaths(quizId);
  // Team path revalidated by revalidateQuizPaths
  emitUpdate(quizId);
  return { success: true };
}

export async function resumeQuiz(quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  let timerEndsAt = null;
  
  if (quiz?.round === 'domain' && (quiz.phase === 'answering' || quiz.phase === 'answering_with_options')) {
    timerEndsAt = new Date(Date.now() + 120000); // 2 minutes for domain round
  } else if (quiz?.round === 'buzzer' && quiz.phase === 'answering') {
    timerEndsAt = new Date(Date.now() + 15000);
  }
  // showing_answer and showing_result phases don't have timers - controlled manually
  
  await prisma.quiz.update({
    where: { id: quizId },
    data: { status: 'active', timerEndsAt },
  });
  revalidateQuizPaths(quizId);
  // Team path revalidated by revalidateQuizPaths
  emitUpdate(quizId);
  return { success: true };
}

export async function pauseBuzzerRound(quizId: string) {
  await prisma.quiz.update({
    where: { id: quizId },
    data: { status: 'paused', timerEndsAt: null },
  });
  revalidateQuizPaths(quizId);
  // Team path revalidated by revalidateQuizPaths
  emitUpdate(quizId);
  return { success: true };
}

export async function resumeBuzzerRound(quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  let timerEndsAt = null;
  
  if (quiz?.phase === 'answering') {
    const buzzIndex = quiz.buzzSequence.indexOf(quiz.currentTeamId!);
    const isFirstBuzzer = buzzIndex === 0;
    timerEndsAt = new Date(Date.now() + 15000);
  }
  // showing_answer phase doesn't have timer - controlled manually
  
  await prisma.quiz.update({
    where: { id: quizId },
    data: { status: 'active', timerEndsAt },
  });
  revalidateQuizPaths(quizId);
  // Team path revalidated by revalidateQuizPaths
  emitUpdate(quizId);
  return { success: true };
}

export async function handleBuzzTimerExpiry(quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.round !== 'buzzer') return { success: false };
  
  // If in buzzing phase and no one buzzed, show answer
  if (quiz.phase === 'buzzing' && quiz.buzzSequence.length === 0) {
    await prisma.buzzerQuestion.update({ where: { id: quiz.currentQuestionId! }, data: { isAnswered: true } });
    
    const nextQuestion = await prisma.buzzerQuestion.findFirst({
      where: { quizId, isAnswered: false },
      orderBy: { number: 'asc' },
    });
    
    await prisma.quiz.update({
      where: { id: quizId },
      data: { 
        phase: nextQuestion ? 'showing_answer' : 'completed',
        currentQuestionId: quiz.currentQuestionId,
        buzzSequence: [],
        currentTeamId: null,
        timerEndsAt: null,
        pendingBuzzerAnswers: {},
        buzzTimers: {},
        lastRoundResults: {}
      },
    });
    
    revalidateQuizPaths(quizId);
    // Team path revalidated by revalidateQuizPaths
    emitUpdate(quizId);
    return { success: true };
  }
  
  // If someone buzzed, process their answers
  if (quiz.buzzSequence.length > 0) {
    return processBuzzerAnswers(quizId);
  }
  
  return { success: false };
}

export async function buzz(quizId: string, teamId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || (quiz.phase !== 'buzzing' && quiz.phase !== 'answering')) return { success: false };
  if (quiz.buzzSequence.includes(teamId)) return { success: false };
  
  const buzzSequence = [...quiz.buzzSequence, teamId];
  const isFirstBuzz = buzzSequence.length === 1;
  
  // Set 20-second timer for this team
  const buzzTimers = (quiz.buzzTimers as any) || {};
  buzzTimers[teamId] = Date.now() + 15000;
  
  await prisma.quiz.update({
    where: { id: quizId },
    data: { 
      buzzSequence,
      buzzTimers,
      phase: isFirstBuzz ? 'answering' : quiz.phase
    },
  });
  
  revalidateQuizPaths(quizId);
  // Team path revalidated by revalidateQuizPaths
  emitUpdate(quizId);
  return { success: true };
}

export async function submitBuzzerAnswer(
  quizId: string,
  teamId: string,
  questionId: string,
  answer: string
) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  const question = await prisma.buzzerQuestion.findUnique({ where: { id: questionId } });
  if (!question || !quiz || !quiz.buzzSequence.includes(teamId)) return { success: false };

  // Check if team already submitted
  const pendingAnswers = (quiz.pendingBuzzerAnswers as any) || {};
  if (pendingAnswers[teamId]) return { success: false, error: 'Already submitted' };

  // Don't auto-evaluate - store answer for manual evaluation
  const buzzIndex = quiz.buzzSequence.indexOf(teamId);
  const isFirstBuzzer = buzzIndex === 0;
  
  // Queue the answer for manual evaluation
  pendingAnswers[teamId] = { 
    answer, 
    isCorrect: null, // Will be set by host
    points: null, // Will be calculated by host
    buzzIndex,
    isFirstBuzzer,
    needsEvaluation: true
  };
  
  await prisma.quiz.update({
    where: { id: quizId },
    data: { pendingBuzzerAnswers: pendingAnswers }
  });

  revalidateQuizPaths(quizId);
  // Team path revalidated by revalidateQuizPaths
  emitUpdate(quizId);
  return { success: true, queued: true };
}

export async function processBuzzerAnswers(quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || !quiz.currentQuestionId) return { success: false };
  
  const pendingAnswers = (quiz.pendingBuzzerAnswers as any) || {};
  const question = await prisma.buzzerQuestion.findUnique({ where: { id: quiz.currentQuestionId } });
  if (!question) return { success: false };
  
  // Check if any answers need evaluation
  const needsEvaluation = Object.values(pendingAnswers).some((a: any) => a.needsEvaluation);
  
  if (needsEvaluation) {
    // Go to awaiting_evaluation phase for host to review
    await prisma.quiz.update({
      where: { id: quizId },
      data: { 
        phase: 'awaiting_evaluation',
        timerEndsAt: null
      }
    });
    
    revalidateQuizPaths(quizId);
    emitUpdate(quizId);
    return { success: true, needsEvaluation: true };
  }
  
  // If no evaluation needed (shouldn't happen with new logic), process normally
  const results: any = {};
  
  for (let i = 0; i < quiz.buzzSequence.length; i++) {
    const teamId = quiz.buzzSequence[i];
    const teamAnswer = pendingAnswers[teamId];
    
    if (teamAnswer) {
      results[teamId] = teamAnswer;
      if (teamAnswer.points) {
        await prisma.team.update({ 
          where: { id: teamId }, 
          data: { score: { increment: teamAnswer.points } } 
        });
      }
    } else {
      // Team didn't answer - timeout penalty
      const points = -2;
      results[teamId] = { answer: '', isCorrect: false, points, timeout: true };
      await prisma.team.update({ 
        where: { id: teamId }, 
        data: { score: { increment: points } } 
      });
    }
  }
  
  // Mark question as answered
  await prisma.buzzerQuestion.update({ where: { id: quiz.currentQuestionId }, data: { isAnswered: true } });
  
  const nextQuestion = await prisma.buzzerQuestion.findFirst({
    where: { quizId, isAnswered: false },
    orderBy: { number: 'asc' },
  });
  
  await prisma.quiz.update({
    where: { id: quizId },
    data: { 
      phase: nextQuestion ? 'showing_answer' : 'completed',
      currentQuestionId: quiz.currentQuestionId,
      buzzSequence: [],
      currentTeamId: null,
      timerEndsAt: null,
      lastRoundResults: results,
      pendingBuzzerAnswers: {},
      buzzTimers: {}
    },
  });

  revalidateQuizPaths(quizId);
  // Team path revalidated by revalidateQuizPaths
  emitUpdate(quizId);
  return { success: true };
}

export async function submitAnswer(
  quizId: string,
  teamId: string,
  questionId: string,
  answer: string,
  usedOptions: boolean
) {
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return { success: false, error: 'Question not found' };

  const isCorrect = answer.toLowerCase().trim() === question.answer.toLowerCase().trim();
  let points = 0;

  if (isCorrect) {
    points = usedOptions ? 5 : 10;
    await prisma.question.update({
      where: { id: questionId },
      data: { isAnswered: true },
    });
  }

  await prisma.team.update({
    where: { id: teamId },
    data: { score: { increment: points } },
  });

  // Move to next team
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { teams: true },
  });
  const currentIndex = quiz?.teams.findIndex(t => t.id === teamId) ?? -1;
  const nextIndex = (currentIndex + 1) % (quiz?.teams.length ?? 1);
  const nextTeamId = quiz?.teams[nextIndex]?.id || null;

  await prisma.quiz.update({
    where: { id: quizId },
    data: { currentTeamId: nextTeamId },
  });

  revalidateQuizPaths(quizId);
  // Team path revalidated by revalidateQuizPaths
  emitUpdate(quizId);
  return { success: true, isCorrect, points };
}

export async function updateScore(teamId: string, points: number) {
  await prisma.team.update({
    where: { id: teamId },
    data: { score: { increment: points } },
  });
  revalidatePath(`/quiz/*`);
  return { success: true };
}

// NEW FLOW: Team selects BOTH domain and question in one turn
export async function selectDomainAndQuestion(quizId: string, domainId: string, questionId: string, teamId: string) {
  const quiz = await prisma.quiz.findUnique({ 
    where: { id: quizId }, 
    include: { teams: { orderBy: [{ sequence: 'asc' }, { id: 'asc' }] } } 
  });
  
  if (!quiz) return { success: false, error: 'Quiz not found' };
  if (quiz.currentTeamId !== teamId) return { success: false, error: 'Not your turn' };
  if (quiz.phase !== 'selecting') return { success: false, error: 'Not in selecting phase' };
  
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question) return { success: false, error: 'Question not found' };
  if (question.isAnswered) return { success: false, error: 'Question already answered' };
  if (question.domainId !== domainId) return { success: false, error: 'Question does not belong to domain' };
  
  const timerEndsAt = new Date(Date.now() + 120000); // 2 minutes for domain round
  const phase = question.optionsDefault ? 'answering_with_options' : 'answering';
  
  await prisma.quiz.update({
    where: { id: quizId },
    data: { 
      selectedDomainId: domainId,
      currentQuestionId: questionId, 
      phase, 
      timerEndsAt, 
      lastDomainAnswer: { allAnswers: [] }
    },
  });
  
  await prisma.question.update({
    where: { id: questionId },
    data: { selectedBy: teamId, attemptedBy: { push: teamId }, optionsViewed: question.optionsDefault || false },
  });
  
  revalidateQuizPaths(quizId);
  emitUpdate(quizId);
  return { success: true };
}

// NEW FLOW: Team selects domain first, then question
export async function selectDomain(quizId: string, domainId: string) {
  const quiz = await prisma.quiz.findUnique({ 
    where: { id: quizId }, 
    include: { teams: { orderBy: [{ sequence: 'asc' }, { id: 'asc' }] }, domains: { include: { questions: true } } } 
  });
  
  if (!quiz) return { success: false, error: 'Quiz not found' };
  
  // If domainId is empty string, go back to domain selection
  if (!domainId || domainId === '') {
    await prisma.quiz.update({
      where: { id: quizId },
      data: { 
        selectedDomainId: null,
        phase: 'selecting_domain',
        timerEndsAt: null
      },
    });
    revalidateQuizPaths(quizId);
    emitUpdate(quizId);
    return { success: true };
  }
  
  // Check if domain has unanswered questions
  const domain = quiz.domains.find(d => d.id === domainId);
  const hasUnanswered = domain?.questions.some(q => !q.isAnswered);
  
  if (!hasUnanswered) return { success: false, error: 'No unanswered questions in this domain' };
  
  // Transition to question selection phase
  await prisma.quiz.update({
    where: { id: quizId },
    data: { 
      selectedDomainId: domainId, 
      phase: 'selecting_question',
      timerEndsAt: null
    },
  });
  
  revalidateQuizPaths(quizId);
  emitUpdate(quizId);
  return { success: true };
}

// Team selects question after domain is selected
export async function selectQuestion(quizId: string, questionId: string, teamId: string) {
  const quiz = await prisma.quiz.findUnique({ 
    where: { id: quizId }, 
    include: { teams: { orderBy: [{ sequence: 'asc' }, { id: 'asc' }] } } 
  });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  
  if (!quiz || !question) return { success: false, error: 'Not found' };
  if (quiz.phase !== 'selecting_question') return { success: false, error: 'Select a domain first' };
  if (quiz.currentTeamId !== teamId) return { success: false, error: 'Not your turn' };
  if (question.isAnswered) return { success: false, error: 'Question already answered' };
  
  const timerEndsAt = new Date(Date.now() + 120000); // 2 minutes for domain round
  const phase = question.optionsDefault ? 'answering_with_options' : 'answering';
  
  await prisma.quiz.update({
    where: { id: quizId },
    data: { 
      currentQuestionId: questionId, 
      phase, 
      timerEndsAt, 
      currentTeamId: teamId, 
      answerTurnIndex: quiz.teams.findIndex(t => t.id === teamId),
      lastDomainAnswer: { allAnswers: [] }
    },
  });
  
  await prisma.question.update({
    where: { id: questionId },
    data: { selectedBy: teamId, attemptedBy: { push: teamId }, optionsViewed: question.optionsDefault || false },
  });
  
  revalidateQuizPaths(quizId);
  emitUpdate(quizId);
  return { success: true };
}

export async function showOptions(quizId: string, questionId: string) {
  await prisma.question.update({
    where: { id: questionId },
    data: { optionsViewed: true },
  });
  await prisma.quiz.update({
    where: { id: quizId },
    data: { phase: 'answering_with_options' },
  });
  revalidateQuizPaths(quizId);
  // Team path revalidated by revalidateQuizPaths
  emitUpdate(quizId);
  return { success: true };
}

// New flow: pass means question is skipped, move to result (next team in nextDomainQuestion)
export async function passQuestion(quizId: string, questionId: string, teamId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  
  if (!question || !quiz || question.optionsViewed || question.optionsDefault) {
    return { success: false, error: 'Cannot pass' };
  }

  // Mark question as answered (passed)
  await prisma.question.update({ 
    where: { id: questionId }, 
    data: { isAnswered: true, correctAnswer: question.answer } 
  });
  
  const answerResult = { 
    teamId, 
    answer: 'PASSED', 
    isCorrect: false, 
    points: 0, 
    withOptions: false, 
    wasTabActive: true, 
    questionText: question.text, 
    correctAnswer: question.answer, 
    questionCompleted: true,
    allAnswers: []
  };
  
  // Show result - nextDomainQuestion will rotate to next team
  await prisma.quiz.update({
    where: { id: quizId },
    data: { 
      phase: 'showing_result', 
      timerEndsAt: null, 
      lastDomainAnswer: answerResult 
    }
  });
  
  revalidateQuizPaths(quizId);
  emitUpdate(quizId);
  return { success: true };
}

export async function handleTimerExpiry(quizId: string) {
  const quiz = await prisma.quiz.findUnique({ 
    where: { id: quizId }, 
    include: { teams: { orderBy: [{ sequence: 'asc' }, { id: 'asc' }] } } 
  });
  if (!quiz || (quiz.phase !== 'answering' && quiz.phase !== 'answering_with_options')) return { success: false };
  
  const question = await prisma.question.findUnique({ 
    where: { id: quiz.currentQuestionId! } 
  });
  if (!question || !quiz.currentTeamId) return { success: false };
  
  // If answering without options, treat timeout as a pass
  if (quiz.phase === 'answering' && !question.optionsViewed && !question.optionsDefault) {
    return passQuestion(quizId, quiz.currentQuestionId!, quiz.currentTeamId);
  }
  
  // If answering with options (or optionsDefault), treat timeout as submitting empty answer
  // This goes to awaiting_evaluation for the host to handle
  return submitDomainAnswer(quizId, quiz.currentTeamId, quiz.currentQuestionId!, '', question.optionsViewed || question.optionsDefault, true);
}

export async function submitDomainAnswer(
  quizId: string,
  teamId: string,
  questionId: string,
  answer: string,
  withOptions: boolean,
  wasTabActive: boolean = true
) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { teams: { orderBy: [{ sequence: 'asc' }, { id: 'asc' }] } } });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  if (!question || !quiz) return { success: false, error: 'Not found' };

  // Prevent duplicate submissions - check if question is already answered or if it's not the team's turn
  if (question.isAnswered) return { success: false, error: 'Question already answered' };
  if (quiz.currentTeamId !== teamId) return { success: false, error: 'Not your turn' };
  if (quiz.phase !== 'answering' && quiz.phase !== 'answering_with_options') return { success: false, error: 'Not in answering phase' };

  const actuallyCorrect = answer.toLowerCase().trim() === question.answer.toLowerCase().trim();
  const isCorrect = wasTabActive && actuallyCorrect;
  
  // ALWAYS require manual evaluation by host
  const needsManualEvaluation = true; // Host must evaluate all answers
  
  // Store answer result with all team answers
  const existingAnswers = (quiz.lastDomainAnswer as any)?.allAnswers || [];
  const isTimeout = !answer && !wasTabActive;
  const teamAnswer = { 
    teamId, 
    teamName: quiz.teams.find(t => t.id === teamId)?.name || 'Unknown',
    answer: isTimeout ? 'TIMEOUT' : answer, 
    isCorrect, 
    points: 0, 
    withOptions, 
    wasTabActive,
    isTimeout,
    evaluated: false // Not yet evaluated by host
  };
  
  const answerResult = { 
    teamId, 
    answer, 
    isCorrect, 
    points: 0, 
    withOptions, 
    wasTabActive, 
    questionText: question.text, 
    correctAnswer: question.answer, 
    questionCompleted: false,
    needsManualEvaluation,
    allAnswers: [...existingAnswers.filter((a: any) => a.teamId !== teamId), teamAnswer] // Replace if team answered again
  };
  
  // Always go to awaiting_evaluation phase for host to evaluate
  await prisma.quiz.update({ 
    where: { id: quizId }, 
    data: { 
      phase: 'awaiting_evaluation', 
      timerEndsAt: null,
      lastDomainAnswer: answerResult 
    } 
  });
  revalidateQuizPaths(quizId);
  // Team path revalidated by revalidateQuizPaths
  emitUpdate(quizId);
  return { success: true, needsEvaluation: true };
}

export async function resetQuiz(quizId: string) {
  await prisma.team.updateMany({ where: { quizId }, data: { score: 0 } });
  await prisma.question.updateMany({
    where: { domain: { quizId } },
    data: { isAnswered: false, passedFrom: null, attemptedBy: [], selectedBy: null, correctAnswer: null, optionsViewed: false },
  });
  await prisma.buzzerQuestion.updateMany({
    where: { quizId },
    data: { isAnswered: false, passedFrom: null },
  });
  await prisma.quiz.update({
    where: { id: quizId },
    data: { 
      status: 'setup', 
      round: 'not_started', 
      phase: 'waiting', 
      currentTeamId: null,
      currentQuestionId: null,
      selectedDomainId: null,
      timerEndsAt: null,
      buzzSequence: [],
      domainSelectingTeam: 0,
      questionsInDomain: 0,
      usedDomains: [],
      totalDomainRounds: 0,
      completedDomainRounds: 0,
      domainIndex: 0,
      questionSelectorIndex: 0,
      answerTurnIndex: 0,
      pendingBuzzerAnswers: {},
      buzzTimers: {},
      lastRoundResults: {},
      lastDomainAnswer: {}
    },
  });
  revalidateQuizPaths(quizId);
  // Team path revalidated by revalidateQuizPaths
  emitUpdate(quizId);
  return { success: true };
}
