import 'server-only';

import { sendEmail } from './send';

type FuelConfirmationStoreItem = {
  itemName: string;
  quantity: number;
  subtotalPrice: number;
};

type FuelConfirmationParams = {
  email: string;
  customerName?: string | null;
  orderId: number;
  requestId: number;
  stationName: string;
  stationAddress: string;
  slotStart: Date | string;
  slotEnd: Date | string;
  vehicleLabel: string;
  fuelGrade: string;
  requestTypeLabel: string;
  requestedAmountLabel: string | null;
  specialInstructions?: string | null;
  fuelEstimate: number | null;
  serviceFee: number;
  addonTotal: number;
  totalEstimate: number;
  storeItems: FuelConfirmationStoreItem[];
};

type StoreConfirmationItem = {
  itemName: string;
  quantity: number;
  subtotalPrice: number;
};

type StoreConfirmationParams = {
  email: string;
  customerName?: string | null;
  orderId: number;
  stationName: string;
  stationAddress: string;
  pickupModeLabel: string;
  pickupWindowLabel: string;
  vehicleLabel: string;
  customerNotes?: string | null;
  totalAmount: number;
  items: StoreConfirmationItem[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

function formatDateTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
}

function formatAddress(parts: string[]) {
  return parts.filter(Boolean).join(', ');
}

function renderLineItems(
  items: Array<{ itemName: string; quantity: number; subtotalPrice: number }>
) {
  if (items.length === 0) {
    return '';
  }

  return items
    .map(
      (item) =>
        `<li style="margin: 0 0 8px;">
          ${escapeHtml(item.itemName)} x ${item.quantity}
          <span style="float: right;">${escapeHtml(formatCurrency(item.subtotalPrice))}</span>
        </li>`
    )
    .join('');
}

function textLineItems(
  items: Array<{ itemName: string; quantity: number; subtotalPrice: number }>
) {
  if (items.length === 0) {
    return [];
  }

  return items.map(
    (item) =>
      `- ${item.itemName} x ${item.quantity} (${formatCurrency(item.subtotalPrice)})`
  );
}

export async function sendFuelOrderConfirmationEmail({
  email,
  customerName,
  orderId,
  requestId,
  stationName,
  stationAddress,
  slotStart,
  slotEnd,
  vehicleLabel,
  fuelGrade,
  requestTypeLabel,
  requestedAmountLabel,
  specialInstructions,
  fuelEstimate,
  serviceFee,
  addonTotal,
  totalEstimate,
  storeItems
}: FuelConfirmationParams) {
  const subject = `GasBite booking confirmed: Order #${orderId}`;
  const safeName = customerName?.trim() ? customerName.trim() : 'there';
  const slotLabel = `${formatDateTime(slotStart)} - ${formatDateTime(slotEnd)}`;
  const safeAddress = formatAddress([stationName, stationAddress]);

  const text = [
    `Hi ${safeName},`,
    '',
    `Your GasBite booking is confirmed.`,
    `Order #: ${orderId}`,
    `Request #: ${requestId}`,
    `Location: ${safeAddress}`,
    `Service window: ${slotLabel}`,
    `Vehicle: ${vehicleLabel}`,
    `Fuel grade: ${fuelGrade}`,
    `Request type: ${requestTypeLabel}`,
    ...(requestedAmountLabel ? [`Requested amount: ${requestedAmountLabel}`] : []),
    ...(storeItems.length > 0 ? ['', 'Store items:', ...textLineItems(storeItems)] : []),
    ...(specialInstructions ? ['', `Notes: ${specialInstructions}`] : []),
    '',
    `Fuel estimate: ${fuelEstimate !== null ? formatCurrency(fuelEstimate) : 'Calculated at arrival'}`,
    `Service fee: ${formatCurrency(serviceFee)}`,
    `Store add-ons: ${formatCurrency(addonTotal)}`,
    `Estimated total: ${formatCurrency(totalEstimate)}`,
    '',
    'Thanks for booking with GasBite.'
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <h1 style="margin: 0 0 16px; font-size: 28px;">Your GasBite booking is confirmed</h1>
      <p style="margin: 0 0 20px; line-height: 1.6;">Hi ${escapeHtml(safeName)}, your order is locked in and ready for the service window below.</p>
      <div style="border: 1px solid #e2e8f0; border-radius: 20px; padding: 20px; margin-bottom: 20px; background: #fff;">
        <p style="margin: 0 0 8px;"><strong>Order #:</strong> ${orderId}</p>
        <p style="margin: 0 0 8px;"><strong>Request #:</strong> ${requestId}</p>
        <p style="margin: 0 0 8px;"><strong>Location:</strong> ${escapeHtml(safeAddress)}</p>
        <p style="margin: 0 0 8px;"><strong>Service window:</strong> ${escapeHtml(slotLabel)}</p>
        <p style="margin: 0 0 8px;"><strong>Vehicle:</strong> ${escapeHtml(vehicleLabel)}</p>
        <p style="margin: 0 0 8px;"><strong>Fuel grade:</strong> ${escapeHtml(fuelGrade)}</p>
        <p style="margin: 0 0 8px;"><strong>Request type:</strong> ${escapeHtml(requestTypeLabel)}</p>
        ${
          requestedAmountLabel
            ? `<p style="margin: 0 0 8px;"><strong>Requested amount:</strong> ${escapeHtml(requestedAmountLabel)}</p>`
            : ''
        }
        ${
          specialInstructions
            ? `<p style="margin: 0;"><strong>Notes:</strong> ${escapeHtml(specialInstructions)}</p>`
            : ''
        }
      </div>
      ${
        storeItems.length > 0
          ? `<div style="border: 1px solid #e2e8f0; border-radius: 20px; padding: 20px; margin-bottom: 20px; background: #fff;">
              <h2 style="margin: 0 0 12px; font-size: 18px;">Add-ons</h2>
              <ul style="margin: 0; padding-left: 20px; line-height: 1.7;">
                ${renderLineItems(storeItems)}
              </ul>
            </div>`
          : ''
      }
      <div style="border: 1px solid #fed7aa; border-radius: 20px; padding: 20px; background: #fff7ed;">
        <p style="margin: 0 0 8px;"><strong>Fuel estimate:</strong> ${escapeHtml(
          fuelEstimate !== null ? formatCurrency(fuelEstimate) : 'Calculated at arrival'
        )}</p>
        <p style="margin: 0 0 8px;"><strong>Service fee:</strong> ${escapeHtml(formatCurrency(serviceFee))}</p>
        <p style="margin: 0 0 8px;"><strong>Store add-ons:</strong> ${escapeHtml(formatCurrency(addonTotal))}</p>
        <p style="margin: 0;"><strong>Estimated total:</strong> ${escapeHtml(formatCurrency(totalEstimate))}</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    text
  });
}

