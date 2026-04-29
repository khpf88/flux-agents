"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runAgent = runAgent;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const bus_1 = require("../context/bus");
const llm_client_1 = require("./llm_client");
const executor_1 = require("../tools/executor");
async function runAgent(agentName, inputData) {
    const agentPath = path_1.default.join(process.cwd(), 'agents', `${agentName}.json`);
    if (!fs_1.default.existsSync(agentPath)) {
        throw new Error(`Agent ${agentName} not found at ${agentPath}`);
    }
    const agentDef = JSON.parse(fs_1.default.readFileSync(agentPath, 'utf8'));
    // 1. Gather Context
    const context = await (0, bus_1.getContext)(agentDef.context_injection, inputData);
    // 2. Build Prompt
    const prompt = `
    You are an AI Agent with the following identity:
    Name: ${agentDef.identity.name}
    Role: ${agentDef.identity.role}
    Goal: ${agentDef.identity.goal}

    Reasoning Guidelines: ${agentDef.reasoning}
    Decision Policy: ${agentDef.decision_policy}

    Context:
    Business Profile: ${JSON.stringify(context.business_profile)}
    Customer Profile: ${JSON.stringify(context.customer_profile)}
    System State: ${JSON.stringify(context.system_state)}

    Available Tools:
    ${JSON.stringify(agentDef.tools)}

    Your task is to decide which tool to call and with what parameters.
    Output your decision in EXACTLY this JSON format:
    {
      "tool": "tool_name",
      "parameters": { ... }
    }
  `;
    console.log(`Running Agent: ${agentDef.identity.name}`);
    // 3. Call LLM
    const response = await (0, llm_client_1.generateContent)(prompt);
    // 4. Parse Response
    try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch)
            throw new Error("No JSON found in LLM response");
        const decision = JSON.parse(jsonMatch[0]);
        console.log(`Agent Decision:`, decision);
        // 5. Execute Tool
        await (0, executor_1.executeTool)(decision.tool, decision.parameters, inputData.lead_id);
    }
    catch (error) {
        console.error('Error parsing agent decision:', response);
        throw error;
    }
}
//# sourceMappingURL=engine.js.map