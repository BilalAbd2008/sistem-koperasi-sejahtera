import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const host = process.env.DB_HOST || "localhost";
const port = parseInt(process.env.DB_PORT || "3306", 10);
const user = process.env.DB_USER || "root";
const password = process.env.DB_PASSWORD || "";
const databaseName = process.env.DB_NAME || "repa_koperasi";

let pool: ReturnType<typeof mysql.createPool> | null = null;
let bootstrapPromise: Promise<ReturnType<typeof mysql.createPool>> | null =
  null;

async function bootstrapPool() {
  const adminConnection = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true,
  });

  try {
    await adminConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${databaseName}\``,
    );

    const [rows] = await adminConnection.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS tableCount FROM information_schema.tables WHERE table_schema = ?",
      [databaseName],
    );

    const tableCount = Number(rows[0]?.tableCount || 0);

    if (tableCount === 0) {
      const schemaPath = path.join(process.cwd(), "database_schema.sql");
      const schemaSql = await fs.readFile(schemaPath, "utf8");
      await adminConnection.query(`USE \`${databaseName}\`; ${schemaSql}`);
    }

    const [accountingRows] = await adminConnection.query<mysql.RowDataPacket[]>(
      "SELECT COUNT(*) AS tableCount FROM information_schema.tables WHERE table_schema = ? AND table_name = 'rekening'",
      [databaseName],
    );

    if (Number(accountingRows[0]?.tableCount || 0) === 0) {
      const extensionPath = path.join(
        process.cwd(),
        "database_schema_accounting_extension.sql",
      );
      const extensionSql = await fs.readFile(extensionPath, "utf8");
      await adminConnection.query(`USE \`${databaseName}\`; ${extensionSql}`);
    }
  } finally {
    await adminConnection.end();
  }

  return mysql.createPool({
    host,
    port,
    user,
    password,
    database: databaseName,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

async function getPool() {
  if (pool) {
    return pool;
  }

  if (!bootstrapPromise) {
    bootstrapPromise = bootstrapPool();
  }

  pool = await bootstrapPromise;
  return pool;
}

const db = {
  async getConnection() {
    return (await getPool()).getConnection();
  },
  async query(
    ...args: Parameters<ReturnType<typeof mysql.createPool>["query"]>
  ) {
    return (await getPool()).query(...args);
  },
  async execute(
    ...args: Parameters<ReturnType<typeof mysql.createPool>["execute"]>
  ) {
    return (await getPool()).execute(...args);
  },
  async end() {
    return (await getPool()).end();
  },
};

export default db;
