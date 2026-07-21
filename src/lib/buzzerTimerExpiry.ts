'use server';

import { prisma } from './db';
import { revalidatePath } from 'next/cache';
import { emitUpdate } from './emitUpdate';

export async function handleBuzzerAnswerTimerExpiry(quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId }, include: { teams: true } });
  if (!quiz || quiz.phase !== 'answering' || quiz.round !== 'buzzer') return;
  
  const question = await prisma.buzzerQuestion.findUnique({ where: { id: quiz.currentQuestionId! } });
  if (!question) return;
  
  const teamId = quiz.currentTeamId!;
  const buzzIndex = quiz.buzzSequence.indexOf(teamId);
  const isFirstBuzzer = buzzIndex === 0;
  
  // Queue timeout penalty instead of applying directly to prevent double scoring
  const pendingAnswers = (quiz.pendingBuzzerAnswers as any) || {};
  if (!pendingAnswers[teamId]) {
    const points = isFirstBuzzer ? -10 : -5;
    pendingAnswers[teamId] = { answer: '', isCorrect: false, points, timeout: true };
  }
  
  // Pass to next in buzz sequence
  const currentIndex = quiz.buzzSequence.indexOf(teamId);
  const nextTeamId = quiz.buzzSequence[currentIndex + 1];
  
  if (nextTeamId) {
    const timerEndsAt = new Date(Date.now() + 20000);
    await prisma.quiz.update({
      where: { id: quizId },
      data: { 
        currentTeamId: nextTeamId, 
        phase: 'answering', 
        timerEndsAt,
        pendingBuzzerAnswers: pendingAnswers
      },
    });
  } else {
    // No more teams - update state and let the system process answers
    await prisma.quiz.update({
      where: { id: quizId },
      data: { 
        phase: 'processing_answers',
        pendingBuzzerAnswers: pendingAnswers,
        currentTeamId: null,
        timerEndsAt: null
      },
    });
  }
  
  revalidatePath(`/quiz/${quizId}/host`);
  revalidatePath(`/quiz/${quizId}/team`);
  emitUpdate(quizId);
}
