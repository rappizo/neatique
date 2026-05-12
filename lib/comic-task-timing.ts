export type ComicTaskTiming = {
  totalMs: number;
  stages: Record<string, number>;
  startedAt: string;
  completedAt: string;
};

export function createComicTaskTimer() {
  const startedAtMs = Date.now();
  const stages: Record<string, number> = {};

  function addStageDuration(stage: string, startedAt: number) {
    stages[stage] = (stages[stage] || 0) + Date.now() - startedAt;
  }

  return {
    async time<T>(stage: string, action: () => Promise<T>) {
      const stageStart = Date.now();

      try {
        return await action();
      } finally {
        addStageDuration(stage, stageStart);
      }
    },
    timeSync<T>(stage: string, action: () => T) {
      const stageStart = Date.now();

      try {
        return action();
      } finally {
        addStageDuration(stage, stageStart);
      }
    },
    snapshot(): ComicTaskTiming {
      return {
        totalMs: Date.now() - startedAtMs,
        stages: { ...stages },
        startedAt: new Date(startedAtMs).toISOString(),
        completedAt: new Date().toISOString()
      };
    }
  };
}
