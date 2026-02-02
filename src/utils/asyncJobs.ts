type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface AsyncJobInfo {
  id: string;
  name: string;
  status: JobStatus;
  createdAt: Date;
  startedAt?: Date;
  finishedAt?: Date;
  error?: string;
}

const jobs = new Map<string, AsyncJobInfo>();

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function enqueueJob(name: string, fn: () => Promise<void>) {
  const id = newId();
  const info: AsyncJobInfo = {
    id,
    name,
    status: 'queued',
    createdAt: new Date(),
  };
  jobs.set(id, info);

  setImmediate(async () => {
    info.status = 'running';
    info.startedAt = new Date();
    try {
      await fn();
      info.status = 'completed';
      info.finishedAt = new Date();
    } catch (e: any) {
      info.status = 'failed';
      info.finishedAt = new Date();
      info.error = e?.message ? String(e.message) : String(e);
    }
  });

  return info;
}

export function getJob(id: string) {
  return jobs.get(id) || null;
}

