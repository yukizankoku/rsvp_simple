## How To Run
.venv\Scripts\activate
copy .env.example .env      # isi SECRET_KEY dan DATABASE_URL
createdb eo_management
flask db upgrade
flask seed-demo             # admin@example.com / password123
flask run