// ════════════════════════════════════════════════════════════════════
// CSV UTILS — Parsers para reportes de Mailchimp
// ════════════════════════════════════════════════════════════════════

/**
 * Parsea una línea CSV respetando comillas dobles y escapeos.
 * Soporta strings tipo: `"Hello, world","Foo ""bar"" baz",123`
 */
export const parseCsvLine = (line) => {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
};

/**
 * Extrae un número de un string tipo "41 (51.3%)" → 41
 * Devuelve 0 si no encuentra número.
 */
export const extractNumber = (str) => {
  if (!str) return 0;
  const m = str.toString().match(/[\d,]+/);
  if (!m) return 0;
  return parseInt(m[0].replace(/,/g, ''), 10) || 0;
};

/**
 * Parser del reporte de campaña Mailchimp (Email Campaign Report).
 *
 * Devuelve:
 *   {
 *     title, subject, deliveryDate,
 *     recipients, deliveries, bounces,
 *     opens, totalOpens, openRate,
 *     clicks, totalClicks, clickRate,
 *     unsubs, abuse,
 *     urls: [{url, total, unique}]
 *   }
 *
 * El CSV de Mailchimp tiene 3 secciones:
 *   1. "Email Campaign Report" → metadata (Title, Subject, Date)
 *   2. "Overall Stats" → métricas (Total Recipients, Deliveries, Opens, etc.)
 *   3. "Clicks by URL" → URLs clickeadas con total y único
 */
export const parseMailchimpReport = (csvText) => {
  const lines = csvText.split(/\r?\n/);
  const result = {
    title: '',
    subject: '',
    deliveryDate: '',
    recipients: 0,
    deliveries: 0,
    bounces: 0,
    opens: 0,
    totalOpens: 0,
    openRate: 0,
    clicks: 0,
    totalClicks: 0,
    clickRate: 0,
    unsubs: 0,
    abuse: 0,
    urls: [],
  };
  let section = '';
  let urlHeaderSeen = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      urlHeaderSeen = false;
      continue;
    }

    if (line === 'Email Campaign Report') { section = 'header'; continue; }
    if (line === 'Overall Stats')         { section = 'stats';  continue; }
    if (line === 'Clicks by URL')         { section = 'urls'; urlHeaderSeen = false; continue; }

    const cols = parseCsvLine(line);
    const key = cols[0];
    const val = cols[1] || '';

    if (section === 'header') {
      if (key === 'Title') result.title = val;
      else if (key === 'Subject Line') result.subject = val;
      else if (key === 'Delivery Date/Time') result.deliveryDate = val;
    } else if (section === 'stats') {
      if (key === 'Total Recipients') result.recipients = extractNumber(val);
      else if (key === 'Successful Deliveries') result.deliveries = extractNumber(val);
      else if (key === 'Bounces') result.bounces = extractNumber(val);
      else if (key === 'Recipients Who Opened') {
        result.opens = extractNumber(val);
        const pct = val.match(/([\d.]+)%/);
        if (pct) result.openRate = parseFloat(pct[1]);
      } else if (key === 'Total Opens') {
        result.totalOpens = extractNumber(val);
      } else if (key === 'Recipients Who Clicked') {
        result.clicks = extractNumber(val);
        const pct = val.match(/([\d.]+)%/);
        if (pct) result.clickRate = parseFloat(pct[1]);
      } else if (key === 'Total Clicks') {
        result.totalClicks = extractNumber(val);
      } else if (key === 'Total Unsubs') {
        result.unsubs = extractNumber(val);
      } else if (key === 'Total Abuse Complaints') {
        result.abuse = extractNumber(val);
      }
    } else if (section === 'urls') {
      if (!urlHeaderSeen && key === 'URL') {
        urlHeaderSeen = true;
        continue;
      }
      if (key && key.startsWith('http')) {
        result.urls.push({
          url: key,
          total: extractNumber(cols[1]),
          unique: extractNumber(cols[2]),
        });
      }
    }
  }
  return result;
};

/**
 * Parser de lista de subscribers de Mailchimp (Subscriber Activity export).
 *
 * Acepta CSVs con columnas: Email Address, First Name, Last Name,
 * Member Rating, Total Opens, Total Clicks, Last Open, Last Click, etc.
 *
 * Clasificación:
 *   - Hot lead: clickeó al menos 1 vez O rating ≥ 4
 *   - Lead: solo abrió (opens > 0)
 *
 * Devuelve { leads, hotLeads } como arrays de entries.
 */
export const parseMailchimpSubscribers = (csvText) => {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { leads: [], hotLeads: [] };

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const findCol = (names) => {
    for (const n of names) {
      const idx = header.findIndex((h) => h.includes(n));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const emailIdx     = findCol(['email address', 'email']);
  const firstNameIdx = findCol(['first name', 'firstname', 'fname']);
  const lastNameIdx  = findCol(['last name', 'lastname', 'lname']);
  const opensIdx     = findCol(['total opens', 'opens']);
  const clicksIdx    = findCol(['total clicks', 'clicks']);
  const ratingIdx    = findCol(['member rating', 'rating']);
  const companyIdx   = findCol(['company', 'empresa', 'organization']);

  const leads = [];
  const hotLeads = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (emailIdx < 0 || !cols[emailIdx]) continue;

    const email = cols[emailIdx].trim();
    if (!email || !email.includes('@')) continue;

    const firstName = firstNameIdx >= 0 ? (cols[firstNameIdx] || '').trim() : '';
    const lastName  = lastNameIdx >= 0  ? (cols[lastNameIdx] || '').trim()  : '';
    const opens     = opensIdx >= 0     ? extractNumber(cols[opensIdx])      : 0;
    const clicks    = clicksIdx >= 0    ? extractNumber(cols[clicksIdx])     : 0;
    const rating    = ratingIdx >= 0    ? extractNumber(cols[ratingIdx])     : 0;
    const company   = companyIdx >= 0   ? (cols[companyIdx] || '').trim()    : '';

    const fullName = `${firstName} ${lastName}`.trim() || email.split('@')[0];
    const entry = { email, name: fullName, company, opens, clicks, rating };

    if (clicks > 0 || rating >= 4) {
      hotLeads.push(entry);
    } else if (opens > 0) {
      leads.push(entry);
    }
  }
  return { leads, hotLeads };
};
