/* ===========================================================================
   Citirea datelor istorice scrise in romaneste.
   ---------------------------------------------------------------------------
   Cele 656 de repere ale volumului sunt scrise asa cum le scrie un istoric, nu
   asa cum le-ar vrea un calculator: "c. 7500–6200 î.Hr.", "sec. VI – începutul
   sec. V î.Hr.", "514/513 î.Hr.", "iarna 85/86 d.Hr.", "9/21 mai 1877".
   Functia intoarce intervalul in ani cu semn — negativ inainte de Hristos — si
   spune daca data e precisa sau aproximativa.
   =========================================================================== */

const ROMANE = { i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 }

/* cifra romana → numar; intoarce 0 daca sirul nu e o cifra romana valida */
export function roman(s) {
  const t = String(s).trim().toLowerCase()
  if (!/^[ivxlcdm]+$/.test(t)) return 0
  let n = 0
  for (let i = 0; i < t.length; i++) {
    const a = ROMANE[t[i]], b = ROMANE[t[i + 1]] || 0
    n += a < b ? -a : a
  }
  return n > 0 && n < 40 ? n : 0
}

/* Un secol acopera o suta de ani; al VI-lea d.Hr. e 501–600, al VI-lea î.Hr.
   este 600–501, adica de la -600 la -501 pe axa cu semn. */
const secol = (n, ih) => ih ? { de: -n * 100, la: -(n - 1) * 100 - 1 }
  : { de: (n - 1) * 100 + 1, la: n * 100 }

/* Partea de secol, cand textul o precizeaza: o treime din interval. */
function parteaDin(iv, cuvant) {
  const d = iv.la - iv.de + 1, t = Math.round(d / 3)
  if (/început|prima jum|prima parte/i.test(cuvant)) return { de: iv.de, la: iv.de + t }
  if (/mijloc|jumătatea|a doua treime/i.test(cuvant)) return { de: iv.de + t, la: iv.la - t }
  if (/sfârșit|finalul|ultima|a doua jum/i.test(cuvant)) return { de: iv.la - t, la: iv.la }
  return iv
}

/* Marcatorii de nesiguranta. Cuvintele cu diacritice nu se pot margini cu \b,
   fiindca JS socoteste \b numai pe litere ASCII: se scriu deci separat. */
const APROX = /\b(c|cca|circa|aprox|probabil|poate|atestat)\b|\?|în jur|înainte de|nu mai (târziu|devreme)/i
/* Capete deschise: "n. 1952", "1921–prezent", "din 1880", "după 1541", "1895–?".
   Un capat deschis nu e o data: e o afirmatie ca lucrul continua. Se retine ca
   atare, ca banda sa-l deseneze cu sageata, nu cu un capat inchis pe care
   textul nu-l spune. */
const PREZENT = /\bprezent\b|\bazi\b|\bîn activitate\b|\bîn curs\b/i
const NASCUT = /^\s*n\.\s*\d|\bn[ăa]scut[ăa]?\s+(în\s+)?\d/i
const DESCHIS = /\bdin\s+(anul\s+)?\d|dup[ăa]\s+\d|[–-]\s*\?|(înființat|constituit|fondat|întemeiat|inaugurat)[ăaeiț]*/i
const INAINTE = /î\.?\s?(hr|e\.?n)\b/i
const LUNI = /ianuarie|februarie|martie|aprilie|mai|iunie|iulie|august|septembrie|octombrie|noiembrie|decembrie/i

/* un singur termen: "1877", "sec. VI", "începutul sec. V", "1000/950" */
function termen(s, ih) {
  const t = s.trim()
  /* "sec. VI", dar si "secolul al VI-lea" si "secolele al VI-lea - al VII-lea":
     intre cuvantul "secol" si cifra romana se poate strecura un "al", iar dupa
     cifra un "-lea". */
  const m = t.match(/sec(?:\.|ol(?:ul(?:ui)?|ele(?:lor)?|elor|e)?)?\s*(?:al\s+)?([ivxlcdm]+)(?:-?lea)?\b/i)
  if (m) {
    const n = roman(m[1])
    if (n) return parteaDin(secol(n, ih), t)
  }
  /* an, eventual cu varianta dupa bara: "514/513", "85/86" — se ia prima */
  const a = t.match(/(\d{1,4})/)
  if (!a) return null
  const an = Number(a[1])
  if (!an) return null
  return { de: ih ? -an : an, la: ih ? -an : an }
}

/**
 * "c. 7500–6200 î.Hr." → { de: -7500, la: -6200, sigur: false }
 * Intoarce null cand sirul nu contine nicio data lizibila.
 */
