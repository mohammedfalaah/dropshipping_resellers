/**
 * Intelligent WhatsApp Customer Address Parser for Indian Dropshipping Resellers
 *
 * Supports labeled and unlabeled address formats copied directly from WhatsApp,
 * Instagram, SMS, or notes. Intelligently extracts:
 * - First Name & Last Name
 * - Mobile / Phone Number (+91, 10-digit)
 * - Email Address
 * - Full Street Address (House / Flat / Building / Landmark)
 * - City / Town / District
 * - State (All 28 Indian States & 8 UTs + common abbreviations)
 * - 6-Digit Indian PIN Code
 * - Special Order Notes / Instructions
 */

export const INDIAN_STATES = [
  { name: "Andhra Pradesh", aliases: ["ap", "andhra"] },
  { name: "Arunachal Pradesh", aliases: ["arunachal"] },
  { name: "Assam", aliases: ["assam", "as"] },
  { name: "Bihar", aliases: ["bihar", "br"] },
  { name: "Chhattisgarh", aliases: ["cg", "chhattisgarh", "chattisgarh"] },
  { name: "Goa", aliases: ["goa", "ga"] },
  { name: "Gujarat", aliases: ["gujarat", "gujrat", "gj"] },
  { name: "Haryana", aliases: ["haryana", "hr"] },
  { name: "Himachal Pradesh", aliases: ["himachal pradesh", "himachal", "hp"] },
  { name: "Jharkhand", aliases: ["jharkhand", "jh"] },
  { name: "Karnataka", aliases: ["karnataka", "kar", "ka"] },
  { name: "Kerala", aliases: ["kerala", "ker", "kl"] },
  { name: "Madhya Pradesh", aliases: ["madhya pradesh", "mp"] },
  { name: "Maharashtra", aliases: ["maharashtra", "maha", "mh"] },
  { name: "Manipur", aliases: ["manipur", "mn"] },
  { name: "Meghalaya", aliases: ["meghalaya", "ml"] },
  { name: "Mizoram", aliases: ["mizoram", "mz"] },
  { name: "Nagaland", aliases: ["nagaland", "nl"] },
  { name: "Odisha", aliases: ["odisha", "orissa", "or"] },
  { name: "Punjab", aliases: ["punjab", "pb"] },
  { name: "Rajasthan", aliases: ["rajasthan", "raj", "rj"] },
  { name: "Sikkim", aliases: ["sikkim", "sk"] },
  { name: "Tamil Nadu", aliases: ["tamil nadu", "tamilnadu", "tn"] },
  { name: "Telangana", aliases: ["telangana", "ts", "tg", "telengana"] },
  { name: "Tripura", aliases: ["tripura", "tr"] },
  { name: "Uttar Pradesh", aliases: ["uttar pradesh", "up"] },
  { name: "Uttarakhand", aliases: ["uttarakhand", "uttaranchal", "uk"] },
  { name: "West Bengal", aliases: ["west bengal", "wb", "bengal"] },
  { name: "Delhi", aliases: ["delhi", "new delhi", "delhi ncr", "dl", "ncr"] },
  { name: "Jammu and Kashmir", aliases: ["jammu and kashmir", "jammu & kashmir", "jk", "j&k", "kashmir"] },
  { name: "Ladakh", aliases: ["ladakh"] },
  { name: "Puducherry", aliases: ["puducherry", "pondicherry", "py"] },
  { name: "Chandigarh", aliases: ["chandigarh", "ch"] },
  { name: "Andaman and Nicobar Islands", aliases: ["andaman"] },
  { name: "Dadra and Nagar Haveli and Daman and Diu", aliases: ["daman", "diu"] },
  { name: "Lakshadweep", aliases: ["lakshadweep"] },
];

