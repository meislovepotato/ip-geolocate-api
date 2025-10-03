import bcrypt from "bcrypt";
import { pool, init } from "./db.js";
await init();

const email = "test@example.com";
const password = "password123";
const name = "Mike Jordan";

const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
if (result.rows.length === 0) {
  const hashed = await bcrypt.hash(password, 10);
  await pool.query("INSERT INTO users (name, email, password) VALUES ($1, $2, $3)", [name, email, hashed]);
  console.log("Seeded user:", email, password);
} else {
  console.log("User already exists:", email);
}
