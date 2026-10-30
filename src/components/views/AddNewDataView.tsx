import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Building2,
  Package,
  Warehouse,
  Boxes,
  Truck,
  ShoppingCart,
  AlertOctagon,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  RotateCcw,
  Sparkles,
  MapPin,
  Map,
  Calendar,
  Clock,
  Phone,
  Crosshair,
  X,
  Navigation,
} from 'lucide-react';
import { api } from '../../api';
import { Supplier, Product, Warehouse as WarehouseType } from '../../types';

interface AddNewDataViewProps {
  onNavigate: (viewId: string) => void;
  defaultTab?: string;
}

export const AddNewDataView: React.FC<AddNewDataViewProps> = ({ onNavigate, defaultTab = 'supplier' }) => {
  const [activeTab, setActiveTab] = useState<
    'supplier' | 'product' | 'warehouse' | 'inventory' | 'shipment' | 'order' | 'disruption'
  >((defaultTab as any) || 'supplier');

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [shipments, setShipments] = useState<any[]>([]);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  // A. Supplier Form
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    location: '',
    reliabilityScore: 95,
    status: 'Active' as const,
  });

  // B. Product Form
  const [productForm, setProductForm] = useState({
    name: '',
    category: 'Semiconductors',
    description: '',
    unitCost: 50,
    status: 'Active' as const,
  });

  // C. Warehouse Form
  const [warehouseForm, setWarehouseForm] = useState({
    name: '',
    location: '',
    capacity: 12000,
    manager: '',
    status: 'Operational' as const,
  });

  // D. Inventory Form
  const [inventoryForm, setInventoryForm] = useState({
    productId: '',
    warehouseId: '',
    availableStock: 100,
    reservedStock: 20,
    minimumStock: 40,
  });

  // E. Shipment Form (with GPS Lorry Tracking Integration)
  const [shipmentForm, setShipmentForm] = useState({
    customShipmentId: '',
    lorryId: 'TRUCK-101',
    driverName: 'Ravi Kumar',
    driverContactNumber: '+91 98450 12345',
    currentLatitude: 13.0827,
    currentLongitude: 80.2707,
    gpsTrackingEnabled: true,
    // Destination Address & Coordinates (Optional - Never mixed with current GPS)
    destinationAddress: '',
    destinationLocation: '',
    destinationLatitude: '' as number | '',
    destinationLongitude: '' as number | '',
    destinationWarehouseId: '', // Optional
    expectedDeliveryDate: '', // Optional
    expectedDeliveryTime: '', // Optional
    // Structured Address fields
    buildingOrCompany: '',
    streetName: '',
    areaOrLocality: '',
    city: '',
    state: '',
    pinCode: '',
    country: 'India',
    supplierId: '',
    productId: '',
    quantity: 150,
    sourceLocation: '',
    carrierName: 'Deccan Express Logistics',
    status: 'In Transit' as const,
    trackingReference: `TRK-${Math.floor(Math.random() * 900000 + 100000)}`,
    locationSource: 'GPS_DEVICE' as 'GPS_DEVICE' | 'GPS_API' | 'SIMULATED',
  });

  // Destination Map Selection Modal
  const [showStructuredAddress, setShowStructuredAddress] = useState(false);
  const [isDestMapModalOpen, setIsDestMapModalOpen] = useState(false);
  const [destMapPinnedCoords, setDestMapPinnedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destMapAddrText, setDestMapAddrText] = useState('');
  const destMapContainerRef = useRef<HTMLDivElement>(null);
  const destMapInstanceRef = useRef<L.Map | null>(null);
  const destMarkerRef = useRef<L.Marker | null>(null);

  // F. Customer Order Form
  const [orderForm, setOrderForm] = useState({
    customerName: '',
    customerContact: '',
    productId: '',
    requiredQuantity: 30,
    destinationWarehouseId: '',
    deliveryAddress: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDeadline: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    priority: 'High' as const,
    status: 'Confirmed' as const,
  });

  // G. Disruption Form
  const [disruptionForm, setDisruptionForm] = useState({
    disruptionType: 'Supplier Delay' as const,
    relatedSupplierId: '',
    relatedShipmentId: '',
    affectedWarehouseId: '',
    affectedProductId: '',
    expectedDelayDays: 4,
    shortageQuantity: 40,
    severity: 'Critical' as const,
    description: '',
    reportedDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadLookups();
  }, []);

  const loadLookups = async () => {
    try {
      const [sups, prods, whs, shps] = await Promise.all([
        api.getSuppliers(),
        api.getProducts(),
        api.getWarehouses(),
        api.getShipments(),
      ]);
      setSuppliers(sups);
      setProducts(prods);
      setWarehouses(whs);
      setShipments(shps);

      if (prods.length > 0 && !inventoryForm.productId) {
        setInventoryForm((prev) => ({ ...prev, productId: prods[0].id }));
        setShipmentForm((prev) => ({ ...prev, productId: prods[0].id }));
        setOrderForm((prev) => ({ ...prev, productId: prods[0].id }));
        setDisruptionForm((prev) => ({ ...prev, affectedProductId: prods[0].id }));
      }
      if (whs.length > 0 && !inventoryForm.warehouseId) {
        setInventoryForm((prev) => ({ ...prev, warehouseId: whs[0].id }));
        setShipmentForm((prev) => ({ ...prev, destinationWarehouseId: whs[0].id }));
        setOrderForm((prev) => ({ ...prev, destinationWarehouseId: whs[0].id }));
        setDisruptionForm((prev) => ({ ...prev, affectedWarehouseId: whs[0].id }));
      }
      if (sups.length > 0 && !shipmentForm.supplierId) {
        setShipmentForm((prev) => ({ ...prev, supplierId: sups[0].id, sourceLocation: sups[0].location }));
        setDisruptionForm((prev) => ({ ...prev, relatedSupplierId: sups[0].id }));
      }
    } catch (err) {
      console.error('Failed to load lookup data for forms:', err);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage(null);
  };

  // Destination Map Selection Hook
  useEffect(() => {
    if (!isDestMapModalOpen || !destMapContainerRef.current) return;

    const initialLat =
      typeof shipmentForm.destinationLatitude === 'number'
        ? shipmentForm.destinationLatitude
        : typeof shipmentForm.currentLatitude === 'number'
        ? shipmentForm.currentLatitude
        : 12.9716;
    const initialLng =
      typeof shipmentForm.destinationLongitude === 'number'
        ? shipmentForm.destinationLongitude
        : typeof shipmentForm.currentLongitude === 'number'
        ? shipmentForm.currentLongitude
        : 77.5946;

    const map = L.map(destMapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 11,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const destIcon = L.divIcon({
      html: `
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-xl flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
      `,
      className: 'dest-picker-marker',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    let marker: L.Marker | null = null;
    if (typeof shipmentForm.destinationLatitude === 'number' && typeof shipmentForm.destinationLongitude === 'number') {
      marker = L.marker([shipmentForm.destinationLatitude, shipmentForm.destinationLongitude], { icon: destIcon }).addTo(map);
      destMarkerRef.current = marker;
      setDestMapPinnedCoords({ lat: shipmentForm.destinationLatitude, lng: shipmentForm.destinationLongitude });
    }

    map.on('click', (e) => {
      const lat = Number(e.latlng.lat.toFixed(6));
      const lng = Number(e.latlng.lng.toFixed(6));
      setDestMapPinnedCoords({ lat, lng });

      if (marker) {
        marker.setLatLng([lat, lng]);
      } else {
        marker = L.marker([lat, lng], { icon: destIcon }).addTo(map);
        destMarkerRef.current = marker;
      }
      setDestMapAddrText(`Destination Location Point (${lat}° N, ${lng}° E)`);
    });

    destMapInstanceRef.current = map;

    return () => {
      map.remove();
      destMapInstanceRef.current = null;
      destMarkerRef.current = null;
    };
  }, [isDestMapModalOpen]);

  const handleConfirmMapDestination = () => {
    if (destMapPinnedCoords) {
      setShipmentForm((prev) => {
        const addr = prev.destinationAddress || destMapAddrText || `Destination (${destMapPinnedCoords.lat}, ${destMapPinnedCoords.lng})`;
        return {
          ...prev,
          destinationLatitude: destMapPinnedCoords.lat,
          destinationLongitude: destMapPinnedCoords.lng,
          destinationAddress: addr,
          destinationLocation: addr,
        };
      });
    }
    setIsDestMapModalOpen(false);
  };

  const handleAssembleStructuredAddress = () => {
    const parts = [
      shipmentForm.buildingOrCompany,
      shipmentForm.streetName,
      shipmentForm.areaOrLocality,
      shipmentForm.city,
      shipmentForm.state,
      shipmentForm.pinCode,
      shipmentForm.country,
    ].filter(Boolean);

    if (parts.length > 0) {
      const assembled = parts.join(', ');
      setShipmentForm((prev) => ({
        ...prev,
        destinationAddress: assembled,
        destinationLocation: assembled,
      }));
      showSuccess(`Address assembled: ${assembled}`);
    }
  };

  const handleAddressFieldChange = (field: string, value: string) => {
    setShipmentForm((prev) => {
      const updated = {
        ...prev,
        [field]: value,
      };
      const parts = [
        field === 'buildingOrCompany' ? value : prev.buildingOrCompany,
        field === 'streetName' ? value : prev.streetName,
        field === 'areaOrLocality' ? value : prev.areaOrLocality,
        field === 'city' ? value : prev.city,
        field === 'state' ? value : prev.state,
        field === 'pinCode' ? value : prev.pinCode,
        field === 'country' ? value : prev.country,
      ].filter(Boolean);
      if (parts.length > 0) {
        const full = parts.join(', ');
        updated.destinationLocation = full;
        updated.destinationAddress = full;
      }
      return updated;
    });
  };

  const handleLoadExampleTestShipment = () => {
    const firstSup = suppliers[0];
    const firstProd = products[0];
    setShipmentForm({
      customShipmentId: 'SHIP-001',
      lorryId: 'TRUCK-101',
      driverName: 'Ravi Kumar',
      driverContactNumber: '+91 98450 12345',
      currentLatitude: 13.0827,
      currentLongitude: 80.2707,
      gpsTrackingEnabled: true,
      destinationAddress: 'Tech Gateway Logistics Park, 42 Outer Ring Road, Bellandur, Bengaluru, Karnataka, 560103, India',
      destinationLocation: 'Bengaluru, Karnataka, India',
      destinationLatitude: 12.9716,
      destinationLongitude: 77.5946,
      buildingOrCompany: 'Tech Gateway Logistics Park',
      streetName: '42 Outer Ring Road',
      areaOrLocality: 'Bellandur',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560103',
      country: 'India',
      destinationWarehouseId: '',
      expectedDeliveryDate: '2026-10-30',
      expectedDeliveryTime: '18:00',
      supplierId: firstSup?.id || shipmentForm.supplierId,
      productId: firstProd?.id || shipmentForm.productId,
      quantity: 450,
      sourceLocation: 'Chennai Container Freight Station, Chennai, TN, India',
      carrierName: 'Deccan Express Logistics',
      status: 'In Transit',
      trackingReference: 'TRK-SHIP-001-BLR',
      locationSource: 'GPS_DEVICE',
    });
    showSuccess('Section 9 Example Test Shipment (SHIP-001 • TRUCK-101 Chennai to Bengaluru) loaded into form!');
  };

  // Form Submissions
  const handleSubmitSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name || !supplierForm.email) {
      return showError('Supplier name and email are mandatory.');
    }
    setIsSubmitting(true);
    try {
      const created = await api.createSupplier(supplierForm);
      showSuccess(`Supplier ${created.supplierCode} (${created.name}) saved to database!`);
      setSupplierForm({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        location: '',
        reliabilityScore: 95,
        status: 'Active',
      });
      loadLookups();
    } catch (err: any) {
      showError(err.message || 'Failed to save supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.name) {
      return showError('Product name is required.');
    }
    setIsSubmitting(true);
    try {
      const created = await api.createProduct(productForm);
      showSuccess(`Product ${created.productCode} (${created.name}) saved to database!`);
      setProductForm({
        name: '',
        category: 'Semiconductors',
        description: '',
        unitCost: 50,
        status: 'Active',
      });
      loadLookups();
    } catch (err: any) {
      showError(err.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseForm.name || !warehouseForm.location) {
      return showError('Warehouse name and location are required.');
    }
    setIsSubmitting(true);
    try {
      const created = await api.createWarehouse(warehouseForm);
      showSuccess(`Warehouse ${created.warehouseCode} (${created.name}) saved to database!`);
      setWarehouseForm({
        name: '',
        location: '',
        capacity: 12000,
        manager: '',
        status: 'Operational',
      });
      loadLookups();
    } catch (err: any) {
      showError(err.message || 'Failed to save warehouse');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryForm.productId || !inventoryForm.warehouseId) {
      return showError('Product and Warehouse must be selected.');
    }
    if (inventoryForm.availableStock < 0 || inventoryForm.reservedStock < 0) {
      return showError('Stock quantities cannot be negative.');
    }
    setIsSubmitting(true);
    try {
      await api.createOrUpdateInventory(inventoryForm);
      showSuccess(`Inventory record successfully updated in database!`);
    } catch (err: any) {
      showError(err.message || 'Failed to save inventory');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipmentForm.supplierId || !shipmentForm.productId) {
      return showError('Supplier and Product are required.');
    }
    if (shipmentForm.quantity <= 0) {
      return showError('Shipment quantity must be greater than zero.');
    }
    if (!shipmentForm.lorryId?.trim()) {
      return showError('Lorry ID is required.');
    }
    if (!shipmentForm.driverName?.trim()) {
      return showError('Driver Name is required.');
    }

    if (shipmentForm.gpsTrackingEnabled) {
      const lat = Number(shipmentForm.currentLatitude);
      const lng = Number(shipmentForm.currentLongitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        return showError('Current GPS Latitude must be a valid number between -90 and +90.');
      }
      if (isNaN(lng) || lng < -180 || lng > 180) {
        return showError('Current GPS Longitude must be a valid number between -180 and +180.');
      }
    }

    // Validate optional destination coordinates if provided (SEPARATE from lorry current GPS)
    if (shipmentForm.destinationLatitude !== '' && shipmentForm.destinationLatitude !== undefined && shipmentForm.destinationLatitude !== null) {
      const dLat = Number(shipmentForm.destinationLatitude);
      if (isNaN(dLat) || dLat < -90 || dLat > 90) {
        return showError('Destination Latitude must be a valid coordinate between -90 and +90.');
      }
    }
    if (shipmentForm.destinationLongitude !== '' && shipmentForm.destinationLongitude !== undefined && shipmentForm.destinationLongitude !== null) {
      const dLng = Number(shipmentForm.destinationLongitude);
      if (isNaN(dLng) || dLng < -180 || dLng > 180) {
        return showError('Destination Longitude must be a valid coordinate between -180 and +180.');
      }
    }

    // Check unique Shipment ID if entered
    if (shipmentForm.customShipmentId?.trim()) {
      const existing = shipments.find(
        (s) => s.shipmentCode.toLowerCase() === shipmentForm.customShipmentId.trim().toLowerCase()
      );
      if (existing) {
        return showError(`Shipment ID "${shipmentForm.customShipmentId.trim()}" already exists. Shipment ID must be unique.`);
      }
    }

    setIsSubmitting(true);
    try {
      const destAddr = shipmentForm.destinationAddress?.trim() || shipmentForm.destinationLocation?.trim() || undefined;
      const payload: any = {
        ...shipmentForm,
        destinationAddress: destAddr,
        destinationLocation: destAddr,
        destinationLatitude: shipmentForm.destinationLatitude !== '' && shipmentForm.destinationLatitude !== undefined && shipmentForm.destinationLatitude !== null ? Number(shipmentForm.destinationLatitude) : undefined,
        destinationLongitude: shipmentForm.destinationLongitude !== '' && shipmentForm.destinationLongitude !== undefined && shipmentForm.destinationLongitude !== null ? Number(shipmentForm.destinationLongitude) : undefined,
        destinationWarehouseId: shipmentForm.destinationWarehouseId || undefined,
        expectedDeliveryDate: shipmentForm.expectedDeliveryDate || undefined,
        expectedDeliveryTime: shipmentForm.expectedDeliveryTime || undefined,
        driverContactNumber: shipmentForm.driverContactNumber || undefined,
      };
      const created = await api.createShipment(payload);
      showSuccess(`Shipment ${created.shipmentCode} registered successfully and linked to Lorry ${shipmentForm.lorryId}!`);
      loadLookups();
    } catch (err: any) {
      showError(err.message || 'Failed to save shipment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForm.customerName || !orderForm.productId || !orderForm.destinationWarehouseId) {
      return showError('Customer Name, Product, and Warehouse are mandatory.');
    }
    if (orderForm.requiredQuantity <= 0) {
      return showError('Required quantity must be positive.');
    }
    setIsSubmitting(true);
    try {
      const created = await api.createOrder(orderForm);
      showSuccess(`Customer Order ${created.orderCode} registered! Risk score evaluated automatically.`);
      setOrderForm((prev) => ({
        ...prev,
        customerName: '',
        customerContact: '',
        deliveryAddress: '',
        requiredQuantity: 30,
      }));
    } catch (err: any) {
      showError(err.message || 'Failed to save customer order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitDisruption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disruptionForm.description) {
      return showError('Disruption description is required.');
    }
    setIsSubmitting(true);
    try {
      const created = await api.createDisruption(disruptionForm);
      showSuccess(`Disruption ${created.disruptionCode} logged! Ripple impact engine activated.`);
      setDisruptionForm((prev) => ({
        ...prev,
        description: '',
        expectedDelayDays: 4,
        shortageQuantity: 40,
      }));
    } catch (err: any) {
      showError(err.message || 'Failed to log disruption');
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: 'supplier', label: 'A. Add Supplier', icon: Building2 },
    { id: 'product', label: 'B. Add Product', icon: Package },
    { id: 'warehouse', label: 'C. Add Warehouse', icon: Warehouse },
    { id: 'inventory', label: 'D. Add Inventory', icon: Boxes },
    { id: 'shipment', label: 'E. Add Shipment', icon: Truck },
    { id: 'order', label: 'F. Add Customer Order', icon: ShoppingCart },
    { id: 'disruption', label: 'G. Report Disruption', icon: AlertOctagon, highlight: true },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                <PlusCircle className="w-5 h-5" />
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Manual User Input System</h1>
              <span className="text-[10px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded uppercase">
                Core Feature
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Enter real operational supply chain records. All entries are validated, persisted to database, and ingested by the algorithmic intelligence engines.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('data-import')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium underline"
            >
              Need bulk upload? Go to CSV / JSON Import →
            </button>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 px-4 py-3 rounded-xl flex items-center gap-3 text-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl flex items-center gap-3 text-xs animate-in fade-in">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Form Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : tab.highlight
                  ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40 hover:bg-rose-900/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Form Content Area */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
        {/* A. ADD SUPPLIER */}
        {activeTab === 'supplier' && (
          <form onSubmit={handleSubmitSupplier} className="space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Add New Supplier Record
              </h2>
              <p className="text-xs text-slate-400">
                Register an OEM component supplier. ID is automatically generated in database.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Supplier ID</label>
                <input
                  type="text"
                  disabled
                  value="SUP-xxx (Auto-generated on Save)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Foxconn Electronics Ltd"
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. Terry Kuo"
                  value={supplierForm.contactPerson}
                  onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Contact Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. supply@foxconn.com"
                  value={supplierForm.email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="+886-2-2268-3466"
                  value={supplierForm.phone}
                  onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Manufacturing Location</label>
                <input
                  type="text"
                  placeholder="e.g. Taipei, Taiwan"
                  value={supplierForm.location}
                  onChange={(e) => setSupplierForm({ ...supplierForm, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Reliability Score (0 - 100): <span className="text-blue-400 font-bold">{supplierForm.reliabilityScore}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={supplierForm.reliabilityScore}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, reliabilityScore: Number(e.target.value) })
                  }
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Supplier Status</label>
                <select
                  value={supplierForm.status}
                  onChange={(e) => setSupplierForm({ ...supplierForm, status: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                  <option value="High Risk">High Risk</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all"
              >
                Save Supplier
              </button>
              <button
                type="button"
                onClick={() =>
                  setSupplierForm({
                    name: '',
                    contactPerson: '',
                    email: '',
                    phone: '',
                    location: '',
                    reliabilityScore: 95,
                    status: 'Active',
                  })
                }
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-4 py-2.5 rounded-lg border border-slate-700 transition-colors"
              >
                Clear Form
              </button>
            </div>
          </form>
        )}

        {/* B. ADD PRODUCT */}
        {activeTab === 'product' && (
          <form onSubmit={handleSubmitProduct} className="space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-indigo-400" />
                Add New Product / Part
              </h2>
              <p className="text-xs text-slate-400">
                Register an inventory SKU or critical assembly component.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Product ID</label>
                <input
                  type="text"
                  disabled
                  value="PRD-xxx (Auto-generated on Save)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Microcontroller MC-900 Core"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Product Category</label>
                <select
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Semiconductors">Semiconductors</option>
                  <option value="Energy Storage">Energy Storage</option>
                  <option value="Sensors">Sensors</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Power Electronics">Power Electronics</option>
                  <option value="Raw Materials">Raw Materials</option>
                  <option value="Automation">Automation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Unit Cost ($ USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.unitCost}
                  onChange={(e) => setProductForm({ ...productForm, unitCost: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">Product Description</label>
                <textarea
                  rows={2}
                  placeholder="Technical specifications, operating tolerances, and manufacturer notes..."
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Product Status</label>
                <select
                  value={productForm.status}
                  onChange={(e) => setProductForm({ ...productForm, status: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Discontinued">Discontinued</option>
                  <option value="Supply Constrained">Supply Constrained</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all"
              >
                Save Product
              </button>
            </div>
          </form>
        )}

        {/* C. ADD WAREHOUSE */}
        {activeTab === 'warehouse' && (
          <form onSubmit={handleSubmitWarehouse} className="space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Warehouse className="w-5 h-5 text-cyan-400" />
                Add Distribution Warehouse / Hub
              </h2>
              <p className="text-xs text-slate-400">
                Register a logistics depot, fulfillment facility, or cross-dock hub.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Warehouse ID</label>
                <input
                  type="text"
                  disabled
                  value="WH-xxx (Auto-generated on Save)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Warehouse Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chennai Central Logistics Hub"
                  value={warehouseForm.name}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Geographic Location *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chennai, Tamil Nadu, India"
                  value={warehouseForm.location}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, location: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Storage Capacity (Units)</label>
                <input
                  type="number"
                  min="100"
                  value={warehouseForm.capacity}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, capacity: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Warehouse Manager</label>
                <input
                  type="text"
                  placeholder="e.g. Anand Natarajan"
                  value={warehouseForm.manager}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, manager: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Facility Status</label>
                <select
                  value={warehouseForm.status}
                  onChange={(e) => setWarehouseForm({ ...warehouseForm, status: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Operational">Operational</option>
                  <option value="Congested">Congested</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all"
              >
                Save Warehouse
              </button>
            </div>
          </form>
        )}

        {/* D. ADD INVENTORY */}
        {activeTab === 'inventory' && (
          <form onSubmit={handleSubmitInventory} className="space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Boxes className="w-5 h-5 text-orange-400" />
                Add / Update Warehouse Inventory Stock
              </h2>
              <p className="text-xs text-slate-400">
                Maintains inventory balances. Calculates Available-to-Promise (ATP) stock and prevents negative values.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Select Product *</label>
                <select
                  required
                  value={inventoryForm.productId}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, productId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.productCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Select Warehouse Hub *</label>
                <select
                  required
                  value={inventoryForm.warehouseId}
                  onChange={(e) => setInventoryForm({ ...inventoryForm, warehouseId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.warehouseCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Available On-Hand Stock</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={inventoryForm.availableStock}
                  onChange={(e) =>
                    setInventoryForm({ ...inventoryForm, availableStock: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Reserved Stock (Allocated)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={inventoryForm.reservedStock}
                  onChange={(e) =>
                    setInventoryForm({ ...inventoryForm, reservedStock: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Minimum Safety Stock Level</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={inventoryForm.minimumStock}
                  onChange={(e) =>
                    setInventoryForm({ ...inventoryForm, minimumStock: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Computed Available-to-Promise (ATP)
                </label>
                <div className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-400 font-bold">
                  {Math.max(0, inventoryForm.availableStock - inventoryForm.reservedStock)} Units
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all"
              >
                Save Inventory Stock
              </button>
            </div>
          </form>
        )}

        {/* E. ADD SHIPMENT */}
        {activeTab === 'shipment' && (
          <form onSubmit={handleSubmitShipment} className="space-y-6">
            {/* Header & Quick Actions */}
            <div className="border-b border-slate-800 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-cyan-400" />
                  Add New Shipment Record
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Register freight shipment with standalone GPS telematics tracking, optional destination address, and autonomous breakdown monitoring.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadExampleTestShipment}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-900/60 to-blue-900/60 border border-cyan-500/40 text-cyan-300 hover:text-white hover:border-cyan-400 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                  title="Loads Section 9 Test: SHIP-001 / TRUCK-101 (Chennai to Bengaluru)"
                >
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Fill Example Test Shipment (SHIP-001 • TRUCK-101)</span>
                </button>

                <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    id="gpsTrackingCheck"
                    checked={shipmentForm.gpsTrackingEnabled}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, gpsTrackingEnabled: e.target.checked })}
                    className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                  />
                  <label htmlFor="gpsTrackingCheck" className="cursor-pointer font-medium text-cyan-300">
                    Enable GPS Telemetry
                  </label>
                </div>
              </div>
            </div>

            {/* Core 8 Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Field 1: Shipment ID (Required, Unique) */}
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-white flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] inline-flex items-center justify-center font-bold">1</span>
                    Shipment ID *
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono font-semibold">REQUIRED & UNIQUE</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. SHIP-001 or SHIP-8840"
                  value={shipmentForm.customShipmentId}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, customShipmentId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Primary identifier across shipments and telemetry logs.</p>
              </div>

              {/* Field 2: Lorry ID (Required) */}
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-white flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] inline-flex items-center justify-center font-bold">2</span>
                    Lorry ID / Reg *
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono font-semibold">REQUIRED</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. TRUCK-101 or TN-01-AB-1234"
                  value={shipmentForm.lorryId}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, lorryId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">Vehicle registration / fleet asset tag.</p>
              </div>

              {/* Field 3: Driver Name (Required) */}
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-white flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] inline-flex items-center justify-center font-bold">3</span>
                    Driver Name *
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono font-semibold">REQUIRED</span>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ravi Kumar"
                  value={shipmentForm.driverName}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, driverName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <div className="mt-2 flex items-center gap-1.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Driver contact phone (optional)"
                    value={shipmentForm.driverContactNumber}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, driverContactNumber: e.target.value })}
                    className="w-full bg-slate-900/60 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Field 4: Current GPS Latitude (Required when GPS enabled) */}
              <div className="bg-slate-950/70 p-3 rounded-lg border border-cyan-900/40">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] inline-flex items-center justify-center font-bold">4</span>
                    Current GPS Latitude {shipmentForm.gpsTrackingEnabled && '*'}
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono font-semibold">-90.0 to +90.0</span>
                </div>
                <input
                  type="number"
                  step="0.000001"
                  min="-90"
                  max="90"
                  required={shipmentForm.gpsTrackingEnabled}
                  value={shipmentForm.currentLatitude}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, currentLatitude: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-cyan-800/60 rounded-lg px-3 py-2 text-xs text-cyan-200 font-mono focus:outline-none focus:border-cyan-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">Current lorry position (isolated from destination).</p>
              </div>

              {/* Field 5: Current GPS Longitude (Required when GPS enabled) */}
              <div className="bg-slate-950/70 p-3 rounded-lg border border-cyan-900/40">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] inline-flex items-center justify-center font-bold">5</span>
                    Current GPS Longitude {shipmentForm.gpsTrackingEnabled && '*'}
                  </label>
                  <span className="text-[10px] text-cyan-400 font-mono font-semibold">-180.0 to +180.0</span>
                </div>
                <input
                  type="number"
                  step="0.000001"
                  min="-180"
                  max="180"
                  required={shipmentForm.gpsTrackingEnabled}
                  value={shipmentForm.currentLongitude}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, currentLongitude: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-cyan-800/60 rounded-lg px-3 py-2 text-xs text-cyan-200 font-mono focus:outline-none focus:border-cyan-400"
                />
                <p className="text-[10px] text-slate-400 mt-1">Current lorry position (isolated from destination).</p>
              </div>

              {/* Field 7: Expected Delivery Date (Optional) */}
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-white flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-emerald-400 text-[10px] inline-flex items-center justify-center font-bold">7</span>
                    Expected Delivery Date
                  </label>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    OPTIONAL
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="date"
                    value={shipmentForm.expectedDeliveryDate}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, expectedDeliveryDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Optional. Tracking operates normally if blank.</p>
              </div>

              {/* Field 8: Expected Delivery Time (Optional) */}
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-white flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-emerald-400 text-[10px] inline-flex items-center justify-center font-bold">8</span>
                    Expected Delivery Time
                  </label>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    OPTIONAL
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="time"
                    value={shipmentForm.expectedDeliveryTime}
                    onChange={(e) => setShipmentForm({ ...shipmentForm, expectedDeliveryTime: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Optional 24h arrival schedule (e.g. 18:00).</p>
              </div>

              {/* Destination Warehouse Hub (Optional) */}
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Destination Warehouse Hub <span className="text-[10px] text-emerald-400">(Optional)</span>
                </label>
                <select
                  value={shipmentForm.destinationWarehouseId}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, destinationWarehouseId: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- No specific warehouse assigned --</option>
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.location})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Link to internal warehouse inventory.</p>
              </div>

              {/* Location Telemetry Source */}
              <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                <label className="block text-xs font-medium text-slate-300 mb-1">Location Data Source</label>
                <select
                  value={shipmentForm.locationSource}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, locationSource: e.target.value as any })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="GPS_DEVICE">GPS_DEVICE (Physical Hardware Telematics)</option>
                  <option value="GPS_API">GPS_API (Fleet API / Telematics Partner)</option>
                  <option value="SIMULATED">SIMULATED (Software Emulation Mode)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">Telemetry pipeline provider classification.</p>
              </div>
            </div>

            {/* Field 6: Complete Destination Address Section (OPTIONAL) */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs inline-flex items-center justify-center font-bold">6</span>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      Destination Address & Separate Coordinates
                    </h3>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      OPTIONAL
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enter destination address manually or pin on map. Coordinates are stored in separate dedicated fields.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDestMapModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-all self-start sm:self-auto"
                >
                  <Map className="w-3.5 h-3.5" />
                  <span>Select Destination on Map (Leaflet)</span>
                </button>
              </div>

              {/* Full Address Input */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Destination Address <span className="text-[10px] text-slate-500">(Manual input or generated from map/address fields)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Bengaluru, Karnataka, India or Tech Park Hub, Electronic City, Bengaluru, Karnataka, 560100, India"
                  value={shipmentForm.destinationLocation}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, destinationLocation: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Dedicated Destination Coordinates (Explicitly Isolated from Current GPS) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                <div>
                  <label className="block text-[11px] font-medium text-emerald-300 mb-1">
                    Destination Latitude <span className="text-[10px] text-slate-400">(-90.0 to +90.0, Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    min="-90"
                    max="90"
                    placeholder="e.g. 12.9716"
                    value={shipmentForm.destinationLatitude}
                    onChange={(e) =>
                      setShipmentForm({
                        ...shipmentForm,
                        destinationLatitude: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-emerald-900/60 rounded px-2.5 py-1.5 text-xs text-emerald-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Separate from current lorry GPS latitude.</p>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-emerald-300 mb-1">
                    Destination Longitude <span className="text-[10px] text-slate-400">(-180.0 to +180.0, Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    min="-180"
                    max="180"
                    placeholder="e.g. 77.5946"
                    value={shipmentForm.destinationLongitude}
                    onChange={(e) =>
                      setShipmentForm({
                        ...shipmentForm,
                        destinationLongitude: e.target.value === '' ? '' : Number(e.target.value),
                      })
                    }
                    className="w-full bg-slate-950 border border-emerald-900/60 rounded px-2.5 py-1.5 text-xs text-emerald-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-0.5">Separate from current lorry GPS longitude.</p>
                </div>
              </div>

              {/* Complete Address Breakdown Fields */}
              <div className="pt-2">
                <p className="text-[11px] font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Detailed Address Breakdown (Building, Street, Area, City, State, PIN, Country)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Building / Company</label>
                    <input
                      type="text"
                      placeholder="e.g. Tech Park Phase 2"
                      value={shipmentForm.buildingOrCompany}
                      onChange={(e) => handleAddressFieldChange('buildingOrCompany', e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Street Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Hosur Main Road"
                      value={shipmentForm.streetName}
                      onChange={(e) => handleAddressFieldChange('streetName', e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Area / Locality</label>
                    <input
                      type="text"
                      placeholder="e.g. Electronic City"
                      value={shipmentForm.areaOrLocality}
                      onChange={(e) => handleAddressFieldChange('areaOrLocality', e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">City</label>
                    <input
                      type="text"
                      placeholder="e.g. Bengaluru"
                      value={shipmentForm.city}
                      onChange={(e) => handleAddressFieldChange('city', e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">State / Province</label>
                    <input
                      type="text"
                      placeholder="e.g. Karnataka"
                      value={shipmentForm.state}
                      onChange={(e) => handleAddressFieldChange('state', e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Postal / PIN Code</label>
                    <input
                      type="text"
                      placeholder="e.g. 560100"
                      value={shipmentForm.pinCode}
                      onChange={(e) => handleAddressFieldChange('pinCode', e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-400 mb-1">Country</label>
                    <input
                      type="text"
                      placeholder="e.g. India"
                      value={shipmentForm.country}
                      onChange={(e) => handleAddressFieldChange('country', e.target.value)}
                      className="w-full bg-slate-900/80 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Freight Details (Origin, Product, Quantity, Carrier, Status) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2 border-t border-slate-800">
              {/* Origin Supplier */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Origin Supplier *</label>
                <select
                  required
                  value={shipmentForm.supplierId}
                  onChange={(e) => {
                    const sup = suppliers.find((s) => s.id === e.target.value);
                    setShipmentForm({
                      ...shipmentForm,
                      supplierId: e.target.value,
                      sourceLocation: sup ? sup.location : shipmentForm.sourceLocation,
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location})
                    </option>
                  ))}
                </select>
              </div>

              {/* In-Transit Product */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">In-Transit Product *</label>
                <select
                  required
                  value={shipmentForm.productId}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, productId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.productCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Quantity (Units) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={shipmentForm.quantity}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, quantity: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Carrier Name */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Carrier / Logistics *</label>
                <input
                  type="text"
                  required
                  value={shipmentForm.carrierName}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, carrierName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Shipment Status */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Shipment Status</label>
                <select
                  value={shipmentForm.status}
                  onChange={(e) => setShipmentForm({ ...shipmentForm, status: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-semibold"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Delayed">Delayed</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <div className="text-[11px] text-slate-400">
                Note: Destination and expected delivery schedule are fully optional. Lorry GPS tracking functions independently.
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-1.5"
                >
                  <Truck className="w-4 h-4" />
                  <span>Save Shipment & Initialize GPS Tracking</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* F. ADD CUSTOMER ORDER */}
        {activeTab === 'order' && (
          <form onSubmit={handleSubmitOrder} className="space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-400" />
                Add Customer Order
              </h2>
              <p className="text-xs text-slate-400">
                Register a customer purchase order. Order risk score is evaluated immediately.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Order ID</label>
                <input
                  type="text"
                  disabled
                  value="ORD-xxx (Auto-generated on Save)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Motors EV Division"
                  value={orderForm.customerName}
                  onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Customer Contact Email</label>
                <input
                  type="email"
                  placeholder="orders@tatamotors.com"
                  value={orderForm.customerContact}
                  onChange={(e) => setOrderForm({ ...orderForm, customerContact: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Required Product *</label>
                <select
                  required
                  value={orderForm.productId}
                  onChange={(e) => setOrderForm({ ...orderForm, productId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (${p.unitCost})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Required Quantity (Units) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={orderForm.requiredQuantity}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, requiredQuantity: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Fulfilling Warehouse Hub *
                </label>
                <select
                  required
                  value={orderForm.destinationWarehouseId}
                  onChange={(e) =>
                    setOrderForm({ ...orderForm, destinationWarehouseId: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Delivery Deadline Date *
                </label>
                <input
                  type="date"
                  required
                  value={orderForm.deliveryDeadline}
                  onChange={(e) => setOrderForm({ ...orderForm, deliveryDeadline: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Order Priority</label>
                <select
                  value={orderForm.priority}
                  onChange={(e) => setOrderForm({ ...orderForm, priority: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-all"
              >
                Save Customer Order
              </button>
            </div>
          </form>
        )}

        {/* G. REPORT DISRUPTION */}
        {activeTab === 'disruption' && (
          <form onSubmit={handleSubmitDisruption} className="space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-400" />
                Report Supply Chain Disruption
              </h2>
              <p className="text-xs text-slate-400">
                Log a vendor delay, port congestion, or material shortage. Feeds the Ripple Impact and Recovery Twin.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Disruption ID</label>
                <input
                  type="text"
                  disabled
                  value="DIS-xxx (Auto-generated on Save)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Disruption Type</label>
                <select
                  value={disruptionForm.disruptionType}
                  onChange={(e) =>
                    setDisruptionForm({ ...disruptionForm, disruptionType: e.target.value as any })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Supplier Delay">Supplier Delay</option>
                  <option value="Shipment Delay">Shipment Delay</option>
                  <option value="Inventory Shortage">Inventory Shortage</option>
                  <option value="Warehouse Disruption">Warehouse Disruption</option>
                  <option value="Transportation Disruption">Transportation Disruption</option>
                  <option value="Unexpected Demand">Unexpected Demand</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Related Supplier</label>
                <select
                  value={disruptionForm.relatedSupplierId}
                  onChange={(e) =>
                    setDisruptionForm({ ...disruptionForm, relatedSupplierId: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">None / Unknown</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Related Shipment</label>
                <select
                  value={disruptionForm.relatedShipmentId}
                  onChange={(e) =>
                    setDisruptionForm({ ...disruptionForm, relatedShipmentId: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">None / General Disruption</option>
                  {shipments.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.shipmentCode} - {s.carrierName} ({s.quantity} units)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Affected Warehouse</label>
                <select
                  value={disruptionForm.affectedWarehouseId}
                  onChange={(e) =>
                    setDisruptionForm({ ...disruptionForm, affectedWarehouseId: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.location})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Affected Product</label>
                <select
                  value={disruptionForm.affectedProductId}
                  onChange={(e) =>
                    setDisruptionForm({ ...disruptionForm, affectedProductId: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Expected Inbound Delay (Days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={disruptionForm.expectedDelayDays}
                  onChange={(e) =>
                    setDisruptionForm({
                      ...disruptionForm,
                      expectedDelayDays: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Severity Level</label>
                <select
                  value={disruptionForm.severity}
                  onChange={(e) =>
                    setDisruptionForm({ ...disruptionForm, severity: e.target.value as any })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Disruption Description *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail root cause: e.g. Factory machinery breakdown, typhoon at port, customs quarantine..."
                  value={disruptionForm.description}
                  onChange={(e) =>
                    setDisruptionForm({ ...disruptionForm, description: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-sm transition-all"
              >
                Log Disruption & Calculate Impact
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Destination Map Picker Modal */}
      {isDestMapModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col">
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Select Destination on Interactive Map</h3>
                  <p className="text-[11px] text-slate-400">Click anywhere on OpenStreetMap to pin destination coordinates.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDestMapModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs bg-slate-950 px-3 py-2 rounded-lg border border-slate-800">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-emerald-400" />
                  <span className="text-slate-300">
                    Pinned Coordinates:{' '}
                    <span className="text-emerald-400 font-mono font-semibold">
                      {destMapPinnedCoords ? `${destMapPinnedCoords.lat.toFixed(5)}, ${destMapPinnedCoords.lng.toFixed(5)}` : 'None selected (Click map)'}
                    </span>
                  </span>
                </div>
                {destMapAddrText && (
                  <span className="text-[11px] text-slate-400 truncate max-w-xs" title={destMapAddrText}>
                    {destMapAddrText}
                  </span>
                )}
              </div>

              {/* Map Canvas Container */}
              <div
                ref={destMapContainerRef}
                className="w-full h-80 rounded-lg border border-slate-800 overflow-hidden bg-slate-950 relative"
                style={{ minHeight: '320px' }}
              />

              <p className="text-[11px] text-slate-400 italic">
                * Note: Destination coordinates are stored independently from current lorry coordinates.
              </p>
            </div>

            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDestMapModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMapDestination}
                disabled={!destMapPinnedCoords}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:pointer-events-none text-xs font-semibold text-white transition-colors flex items-center gap-1.5"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Confirm Pinned Destination</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