export const COMMON_INDIAN_CITIES = [
  "Mumbai", "Delhi", "Bengaluru", "Bangalore", "Hyderabad", "Ahmedabad", "Chennai", "Kolkata", "Surat", "Pune", "Jaipur",
  "Lucknow", "Kanpur", "Nagpur", "Indore", "Thane", "Bhopal", "Visakhapatnam", "Patna", "Vadodara",
  "Ghaziabad", "Ludhiana", "Agra", "Nashik", "Faridabad", "Meerut", "Rajkot", "Varanasi", "Srinagar", "Aurangabad",
  "Dhanbad", "Amritsar", "Navi Mumbai", "Prayagraj", "Allahabad", "Ranchi", "Howrah", "Coimbatore", "Jabalpur", "Gwalior",
  "Vijayawada", "Jodhpur", "Madurai", "Raipur", "Kota", "Guwahati", "Chandigarh", "Solapur", "Hubli", "Dharwad", "Bareilly",
  "Moradabad", "Mysore", "Mysuru", "Gurgaon", "Gurugram", "Aligarh", "Jalandhar", "Tiruchirappalli", "Trichy", "Bhubaneswar",
  "Salem", "Warangal", "Thiruvananthapuram", "Trivandrum", "Bhiwandi", "Saharanpur", "Guntur", "Amravati", "Bikaner", "Noida",
  "Jamshedpur", "Bhilai", "Cuttack", "Firozabad", "Kochi", "Cochin", "Nellore", "Bhavnagar", "Dehradun", "Durgapur", "Asansol",
  "Rourkela", "Nanded", "Kolhapur", "Ajmer", "Akola", "Gulbarga", "Kalaburagi", "Jamnagar", "Ujjain", "Siliguri", "Jhansi",
  "Jammu", "Mangalore", "Mangaluru", "Erode", "Belgaum", "Belagavi", "Tirunelveli", "Malegaon", "Gaya", "Jalgaon", "Udaipur",
  "Kozhikode", "Calicut", "Tirur", "Malappuram", "Kollam", "Palakkad", "Thrissur", "Kannur", "Alappuzha", "Kottayam",
  "Kasaragod", "Wayanad", "Pathanamthitta", "Idukki", "Ernakulam", "Manjeri", "Perinthalmanna", "Ponnani", "Kottakkal",
  "Tanur", "Parappanangadi", "Thalassery", "Vatakara"
];

const ADDRESS_KEYWORDS = [
  "house", "flat", "room", "block", "apt", "apartment", "building", "bldg", "floor", "flr",
  "plot", "door", "d\\.no", "road", "rd", "street", "st", "lane", "nagar", "colony", "enclave",
  "society", "soc", "vihar", "sector", "sec", "cross", "main", "near", "opp", "opposite",
  "behind", "beside", "landmark", "po", "p\\.o", "post", "office", "village", "taluk", "tehsil",
  "bazar", "market", "bazaar", "gate", "bridge", "tower", "complex", "residency", "villas", "villa", "avenue"
];

const INSTRUCTION_KEYWORDS = [
  "call before", "deliver", "fast delivery", "urgent", "care of", "c/o", "cod", "cash on delivery",
  "please send", "send soon", "morning", "evening", "deliver between"
];

const hasWordMatch = (text, wordList) => {
  return wordList.some((w) => new RegExp(`\\b${w}\\b`, "i").test(text));
};

/**
 * Remove WhatsApp message meta, timestamps, and forward markers
 */
const cleanWhatsAppNoise = (text) => {
  if (!text) return "";
  let clean = text;

  // Remove WhatsApp timestamp headers like:
  // [12:45, 24/11/2026] +91 98765 43210:
  // 24/11/26, 1:30 pm - John Doe:
  clean = clean.replace(/\[\d{1,2}:\d{2}(?::\d{2})?(?:\s*[apAP][mM])?,?\s*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\]\s*[^:\n]*:\s*/g, "");
  clean = clean.replace(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4},?\s*\d{1,2}:\d{2}(?::\d{2})?(?:\s*[apAP][mM])?\s*-\s*[^:\n]*:\s*/g, "");

  // Remove forwarded markers
  clean = clean.replace(/^(?:Forwarded|Forwarded message)\s*$/gim, "");

  return clean.trim();
};

/**
 * Parse Name into First Name and Last Name
 */
