# Screenshots

Place captured screenshots here and reference them from `README.md`.

## Suggested screenshots

| Filename | Content |
|---|---|
| `01-login.png` | Login page — split-screen with seeded cohort risk split (17/27/56) & OULAD ROC-AUC benchmark curve |
| `02-dashboard.png` | Dashboard — "Needs attention today" severity rail (top 5 priority students), class health proportional bar, and quiet progress charts |
| `03-students-list.png` | Student directory — paginated table with accessible high-contrast risk badges, search, and score filters |
| `04-student-profile.png` | Student profile — score gauge with 50/60 risk bands, "Why this risk" rule chips, combined assessment impact chart, and intervention timeline |
| `05-add-student.png` | Enroll student — accessible sectioned form capturing the 37 model input features |
| `06-interventions.png` | Interventions directory — status filter tabs, before/after impact evaluation modal, and simulated demo notices |
| `07-early-warning.png` | OULAD early warning — ROC-AUC benchmark by cutoff day, weekly engagement telemetry, and real schema at-risk student registry |

## How to add

1. Run the app (`npm run dev` in `frontend/`, `node server.js` in `backend/`, and `uvicorn` in `ml-service/`).
2. Take a screenshot of each corresponding page.
3. Save each screenshot to `docs/screenshots/<filename>.png`.
4. Update `README.md` to un-comment the screenshot image tags.
