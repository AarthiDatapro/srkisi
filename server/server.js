import 'dotenv/config';
import express from 'express';
import { applySecurity, createSecureServer } from '@datapromr/auth/server';
import { log } from '@datapromr/log';
import { connect_db, is_db_connected, ping_db } from "./utils/db_setup.js";
import { mount_student_auth } from "./student_authentication/student_auth_routes.js";
import { mount_employee_auth } from "./employee_authentication/employee_auth_routes.js";
import { mount_auth_refresh } from "./utils/auth_refresh.js";
import { mount_dropdowns } from "./dropdown_manager/dropdown_routes.js";
import { mount_programs } from "./programs_control/program_routes.js";
import { mount_cohorts } from "./cohorts/cohort_routes.js";
import { mount_employees } from "./employee_manager/employee_routes.js";
import { mount_courses } from "./course_manager/course_routes.js";
import { mount_course_content } from "./course_content_manager/content_routes.js";
import { mount_course_registration } from "./course_registration/catalog_routes.js";
import { mount_course_learning } from "./course_learning/learn_routes.js";
import { mount_student_profile } from "./student_profile/profile_routes.js";
import { mount_student_resume_analyser } from "./student_resume_analyser/analyser_routes.js";
import { mount_jobs } from "./jobs_manager/jobs_routes.js";
import { mount_hackathons } from "./hackathon_manager/hackathon_routes.js";
import { mount_student_mock_interview } from "./student_mock_interview/interview_routes.js";
import { mount_performance_dashboard } from "./performance_dashboard/dashboard_routes.js";
import { mount_admin_home } from "./admin_home/home_routes.js";
import { mount_ai_chat_proxy } from "./utils/ai_chat_proxy.js";
import { mount_ai_routes } from "./ai/ai_routes.js";
import { mount_ai_monitor } from "./ai_monitor/monitor_routes.js";
import { mount_student_manager } from "./student_manager/report_routes.js";
import { mount_analytics_center } from "./analytics_center/analytics_routes.js";
import { mount_hackathon_showcase } from "./hackathon_showcase/showcase_routes.js";
import { mount_student_history } from "./student_history/history_routes.js";
import { mount_api_integration } from "./api_integration/student_import_routes.js";
import { mount_certificate_manager } from "./certificate_manager/certificate_routes.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

applySecurity(app);
mount_auth_refresh(app);
mount_student_auth(app);
mount_employee_auth(app);
mount_dropdowns(app);
mount_programs(app);
mount_cohorts(app);
mount_employees(app);
mount_courses(app);
mount_course_content(app);
mount_course_registration(app);
mount_course_learning(app);
mount_student_profile(app);
mount_student_resume_analyser(app);
mount_jobs(app);
mount_hackathons(app);
mount_student_mock_interview(app);
mount_performance_dashboard(app);
mount_admin_home(app);
mount_ai_chat_proxy(app);
mount_ai_routes(app);
mount_ai_monitor(app);
mount_student_manager(app);
mount_analytics_center(app);
mount_hackathon_showcase(app);
mount_student_history(app);
mount_api_integration(app);
mount_certificate_manager(app);

app.get('/health', async (req, res) => {
  const db_ok = await ping_db();

  if (!db_ok) {
    log.fail('health', 'backend connectivity failed: database not connected', req);
    return res.status(503).json({
      status: 'error',
      backend: 'failed',
      database: 'disconnected'
    });
  }

  log.pass('health', 'backend connectivity successful', req);
  return res.json({
    status: 'ok',
    backend: 'successful',
    database: 'connected'
  });
});

async function start() {
  log.info('start', 'starting backend');

  try {
    await connect_db();
  } catch {
    log.fail('start', 'backend connectivity failed: database not connected');
    process.exit(1);
  }

  if (!is_db_connected()) {
    log.fail('start', 'backend connectivity failed: database not connected');
    process.exit(1);
  }

  const server = createSecureServer(app);

  server.listen(PORT, () => {
    if (!is_db_connected()) {
      log.fail('start', 'backend connectivity failed: database not connected');
      server.close();
      process.exit(1);
      return;
    }

    log.pass(
      'start',
      `backend connectivity successful on port ${PORT}`
    );
  });
}

start();