export async function sendStoreOrderConfirmationEmail({
  email,
  customerName,
  orderId,
  stationName,
  stationAddress,
  pickupModeLabel,
  pickupWindowLabel,
  vehicleLabel,
  customerNotes,
  totalAmount,
  items
}: StoreConfirmationParams) {
  const subject = `GasBite store order confirmed: Order #${orderId}`;
  const safeName = customerName?.trim() ? customerName.trim() : 'there';
  const safeAddress = formatAddress([stationName, stationAddress]);

  const text = [
    `Hi ${safeName},`,
    '',
    `Your GasBite store order is confirmed.`,
    `Order #: ${orderId}`,
    `Pickup location: ${safeAddress}`,
    `Pickup mode: ${pickupModeLabel}`,
    `Pickup time: ${pickupWindowLabel}`,
    `Vehicle: ${vehicleLabel}`,
    '',
    'Items:',
    ...textLineItems(items),
    ...(customerNotes ? ['', `Notes: ${customerNotes}`] : []),
    '',
    `Order total: ${formatCurrency(totalAmount)}`,
    '',
    'Thanks for ordering with GasBite.'
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #0f172a;">
      <h1 style="margin: 0 0 16px; font-size: 28px;">Your GasBite order is confirmed</h1>
      <p style="margin: 0 0 20px; line-height: 1.6;">Hi ${escapeHtml(safeName)}, your store order is confirmed and ready for the pickup details below.</p>
      <div style="border: 1px solid #e2e8f0; border-radius: 20px; padding: 20px; margin-bottom: 20px; background: #fff;">
        <p style="margin: 0 0 8px;"><strong>Order #:</strong> ${orderId}</p>
        <p style="margin: 0 0 8px;"><strong>Pickup location:</strong> ${escapeHtml(safeAddress)}</p>
        <p style="margin: 0 0 8px;"><strong>Pickup mode:</strong> ${escapeHtml(pickupModeLabel)}</p>
        <p style="margin: 0 0 8px;"><strong>Pickup time:</strong> ${escapeHtml(pickupWindowLabel)}</p>
        <p style="margin: 0;"><strong>Vehicle:</strong> ${escapeHtml(vehicleLabel)}</p>
      </div>
      <div style="border: 1px solid #e2e8f0; border-radius: 20px; padding: 20px; margin-bottom: 20px; background: #fff;">
        <h2 style="margin: 0 0 12px; font-size: 18px;">Items</h2>
        <ul style="margin: 0; padding-left: 20px; line-height: 1.7;">
          ${renderLineItems(items)}
        </ul>
      </div>
      ${
        customerNotes
          ? `<div style="border: 1px solid #e2e8f0; border-radius: 20px; padding: 20px; margin-bottom: 20px; background: #fff;">
              <p style="margin: 0;"><strong>Notes:</strong> ${escapeHtml(customerNotes)}</p>
            </div>`
          : ''
      }
      <div style="border: 1px solid #fed7aa; border-radius: 20px; padding: 20px; background: #fff7ed;">
        <p style="margin: 0;"><strong>Order total:</strong> ${escapeHtml(formatCurrency(totalAmount))}</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: email,
    subject,
    html,
    text
  });
}
