/* Completeaza capetele de pagina dupa ce Paged.js a terminat paginarea.
   Se face in JS fiindca string-set() nu se inregistreaza in polyfill: titlul
   cartii este fix si sta in CSS, iar titlul capitolului se propaga aici,
   pagina cu pagina. */
export const COMPLETEAZA_CAPETE = () => {
  const pagini = [...document.querySelectorAll('.pagedjs_page')]
  let titluCurent = ''
  for (const pg of pagini) {
    const deschidere = pg.querySelector('h2.cap-titlu, .anexa h2')
    if (deschidere) titluCurent = deschidere.textContent.trim()
    const cutie = pg.querySelector('.pagedjs_margin-top-right .pagedjs_margin-content')
    if (!cutie) continue
    /* pagina care deschide un capitol nu poarta cap de pagina */
    cutie.textContent = deschidere ? '' : titluCurent
  }
  return pagini.length
}
