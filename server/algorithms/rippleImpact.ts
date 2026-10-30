import { db } from '../db';
import {
  Disruption,
  RippleImpactResult,
  RippleImpactNode,
  RippleImpactLink,
  CustomerOrder,
} from '../../src/types';

export function calculateRippleImpact(disruptionId: string): RippleImpactResult {
  const disruption = db.getDisruptionById(disruptionId);
  if (!disruption) {
    throw new Error(`Disruption ${disruptionId} not found`);
  }

  const nodes: RippleImpactNode[] = [];
  const links: RippleImpactLink[] = [];
  const nodeMap = new Set<string>();

  const addNode = (node: RippleImpactNode) => {
    if (!nodeMap.has(node.id)) {
      nodeMap.add(node.id);
      nodes.push(node);
    }
  };

  const addLink = (link: RippleImpactLink) => {
    links.push(link);
  };

  // 1. Trace Supplier
  const supplier = disruption.relatedSupplierId
    ? db.getSupplierById(disruption.relatedSupplierId)
    : undefined;

  if (supplier) {
    addNode({
      id: supplier.id,
      label: supplier.name,
      type: 'supplier',
      status: supplier.status,
      severity: disruption.severity,
      details: {
        code: supplier.supplierCode,
        reliability: `${supplier.reliabilityScore}%`,
        location: supplier.location,
        contact: supplier.contactPerson,
      },
    });
  }

  // 2. Trace Shipment
  const shipment = disruption.relatedShipmentId
    ? db.getShipmentById(disruption.relatedShipmentId)
    : undefined;

  if (shipment) {
    addNode({
      id: shipment.id,
      label: `${shipment.shipmentCode} (${shipment.carrierName})`,
      type: 'shipment',
      status: shipment.status,
      severity: disruption.severity,
      details: {
        code: shipment.shipmentCode,
        carrier: shipment.carrierName,
        quantity: shipment.quantity,
        delayDays: disruption.expectedDelayDays || shipment.delayDays,
        expectedDate: shipment.expectedDeliveryDate,
        tracking: shipment.trackingReference,
      },
    });

    if (supplier) {
      addLink({
        source: supplier.id,
        target: shipment.id,
        label: `Shipment Delayed (+${disruption.expectedDelayDays}d)`,
        critical: true,
      });
    }
  }

  // 3. Trace Destination Warehouse
  const warehouse = disruption.affectedWarehouseId
    ? db.getWarehouseById(disruption.affectedWarehouseId)
    : shipment && shipment.destinationWarehouseId
    ? db.getWarehouseById(shipment.destinationWarehouseId)
    : undefined;

  if (warehouse) {
    addNode({
      id: warehouse.id,
      label: warehouse.name,
      type: 'warehouse',
      status: warehouse.status,
      details: {
        code: warehouse.warehouseCode,
        capacity: warehouse.capacity,
        manager: warehouse.manager,
        location: warehouse.location,
      },
    });

    if (shipment) {
      addLink({
        source: shipment.id,
        target: warehouse.id,
        label: `Inbound Delay (${shipment.quantity} units)`,
        critical: true,
      });
    }
  }

  // 4. Trace Affected Product & Inventory
  const product = disruption.affectedProductId
    ? db.getProductById(disruption.affectedProductId)
    : shipment
    ? db.getProductById(shipment.productId)
    : undefined;

  let availableOnHand = 0;
  let reservedOnHand = 0;
  let minimumSafety = 0;

  if (product && warehouse) {
    const inv = db
      .getInventory()
      .find((i) => i.productId === product.id && i.warehouseId === warehouse.id);

    if (inv) {
      availableOnHand = inv.availableStock;
      reservedOnHand = inv.reservedStock;
      minimumSafety = inv.minimumStock;
    }

    addNode({
      id: `inv-${product.id}-${warehouse.id}`,
      label: `${product.name} (Stock: ${availableOnHand})`,
      type: 'product',
      status: availableOnHand < minimumSafety ? 'Critical Shortage' : 'Low Stock',
      severity: disruption.severity,
      details: {
        code: product.productCode,
        category: product.category,
        unitCost: `$${product.unitCost}`,
        availableStock: availableOnHand,
        reservedStock: reservedOnHand,
        safetyStock: minimumSafety,
      },
    });

    addLink({
      source: warehouse.id,
      target: `inv-${product.id}-${warehouse.id}`,
      label: `On-Hand: ${availableOnHand} vs Need`,
      critical: availableOnHand < minimumSafety,
    });
  }

  // 5. Trace Connected Customer Orders
  const allOrders = db.getOrders();
  const targetWhId = warehouse?.id;
  const targetProdId = product?.id;

  const connectedOrders: CustomerOrder[] = allOrders.filter((o) => {
    const isMatchingWh = !targetWhId || o.destinationWarehouseId === targetWhId;
    const isMatchingProduct =
      !targetProdId ||
      o.productId === targetProdId ||
      o.items?.some((it) => it.productId === targetProdId);
    const isNotDelivered = o.status !== 'Delivered' && o.status !== 'Cancelled';
    return isMatchingWh && isMatchingProduct && isNotDelivered;
  });

  let totalDemand = 0;
  const urgencyRankedOrders: RippleImpactResult['urgencyRankedOrders'] = [];

  const now = new Date();

  connectedOrders.forEach((order) => {
    const reqQty = order.requiredQuantity || order.items?.[0]?.requiredQuantity || 20;
    totalDemand += reqQty;

    const deadline = new Date(order.deliveryDeadline);
    const diffDays = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const delayImpact = disruption.expectedDelayDays;
    const willMissDeadline = diffDays <= delayImpact;

    urgencyRankedOrders.push({
      order,
      shortage: Math.max(0, reqQty - Math.floor(availableOnHand / Math.max(1, connectedOrders.length))),
      delayDays: delayImpact,
      daysUntilDeadline: diffDays,
      riskScore: order.riskScore || (willMissDeadline ? 85 : 55),
    });

    addNode({
      id: order.id,
      label: `${order.customerName} (${order.orderCode})`,
      type: 'order',
      status: order.priority,
      severity: willMissDeadline ? 'Critical' : 'High',
      details: {
        code: order.orderCode,
        customer: order.customerName,
        requiredQty: reqQty,
        deadline: order.deliveryDeadline,
        daysRemaining: diffDays,
        priority: order.priority,
        risk: willMissDeadline ? 'CRITICAL (Deadline at Risk)' : 'ELEVATED',
      },
    });

    if (product && warehouse) {
      addLink({
        source: `inv-${product.id}-${warehouse.id}`,
        target: order.id,
        label: `Needs ${reqQty} units (${diffDays}d left)`,
        critical: willMissDeadline,
      });
    }
  });

  // Sort orders by urgency: deadline days asc, priority desc, risk desc
  urgencyRankedOrders.sort((a: any, b: any) => {
    if (a.daysUntilDeadline !== b.daysUntilDeadline) {
      return a.daysUntilDeadline - b.daysUntilDeadline;
    }
    return b.riskScore - a.riskScore;
  });

  const netShortage = Math.max(0, totalDemand - availableOnHand);

  return {
    disruption,
    affectedOrders: connectedOrders,
    affectedProducts: product ? [product] : [],
    affectedWarehouses: warehouse ? [warehouse] : [],
    totalShortageQuantity: netShortage,
    estimatedDeliveryImpactDays: disruption.expectedDelayDays,
    nodes,
    links,
    urgencyRankedOrders,
  };
}
