export interface AgentContext {
    business_profile: any;
    customer_profile: any;
    conversation_history: any[];
    system_state: any;
}
export declare function getContext(injectionPoints: string[], data: any): Promise<Partial<AgentContext>>;
//# sourceMappingURL=bus.d.ts.map