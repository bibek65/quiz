'use server';

import { prisma } from './db';
import { revalidatePath } from 'next/cache';
import { emitUpdate } from './emitUpdate';

export async function handleBuzzerTimerExpiry(quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || quiz.phase !== 'showing_answer') return { success: false };
  
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
  
  revalidatePath(`/quiz/${quizId}/host`);
  revalidatePath(`/quiz/${quizId}/team`);
  emitUpdate(quizId);
  return { success: true };
}
