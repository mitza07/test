/* ===========================================================================
   TABELELE volumului.
   ---------------------------------------------------------------------------
   Cartea avea, pana acum, zero tabele: o mie de pagini de referinta fara niciun
   loc in care sa se uite cineva ca sa gaseasca ceva. Iar materialul era deja
   acolo, numai ca risipit — doua sute de oameni imprastiati cate cinci prin
   patruzeci de capitole, patruzeci de dispute istoriografice fiecare la coada
   capitolului ei, o suta saizeci de cifre.

   Aici nu se adauga niciun fapt: se aseaza la un loc ce e deja scris, ca sa
   poata fi cautat. Fiecare rand trimite inapoi la sectiunea din care vine.
   =========================================================================== */
import { citesteAni, mijloc } from './data.mjs'

const colator = new Intl.Collator('ro', { sensitivity: 'base', numeric: true })

/* Numele de familie, pentru alfabetizare: ultimul cuvant cu majuscula al
   primei parti a numelui. Institutiile si numele de domnitori romanesti
   ("Stefan cel Mare") raman cum sunt — nu se taie ce nu se poate taia. */
export function cheieAlfabetica(nume) {
  const n = String(nume).split(/[,(]/)[0].trim()
  const cuv = n.split(/\s+/)
  if (cuv.length < 2) return n
  /* "cel", "de", "din", "lui" arata un nume de domnitor sau de institutie */
  if (/\b(cel|cea|de|din|lui|al|a|si|și|pentru|national|național)\b/i.test(n)) return n
  const ultim = cuv[cuv.length - 1]
  if (!/^[A-ZĂÂÎȘȚ]/.test(ultim)) return n
  return ultim + ', ' + cuv.slice(0, -1).join(' ')
}

const ani = (de, la) => {
  const d = Math.abs(la - de)
  return d >= 2 ? `${d.toLocaleString('ro')} ani` : d === 1 ? 'un an' : 'sub un an'
}

/**
 * Cele patruzeci de secțiuni, dintr-o privire.
 * Nimic nou: perioada, întinderea în ani și cât aparat are fiecare.
 */
export function tabelSinoptic(sectiuni) {
  return {
    id: 'sinoptic',
    titlu: 'Dintr-o privire',
    intro: `Cele ${sectiuni.length} de secțiuni ale acestui volum, cu întinderea lor în timp și cu aparatul fiecăreia. Coloanele din dreapta arată câte repere, câți oameni și câte cifre are fiecare — sunt aceleași peste tot, prin construcție, iar abaterile se văd imediat.`,
    coloane: [
      { cheie: 'nr', et: '', clasa: 'num' },
      { cheie: 'titlu', et: 'Secțiunea' },
      { cheie: 'per', et: 'Perioada' },
      { cheie: 'durata', et: 'Întindere', clasa: 'num' },
      { cheie: 'repere', et: 'Repere', clasa: 'num' },
      { cheie: 'oameni', et: 'Oameni', clasa: 'num' },
      { cheie: 'cifre', et: 'Cifre', clasa: 'num' },
    ],
    randuri: sectiuni.map((c, i) => ({
      nr: c.tema ? '—' : String(i + 1),
      titlu: c.titlu,
      per: c.per === 'transversal' ? 'transversal' : c.per,
      durata: (c.de != null && c.la != null) ? ani(c.de, c.la) : '—',
      repere: (c.cronologie || []).length,
      oameni: (c.figuri || []).length,
      cifre: (c.cifre || []).length,
      spre: c.id,
    })),
  }
}

/**
 * Indicele de persoane: cei două sute de oameni ai volumului, la un loc.
 * Pana acum se puteau gasi numai citind capitolul in care erau.
 */
export function indicePersoane(sectiuni) {
  const randuri = []
  for (const c of sectiuni) {
    for (const f of c.figuri || []) {
      const d = citesteAni(f.ani)
      randuri.push({
        cheie: cheieAlfabetica(f.nume),
        nume: f.nume,
        ani: f.ani,
        rol: f.rol,
        sectiune: c.titlu,
        spre: c.id,
        ordine: d ? mijloc(d) : 0,
      })
    }
  }
  randuri.sort((a, b) => colator.compare(a.cheie, b.cheie))
  return {
    id: 'indice-persoane',
    titlu: 'Indice de persoane',
    intro: `Cei ${randuri.length} de oameni și instituții cărora acest volum le dă o fișă, alfabetic. Anii sunt cei din fișă; „din" și „n." înseamnă că textul nu dă un an de sfârșit.`,
    coloane: [
      { cheie: 'cheie', et: 'Nume' },
      { cheie: 'ani', et: 'Anii', clasa: 'num' },
      { cheie: 'rol', et: 'Ce a fost' },
      { cheie: 'sectiune', et: 'Unde' },
    ],
    randuri,
  }
}

/** Cele patruzeci de dispute, una pe rând: prima frază a fiecăreia. */
export function tabelDispute(sectiuni) {
  const primaFraza = (t) => {
    const s = String(t || '').trim()
    const m = s.match(/^[\s\S]*?[.!?](?=\s+[„"A-ZĂÂÎȘȚ]|$)/)
    return (m ? m[0] : s).trim()
  }
  return {
    id: 'dispute',
    titlu: 'Disputele istoriografice',
    intro: 'Fiecare secțiune se încheie cu principala dispută istoriografică a subiectului ei, cu ambele poziții expuse corect. Tabelul le strânge la un loc, cu prima frază a fiecăreia; discuția întreagă rămâne la locul ei, în secțiune.',
    coloane: [
      { cheie: 'sectiune', et: 'Secțiunea' },
      { cheie: 'disputa', et: 'Ce se discută' },
    ],
    randuri: sectiuni.filter((c) => c.controversa).map((c) => ({
      sectiune: c.titlu,
      disputa: primaFraza(c.controversa),
      spre: c.id,
    })),
  }
}

/** Toate cifrele volumului, la un loc. */
export function tabelCifre(sectiuni) {
  const randuri = []
  for (const c of sectiuni) for (const x of c.cifre || []) {
    randuri.push({ valoare: x.valoare, eticheta: x.eticheta, sectiune: c.titlu, spre: c.id })
  }
  return {
    id: 'cifre',
    titlu: 'Cifrele',
    intro: `Cele ${randuri.length} de cifre pe care acest volum le dă, în ordinea secțiunilor. Nota care le însoțește — de unde vine cifra și cât de sigură este — se află la locul ei, în secțiune.`,
    coloane: [
      { cheie: 'valoare', et: 'Cifra', clasa: 'num' },
      { cheie: 'eticheta', et: 'Ce măsoară' },
      { cheie: 'sectiune', et: 'Unde' },
    ],
    randuri,
  }
}

/** Toate cele patru, în ordinea în care se pun la sfârșitul volumului. */
export function toateTabelele(sectiuni) {
  return [tabelSinoptic(sectiuni), tabelDispute(sectiuni), indicePersoane(sectiuni), tabelCifre(sectiuni)]
}

/* --- randarea, pentru cele trei formate cu HTML --------------------------- */
const escT = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Tabelul ca HTML. Capul se repeta la fiecare pagina in tipar (thead), iar
 * randurile nu se rup in doua (tr).
 * @param {object} t         tabelul, de mai sus
 * @param {object} optiuni   { esc } functia de scapare a formatului,
 *                           { legaturi } daca se pun trimiteri catre sectiuni
 */
export function tabelHtml(t, optiuni = {}) {
  const esc = optiuni.esc || escT
  const leg = optiuni.legaturi !== false
  const cap = t.coloane.map((c) => `<th${c.clasa ? ` class="${c.clasa}"` : ''}>${esc(c.et)}</th>`).join('')
  const randuri = t.randuri.map((r) => {
    const celule = t.coloane.map((c, i) => {
      let v = esc(r[c.cheie])
      if (leg && i === 0 && r.spre) v = `<a href="#${r.spre}">${v}</a>`
      return `<td${c.clasa ? ` class="${c.clasa}"` : ''}>${v}</td>`
    }).join('')
    return `<tr${r.rupe ? ' class="rupe"' : ''}>${celule}</tr>`
  }).join('')
  return `<div class="tabel-cutie"><table><thead><tr>${cap}</tr></thead><tbody>${randuri}</tbody></table></div>`
}

/** Secțiunea întreagă: titlu, introducere, tabel. */
export function sectiuneTabel(t, optiuni = {}) {
  const esc = optiuni.esc || escT
  const H = optiuni.nivel || 'h2'
  return `<${H}>${esc(t.titlu)}</${H}>
<p class="tabel-intro">${esc(t.intro)}</p>
${tabelHtml(t, optiuni)}`
}
