import { db } from '../db';
import { CustomerOrder, OrderRiskEvaluation, RiskScoringWeights } from '../../src/types';

/**
 * Deterministic Order Risk Scoring Algorithm (0 - 100)
 *
 * Formula:
 * Score = 100 * [
 *   w_delay * (DelayDays / MaxDelayBaseline) +
 *   w_deadline * (1 - NormalizedDaysRemaining) +
 *   w_shortage * (ShortageQty / RequiredQty) +
 *   w_stock * (1 - WarehouseAvailabilityRatio) +
 *   w_reliability * (1 - SupplierReliability / 100)
 * ]
 *
 * Normalization baselines:
 * - MaxDelayBaseline = 14 days
 * - Critical deadline horizon = 10 days
 * - Categories:
 *     0 - 29: LOW
 *    30 - 59: MEDIUM
 *    60 - 79: HIGH
 *    80 - 100: CRITICAL
 */

export function calculateOrderRisk(
  order: CustomerOrder,
  customWeights?: Partial<RiskScoringWeights>
): OrderRiskEvaluation {
  const currentSettings = db.getSettings();
  const weights: RiskScoringWeights = {
    ...currentSettings.riskWeights,
    ...(customWeights || {}),
  };

  const now = new Date();
  const deadline = new Date(order.deliveryDeadline);
  const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, diffDays);

  // 1. Trace connected shipment & delay
  const shipments = db.getShipments();
  const relatedShipment = shipments.find(
    (s) =>
      s.destinationWarehouseId === order.destinationWarehouseId &&
      (s.productId === order.productId || order.items?.some((i: any) => i.productId === s.productId)) &&
      s.status !== 'Delivered' &&
      s.status !== 'Cancelled'
  );

  const delayDays = relatedShipment ? relatedShipment.delayDays : 0;
  // Factor A: Delay Contribution (normalized over 14 days max)
  const normalizedDelay = Math.min(1.0, delayDays / 14);
  const delayContribution = normalizedDelay * weights.delayWeight * 100;

  // Factor B: Deadline Urgency Contribution (closer deadline = higher risk)
  // If daysRemaining <= 0 -> 1.0 (overdue), if >= 14 days -> 0.0
  const normalizedDeadlineUrgency = Math.max(0, Math.min(1.0, 1 - daysRemaining / 14));
  const deadlineContribution = normalizedDeadlineUrgency * weights.deadlineWeight * 100;

  // Factor C: Inventory Availability in Destination Warehouse
  const inventoryList = db.getInventory();
  const destInventory = inventoryList.find(
    (i) => i.productId === order.productId && i.warehouseId === order.destinationWarehouseId
  );
  const requiredQty = order.requiredQuantity || order.items?.[0]?.requiredQuantity || 25;
  const availableStock = destInventory ? destInventory.availableStock : 0;
  const deficit = Math.max(0, requiredQty - availableStock);
  const shortageRatio = requiredQty > 0 ? Math.min(1.0, deficit / requiredQty) : 0;
  const shortageContribution = shortageRatio * weights.shortageWeight * 100;

  const stockSafetyRatio =
    destInventory && destInventory.minimumStock > 0
      ? Math.min(1.0, availableStock / (destInventory.minimumStock + requiredQty))
      : 0;
  const stockContribution = (1 - stockSafetyRatio) * weights.stockWeight * 100;

  // Factor D: Supplier Reliability Contribution
  let supplierReliability = 92;
  if (relatedShipment) {
    const supplier = db.getSupplierById(relatedShipment.supplierId);
    if (supplier) {
      supplierReliability = supplier.reliabilityScore;
    }
  }
  const normalizedReliabilityRisk = Math.max(0, Math.min(1.0, 1 - supplierReliability / 100));
  const supplierContribution = normalizedReliabilityRisk * weights.reliabilityWeight * 100;

  // Priority multiplier baseline
  let priorityMultiplier = 1.0;
  if (order.priority === 'Critical') priorityMultiplier = 1.15;
  else if (order.priority === 'High') priorityMultiplier = 1.05;
  else if (order.priority === 'Low') priorityMultiplier = 0.9;

  let rawScore =
    (delayContribution +
      deadlineContribution +
      shortageContribution +
      stockContribution +
      supplierContribution) *
    priorityMultiplier;

  // Bounds clamp [0, 100]
  const finalScore = Math.min(100, Math.max(0, Math.round(rawScore * 10) / 10));

  let riskCategory: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (finalScore >= 80) riskCategory = 'CRITICAL';
  else if (finalScore >= 60) riskCategory = 'HIGH';
  else if (finalScore >= 30) riskCategory = 'MEDIUM';

  // Construct intelligent deterministic explanation
  const factorExplanations: string[] = [];
  if (delayDays > 0) {
    factorExplanations.push(`Inbound shipment delayed by ${delayDays} days`);
  }
  if (daysRemaining <= 5) {
    factorExplanations.push(`Tight deadline (${daysRemaining} days remaining)`);
  }
  if (deficit > 0) {
    factorExplanations.push(`Stock shortage of ${deficit} units at local warehouse`);
  }
  if (supplierReliability < 85) {
    factorExplanations.push(`Supplier reliability index below baseline (${supplierReliability}%)`);
  }
  if (factorExplanations.length === 0) {
    factorExplanations.push('Stable inventory buffers and on-schedule fulfillment pipeline');
  }

  const explanation = `${riskCategory} Risk: ${factorExplanations.join('; ')}.`;

  let recommendedPriority = order.priority;
  if (finalScore >= 75) recommendedPriority = 'Critical';
  else if (finalScore >= 55 && recommendedPriority === 'Low') recommendedPriority = 'High';

  return {
    orderId: order.id,
    orderCode: order.orderCode,
    customerName: order.customerName,
    riskScore: finalScore,
    riskCategory,
    relatedShipmentCode: relatedShipment?.shipmentCode,
    expectedDelayDays: delayDays,
    shortageQuantity: deficit,
    deadline: order.deliveryDeadline,
    daysRemaining,
    factors: {
      delayContribution: Math.round(delayContribution * 10) / 10,
      deadlineContribution: Math.round(deadlineContribution * 10) / 10,
      shortageContribution: Math.round(shortageContribution * 10) / 10,
      stockContribution: Math.round(stockContribution * 10) / 10,
      supplierContribution: Math.round(supplierContribution * 10) / 10,
    },
    explanation,
    recommendedPriority,
  };
}

export function evaluateAllOrdersRisk(): OrderRiskEvaluation[] {
  const orders = db.getOrders();
  return orders
    .map((o) => calculateOrderRisk(o))
    .sort((a, b) => b.riskScore - a.riskScore);
}
