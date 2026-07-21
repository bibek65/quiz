'use server';

import { prisma } from './db';
import { revalidatePath } from 'next/cache';
import { emitUpdate } from './emitUpdate';

async function revalidateQuizPaths(quizId: string) {
  revalidatePath(`/quiz/${quizId}/host`);
  revalidatePath(`/quiz/${quizId}/host/setup`);
  revalidatePath(`/quiz/${quizId}/host/control`);
  revalidatePath(`/quiz/${quizId}/team`);
}

// Move to next question in buzzer round
export async function nextBuzzerQuestion(quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.round !== 'buzzer' || quiz.phase !== 'showing_answer') {
    return { success: false, error: 'Not in showing_answer phase' };
  }
  
  const nextQuestion = await prisma.buzzerQuestion.findFirst({
    where: { quizId, isAnswered: false },
    orderBy: { number: 'asc' },
  });
  
  await prisma.quiz.update({
    where: { id: quizId },
    data: { 
      phase: nextQuestion ? 'buzzing' : 'completed',
      currentQuestionId: nextQuestion?.id || null,
      buzzSequence: [],
      currentTeamId: null,
      timerEndsAt: nextQuestion ? new Date(Date.now() + 15000) : null,
      pendingBuzzerAnswers: {},
      buzzTimers: {},
      lastRoundResults: {}
    },
  });
  
  revalidateQuizPaths(quizId);
  emitUpdate(quizId);
  return { success: true };
}

// Move to next team (selecting phase) or end domain round
export async function nextDomainQuestion(quizId: string) {
  const quiz = await prisma.quiz.findUnique({ 
    where: { id: quizId }, 
    include: { teams: { orderBy: [{ sequence: 'asc' }, { id: 'asc' }] }, domains: { include: { questions: true } } } 
  });
  
  if (!quiz || quiz.round !== 'domain' || quiz.phase !== 'showing_result') {
    return { success: false, error: 'Not in showing_result phase' };
  }
  
  // Check if ALL questions in ALL domains are answered
  const allDomains = await prisma.domain.findMany({
    where: { quizId },
    include: { questions: true }
  });
  
  const allQuestionsAnswered = allDomains.every(domain => 
    domain.questions.every(q => q.isAnswered)
  );
  
  // End domain round if all questions completed
  if (allQuestionsAnswered) {
    await prisma.quiz.update({
      where: { id: quizId },
      data: { 
        phase: 'domain_round_ended', 
        currentTeamId: null, 
        currentQuestionId: null, 
        selectedDomainId: null, 
        timerEndsAt: null
      },
    });
  } else {
    // Rotate to next team - go back to selecting domain
    const teamCount = quiz.teams.length;
    const currentIndex = quiz.teams.findIndex(t => t.id === quiz.currentTeamId);
    const nextIndex = (currentIndex + 1) % teamCount;
    const nextTeamId = quiz.teams[nextIndex]?.id || null;
    
    await prisma.quiz.update({
      where: { id: quizId },
      data: { 
        currentTeamId: nextTeamId,
        phase: 'selecting_domain',
        currentQuestionId: null,
        selectedDomainId: null,
        timerEndsAt: null,
        lastDomainAnswer: { allAnswers: [] }
      },
    });
  }
  
  revalidateQuizPaths(quizId);
  emitUpdate(quizId);
  return { success: true };
}