const splitFullName = (fullName) => {
  if (!fullName) return { firstName: "", lastName: "" };
  let cleanName = fullName.replace(/^(?:mr|mrs|ms|dr|shri|smt)\.?\s+/i, "").trim();
  cleanName = cleanName.replace(/[,\.\-\:\;]+$/, "").trim();
  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  if (parts.length === 2) return { firstName: parts[0], lastName: parts[1] };

  // For 3+ words: e.g. "Mohammed Falaah KP" -> firstName: "Mohammed Falaah", lastName: "KP"
  return {
    firstName: parts.slice(0, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
};

/**
 * Main Address Parsing Function
 * @param {string} rawInput - Text pasted from WhatsApp or notes
 * @returns {object} Extracted fields, detected labels, and validation warnings
 */
export const parseWhatsAppAddress = (rawInput) => {
  const result = {
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    notes: "",
    warnings: [],
    detectedFields: [],
  };

  if (!rawInput || typeof rawInput !== "string" || !rawInput.trim()) {
    return result;
  }

  const cleaned = cleanWhatsAppNoise(rawInput);

  // Split into lines. If text has no newlines but multiple commas (single-line comma separated), split by comma.
  let lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1 && cleaned.includes(",")) {
    lines = cleaned
      .split(",")
      .map((l) => l.trim())
      .filter(Boolean);
  }

  const unhandledLines = [];
  const addressParts = [];

  for (let rawLine of lines) {
    let line = rawLine.trim();

    // Clean bullets / numbering safely: "1. ", "1) ", "- ", "* ", "• " (without eating pure digits)
    line = line.replace(/^[\*\-\•]\s*|^\d+[\.\)\-]\s*/, "").trim();
    if (!line) continue;

    // Filter out greeting/header lines like "Hi sir", "My order details:", "New Order"
    if (/^(?:hi|hello|hey|dear|sir|bro|plz|pls|my order details|order details|delivery address|address details|customer details|new order)\b[\s\:\-\,a-zA-Z]*$/i.test(line)) {
      continue;
    }
    // If line has greeting prefix followed by details, strip the greeting
    line = line.replace(/^(?:hi|hello|hey|dear|sir|bro|plz|pls|my order details|order details|delivery address|address details|customer details|new order)\b[\s\:\-\,]*/i, "").trim();
    if (!line) continue;

    // 1. Check Labeled Email
    const labeledEmail = line.match(/(?:email|mail|e-mail)\s*[\:\-\=]\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (labeledEmail) {
      result.email = labeledEmail[1].trim();
      result.detectedFields.push("Email");
      continue;
    }
    // Check Raw Email in line
    const rawEmail = line.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i);
    if (rawEmail && !result.email) {
      result.email = rawEmail[0].trim();
      result.detectedFields.push("Email");
      line = line.replace(rawEmail[0], "").replace(/(?:email|mail|e-mail)\s*[\:\-\=]?/i, "").trim();
      if (!line) continue;
    }

    // 2. Check Labeled Phone
    const labeledPhone = line.match(/(?:phone|ph|mob|mobile|contact|tel|call|whatsapp|wa|ph\.no|mob\.no)\s*[\:\-\=]\s*([+]?[0-9\s\-\(\)]{10,16})/i);
    if (labeledPhone) {
      let p = labeledPhone[1].replace(/[\s\-\(\)\+]/g, "");
      if (p.startsWith("91") && p.length === 12) p = p.slice(2);
      if (p.startsWith("0") && p.length === 11) p = p.slice(1);
      if (p.length === 10) {
        result.phone = p;
        result.detectedFields.push("Phone");
        continue;
      }
    }

    // Check Unlabeled Phone
    const rawPhone = line.match(/(?:(?:\+?91|0)[\s\-]?)?([6-9]\d{4}[\s\-]?\d{5}\b|[6-9]\d{9}\b)/);
    if (rawPhone && !result.phone) {
      let p = rawPhone[0].replace(/[\s\-\(\)\+]/g, "");
      if (p.startsWith("91") && p.length === 12) p = p.slice(2);
      if (p.startsWith("0") && p.length === 11) p = p.slice(1);
      if (p.length === 10) {
        result.phone = p;
        result.detectedFields.push("Phone");
        line = line.replace(rawPhone[0], "").replace(/(?:phone|ph|mob|mobile|contact|tel)\s*[\:\-\=]?/i, "").trim();
        if (!line) continue;
      }
    }

    // 3. Check Labeled PIN
    const labeledPin = line.match(/(?:pin|pincode|pin\s*code|postal|postal\s*code|zip|zipcode)\s*[\:\-\=]\s*([1-9][0-9]{5})\b/i);
    if (labeledPin) {
      result.zip = labeledPin[1].trim();
      result.detectedFields.push("PIN Code");
      continue;
    }

    // Check Unlabeled 6-digit PIN in line
    const rawPin = line.match(/\b([1-9][0-9]{5})\b/);
    if (rawPin && !result.zip) {
      result.zip = rawPin[1].trim();
      result.detectedFields.push("PIN Code");
      line = line.replace(rawPin[0], "").replace(/(?:pin|pincode|postal|zip)\s*[\:\-\=]?/i, "").trim();
      if (!line) continue;
    }

    // 4. Check Labeled State
    const labeledState = line.match(/(?:state|province)\s*[\:\-\=]\s*([a-zA-Z\s]+)/i);
    if (labeledState) {
      const cand = labeledState[1].trim().toLowerCase();
      const st = INDIAN_STATES.find(
        (s) => s.name.toLowerCase() === cand || s.aliases.includes(cand)
      );
      if (st) {
        result.state = st.name;
        result.detectedFields.push("State");
        continue;
      }
    }

    // Check State in line
    for (const st of INDIAN_STATES) {
      const stateReg = new RegExp(`\\b${st.name}\\b`, "i");
      if (stateReg.test(line)) {
        result.state = st.name;
        result.detectedFields.push("State");
        line = line.replace(stateReg, "").trim();
        break;
      }
      // Check longer aliases (avoiding short collision-prone aliases)
      const validAliases = st.aliases.filter((a) => a.length >= 3);
      for (const alias of validAliases) {
        const aliasReg = new RegExp(`\\b${alias}\\b`, "i");
        if (aliasReg.test(line)) {
          result.state = st.name;
          result.detectedFields.push("State");
          line = line.replace(aliasReg, "").trim();
          break;
        }
      }
      if (result.state) break;
    }
    line = line.replace(/[,\s\-]+$/, "").trim();
    if (!line) continue;

    // 5. Check Labeled City
    const labeledCity = line.match(/(?:city|town|district|dist)\s*[\:\-\=]\s*([a-zA-Z\s]+)/i);
    if (labeledCity) {
      result.city = labeledCity[1].trim();
      result.detectedFields.push("City");
      continue;
    }

    // Check City against dictionary
    for (const city of COMMON_INDIAN_CITIES) {
      const cityReg = new RegExp(`\\b${city}\\b`, "i");
      if (cityReg.test(line)) {
        result.city = city;
        result.detectedFields.push("City");
        line = line.replace(cityReg, "").trim();
        break;
      }
    }
    line = line.replace(/[,\s\-]+$/, "").trim();
    if (!line) continue;

    // 6. Check Labeled Name
    const labeledName = line.match(/(?:name|customer(?:\s*name)?|cust(?:\s*name)?|receiver|to)\s*[\:\-\=]\s*([a-zA-Z\s\.\'\-]+)/i);
    if (labeledName && !result.firstName) {
      const { firstName, lastName } = splitFullName(labeledName[1]);
      result.firstName = firstName;
      result.lastName = lastName;
      result.detectedFields.push("Customer Name");
      continue;
    }

    // 7. Check Labeled Address
    const labeledAddress = line.match(/(?:address|addr|delivery address|shipping address|full address)\s*[\:\-\=]\s*(.+)/i);
    if (labeledAddress) {
      addressParts.push(labeledAddress[1].trim());
      continue;
    }

    // 8. Check Instructions/Notes
    const isNote = hasWordMatch(line, INSTRUCTION_KEYWORDS);
    const hasAddressWord = hasWordMatch(line, ADDRESS_KEYWORDS);

    if (isNote && !hasAddressWord && line.length < 60) {
      result.notes = result.notes ? `${result.notes} | ${line}` : line;
      continue;
    }

    // Otherwise add to unhandledLines for Name / Address resolution
    unhandledLines.push(line);
  }

  // From unhandled lines, resolve Customer Name and Street Address
  for (let l of unhandledLines) {
    l = l.replace(/^[,\s\-]+|[,\s\-]+$/g, "").trim();
    if (!l) continue;

    // Check if this line is the customer's Name
    if (!result.firstName) {
      const isPureText = /^[a-zA-Z\s\.\'\-]+$/.test(l);
      const hasNoAddrKeywords = !hasWordMatch(l, ADDRESS_KEYWORDS);
      const words = l.split(/\s+/).filter(Boolean);

      if (isPureText && hasNoAddrKeywords && words.length >= 1 && words.length <= 4 && l.length <= 35) {
        const { firstName, lastName } = splitFullName(l);
        result.firstName = firstName;
        result.lastName = lastName;
        result.detectedFields.push("Customer Name");
        continue;
      }
    }

    // If city is still empty and line is short, check if it's the City
    if (!result.city && addressParts.length > 0 && l.length < 25 && !/\d/.test(l)) {
      const hasNoAddrKeywords = !hasWordMatch(l, ADDRESS_KEYWORDS);
      if (hasNoAddrKeywords) {
        result.city = l;
        result.detectedFields.push("City");
        continue;
      }
    }

    addressParts.push(l);
  }

  // Combine address lines
  if (addressParts.length > 0) {
    result.address = addressParts.join(", ");
    result.detectedFields.push("Street Address");
  }

  // Deduplicate detectedFields
  result.detectedFields = [...new Set(result.detectedFields)];

  // Validate missing required fields
  const requiredFields = [
    { key: "firstName", label: "First Name" },
    { key: "lastName", label: "Last Name" },
    { key: "phone", label: "Phone Number" },
    { key: "address", label: "Delivery Address" },
    { key: "city", label: "Town / City" },
    { key: "state", label: "State" },
    { key: "zip", label: "PIN Code" },
  ];

  requiredFields.forEach((field) => {
    if (!result[field.key] || !result[field.key].trim()) {
      result.warnings.push(`${field.label} missing`);
    }
  });

  return result;
};
