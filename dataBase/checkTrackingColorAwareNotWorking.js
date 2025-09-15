// checkTrackingColorAware.js
// Detects whether the "Entregue" or "Em trânsito" entry is active by inspecting DOM classes and computed color.
// Works with require() or dynamic import() depending on environment.



{ids:[
  "RT160347308PT",
  "RT160329508PT",
  "RT160279126PT"
]
}
// checkTrackingColorAware_simple.js
// Prints only one word: "Entregue", "Em trânsito", "Em espera", or "unknown"
// checkTrackingColorAware_strict.js
// Prints one word: "Entregue", "Em trânsito", "Em espera", or "unknown"
// Uses stricter heuristics to find the active timeline item (checks text nodes, element color,
// ancestor/descendant background colors, and SVG fill/stroke).

(async function () {
  // load puppeteer (require then import fallback)
  let puppeteer;
  try { puppeteer = require('puppeteer'); }
  catch (err) {
    try {
      const mod = await import('puppeteer');
      puppeteer = mod && mod.default ? mod.default : mod;
    } catch (err2) {
      console.error('Please install puppeteer: npm install puppeteer');
      process.exit(1);
    }
  }

  const raw = process.argv[2];
  if (!raw) {
    console.error('Usage: node checkTrackingColorAware_strict.js <TRACKING_URL_OR_ID_OR_FULL_URL>');
    process.exit(1);
  }

  function buildUrl(v) {
    if (/^https?:\/\//i.test(v)) return v;
    const id = encodeURIComponent(v);
    return `https://appserver.ctt.pt/CustomerArea/PublicArea_Detail?ObjectCodeInput=${id}&SearchInput=${id}&IsFromPublicArea=true`;
  }
  const url = buildUrl(raw);

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36');
    await page.setViewport({ width: 1200, height: 900 });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    // wait a bit for client rendering
    await sleep(1400);

    const result = await page.evaluate(() => {
      // Helpers inside the page
      function parseRGB(s) {
        if (!s) return null;
        const m = s.match(/rgba?\s*\(\s*(\d+)[^\d]+(\d+)[^\d]+(\d+)/i);
        if (!m) return null;
        return { r: parseInt(m[1], 10), g: parseInt(m[2], 10), b: parseInt(m[3], 10) };
      }
      function isGreenDominantRGBObj(obj) {
        if (!obj) return false;
        const { r, g, b } = obj;
        return (g > r + 18 && g > b + 18 && g >= 90); // stricter threshold
      }
      function isGreenColorString(s) {
        const rgb = parseRGB(s);
        return isGreenDominantRGBObj(rgb);
      }

      // canonical keywords in order of preference
      const keywords = [
        { key: 'Entregue', out: 'Entregue' },
        { key: 'Em trânsito', out: 'Em trânsito' },
        { key: 'Em transito', out: 'Em trânsito' }, // fallback without accent
        { key: 'Em espera', out: 'Em espera' }
      ];

      // find short elements that contain one of the keywords (avoid long containers)
      const candidates = [];
      const all = document.querySelectorAll('*');
      for (let el of all) {
        try {
          const txt = (el.textContent || '').trim();
          if (!txt) continue;
          if (txt.length > 80) continue; // ignore large containers
          for (let k of keywords) {
            if (txt.toLowerCase().indexOf(k.key.toLowerCase()) !== -1) {
              // found candidate
              const cs = window.getComputedStyle(el);
              const color = cs && cs.color ? cs.color : '';
              candidates.push({ el, keyword: k.key, out: k.out, color });
              break;
            }
          }
        } catch (e) { /* ignore */ }
      }

      if (!candidates.length) return 'unknown';

      // For each candidate check multiple indicators for "active"
      function candidateIsActive(cand) {
        // 1) if element text color is green-dominant
        if (isGreenColorString(cand.color)) return true;

        // 2) check ancestors (up to 4) for green background or green color or an SVG with green fill/stroke
        let cur = cand.el;
        for (let depth = 0; depth < 5 && cur; depth++) {
          try {
            const cs = window.getComputedStyle(cur);
            if (cs) {
              if (isGreenColorString(cs.backgroundColor)) return true;
              if (isGreenColorString(cs.color)) return true;
            }

            // scan some descendants of this ancestor for icons with green fill/stroke/background
            const desc = cur.querySelectorAll('*');
            let checked = 0;
            for (let d of desc) {
              if (checked++ > 20) break; // limit scans to first 20 children for perf
              try {
                const dcs = window.getComputedStyle(d);
                if (dcs) {
                  if (isGreenColorString(dcs.backgroundColor)) return true;
                  if (isGreenColorString(dcs.color)) return true;
                  // check SVG fill/stroke attributes if present via computed style
                  if (isGreenColorString(dcs.fill)) return true;
                  if (isGreenColorString(dcs.stroke)) return true;
                }
                // check attributes for inline fills (e.g., <svg fill="#00a...">)
                const fillAttr = d.getAttribute && d.getAttribute('fill');
                const strokeAttr = d.getAttribute && d.getAttribute('stroke');
                if (fillAttr && /#|rgb|hsl/i.test(fillAttr)) {
                  const tmp = window.getComputedStyle(d).fill || fillAttr;
                  if (isGreenColorString(tmp)) return true;
                }
                if (strokeAttr && /#|rgb|hsl/i.test(strokeAttr)) {
                  const tmp2 = window.getComputedStyle(d).stroke || strokeAttr;
                  if (isGreenColorString(tmp2)) return true;
                }
              } catch (e) { /* ignore */ }
            }
          } catch (e) { /* ignore */ }
          cur = cur.parentElement;
        }

        // 3) if nothing green found: not active
        return false;
      }

      // Prefer candidate that is active. If multiple active, prefer the one that appears later in DOM (timeline typically top-down)
      let activeCandidates = candidates.filter(candidateIsActive);
      if (activeCandidates.length === 0) {
        // fallback: prefer candidate whose color has any green component bigger than red & blue (softer)
        for (let c of candidates) {
          try {
            const rgb = parseRGB(window.getComputedStyle(c.el).color || c.color);
            if (rgb && rgb.g > rgb.r + 8 && rgb.g > rgb.b + 8 && rgb.g >= 70) {
              activeCandidates.push(c);
            }
          } catch(e){}
        }
      }

      let chosen = null;
      if (activeCandidates.length) {
        // pick the one that is visually the most green by g-(r+b)/2
        activeCandidates.sort((a,b) => {
          const ra = parseRGB(window.getComputedStyle(a.el).color || a.color) || {r:0,g:0,b:0};
          const rb = parseRGB(window.getComputedStyle(b.el).color || b.color) || {r:0,g:0,b:0};
          const scoreA = (ra.g - (ra.r+ra.b)/2);
          const scoreB = (rb.g - (rb.r+rb.b)/2);
          return scoreB - scoreA;
        });
        chosen = activeCandidates[0];
      } else {
        // last-resort: pick candidate that appears nearest to the timeline icon (heuristic: prefer one whose parent has 'timeline' in class)
        chosen = candidates.find(c => (c.el.parentElement && (c.el.parentElement.className || '').toLowerCase().includes('timeline'))) || candidates[0];
      }

      if (!chosen) return 'unknown';
      // normalize output
      if (/entregue/i.test(chosen.keyword)) return 'Entregue';
      if (/em tr/i.test(chosen.keyword)) return 'Em trânsito';
      if (/em espera/i.test(chosen.keyword)) return 'Em espera';
      return 'unknown';
    });

    // print only the result word
    console.log(result);

    await browser.close();
    process.exit(0);
  } catch (err) {
    if (browser) try { await browser.close(); } catch(_) {}
    console.log('unknown');
    process.exit(0);
  }
})();

