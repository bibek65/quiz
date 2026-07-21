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

// Evaluate domain answer manually - NEW FLOW
export async function evaluateDomainAnswer(
  quizId: string,
  teamId: string,
  questionId: string,
  evaluation: 'correct' | 'incorrect'
) {
  const quiz = await prisma.quiz.findUnique({ 
    where: { id: quizId }, 
    include: { teams: { orderBy: [{ sequence: 'asc' }, { id: 'asc' }] } } 
  });
  const question = await prisma.question.findUnique({ where: { id: questionId } });
  
  if (!quiz || !question) return { success: false, error: 'Not found' };
  
  const withOptions = question.optionsViewed || question.optionsDefault;
  
  let points = 0;
  if (evaluation === 'correct') {
    points = 10; // Always 10 points for correct
  } else {
    points = 0; // No negative marking
  }
  
  await prisma.team.update({
    where: { id: teamId },
    data: { score: { increment: points } }
  });
  
  // Mark question as answered
  await prisma.question.update({ 
    where: { id: questionId }, 
    data: { isAnswered: true, correctAnswer: question.answer } 
  });
  
  // Preserve existing allAnswers from the submitted answer
  const existingAnswers = (quiz.lastDomainAnswer as any)?.allAnswers || [];
  
  const answerResult = {
    teamId,
    answer: '',
    isCorrect: evaluation === 'correct',
    points,
    withOptions,
    wasTabActive: true,
    questionId: question.id,
    questionText: question.text,
    correctAnswer: question.answer,
    options: question.options,
    questionCompleted: true,
    evaluated: true,
    allAnswers: existingAnswers
  };
  
  // Show result - nextDomainQuestion will handle rotation
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
  return { success: true, points };
}

// Mark a buzzer answer as correct or incorrect (no points yet - just stores evaluation)
export async function evaluateBuzzerAnswer(
  quizId: string,
  teamId: string,
  evaluation: 'correct' | 'incorrect'
) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz || !quiz.currentQuestionId) return { success: false, error: 'Not found' };
  
  const pendingAnswers = (quiz.pendingBuzzerAnswers as any) || {};
  const teamAnswer = pendingAnswers[teamId] || { answer: '' };
  
  pendingAnswers[teamId] = {
    ...teamAnswer,
    evaluation,
    needsEvaluation: false,
    evaluated: true
  };
  
  await prisma.quiz.update({
    where: { id: quizId },
    data: { pendingBuzzerAnswers: pendingAnswers }
  });
  
  revalidateQuizPaths(quizId);
  emitUpdate(quizId);
  return { success: true };
}

// Process evaluations in buzz order and award points, then move to showing_answer
export async function completeEvaluation(quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) return { success: false };
  
  if (quiz.round === 'buzzer') {
    const pendingAnswers = (quiz.pendingBuzzerAnswers as any) || {};
    const results: any = {};
    
    // Walk through buzz sequence in order
    // Penalize wrong answers until we find a correct one, then stop
    for (let i = 0; i < quiz.buzzSequence.length; i++) {
      const teamId = quiz.buzzSequence[i];
      const teamAnswer = pendingAnswers[teamId];
      const isFirstBuzzer = i === 0;
      
      if (!teamAnswer || !teamAnswer.evaluated) {
        const points = -2;
        results[teamId] = { answer: '', isCorrect: false, points, timeout: true };
        await prisma.team.update({ where: { id: teamId }, data: { score: { increment: points } } });
        continue;
      }
      
      if (teamAnswer.evaluation === 'correct') {
        const points = 2;
        results[teamId] = { ...teamAnswer, isCorrect: true, points };
        await prisma.team.update({ where: { id: teamId }, data: { score: { increment: points } } });
        
        // Remaining teams: not reached, no penalty
        for (let j = i + 1; j < quiz.buzzSequence.length; j++) {
          const remainingTeamId = quiz.buzzSequence[j];
          const remainingAnswer = pendingAnswers[remainingTeamId];
          results[remainingTeamId] = { ...(remainingAnswer || { answer: '' }), isCorrect: false, points: 0, notReached: true };
        }
        break;
      } else {
        const points = -2;
        results[teamId] = { ...teamAnswer, isCorrect: false, points };
        await prisma.team.update({ where: { id: teamId }, data: { score: { increment: points } } });
      }
    }
    
    await prisma.buzzerQuestion.update({ where: { id: quiz.currentQuestionId! }, data: { isAnswered: true } });
    
    await prisma.quiz.update({
      where: { id: quizId },
      data: { 
        phase: 'showing_answer',
        timerEndsAt: null,
        lastRoundResults: { _buzzOrder: quiz.buzzSequence, ...results },
        pendingBuzzerAnswers: {},
        buzzTimers: {}
      }
    });
  }
  
  revalidateQuizPaths(quizId);
  emitUpdate(quizId);
  return { success: true };
}
