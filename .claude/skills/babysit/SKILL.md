---
name: babysit
description: Cum se supraveghează un pull request în acest repo. Se citește înainte de a reacționa la CI, la comentarii de review sau la orice eveniment de pe un PR din mitza07/test.
---

# Supravegherea PR-urilor în acest repo

Acest repo e personal. Nu are CI configurat, nu are recenzenți, nu are alți
contribuitori. Pe un PR de aici nu se schimbă nimic fără ca proprietarul să
facă el ceva.

## Regula

**Nu programa check-in-uri recurente. Niciodată.** Fără `send_later`, fără
`create_trigger`, fără cron, fără bucle de tip „reverifică peste o oră".
Tool-urile de programare sunt blocate în `.claude/settings.json`; blocarea e
intenționată, nu o ocoli și nu propune ocoliri.

Ce faci în loc:

1. Verifici **o singură dată**, imediat după ce ai împins.
2. Raportezi starea într-un singur mesaj.
3. Te oprești.

Dacă apare ceva mai târziu, un comentariu sau un eveniment de CI, evenimentul
trezește sesiunea singur. Nu e nevoie de interogare periodică.

## De ce

Pe 11 și 12 septembrie 2026, o buclă orară de acest fel a rulat 46 de runde pe
PR #3. A consumat de aproximativ trei ori cât construirea efectivă a lucrării și
nu a detectat nicio schimbare, fiindcă nu avea ce detecta. Două bucle identice
rulau simultan în alte sesiuni, pe aceeași cadență.

Costul unei treziri crește cu fiecare rundă: conversația se lungește, se
recitește integral, iar blocul de cache se rescrie la tariful de scriere.

## Dacă chiar pare că e nevoie de supraveghere

Întreabă proprietarul întâi. Spune-i explicit că fiecare trezire costă și cât
aproximativ. Propune un interval și așteaptă răspuns. Nu porni nimic din
proprie inițiativă.

## Ce rămâne valabil

Regulile normale de calitate nu se schimbă: dacă PR-ul are CI roșu sau conflict
de merge **în timpul sesiunii curente**, se repară atunci, pe loc. Interdicția
e doar pe supravegherea programată după ce sesiunea și-a terminat treaba.
