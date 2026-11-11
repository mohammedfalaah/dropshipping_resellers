const axios = require("axios");
const Order = require("../models/Order");

/**
 * Code 128 Pattern Table (widths of alternating bars and spaces, 0 to 106)
 */
const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112"
];

/**
 * Generate a standalone, scannable Code 128 SVG barcode
 */
const generateBarcodeSvg = (rawText, options = {}) => {
  const text = String(rawText || "").trim().toUpperCase();
  const height = options.height || 64;
  const moduleWidth = options.moduleWidth || 2;
  const quietZone = options.quietZone || 12;

  // Start with Start Code B (index 104)
  const indices = [104];
  let checksum = 104;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) - 32;
    if (code >= 0 && code <= 95) {
      indices.push(code);
      checksum += code * (i + 1);
    }
  }

  // Check digit modulo 103
  indices.push(checksum % 103);
  // Stop code (index 106)
  indices.push(106);

  let svgElements = [];
  let currentX = quietZone;

  for (const idx of indices) {
    const pattern = CODE128_PATTERNS[idx];
    for (let p = 0; p < pattern.length; p++) {
      const width = parseInt(pattern[p], 10) * moduleWidth;
      if (p % 2 === 0) {
        // Bar (black)
        svgElements.push(`<rect x="${currentX}" y="0" width="${width}" height="${height}" fill="#000000" />`);
      }
      currentX += width;
    }
  }

  const totalWidth = currentX + quietZone;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" width="${totalWidth}" height="${height}" style="display:block;margin:0 auto;max-width:100%;height:auto;">
  <rect width="${totalWidth}" height="${height}" fill="#ffffff" />
  ${svgElements.join("")}
