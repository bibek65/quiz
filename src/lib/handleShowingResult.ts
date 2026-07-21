'use server';

import { prisma } from './db';
import { revalidatePath } from 'next/cache';
import { emitUpdate } from './emitUpdate';

export async function handleShowingResultExpiry(quizId: string) {
  const quiz = await prisma.quiz.findUnique({ 
    where: { id: quizId }, 
    include: { teams: { orderBy: [{ sequence: 'asc' }, { id: 'asc' }] }, domains: { include: { questions: true } } } 
  });
  if (!quiz || quiz.phase !== 'showing_result') return { success: false };
  
  const teamCount = quiz.teams.length;
  const domain = await prisma.domain.findUnique({ where: { id: quiz.selectedDomainId! }, include: { questions: true } });
  const totalQuestionsForDomain = Math.floor((domain?.questions.length || 0) / teamCount) * teamCount;
  
  // Check if domain is complete
  if (quiz.questionsInDomain >= totalQuestionsForDomain) {
    const completedSelections = (quiz.completedDomainRounds || 0) + 1;
    
    if (completedSelections >= (quiz.totalDomainRounds || 0)) {
      await prisma.quiz.update({
        where: { id: quizId },
        data: { phase: 'domain_round_ended', currentTeamId: null, currentQuestionId: null, selectedDomainId: null, timerEndsAt: null, completedDomainRounds: completedSelections },
      });
    } else {
      const nextDomainIndex = (quiz.domainIndex + 1) % teamCount;
      await prisma.quiz.update({
        where: { id: quizId },
        data: { 
          currentTeamId: quiz.teams[nextDomainIndex]?.id,
          phase: 'selecting_domain',
          currentQuestionId: null,
          selectedDomainId: null,
          timerEndsAt: null,
          questionsInDomain: 0,
          domainSelectingTeam: nextDomainIndex,
          completedDomainRounds: completedSelections,
          domainIndex: nextDomainIndex,
          questionSelectorIndex: nextDomainIndex,
          answerTurnIndex: nextDomainIndex
        },
      });
    }
  } else {
    // Continue in same domain - selector already updated, just change phase
    await prisma.quiz.update({
      where: { id: quizId },
      data: { 
        currentTeamId: quiz.teams[quiz.questionSelectorIndex]?.id,
        phase: 'selecting_question',
        currentQuestionId: null,
        timerEndsAt: null
      },
    });
  }
  
  revalidatePath(`/quiz/${quizId}/host`);
  revalidatePath(`/quiz/${quizId}/team`);
  emitUpdate(quizId);
  return { success: true };
}
