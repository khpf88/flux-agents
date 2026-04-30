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

    try {
      logger.info('FINALIZING_COORDINATION', { correlationId, count: outputs.length });

      // Load Memory State for prioritization
      const { state } = await MemoryAgent.loadMemory(leadId);

      // 3. Merging Logic
      // Priority: scheduler_agent > lead_followup_agent UNLESS state says otherwise
      const schedulerOutput = outputs.find(o => o.agentId === 'scheduler_agent');
      const followupOutput = outputs.find(o => o.agentId === 'lead_followup_agent');

      let finalMessage = '';
      let finalPhone = '';

      if (state.state === 'awaiting_time_selection' && schedulerOutput) {
        // High priority for scheduler when waiting for time selection
        finalMessage = schedulerOutput.proposal.content;
        finalPhone = schedulerOutput.proposal.data.phone || 'N/A';
      } else if (schedulerOutput && followupOutput) {
        // Merge: Follow-up intro + Scheduler details
        const intro = followupOutput.proposal.content.split('.')[0]; // Take first sentence of follow-up
        finalMessage = `${intro}. ${schedulerOutput.proposal.content}`;
        finalPhone = schedulerOutput.proposal.data.phone || followupOutput.proposal.data.phone || 'N/A';
      } else if (schedulerOutput) {
        finalMessage = schedulerOutput.proposal.content;
        finalPhone = schedulerOutput.proposal.data.phone || 'N/A';
      } else if (followupOutput) {
        finalMessage = followupOutput.proposal.content;
        finalPhone = followupOutput.proposal.data.phone || 'N/A';
      } else {
        // Fallback to first available
        finalMessage = outputs[0].proposal.content;
        finalPhone = outputs[0].proposal.data.phone || 'N/A';
      }

      // 4. Emit Final Response
      if (finalMessage && finalPhone !== 'N/A') {
        this.finalizedLeads.add(correlationId); // Mark as finalized
        logAgentStep(leadId, 'Coordinator', 'FINAL_RESPONSE_COMPOSED', 'Unified response ready for delivery', { 
          message: finalMessage,
          state: state.state
        }, correlationId);
        
        eventBus.emitFluxEvent(EVENTS.OUTPUT.FINAL_RESPONSE_READY, {
          phone: finalPhone,
          message: finalMessage,
          leadId
        }, correlationId, outputs[0].event.eventId);
      } else {
        logger.error('COORDINATION_MISSING_PHONE', { correlationId, finalPhone });
      }
    } catch (error) {
      logger.error('COORDINATION_FAILED', error, { correlationId });
      // FAIL-SAFE: Fallback to the first available output (usually follow-up)
      const fallback = outputs.find(o => o.agentId === 'lead_followup_agent') || outputs[0];
      if (fallback) {
        this.finalizedLeads.add(correlationId);
        eventBus.emitFluxEvent(EVENTS.OUTPUT.FINAL_RESPONSE_READY, {
          phone: fallback.proposal.data.phone,
          message: fallback.proposal.content,
          leadId
        }, correlationId, fallback.event.eventId);
      }
    }
  }
}

export const coordinator = new ConversationCoordinator();
