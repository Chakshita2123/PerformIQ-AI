# PerformIQ: Phase prompts (copy one at a time into Claude Code)

After each phase: read the explanation, test it yourself, run `git commit`, then send the next prompt.

## Phase 1
Start Phase 1 from CLAUDE.md. Create the backend project from scratch: Express server, MongoDB
connection, all Mongoose models, JWT authentication (register, login, me) with roles, auth and
error-handling middleware, and full Student CRUD with pagination, search, filter and sort.
Show me a plan first, then build it. Run the server and test the endpoints with curl. Guide me
step by step through setting up MongoDB Atlas and the .env file. Create README.md, TESTS.md and
VIVA_NOTES.md.

## Phase 2
Start Phase 2. Add assessments, the risk-level and recommendation utilities, interventions, the
improvement-tracking endpoint (/api/interventions/:id/impact) and the dashboard summary using a
MongoDB aggregation pipeline. For now, the predict endpoint can accept a predictedScore manually
until the ML service is ready. Explain the aggregation pipeline to me line by line. Update the
three study files.

## Phase 3
Start Phase 3. Build the FastAPI ml-service that loads performiq_model.joblib and exposes
POST /predict. First check my notebook and the CSV header to get the exact input columns.
Pin the scikit-learn version in requirements.txt to match my environment (version: <PASTE YOUR
scikit-learn VERSION HERE>). Then connect the Express POST /api/students/:id/predict endpoint to
it: send the student's fields, get the score, clip to 0-100, compute risk and recommendations, and
save a Prediction. Handle the case where the ML service is down with a clear error. Update the
three study files.

## Phase 4
Start Phase 4. Write a seed script in backend/seed/ that:
1. creates 1 admin and 3 teachers,
2. imports 5000 random students from data/final_student_exam_performance.csv and assigns them
   across the teachers,
3. generates 4 to 6 simulated past assessments per student around their previous_exam_score
   (add noise, spread dates over the past year, mark isSimulated: true),
4. creates simulated interventions for some at-risk students (isSimulated: true),
5. imports the OULAD CSV files into MongoDB.
Make the script safe to re-run. Print a summary at the end.

## Phase 5
Start Phase 5: the React frontend in frontend/ (Vite, Tailwind, Recharts, React Router).
Pages: Login, Dashboard (risk pie chart, summary cards, interventions by status), Students list
(search, filter, pagination), Student profile (assessment trend line chart, predicted score, risk
badge, recommendations, intervention history), Predict page, Interventions page (create, update
status, show impact), Early-warning page (OULAD cutoff chart and engagement chart).
Use protected routes with the JWT. Keep the components simple and clean, make it responsive, and
handle loading and error states. Explain the React concepts I need for my viva in VIVA_NOTES.md.

## Phase 6
Start Phase 6. Write a professional README (what it does, architecture diagram, screenshots
placeholders, tech stack, setup steps, API list, which data is real vs simulated, ML results:
Module 1 R2 0.66 / MAE 7.3; Module 3 ROC-AUC 0.84 at day 60). Export a Postman collection into
docs/. Then help me deploy: MongoDB Atlas, backend and ml-service on Render, frontend on Vercel.