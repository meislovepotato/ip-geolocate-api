import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export async function init() {
  try {
    // connect without selecting db first
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3306,
    });

    // create db if missing
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`
    );

    // switch into db
    await connection.query(`USE \`${process.env.DB_NAME}\`;`);

    // create users table if missing
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log(`✅ Database '${process.env.DB_NAME}' and tables are ready`);

    await connection.end();
  } catch (err) {
    console.error("❌ Database init failed:", err);
    process.exit(1);
  }
}

// create pool after DB is ensured
export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
});
