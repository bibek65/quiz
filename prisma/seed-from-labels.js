/**
 * Seed script that accepts JSON with option labels (A, B, C, D) as correct answer
 * and converts them to the actual option text.
 * 
 * Input JSON format:
 * {
 *   "domains": [
 *     {
 *       "name": "Domain Name",
 *       "questions": [
 *         {
 *           "question": "Question text here?",
 *           "options": ["Option A", "Option B", "Option C", "Option D"],
 *           "correctAnswer": "A"  // or "B", "C", "D" - the letter, not the text
 *         }
 *       ]
 *     }
 *   ],
 *   "buzzerQuestions": [
 *     {
 *       "question": "Buzzer question text?",
 *       "answer": "Answer text"
 *     }
 *   ]
 * }
 * 
 * Usage:
 * node prisma/seed-from-labels.js < quiz-data.json
 * or
 * node prisma/seed-from-labels.js quiz-data.json
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function getOptionTextFromLabel(options, label) {
  const labelIndex = label.toUpperCase().charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
  if (labelIndex >= 0 && labelIndex < options.length) {
    return options[labelIndex];
  }
  throw new Error(`Invalid option label: ${label}. Must be A, B, C, or D`);
}

async function main() {
  // Read input JSON from stdin or file argument
  let inputData;
  
  const fs = require('fs');
  const readline = require('readline');
  
  const args = process.argv.slice(2);
  
  if (args.length > 0) {
    // Read from file
    const filePath = args[0];
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    inputData = JSON.parse(fileContent);
  } else {
    // Read from stdin
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
    
    let jsonString = '';
    for await (const line of rl) {
      jsonString += line;
    }
    inputData = JSON.parse(jsonString);
  }
  
  const { domains } = inputData;
  
  if (!domains || !Array.isArray(domains)) {
    throw new Error('Input JSON must have a "domains" array');
  }
  
  console.log(`Creating quiz...`);
  
  // Create the quiz
  const quiz = await prisma.quiz.create({
    data: {
      status: 'setup',
      round: 'domain',
      phase: 'not_started',
      completedDomainRounds: 0,
      usedDomains: [],
      lastDomainAnswer: { allAnswers: [] },
      lastRoundResults: {},
      buzzTimers: {},
    }
  });
  
  console.log(`Created quiz with ID: ${quiz.id}`);
  
  // Create domains and questions
  for (const domainData of domains) {
    const { name, questions } = domainData;
    
    if (!name || !questions || !Array.isArray(questions)) {
      console.warn(`Skipping invalid domain: ${JSON.stringify(domainData)}`);
      continue;
    }
    
    const domain = await prisma.domain.create({
      data: {
        name,
        quizId: quiz.id,
      }
    });
    
    console.log(`Created domain: ${name}`);
    
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      const correctAnswerText = getOptionTextFromLabel(q.options, q.correctAnswer);
      
      await prisma.question.create({
        data: {
          domainId: domain.id,
          number: i + 1,
          text: q.question,
          answer: correctAnswerText,
          options: q.options,
          optionsDefault: true, // All questions have options by default
          isAnswered: false,
        }
      });
      
      console.log(`  - Question ${i + 1}: ${q.question.substring(0, 50)}...`);
      console.log(`    Correct: ${q.correctAnswer}) ${correctAnswerText}`);
    }
  }
  
  // Create default teams
  const defaultTeams = ['Team 1', 'Team 2', 'Team 3', 'Team 4', 'Team 5', 'Team 6'];
  for (let i = 0; i < defaultTeams.length; i++) {
    await prisma.team.create({
      data: {
        name: defaultTeams[i],
        quizId: quiz.id,
        sequence: i + 1,
        score: 0,
      }
    });
  }
  
  console.log(`Created ${defaultTeams.length} default teams`);
  
  // Create buzzer questions
  const buzzerQuestions = inputData.buzzerQuestions || [];
  if (buzzerQuestions.length > 0) {
    for (let i = 0; i < buzzerQuestions.length; i++) {
      const bq = buzzerQuestions[i];
      await prisma.buzzerQuestion.create({
        data: {
          quizId: quiz.id,
          number: i + 1,
          text: bq.question,
          answer: bq.answer,
          options: [],
          isAnswered: false,
        }
      });
      console.log(`  - Buzzer ${i + 1}: ${bq.question.substring(0, 50)}...`);
      console.log(`    Answer: ${bq.answer}`);
    }
  }
  
  console.log(`\nQuiz created successfully!`);
  console.log(`Quiz ID: ${quiz.id}`);
  console.log(`\nTo manage the quiz, visit: /quiz/${quiz.id}/host`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error('Error seeding database:', e);
    await prisma.$disconnect();
    process.exit(1);
  });