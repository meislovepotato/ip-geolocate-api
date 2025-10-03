⚙️ Backend (ip-geolocate-api)
Tech Stack

Node.js + Express

PostgreSQL (hosted on Render)

dotenv → environment config

cors → cross-origin support

body-parser → request body parsing

bcrypt → password hashing

jsonwebtoken → JWT authentication

Installed Dependencies
npm install express body-parser cors dotenv bcrypt jsonwebtoken pg
npm install --save-dev nodemon

.env Example
PORT=8000
JWT_SECRET=supersecretkey

# Postgres Database (external URL from Render)
DB_HOST=dpg-d3fnieili9vc73e7pjq0-a.singapore-postgres.render.com
DB_USER=geolocate_db_user
DB_PASSWORD=Y2wEk6OiOIhMP8QV7ePLGMzEaXTuZjQE
DB_NAME=geolocate_db
DB_PORT=5432
DB_SSL=true
