import { eventBus, EVENTS, FluxEvent } from '../events/event_bus.js';
import { logger } from '../logger.js';
import { logAgentStep } from '../agent_engine/logger.js';
import { MemoryAgent } from '../memory/memory_agent.js';

interface ProposedAction {
  type: 'sms';
  priority: 'high' | 'medium' | 'low';
  content: string;
  data: any;
}

interface AgentOutput {
  agentId: string;
  proposal: ProposedAction;
  event: FluxEvent;
}

/**
 * Conversation Coordinator
 * Responsibilities:
 * - Aggregate outputs from multiple agents per correlationId
 * - Merge conflicting or complementary messages
 * - Enforce a single final response to the user
 */
class ConversationCoordinator {
  private buffer = new Map<string, AgentOutput[]>();
  private timeouts = new Map<string, NodeJS.Timeout>();
  private finalizedLeads = new Set<string>(); // Persistence-light idempotency

  public initialize() {
    // Listen for agent proposals
    eventBus.subscribe(EVENTS.PROCESS.AGENT_OUTPUT_READY, (event: FluxEvent) => {
      this.handleProposal(event);
    });
  }

  private handleProposal(event: FluxEvent) {
    const { agentId, proposed_action } = event.payload;
    const correlationId = event.correlationId;
    
    // Idempotency check: Don't process if we already sent a final response for this chain
    if (this.finalizedLeads.has(correlationId)) {
      logger.info('COORDINATION_SKIPPED', { correlationId, reason: 'Already finalized' });
      return;
    }
    const leadIdStr = correlationId.replace('lead_', '');
    const leadId = parseInt(leadIdStr);

    logger.info('COORDINATION_RECEIVED', { agentId, correlationId });
    
    // 1. Add to buffer
    if (!this.buffer.has(correlationId)) {
      this.buffer.set(correlationId, []);
      logAgentStep(leadId, 'Coordinator', 'COORDINATION_STARTED', 'Aggregating agent outputs...', {}, correlationId);
    }
    
    this.buffer.get(correlationId)!.push({ agentId, proposal: proposed_action, event });

    // 2. Set/Reset Timeout (Wait 2s for other agents)
    if (this.timeouts.has(correlationId)) {
      clearTimeout(this.timeouts.get(correlationId));
    }

    const timeout = setTimeout(() => {
      this.finalizeCoordination(correlationId);
    }, 2000);

    this.timeouts.set(correlationId, timeout);
  }

  private async finalizeCoordination(correlationId: string) {
    const outputs = this.buffer.get(correlationId) || [];
    const leadId = parseInt(correlationId.replace('lead_', ''));
    
    this.buffer.delete(correlationId);
    this.timeouts.delete(correlationId);

    if (outputs.length === 0) return;

    // Delegate merging to Response Composer Agent
    logger.info('DELEGATING_TO_COMPOSER', { correlationId });
    
    eventBus.emitFluxEvent(
      EVENTS.PROCESS.COMPOSITION_REQUESTED,
      {
        lead_id: leadId,
        agent_outputs: outputs.map(o => ({
          agentId: o.agentId,
          proposal: o.proposal
        }))
      },
      correlationId,
      outputs[0].event.eventId
    );
  }
}

export const coordinator = new ConversationCoordinator();
