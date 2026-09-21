# Quiz Platform — Runbook

Simple step-by-step guide: get the app running, load your quiz questions, share it with people, and how everyone uses it.

---

## Part 1 — Getting the App Running (do this once)

### Step 1: Create the settings file

In the project folder, create a file named `.env` with this content:

```env
DATABASE_URL="postgresql://quizuser:quizpass@postgres:5432/quizdb?schema=public"
SESSION_SECRET="pick-any-long-random-sentence-here"
HOST_PASSWORD="choose-a-password-for-the-host-login"
ALLOWED_ORIGIN="*"
NEXT_PUBLIC_SOCKET_PATH="/socket.io"
```

- `DATABASE_URL` — the database password (`quizpass` by default). Only change this if you've changed the database password yourself.
- `HOST_PASSWORD` — this is the password **you**, the organizer, will use to log into `/host`. Set it to something only you know.
- `SESSION_SECRET` — just any long random text, doesn't need to be memorable.

### Step 2: Start the app

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

This starts everything (app, database, real-time updates). First run takes a few minutes; after that it's fast.

### Step 3: Set up the database tables (run migrations)

```bash
docker compose -f docker-compose.dev.yml --profile migrate run --rm migrate
```

Run this once after Step 2 completes. You'll only need to repeat it if the quiz schema itself changes later.

### Step 4: Prepare your quiz questions (seed file)

Your questions go in one JSON file, shaped like this:

```json
{
  "domains": [
    {
      "name": "Category name (e.g. AWS Basics)",
      "questions": [
        {
          "question": "Your question text here?",
          "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
          "correctAnswer": "B"
        }
      ]
    }
  ],
  "buzzerQuestions": [
    { "question": "A rapid-fire question", "answer": "The answer" }
  ]
}
```

- You can have as many categories ("domains") and questions as you like.
- `correctAnswer` is just the letter (A, B, C, or D) of the right option.
- `buzzerQuestions` are optional — a separate pool of quickfire questions with a typed answer instead of multiple choice.

A ready-to-use example is already in the project at `prisma/examples/quiz_seed.json` — open it to see a full real example, or copy it and replace the content with your own questions.

### Step 5: Load your questions into the app (seed it)

```bash
docker compose -f docker-compose.dev.yml exec -T app node prisma/seed-from-labels.js prisma/examples/quiz_seed.json
```

Replace the file path at the end with your own file if you made one. This prints a **Quiz ID** at the end — save it, you'll need it in Part 2.

Running this again with a different file creates a **new, separate quiz** — it won't overwrite or mix with a previous one.

---

## Part 2 — Making It Available to People (Cloudflare Tunnel)

By default, the app only works on your own computer. To let other people — teammates, other players — reach it from their own devices, you need to open a tunnel.

### Step 1: Download the tunnel tool (one-time)

```bash
curl -sL -o cloudflared https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared
```

### Step 2: Start the tunnel

Make sure the app is already running (Part 1), then run:

```bash
./cloudflared tunnel --url http://localhost:8080
```

### Step 3: Get your link

It will print something like:

```
https://some-random-words.trycloudflare.com
```

**This is the link you share with everyone** — host and participants both use it. No account or sign-up needed.

Keep the terminal running this command open for the whole event — closing it kills the link. If it stops and you restart it, you'll get a **new** link and need to re-share it.

> Tip: if everyone is on the same Wi-Fi/office network, you don't need the tunnel at all — just share `http://<your-computer's-IP-address>:8080` instead.

---

## Part 3 — For the Host / Organizer

1. Open the shared link and go to `/host` (e.g. `https://your-link.trycloudflare.com/host`).
2. Log in with the `HOST_PASSWORD` you set in Part 1.
3. You'll see a list of quizzes. Find the one matching the Quiz ID you got when you seeded your questions, and click **Control**.
   - (If you don't see it yet or want to start fresh, click **+ New Session**, then add teams/questions manually from the **Setup** page instead of seeding a file.)
4. Share the same link with participants, and tell them the **Quiz ID** so they can join.
5. When everyone's joined, use the buttons on the Control page to run the game:
   - **Start Domain Round** — begins the multiple-choice round.
   - **Start Buzzer Round** — begins the rapid-fire buzz-in round.
   - **Pause / Resume Quiz** — freeze/unfreeze if you need a break.
   - **Reset Quiz** — wipes scores and starts over (be careful, this can't be undone).

   You can click either "Start" button any time — you don't need to explicitly stop one round before starting the other, it switches immediately. Just make sure you've finished evaluating the current question first, since switching rounds abandons anything still in progress.
6. To display live scores on a projector or shared screen, open `/quiz/<Quiz ID>/spectator` on that screen — it updates automatically, no login needed.

---

## Part 4 — For Participants (How to Join)

1. Open the link the host shared with you.
2. Go to `/team`.
3. Enter the **Quiz ID** the host gave you.
4. Pick your team from the list, and type your name.
5. That's it — you're in. Questions, timers, and scores will update automatically on your screen as the host runs the quiz.

### Playing the Domain Round

This round goes **team by team, in turns** — not everyone answers at once.

1. When it's your team's turn, your screen will let you pick a **category** (domain), then pick a specific **question** from that category.
2. Once picked, the question and its 4 options appear for everyone to see, and you get **2 minutes** on the clock.
3. Type/select your answer and submit before time runs out.
4. The host then checks your answer and awards points — you'll see the result on screen.
5. If it's not your turn, just sit tight and watch — your turn will come around.

### Playing the Buzzer Round

This round is fast and open to everyone at once.

1. A question pops up on every team's screen at the same time.
2. As soon as you know the answer, hit **Buzz** — whoever buzzes first gets to answer first.
3. Once you've buzzed in, you get about **15 seconds** to type your answer.
4. The host reviews and confirms who was correct and awards points before moving to the next question.

---

## Troubleshooting

| Problem | What to do |
|---|---|
| Page loads but nothing updates live (scores, questions) | Make sure everyone is using the shared link ending in the right port/tunnel — don't mix `:3000` and the tunnel link |
| Spectator screen looks frozen/stale (projector, shared screen) | Just refresh/reload the page. It only updates when it gets a "something changed" signal — if that connection drops for any reason (Wi-Fi blip, laptop went to sleep, tunnel restarted) it won't auto-recover, so a manual reload fixes it |
| "Invalid password" on `/host` | Double check `HOST_PASSWORD` in your `.env` file |
| Tunnel link stopped working | The `cloudflared` command was closed or crashed — run it again and share the new link |
| Can't join from another device on the same WiFi | Check your computer's firewall allows the port |