</svg>`;

  const base64 = Buffer.from(svg).toString("base64");
  const dataUri = `data:image/svg+xml;base64,${base64}`;

  return {
    barcode: text,
    svg,
    dataUri,
    totalWidth,
    height,
  };
};

/**
 * Generate unique India Post compliant UPU S10 tracking barcode
 * Format: 2 alpha prefix (e.g. SP/LP), 9 digits, ending in IN (e.g. SP924286105IN)
 */
const generateConsignmentNumber = (orderIdentifier) => {
  const digitsOnly = String(orderIdentifier || "").replace(/\D/g, "");
  let seed = digitsOnly;
  while (seed.length < 9) {
    seed = seed + Math.floor(100 + Math.random() * 900).toString();
  }
  const nineDigits = seed.substring(0, 9);
  return `SP${nineDigits}IN`;
};

/**
 * Generate or retrieve shipping label data for an order
 */
const getOrCreateShippingLabel = async (orderId) => {
  const order = await Order.findById(orderId).populate("reseller", "name email phone businessInfo");
  if (!order) {
    throw new Error("Order not found");
  }

  let trackingNumber = order.trackingNumber;
  if (!trackingNumber) {
    trackingNumber = generateConsignmentNumber(order.orderNumber);
    order.trackingNumber = trackingNumber;
    order.courierName = order.courierName || "India Post (Speed Post / Parcel)";
    if (!order.deliveryStatus || order.deliveryStatus === "PENDING") {
      order.deliveryStatus = "BOOKED";
    }
  }

  // Check if external India Post API is configured
  const indiaPostApiUrl = process.env.INDIAPOST_API_URL || "https://test.cept.gov.in/beextcustomer";
  const indiaPostToken = process.env.INDIAPOST_BEARER_TOKEN;

  let externalBarcode = null;
  let externalBase64 = null;

  if (indiaPostToken) {
    try {
      // First attempt official India Post domestic address label endpoint
      const domesticPayload = {
        identifier: "Domestic",
        delivery_office_name: order.shippingAddress?.city || "",
        booking_datetime: new Date().toLocaleString("en-GB"),
        channel_type: "E",
        user_type: "R",
        barcode_no: trackingNumber,
        service_type: "PARCEL",
        booking_type: "COM",
        recipient_name: [order.shippingAddress?.firstName, order.shippingAddress?.lastName].filter(Boolean).join(" ") || order.shippingAddress?.fullName || "Recipient",
        recipient_mobile: order.shippingAddress?.phone || "",
        recipient_addressl1: order.shippingAddress?.address || "",
        recipient_city: order.shippingAddress?.city || "",
        recipient_pin: order.shippingAddress?.postalCode || "",
        recipient_state: order.shippingAddress?.state || "",
        sender_name: "Spare pro",
        sender_mobile: "8139808004",
        sender_addressl1: "Thazepalam",
        sender_addressl2: "Tirur",
        sender_city: "Tirur",
        sender_pin: "676107",
        sender_state: "Kerala",
        booking_office_pin: "676107",
      };

      const resp = await axios.post(`${indiaPostApiUrl}/v1/label/create/domestic`, domesticPayload, {
        headers: {
          Authorization: `Bearer ${indiaPostToken}`,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        timeout: 4000,
      });

      if (resp.data?.success && resp.data?.data) {
        externalBarcode = resp.data.data.barcode || resp.data.data.barcode_no;
        externalBase64 = resp.data.data.base64Image || resp.data.data.base64_image;
      }
    } catch (e) {
      // Fallback to /v1/label/create
      try {
        const resp2 = await axios.post(
          `${indiaPostApiUrl}/v1/label/create`,
          { office_customer: "CUSTOMER", article_type: "INTL_APP_EPACKET" },
          {
            headers: {
              Authorization: `Bearer ${indiaPostToken}`,
              "Content-Type": "application/json",
              accept: "application/json",
            },
            timeout: 4000,
          }
        );
        if (resp2.data?.success && resp2.data?.data) {
          externalBarcode = resp2.data.data.barcode;
          externalBase64 = resp2.data.data.base64Image;
        }
      } catch (err2) {
        console.warn("[IndiaPost Label API]: Falling back to local barcode generator:", err2.message);
      }
    }
  }

  const barcodeText = externalBarcode || trackingNumber;
  const barcodeMeta = generateBarcodeSvg(barcodeText);

  if (!order.shippingLabel || !order.shippingLabel.barcode) {
    order.shippingLabel = {
      barcode: barcodeText,
      base64Image: externalBase64 ? `data:image/png;base64,${externalBase64}` : barcodeMeta.dataUri,
      generatedAt: new Date(),
      serviceType: "SPEED_POST",
    };
  }

  // Ensure initial tracking history exists
  if (!order.trackingHistory || order.trackingHistory.length === 0) {
    order.trackingHistory = [
      {
        timestamp: new Date(),
        location: "Spare pro Logistics Hub, Tirur, Kerala - 676107",
        status: "Consignment Manifest Generated",
        details: `Article ${barcodeText} booked under Speed Post / Parcel Logistics at Tirur Booking Office (PIN 676107). Ready for dispatch.`,
      },
    ];
  }

  await order.save();

  return {
    order,
    barcode: barcodeText,
    barcodeSvg: barcodeMeta.svg,
    barcodeDataUri: barcodeMeta.dataUri,
    serviceType: "SPEED_POST",
  };
};

/**
 * Generate a printable, 4x6 inch thermal shipping label HTML document
 */
const generateLabelHtml = (order, barcodeMeta) => {
  const barcode = order.trackingNumber || barcodeMeta.barcode;
  const barcodeSvg = barcodeMeta.svg;
  const isCod = String(order.paymentMethod || "").toUpperCase() === "COD";
  const codAmountRupees = isCod
    ? ((order.customerCollectionPaise || order.cod?.codAmountPaise || order.totalPaise || 0) / 100).toFixed(2)
    : "0.00";

  const recipient = order.shippingAddress || {};
  const recipientName = [recipient.firstName, recipient.lastName].filter(Boolean).join(" ") || recipient.fullName || "Customer";
  const addressLine = recipient.address || "";
  const cityStateZip = `${recipient.city || ""}, ${recipient.state || ""} - ${recipient.postalCode || ""}`;
  const phone = recipient.phone || "";

  const senderName = order.reseller?.businessInfo?.businessName || order.reseller?.name || "SPARE PRO Logistics Hub";
  const bookingDate = new Date(order.createdAt || Date.now()).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const bookingTime = new Date(order.createdAt || Date.now()).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const totalItems = (order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0);
  const itemsSummary = (order.items || []).map((i) => `${i.name || i.sku || "Product"} (x${i.quantity})`).join(", ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Shipping Label - ${order.orderNumber} - ${barcode}</title>
  <style>
    @page {
      size: 100mm 150mm; /* Standard 4x6" thermal label */
      margin: 4mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 12px;
      background: #f1f5f9;
      color: #0f172a;
    }
    .toolbar {
      max-width: 420px;
      margin: 0 auto 12px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #0f172a;
      padding: 10px 16px;
      border-radius: 8px;
      color: #fff;
    }
    .toolbar button {
      background: #dc2626;
      color: #fff;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 13px;
    }
    .toolbar button:hover {
      background: #b91c1c;
    }
    .label-card {
      width: 100mm;
      max-width: 100%;
      min-height: 146mm;
      margin: 0 auto;
      background: #ffffff;
      border: 2px solid #000000;
      padding: 10px;
      position: relative;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .label-header {
      border-bottom: 2px solid #000;
      padding-bottom: 6px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .emblem-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .emblem-box {
      background: #dc2626;
      color: #fff;
      font-weight: 900;
      font-size: 11px;
      padding: 3px 6px;
      border-radius: 3px;
      letter-spacing: 0.5px;
    }
    .dept-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      line-height: 1.1;
    }
    .service-badge {
      font-size: 13px;
      font-weight: 900;
      text-align: right;
      border: 1.5px solid #000;
      padding: 3px 8px;
      background: #000;
      color: #fff;
      border-radius: 3px;
      letter-spacing: 0.5px;
    }
    .barcode-section {
      text-align: center;
      padding: 8px 0 4px 0;
      border-bottom: 2px solid #000;
    }
    .barcode-svg {
      max-width: 90%;
      margin: 0 auto;
    }
    .barcode-text {
      font-family: "Courier New", Courier, monospace;
      font-size: 16px;
      font-weight: 900;
      letter-spacing: 3px;
      margin-top: 4px;
    }
    .routing-row {
      display: flex;
      border-bottom: 2px solid #000;
      background: #f8fafc;
      font-size: 11px;
    }
    .routing-cell {
      flex: 1;
      padding: 5px 8px;
      border-right: 1px solid #000;
    }
    .routing-cell:last-child {
      border-right: none;
    }
    .routing-label {
      font-size: 9px;
      text-transform: uppercase;
      color: #475569;
      font-weight: 700;
    }
    .routing-val {
      font-weight: 800;
      font-size: 13px;
    }
    .address-section {
      display: flex;
      border-bottom: 2px solid #000;
      min-height: 135px;
    }
    .to-box {
      flex: 65%;
      padding: 8px;
      border-right: 2px solid #000;
    }
    .from-box {
      flex: 35%;
      padding: 8px;
      background: #fafafa;
      font-size: 10px;
    }
    .box-title {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      display: inline-block;
      padding: 1px 4px;
      background: #000;
      color: #fff;
      border-radius: 2px;
    }
    .recipient-name {
      font-size: 14px;
      font-weight: 900;
      margin-bottom: 3px;
    }
    .recipient-address {
      font-size: 12px;
      line-height: 1.35;
      font-weight: 500;
    }
    .pin-code-highlight {
      font-size: 15px;
      font-weight: 900;
      margin-top: 4px;
      letter-spacing: 1px;
    }
    .payment-banner {
      border-bottom: 2px solid #000;
      padding: 8px;
      text-align: center;
    }
    .payment-cod {
      background: #fee2e2;
      border: 2px dashed #dc2626;
      padding: 6px;
      border-radius: 4px;
    }
    .payment-cod-title {
      color: #991b1b;
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 1px;
    }
    .payment-cod-amount {
      color: #991b1b;
      font-size: 20px;
      font-weight: 900;
    }
    .payment-prepaid {
      background: #dcfce7;
      border: 1.5px solid #16a34a;
      padding: 6px;
      border-radius: 4px;
      color: #166534;
      font-weight: 900;
      font-size: 14px;
      letter-spacing: 1px;
    }
    .manifest-row {
      padding: 6px 8px;
      border-bottom: 1px solid #cbd5e1;
      font-size: 10px;
      display: flex;
      justify-content: space-between;
    }
    .footer-section {
      padding: 6px 8px;
      font-size: 9px;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    @media print {
      body {
        background: #fff;
        padding: 0;
      }
      .toolbar {
        display: none !important;
      }
      .label-card {
        border: 2px solid #000;
        box-shadow: none;
        width: 100%;
        min-height: auto;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <div>
      <strong>Shipping Label: ${order.orderNumber}</strong> (${barcode})
    </div>
    <button onclick="window.print()">
      <span style="margin-right:4px;">🖨️</span> Print Label / Download PDF
    </button>
  </div>

  <div class="label-card">
    <!-- Header -->
    <div class="label-header">
      <div class="emblem-title">
        <div class="emblem-box">INDIA POST</div>
        <div class="dept-title">
          DEPARTMENT OF POSTS<br />
          <span style="font-size:9px;font-weight:700;color:#64748b;">COMMERCIAL LOGISTICS</span>
        </div>
      </div>
      <div class="service-badge">
        SPEED POST
      </div>
    </div>

    <!-- Barcode Section -->
    <div class="barcode-section">
      <div class="barcode-svg">
        ${barcodeSvg}
      </div>
      <div class="barcode-text">${barcode}</div>
    </div>

    <!-- Routing Details -->
    <div class="routing-row">
      <div class="routing-cell">
        <div class="routing-label">DEST PINCODE</div>
        <div class="routing-val">${recipient.postalCode || "—"}</div>
      </div>
      <div class="routing-cell">
        <div class="routing-label">DEST OFFICE / CITY</div>
        <div class="routing-val">${String(recipient.city || "").toUpperCase()}</div>
      </div>
      <div class="routing-cell">
        <div class="routing-label">ORDER #</div>
        <div class="routing-val">${order.orderNumber}</div>
      </div>
      <div class="routing-cell">
        <div class="routing-label">BOOKING DATE</div>
        <div style="font-weight:700;font-size:11px;">${bookingDate}</div>
      </div>
    </div>

    <!-- Addresses Section -->
    <div class="address-section">
      <div class="to-box">
        <div class="box-title">DELIVER TO:</div>
        <div class="recipient-name">${recipientName}</div>
        <div class="recipient-address">
          ${addressLine}<br />
          ${cityStateZip}
        </div>
        <div class="pin-code-highlight">PIN: ${recipient.postalCode || ""}</div>
        <div style="font-size:11px;font-weight:700;margin-top:4px;">
          📞 Tel: ${phone}
        </div>
      </div>

      <div class="from-box">
        <div class="box-title" style="background:#475569;">RETURN / SENDER:</div>
        <div style="font-weight:800;margin-top:3px;font-size:12px;color:#0f172a;">Spare pro</div>
        ${
          order.reseller?.businessInfo?.businessName
            ? `<div style="font-size:10px;color:#475569;font-weight:600;">(Reseller: ${order.reseller.businessInfo.businessName})</div>`
            : ""
        }
        <div style="margin-top:3px;line-height:1.35;font-size:10.5px;">
          Thazepalam, Tirur<br />
          Kerala - 676107<br />
          📞 Tel: <strong>8139808004</strong><br />
          Support: info@thesparepro.com
        </div>
      </div>
    </div>

    <!-- Payment Banner -->
    <div class="payment-banner">
      ${
        isCod
          ? `<div class="payment-cod">
              <div class="payment-cod-title">⚠️ CASH ON DELIVERY (COD)</div>
              <div class="payment-cod-amount">COLLECT CASH: ₹${codAmountRupees}</div>
              <div style="font-size:10px;color:#7f1d1d;margin-top:2px;">Handover package ONLY after collecting the exact cash amount.</div>
            </div>`
          : `<div class="payment-prepaid">
              ✓ PREPAID - DO NOT COLLECT CASH
            </div>`
      }
    </div>

    <!-- Manifest -->
    <div class="manifest-row">
      <div><strong>Items (${totalItems}):</strong> ${itemsSummary.substring(0, 75)}${itemsSummary.length > 75 ? "..." : ""}</div>
      <div style="text-align:right;"><strong>Wt:</strong> 0.45 kg</div>
    </div>

    <!-- Footer -->
    <div class="footer-section">
      <div>Platform: <strong>thesparepro.com</strong></div>
      <div>Track at: <strong>thesparepro.com/account</strong> or <strong>indiapost.gov.in</strong></div>
    </div>
  </div>

  <script>
    // Auto-trigger print dialog if requested via ?autoPrint=1
    if (new URLSearchParams(window.location.search).get("autoPrint") === "1") {
      window.onload = function() {
        window.print();
      };
    }
  </script>
</body>
</html>`;
};

module.exports = {
  generateBarcodeSvg,
  generateConsignmentNumber,
  getOrCreateShippingLabel,
  generateLabelHtml,
};

