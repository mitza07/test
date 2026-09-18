# Prompturi pentru Gemini și ChatGPT

Fonturile, bibliotecile de tipar și specificațiile tehnice le iau singur — sunt publice și le-am luat deja. Ce nu pot face singur e **verificarea independentă**: eu am scris textul, deci nu sunt martorul potrivit pentru corectitudinea lui. De asta prompturile de mai jos cer altceva decât „caută-mi resurse".

Dă-le fișierul `de-verificat.txt` odată cu promptul 1 și 2.

---

## Prompt 1 — Verificarea cifrelor (dă-l la amândouă, separat)

> Ești redactor de verificare la o editură de carte de istorie. Îți dau o listă de afirmații numerice dintr-un manuscris despre istoria României, care urmează să fie tipărit. Sarcina ta nu este să confirmi, ci să **încerci să infirmi**.
>
> Pentru fiecare afirmație:
> 1. Caută sursa primară sau lucrarea de referință care o susține. Dă titlul, autorul, anul și pagina dacă o găsești.
> 2. Spune dacă cifra e **confirmată**, **disputată** (și atunci dă intervalul real din literatură, cu sursele care susțin fiecare capăt) sau **negăsită**.
> 3. Dacă e disputată, spune care este cifra cel mai des acceptată în literatura de specialitate românească din ultimii 20 de ani, și dacă istoriografia străină diferă.
> 4. Semnalează explicit orice cifră care pare să provină din literatura protocronistă sau din manuale comuniste, chiar dacă circulă și azi.
>
> Nu completa golurile din memorie. Dacă nu găsești o sursă, scrie „negăsit" — este un răspuns util. Nu-mi da rezumate generale despre subiect; vreau doar verdictul pe fiecare linie, în tabel: `nr | afirmație | verdict | cifra corectă sau intervalul | sursa`.
>
> Lista:
> [lipește secțiunea CIFRE din de-verificat.txt]

---

## Prompt 2 — Proveniența citatelor (problema de drepturi de autor)

Ăsta e cel mai important dintre toate, fiindcă e singurul cu consecință juridică.

> Ești consilier juridic pentru o editură. Îți dau citate dintr-un manuscris de istorie care urmează să fie tipărit și vândut în România. Autorii citați sunt în mare parte antici sau morți de peste 70 de ani, deci **textele originale** sunt în domeniul public. Problema mea este alta: **traducerile românești moderne sunt opere protejate separat**.
>
> Pentru fiecare citat:
> 1. Identifică opera și pasajul exact (autor, lucrare, carte/capitol/paragraf).
> 2. Verifică dacă formularea românească dată coincide, cuvânt cu cuvânt sau aproape, cu o **traducere românească publicată**. Dacă da, spune care: traducător, editură, an. Menționează dacă traducătorul a murit acum mai puțin de 70 de ani.
> 3. Dacă formularea pare o retroversiune sau o traducere nouă, spune asta.
> 4. Pentru citatele din secolul XX (discursuri, documente politice, proclamații), spune cine deține drepturile asupra textului și dacă documentul e act oficial — actele oficiale nu sunt protejate de dreptul de autor conform art. 9 din Legea 8/1996.
> 5. Dă-mi verdictul: **se poate tipări ca atare** / **trebuie indicat traducătorul** / **trebuie retradus sau cerut acord**.
>
> Răspunde în tabel, o linie per citat. Nu-mi explica ce e dreptul de autor — dă-mi verdictele.
>
> Citatele:
> [lipește secțiunea CITATE din de-verificat.txt]

---

## Prompt 3 — Logistica publicării în România

> Vreau să public în regie proprie o carte de istorie de circa 380 de pagini, format 6×9 inch, tiraj inițial mic, în România. Am deja fișierele PDF pentru interior și copertă. Am nevoie de informații **actuale și verificabile**, cu linkuri, nu din memorie:
>
> 1. **Tipografii din România** care fac tiraje mici (100–500 exemplare) de carte cusută sau lipită, cu copertă broșată color. Nume, oraș, orientativ preț pe exemplar la 300 de bucăți, timp de execuție. Minimum cinci variante.
> 2. **Print-on-demand** cu livrare în România: ce oferă Lulu, Amazon KDP și eventuali furnizori locali; comparație de costuri de producție și de livrare pentru un volum de 380 de pagini.
> 3. **Distribuție**: cum intră o carte în regie proprie la Cărturești, Humanitas, Libris, eMAG — ce comision iau, ce documente cer, dacă acceptă autori fără editură.
> 4. **Preț**: la ce se vinde în 2026 o carte de istorie de 380 de pagini în România; care e marja obișnuită a librăriei.
> 5. **Fiscal**: ce obligații are o persoană fizică din România care vinde o carte proprie — trebuie PFA, ce cotă de TVA se aplică la carte, dacă drepturile de autor se impozitează diferit.
>
> Pentru fiecare punct dă sursa și data la care ai verificat. Dacă un preț e o estimare, spune că e estimare.

---

## Prompt 4 — Găsirea unui verificator uman

> Caută-mi cum aș putea plăti un istoric român pentru două săptămâni de verificare a unui manuscris de 89.000 de cuvinte despre istoria României. Vreau opțiuni concrete:
> - platforme unde lucrează doctoranzi și absolvenți de istorie din România
> - departamentele de istorie de la universitățile din București, Cluj, Iași și Timișoara care au practică de consultanță editorială
> - asociații profesionale de redactori de carte din România
> - orientativ, cât costă în 2026 o redactare de specialitate pe carte de istorie, la mia de semne sau la coală editorială
>
> Dă-mi date de contact publice acolo unde există.

---

## Ce nu-mi trebuie

Ca să nu pierzi timp cerându-le: **fonturile** (Literata, Spectral, IBM Plex — luate deja, licență OFL, verificată), **bibliotecile de tipar** (Paged.js, instalat), **specificațiile KDP** (extrase din documentația oficială, sunt în `PUBLICARE.md`), **regulile ISBN și depozit legal** (extrase din regulamentul Bibliotecii Naționale, tot acolo). Astea sunt rezolvate.
