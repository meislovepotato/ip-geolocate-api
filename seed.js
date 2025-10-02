import bcrypt from "bcrypt";
import { pool, init } from "./db.js";
await init();

const email = "test@example.com";
const password = "password123";
const name = "Mike Jordan";

const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
if (rows.length === 0) {
  const hashed = await bcrypt.hash(password, 10);
  await pool.query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [name, email, hashed]);
  console.log("Seeded user:", email, password);
} else {
  console.log("User already exists:", email);
}