export function citesteData(text) {
  const brut = String(text || '')
  if (!brut.trim()) return null
  const ih = INAINTE.test(brut)
  /* se taie sufixul erei, ca sa nu fie citit ca an */
  let s = brut.replace(/î\.?\s?(hr|e\.?n)\.?/gi, ' ').replace(/d\.?\s?(hr|e\.?n)\.?/gi, ' ')
  /* Sufixul ordinal romanesc poarta o cratima — "al XIV-lea" — iar cratima e si
     semnul de interval. Fara taierea lui, "secolele al XIV-lea - al XVI-lea" s-ar
     rupe in patru bucati si s-ar citi numai primul secol. */
  s = s.replace(/-\s?lea\b/gi, '')

  /* O data calendaristica — "19-22 martie 1965", "9/21 mai 1877 – 3/15 martie
     1878" — are cifre care sunt zile, nu ani. Acolo cratima desparte zile, deci
     nu se taie in capete de interval: se retin numai numerele de trei-patru
     cifre, care nu pot fi decat ani. */
  if (LUNI.test(s)) {
    const ani = [...s.matchAll(/\d{3,4}/g)].map((x) => Number(x[0])).filter(Boolean)
    if (ani.length) {
      const de = Math.min(...ani), la = Math.max(...ani)
      return { de: ih ? -la : de, la: ih ? -de : la, sigur: !APROX.test(brut) }
    }
  }

  /* interval: doua capete despartite de liniuta, "sau", "până" */
  const parti = s.split(/\s*(?:–|—|-|\bpână\s+(?:în|la)\b|\bsau\b)\s*/i)
    .filter((x) => /\d|sec/i.test(x) || /^(?:al\s+)?[ivxlcdm]+$/i.test(x.trim()))
  if (parti.length >= 2) {
    /* "sec. X–IX": al doilea capat e o cifra romana singura, care se citeste
       tot ca secol — altfel intervalul s-ar opri la primul. */
    const roman2 = (x, refera) => /sec/i.test(refera) && /^(?:al\s+)?[ivxlcdm]+$/i.test(x.trim())
      ? 'sec. ' + x.replace(/^al\s+/i, '') : x
    const a = termen(parti[0], ih)
    const b = termen(roman2(parti[parti.length - 1], parti[0]), ih)
    if (a && b) return { de: Math.min(a.de, b.de), la: Math.max(a.la, b.la), sigur: !APROX.test(brut) }
    const singur = a || b
    if (singur) return { ...singur, sigur: !APROX.test(brut) }
    return null
  }
  /* Doi ani intr-o fraza fara liniuta — "temeiuri în 1224, constituită formal
     în 1486" — sunt tot un interval, chiar daca nu e scris cu cratima. */
  const ani = [...s.matchAll(/\b(\d{3,4})\b/g)].map((m) => Number(m[1])).filter((n) => n > 0)
  const felurite = [...new Set(ani)]
  if (felurite.length >= 2) {
    const de = Math.min(...felurite), la = Math.max(...felurite)
    return { de: ih ? -la : de, la: ih ? -de : la, sigur: !APROX.test(brut) }
  }
  const x = termen(s, ih)
  return x ? { ...x, sigur: !APROX.test(brut) } : null
}

/** Anul de care se leaga "prezent". Fix, nu luat din ceas: altfel volumul s-ar
    schimba singur de la o tiparire la alta. */
export const ACUM = 2026

/**
 * Ca citesteData, dar pentru anii unui om sau ai unei institutii, unde capatul
 * din dreapta e adesea deschis. Intoarce in plus:
 *   deschis — capatul din dreapta nu e spus de text
 * Pentru "n. 1952" si "1921–prezent" capatul se duce la anul curent, fiindca
 * asta chiar spune textul; pentru "din 1880" si "după 1541" nu, fiindca textul
 * spune numai de cand.
 */
export function citesteAni(text) {
  const brut = String(text || '')
  const d = citesteData(brut)
  if (!d) return null
  const ih = /î\.?\s?(hr|e\.?n)\b/i.test(brut)
  const prezent = !ih && (PREZENT.test(brut) || NASCUT.test(brut))
  /* "din" si "întemeiat" deschid capatul si inainte de Hristos — Histria e
     "întemeiată în secolul al VII-lea î.Hr., activă pe tot parcursul epocii" —
     dar numai "prezent" si "n." il duc pana azi. */
  const deschis = prezent || DESCHIS.test(brut)
  if (prezent && d.la < ACUM) return { ...d, la: ACUM, deschis: true }
  if (deschis) return { ...d, deschis: true }
  return d
}

/* mijlocul intervalului, pentru asezarea pe axa */
export const mijloc = (d) => d ? (d.de + d.la) / 2 : null

/* eticheta scurta pentru axa: "-500" → "500 î.Hr." */
export function etichetaAn(an) {
  const n = Math.round(an)
  if (n < 0) return `${Math.abs(n)} î.Hr.`
  if (n === 0) return '1'
  return String(n)
}
