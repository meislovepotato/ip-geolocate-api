import dotenv from "dotenv";
dotenv.config();

const isMySQL =
  process.env.DB_TYPE === "mysql" ||
  (process.env.DB_HOST && process.env.DB_HOST.includes("tidb")) ||
  String(process.env.DB_PORT) === "4000";

let pool = null;
let pgPool = null;

async function createPgPool() {
  const pkg = await import("pg");
  const { Pool } = pkg;
  const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl:
          process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 5432,
        ssl:
          process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
      };
  pgPool = new Pool(poolConfig);
  pgPool.on("error", (err) => {
    console.error("Unexpected idle client error", err);
  });
  pool = pgPool;
}

async function createMysqlPool() {
  const mysql = await import("mysql2/promise");
  const cfg = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306,
    // waitForConnections, connectionLimit etc. can be added as needed
  };
  // Enable TLS for TiDB / when DB_SSL is requested
  if (
    process.env.DB_SSL === "true" ||
    (process.env.DB_HOST && process.env.DB_HOST.includes("tidb"))
  ) {
    // Use TLS but don't require a CA by default; this enables encrypted transport.
    // For strict verification, set DB_SSL=true and provide proper CA handling.
    cfg.ssl = { rejectUnauthorized: false };
  }
  pool = mysql.createPool(cfg);
}

export async function initPool() {
  if (isMySQL) {
    await createMysqlPool();
  } else {
    await createPgPool();
  }
}

export async function query(text, params) {
  if (!pool) await initPool();

  if (isMySQL) {
    // Convert Postgres-style $1 placeholders and ANY($n::int[]) to MySQL-compatible SQL
    let sql = text;
    const originalParams = params || [];

    // Replace ANY($n::...) with IN (?,?,...)
    const anyRegex = /ANY\(\$(\d+)::[^)]+\)/g;
    sql = sql.replace(anyRegex, (_, idx) => {
      const arr = originalParams[Number(idx) - 1] || [];
      if (!Array.isArray(arr) || arr.length === 0) return "IN (NULL)";
      return `IN (${arr.map(() => "?").join(",")})`;
    });

    // Replace $n with ?
    sql = sql.replace(/\$\d+/g, "?");

    // Flatten params (expand arrays)
    const finalParams = [];
    for (const p of originalParams) {
      if (Array.isArray(p)) finalParams.push(...p);
      else finalParams.push(p);
    }

    const [rows] = await pool.query(sql, finalParams);
    return { rows };
  }

  // Postgres
  return pool.query(text, params);
}

export async function init() {
  try {
    if (!pool) await initPool();

    if (isMySQL) {
      // MySQL/TiDB-friendly table creation
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS searches (
          id INT PRIMARY KEY AUTO_INCREMENT,
          ip VARCHAR(45) NOT NULL,
          result JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } else {
      // Postgres
      await query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await query(`
        CREATE TABLE IF NOT EXISTS searches (
          id SERIAL PRIMARY KEY,
          ip VARCHAR(45) NOT NULL,
          result JSON NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }

    console.log(
      `✅ Database '${process.env.DB_NAME || process.env.DATABASE_URL || "(unknown)"}' and tables are ready`,
    );
  } catch (err) {
    console.error("❌ Database init failed:", err);
    throw err;
  }
}

export { pool };
