export async function add_column(pool, table, column, definition) {
  try {
    await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch {
    // column may already exist
  }
}

export async function add_fk(pool, sql) {
  try {
    await pool.query(sql);
  } catch {
    // constraint may already exist
  }
}
