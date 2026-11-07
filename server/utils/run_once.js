const jobs = new Map();

export function run_once(key, task) {
  const existing = jobs.get(key);
  if (existing) return existing;

  const job = Promise.resolve().then(task).catch((error) => {
    jobs.delete(key);
    throw error;
  });
  jobs.set(key, job);
  return job;
}
