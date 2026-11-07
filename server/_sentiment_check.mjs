import "dotenv/config";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "datapro_lms"
});

const [rows] = await connection.query(
  `SELECT COUNT(*) AS sessions,
          SUM(status = 'completed') AS completed,
          SUM(performance_json IS NOT NULL) AS with_performance,
          SUM(performance_json LIKE '%llm_analysis%') AS with_analysis,
          SUM(performance_json LIKE '%sentiment%') AS with_sentiment_word,
          SUM(performance_json LIKE '%overall_score%') AS with_score
   FROM tbl_student_mock_interviews`
);
console.log(JSON.stringify(rows));

const [sample] = await connection.query(
  `SELECT mock_interview_id, status, JSON_KEYS(performance_json) AS keys_list, CHAR_LENGTH(performance_json) AS size
   FROM tbl_student_mock_interviews
   WHERE performance_json IS NOT NULL
   ORDER BY mock_interview_id DESC
   LIMIT 8`
);
console.log(JSON.stringify(sample));
await connection.end();
