export async function emitUpdate(quizId: string) {
  try {
    const socketEmitUrl = process.env.SOCKET_EMIT_URL || 'http://localhost:4000/emit';
    await fetch(socketEmitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId, event: 'quiz-update', data: {} }),
    });
  } catch (error) {
    console.error('Failed to emit update:', error);
  }
}
