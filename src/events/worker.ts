import PQueue from 'p-queue';
import { runAgent } from '../agent_engine/engine.js';
import { logger } from '../logger.js';

const queue = new PQueue({ concurrency: 1 });

export function enqueueAgentTask(agentId: string, data: any) {
  queue.add(async () => {
    try {
      await runAgent(agentId, data);
    } catch (error) {
      logger.error('AGENT_EXECUTION_FAILED', error, { agentId, lead_id: data.lead_id });
    }
  });
}
