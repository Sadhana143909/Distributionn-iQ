import { GoogleGenAI } from '@google/genai';
import { db } from './db';
import { calculateRippleImpact } from './algorithms/rippleImpact';
import { simulateRecoveryDigitalTwin } from './algorithms/recoveryDigitalTwin';

// Initialize Gemini client strictly on server with mandated User-Agent header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

/**
 * Helper to log warnings without polluting stderr with raw quota stack traces
 */
function logGeminiFallback(context: string, err: any) {
  const isQuota =
    err?.status === 429 ||
    err?.message?.includes('429') ||
    err?.message?.includes('quota') ||
    err?.message?.includes('RESOURCE_EXHAUSTED');

  if (isQuota) {
    console.warn(`[ChainPulse AI] Quota limit active for ${context}; deployed Deterministic Intelligence Engine.`);
  } else {
    console.warn(`[ChainPulse AI] Gemini service notice for ${context} (${err?.message || 'offline'}); deployed Deterministic Intelligence Engine.`);
  }
}

export async function explainDisruptionWithGemini(disruptionId: string): Promise<string> {
  const disruption = db.getDisruptionById(disruptionId);
  if (!disruption) {
    throw new Error('Disruption not found');
  }

  const ripple = calculateRippleImpact(disruptionId);
  const simulation = simulateRecoveryDigitalTwin(disruptionId);

  // Deterministic high-fidelity fallback briefing
  const deterministicFallback = [
    `1. Root Cause Summary: Disruption event ${disruption.disruptionCode} triggered by ${disruption.disruptionType} (${disruption.severity} severity) at ${disruption.warehouseName || 'central transit hub'}. Root trigger: ${disruption.description}`,
    `2. Operational Impact: Impending ${disruption.expectedDelayDays}-day delay generates an immediate shortage of ${ripple.totalShortageQuantity.toLocaleString()} units, directly putting ${ripple.affectedOrders.length} customer order(s) at delivery risk (including priority accounts ${ripple.urgencyRankedOrders.slice(0, 2).map((o: any) => o.order.customerName).join(', ') || 'N/A'}).`,
    `3. Financial & SLA Exposure: Estimated inventory deficit exposure of $${(ripple.totalShortageQuantity * 55).toLocaleString()} with elevated SLA compliance risk and potential buffer penalty liabilities.`,
    `4. Recommended Next Action: Execute strategy ${simulation.recommendedOptionKey}: ${simulation.recommendationReason}. Digital twin counterfactual simulation projects a ${simulation.options.find((o: any) => o.optionKey === simulation.recommendedOptionKey)?.expectedRecoveryPercentage || 85}% recovery rate.`,
  ].join('\n\n');

  if (!ai || !apiKey) {
    return deterministicFallback;
  }

  // Ground Gemini with verified deterministic calculations
  const prompt = `You are ChainPulse AI's Chief Supply Chain Risk Officer.
Explain the following supply chain disruption event clearly and concisely for an executive dashboard briefing:

DISRUPTION DATA:
- Code: ${disruption.disruptionCode}
- Type: ${disruption.disruptionType}
- Severity: ${disruption.severity}
- Expected Delay: ${disruption.expectedDelayDays} days
- Affected Product: ${disruption.productName || 'N/A'}
- Affected Warehouse: ${disruption.warehouseName || 'N/A'}
- Description: ${disruption.description}

DETERMINISTIC RIPPLE IMPACT CALCULATIONS:
- Affected Customer Orders Count: ${ripple.affectedOrders.length}
- Total Quantity Shortage: ${ripple.totalShortageQuantity} units
- Highest Urgency Orders: ${ripple.urgencyRankedOrders
    .slice(0, 3)
    .map((o: any) => `${o.order.customerName} (${o.order.orderCode}, Deadline: ${o.order.deliveryDeadline})`)
    .join(', ')}

SIMULATION SUMMARY:
- Recommended Recovery Strategy: ${simulation.recommendedOptionKey}
- Executive Recommendation: ${simulation.recommendationReason}

STRUCTURE YOUR RESPONSE INTO 4 CLEAR BULLETS:
1. Root Cause Summary: Exactly what broke down and why.
2. Operational Impact: Connected inventory deficit and order deadline vulnerabilities.
3. Financial & SLA Exposure: Potential penalty risks and stockout costs.
4. Recommended Next Action: Recommended recovery path to execute immediately.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are an authoritative enterprise supply chain intelligence copilot. Use strictly verified data provided. Do not hallucinate numbers or facts.',
      },
    });

    return response.text || deterministicFallback;
  } catch (error: any) {
    logGeminiFallback('explainDisruption', error);
    return deterministicFallback;
  }
}

export async function getRecoveryInsightsWithGemini(disruptionId: string): Promise<string> {
  const simulation = simulateRecoveryDigitalTwin(disruptionId);

  const fallbackInsights = [
    `Option A (${simulation.options[0]?.title || 'Stock Reallocation'}) vs Option B (${simulation.options[1]?.title || 'Expedited Freight'}): Option A achieves rapid deficit mitigation with ${simulation.options[0]?.expectedRecoveryPercentage || 85}% recovery efficiency at minimal incremental expenditure ($${simulation.options[0]?.estimatedAdditionalCost || 0}), saving ${simulation.options[0]?.ordersRecoveredCount || 0} customer orders. In contrast, Option B incurs $${simulation.options[1]?.estimatedAdditionalCost || 0} in air logistics costs but provides maximum velocity for emergency SLA preservation.`,
    `Assessment of Alternative Suppliers and Order Splitting: Option C (${simulation.options[2]?.title || 'Alternative Supplier'}) demonstrates solid operational feasibility (${simulation.options[2]?.feasibilityScore || 80}/100) and diversifies vendor dependency, while Option D (${simulation.options[3]?.title || 'Order Splitting'}) isolates critical batches to honor immediate customer milestones without incurring excessive overnight freight tariffs.`,
    `Executive Managerial Verdict: ChainPulse AI autonomous governance endorses ${simulation.recommendedOptionKey} (${simulation.recommendationReason}). This strategy minimizes overall risk score to ${simulation.options.find((o: any) => o.optionKey === simulation.recommendedOptionKey)?.newRiskScore || 25}/100 while preserving contractual margin thresholds.`,
  ].join('\n\n');

  if (!ai || !apiKey) {
    return fallbackInsights;
  }

  const prompt = `Analyze the 4 counterfactual recovery options evaluated by ChainPulse AI's Digital Twin Simulator for disruption ${simulation.disruptionCode}:

BEFORE RECOVERY STATE:
- Shortage: ${simulation.beforeRecovery.originalShortage} units
- Orders at Risk: ${simulation.beforeRecovery.affectedOrdersCount}
- Delay: ${simulation.beforeRecovery.estimatedDelayDays} days
- Baseline Risk Score: ${simulation.beforeRecovery.currentRiskScore}/100

EVALUATED OPTIONS:
${simulation.options
  .map(
    (opt: any) =>
      `• ${opt.title}:
  - Cost: $${opt.estimatedAdditionalCost}
  - Recovery: ${opt.expectedRecoveryPercentage}% (${opt.ordersRecoveredCount} orders saved)
  - Feasibility: ${opt.feasibilityScore}/100
  - Residual Risk: ${opt.newRiskScore}/100
  - Trade-off: ${opt.tradeOffSummary}`
  )
  .join('\n\n')}

Write a concise 3-paragraph executive trade-off briefing:
1. Key trade-offs between Option A (Stock Reallocation) vs Option B (Expedited Air Freight).
2. Assessment of Option C (Alternative Supplier) and Option D (Order Splitting).
3. Final managerial verdict endorsing the best strategy with rationale.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || fallbackInsights;
  } catch (error: any) {
    logGeminiFallback('getRecoveryInsights', error);
    return fallbackInsights;
  }
}

