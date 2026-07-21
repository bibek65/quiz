const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Load questions from AWS DOP-C02 JSON
const data = require('../aws-dop-c02.json');
const allQuestions = data.questions;

// Filter for long questions without images and single option
const filteredQuestions = allQuestions.filter(q => 
  q.question_images && q.question_images.length === 0 && 
  q.answer_images && q.answer_images.length === 0 &&
  q.question_text && q.question_text.length > 200 &&
  q.choices && Object.keys(q.choices).length === 4 // Only single answer questions with 4 options
);

// Categorize questions into domains
const categorized = { 
  'Compute & Containers': [], 
  'CI/CD & Automation': [], 
  'Security & IAM': [] 
};

filteredQuestions.forEach(q => {
  const text = q.question_text.toLowerCase();
  
  if (text.includes('lambda') || text.includes('ec2') || text.includes('ecs') || 
      text.includes('eks') || text.includes('container') || text.includes('docker') ||
      text.includes('kubernetes') || text.includes('fargate') || text.includes('instance')) {
    categorized['Compute & Containers'].push(q);
  }
  else if (text.includes('codebuild') || text.includes('codepipeline') || 
           text.includes('cicd') || text.includes('ci/cd') || text.includes('pipeline') ||
           text.includes('code deploy') || text.includes('code commit')) {
    categorized['CI/CD & Automation'].push(q);
  }
  else if (text.includes('iam') || text.includes('security') || text.includes('policy') || 
           text.includes('role') || text.includes('permission') || text.includes('access')) {
    categorized['Security & IAM'].push(q);
  }
});

console.log('📊 Question distribution (4-option single answer only):');
Object.entries(categorized).forEach(([domain, questions]) => {
  console.log(`  ${domain}: ${questions.length} questions`);
});

async function main() {
  console.log('\n🌱 Starting AWS DOP-C02 seed...');

  // Delete existing quiz data first
  await prisma.buzzerQuestion.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.domain.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.quiz.deleteMany({});
  console.log('🗑️  Cleared existing data');

  // Create quiz
  const quiz = await prisma.quiz.create({ 
    data: {
      status: 'setup',
      round: 'not_started',
      phase: 'waiting',
    }
  });
  console.log('✅ Quiz created:', quiz.id);

  // Create teams
  const teams = await Promise.all([
    prisma.team.create({ data: { name: 'Team Alpha', quizId: quiz.id, sequence: 0 } }),
    prisma.team.create({ data: { name: 'Team Beta', quizId: quiz.id, sequence: 1 } }),
    prisma.team.create({ data: { name: 'Team Gamma', quizId: quiz.id, sequence: 2 } }),
    prisma.team.create({ data: { name: 'Team Delta', quizId: quiz.id, sequence: 3 } }),
  ]);

  console.log('✅ Teams created:', teams.length);

  // Create 3 domains with 6 questions each
  const domainNames = ['Compute & Containers', 'CI/CD & Automation', 'Security & IAM'];
  let totalQuestions = 0;

  for (const domainName of domainNames) {
    const questions = categorized[domainName];
    
    if (!questions || questions.length === 0) {
      console.log(`⚠️  No questions for "${domainName}"`);
      continue;
    }

    const domain = await prisma.domain.create({
      data: { name: domainName, quizId: quiz.id },
    });

    // Take first 6 questions
    const domainQuestions = questions.slice(0, 6);
    
    for (let i = 0; i < domainQuestions.length; i++) {
      const q = domainQuestions[i];
      
      // Extract options into array - sorted by key (A, B, C, D)
      const options = [];
      const choices = q.choices;
      if (choices) {
        const sortedKeys = Object.keys(choices).sort();
        sortedKeys.forEach(key => {
          options.push(choices[key]);
        });
      }

      // Get the correct answer TEXT (not just the letter)
      const correctLetter = q.correct_answer; // e.g., "A"
      const correctAnswerText = choices ? choices[correctLetter] : correctLetter;

      await prisma.question.create({
        data: {
          number: i + 1,
          text: q.question_text,
          answer: correctAnswerText, // Store actual answer text
          options: options,
          optionsDefault: true,
          domainId: domain.id,
        },
      });
    }
    
    totalQuestions += domainQuestions.length;
    console.log(`  ✅ ${domainName}: ${domainQuestions.length} questions`);
  }

  // Create buzzer questions - short, direct answer questions (non-MCQ)
  // Filter for shorter questions that can be answered with a specific term/name
  const buzzerCandidates = filteredQuestions
    .filter(q => {
      const text = q.question_text;
      // Look for questions asking for specific terms: "What is", "Which", "Who", "How many"
      const isDirectQuestion = /\b(what is|which|who|how many|how much|name the|identify the)\b/i.test(text);
      // Keep it short
      const isShort = text.length < 400;
      return isDirectQuestion && isShort;
    });

  // Extract the actual answer from the correct choice
  const buzzerQuestions = buzzerCandidates.slice(0, 10).map(q => {
    const correctLetter = q.correct_answer;
    const answerText = q.choices ? q.choices[correctLetter] : correctLetter;
    return {
      text: q.question_text.substring(0, 500),
      answer: answerText
    };
  });

  for (let i = 0; i < buzzerQuestions.length; i++) {
    const q = buzzerQuestions[i];
    await prisma.buzzerQuestion.create({
      data: {
        number: i + 1,
        text: q.text,
        answer: q.answer,
        options: [],
        quizId: quiz.id,
      },
    });
  }

  console.log('✅ Buzzer questions created:', buzzerQuestions.length);

  console.log('\n🎉 Seed completed successfully!');
  console.log(`\n📋 Quiz ID: ${quiz.id}`);
  console.log(`👥 Teams: ${teams.length}`);
  console.log(`📚 Domains: 3`);
  console.log(`❓ Domain Questions: ${totalQuestions} (6 per domain, 4 options each)`);
  console.log(`⚡ Buzzer Questions: ${buzzerQuestions.length} (direct answer)`);
  console.log(`\n💡 Use this Quiz ID in your environment: ${quiz.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });