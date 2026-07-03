# Emergents - Ayurveda Nursing Academy

This repository is for the Emergents — Ayurveda Nursing Academy app. It's currently a minimal scaffold that holds a README and a docker-compose setup to help you get started with local development.

Status
- Repository initialized with documentation and a development docker-compose scaffold.

What to put here
- Application code (mobile frontend, backend API, or both) should go into the `app/` directory.
- Add your language-specific manifests (package.json, requirements.txt, pubspec.yaml, etc.) in `app/` so the compose build can detect and build your service.

Included files
- `docker-compose.yml` — development services: web, postgres database, and Adminer.

Quick start (local)
1. Copy the example env file and edit credentials:
   cp .env.example .env
2. Build and start the development stack:
   docker compose up --build
3. The web service is expected to run on port 8000 (adjust when you add your app). Adminer will be available at http://localhost:8080 to inspect the database.

Useful commands
- Stop and remove containers: `docker compose down`
- Recreate and rebuild: `docker compose up --build --force-recreate`
- Remove volumes (use with care): `docker compose down -v`

Next steps
- Add your application source into `app/` and include a Dockerfile explaining how to build the service.
- Add a README section with the chosen stack (e.g., Node/Express, Django, Flutter) and any environment variables required.

If you'd like, I can:
- Create a minimal example app (Node/Express or Python/FastAPI) inside `app/` and a working Dockerfile.
- Add a .env.example file with sample DB credentials.

Contact
- Repo owner: @ajayterdal1137