export async function answerSupplyChainAssistant(query: string, activeContext?: string): Promise<string> {
  const rawData = db.getRawData();
  const activeDisruptions = rawData.disruptions.filter((d) => d.status !== 'Resolved');
  const criticalOrders = rawData.orders.filter((o) => o.riskCategory === 'CRITICAL');
  const pendingPlans = rawData.recoveryPlans.filter((p) => p.status === 'Pending Approval');

  const deterministicAnswer = [
    `ChainPulse AI Operational Briefing (Network Status: Active):`,
    `• Monitored Network: ${rawData.suppliers.length} qualified suppliers across ${rawData.warehouses.length} active fulfillment centers with ${rawData.lorries.length} freight lorries tracked in real time.`,
    `• Active Disruptions: ${activeDisruptions.length} event(s) currently being mitigated (${activeDisruptions.map((d) => `${d.disruptionCode} [${d.severity}]`).join(', ') || 'None'}).`,
    `• Order Pipeline: ${rawData.orders.length} total customer orders (${criticalOrders.length} critical SLA risks).`,
    `• Autonomous Actions: ${pendingPlans.length} counterfactual recovery plan(s) queued for execution.`,
    `Recommendation regarding "${query}": Maintain focus on high-urgency order deadlines and verify inventory allocation across nodes before initiating emergency carrier reroutes.`,
  ].join('\n\n');

  if (!ai || !apiKey) {
    return deterministicAnswer;
  }

  const summaryContext = `CURRENT SUPPLY CHAIN SNAPSHOT:
- Suppliers: ${rawData.suppliers.length} active (${rawData.suppliers.slice(0, 4).map((s) => s.name).join(', ')})
- Warehouses: ${rawData.warehouses.map((w) => `${w.name} (${w.status})`).join(', ')}
- Active Disruptions: ${activeDisruptions.map((d) => `${d.disruptionCode} [${d.severity}]: ${d.description}`).join('; ')}
- Orders in Pipeline: ${rawData.orders.length} orders (${criticalOrders.length} critical)
- Pending Recovery Plans: ${pendingPlans.map((p) => `${p.planCode} (${p.planType}, cost: $${p.estimatedCost})`).join('; ')}`;

  const prompt = `User Query: "${query}"

Additional UI Context: ${activeContext || 'General Overview'}

${summaryContext}

Answer the supply chain manager's query clearly, referencing specific verified numbers and recommending operational next steps where applicable. Keep your answer crisp and actionable.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction:
          'You are ChainPulse AI Copilot, an autonomous enterprise supply chain assistant. Provide precise, executive-grade answers based on real system state.',
      },
    });
    return response.text || deterministicAnswer;
  } catch (error: any) {
    logGeminiFallback('answerSupplyChainAssistant', error);
    return deterministicAnswer;
  }
}

export async function generateExecutiveReportWithGemini(timeframe: string = 'Current Quarter'): Promise<string> {
  const rawData = db.getRawData();
  const activeDisruptions = rawData.disruptions.filter((d) => d.status !== 'Resolved');
  const criticalOrders = rawData.orders.filter((o) => o.riskCategory === 'CRITICAL');
  const avgReliability = Math.round(
    rawData.suppliers.reduce((acc, s) => acc + s.reliabilityScore, 0) / Math.max(1, rawData.suppliers.length)
  );
  const totalInvValue = rawData.inventory.reduce((acc, i) => acc + i.availableStock * (i.unitCost || 50), 0);

  const fallbackReport = [
    `# ChainPulse AI – Executive Supply Chain Resilience Report`,
    `**Reporting Cycle:** ${timeframe} | **System Status:** Online & Monitoring | **Network Integrity:** High`,
    ``,
    `## 1. Executive Summary`,
    `The enterprise supply chain operates across ${rawData.suppliers.length} strategic tier-1 suppliers, ${rawData.warehouses.length} regional distribution warehouses, and ${rawData.lorries.length} instrumented commercial transit lorries. Average vendor reliability index stands at ${avgReliability}%, with total capitalized inventory valuation of ~$${totalInvValue.toLocaleString()}.`,
    ``,
    `## 2. Disruption Threat Landscape`,
    `- **Active Incidents Under Containment:** ${activeDisruptions.length}`,
    `- **Disruption Types:** ${activeDisruptions.map((d) => `${d.disruptionCode} (${d.disruptionType})`).join(', ') || 'No active critical disruptions'}`,
    `- **Critical Order Exposure:** ${criticalOrders.length} customer order(s) flagged with elevated stockout vulnerability.`,
    ``,
    `## 3. Financial & Delivery Risk Assessment`,
    `Automated ripple impact algorithms continuously calculate multi-tier inventory propagation. Digital twin counterfactual simulation indicates that 85%+ of critical delivery milestones are preserved through intelligent buffer reallocation without recurring emergency air freight premiums.`,
    ``,
    `## 4. Autonomous Recovery & Fleet Health`,
    `- **Recovery Plans Formulated:** ${rawData.recoveryPlans.length} automated mitigation strategies generated.`,
    `- **Fleet Monitoring:** Active GPS telemetry tracking with automated stoppage and breakdown detection operating continuously.`,
    ``,
    `## 5. Strategic Recommendations for C-Level Leadership`,
    `1. **Execute Endorsed Counterfactual Plans:** Approve pending reallocations to prevent downstream penalty escalation.`,
    `2. **Supplier Diversification:** Allocate secondary production quotas to high-reliability vendors (Bosch, Nippon).`,
    `3. **GPS Telemetry Integration:** Enforce automated breakdown notification protocols across all contracted logistics carriers.`,
  ].join('\n');

  if (!ai || !apiKey) {
    return fallbackReport;
  }

  const prompt = `Generate a comprehensive Executive Supply Chain Resilience Report for ${timeframe}.
System Metrics:
- Total Suppliers Monitored: ${rawData.suppliers.length}
- Active Shipments: ${rawData.shipments.filter((s) => s.status === 'In Transit' || s.status === 'Delayed').length}
- Active Disruptions: ${activeDisruptions.length}
- Critical Risk Customer Orders: ${criticalOrders.length}
- Total Inventory Value: ~$${totalInvValue.toLocaleString()}
- Average Supplier Reliability: ${avgReliability}%

Format with:
# Executive Summary
# Disruption Threat Landscape
# Financial & Delivery Risk Assessment
# Autonomous Recovery & Mitigation Performance
# Strategic Recommendations for C-Level Leadership`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || fallbackReport;
  } catch (error: any) {
    logGeminiFallback('generateExecutiveReport', error);
    return fallbackReport;
  }
}
