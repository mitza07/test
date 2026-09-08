"""Rotunjire monetara conform CIUS-RO.

Doua reguli care nu se negociaza:
  1. Orice suma serializata in UBL are maximum 2 zecimale (BR-DEC-RO-*).
  2. TVA-ul se calculeaza pe baza AGREGATA per cota (BG-23), nu ca suma a
     TVA-urilor de linie. Altfel pica corelatiile BR-CO cu diferente de un ban.

Calculul intern poate folosi 4 zecimale; valoarea de linie se rotunjeste la 2,
iar totalurile se recalculeaza DIN valorile deja rotunjite.
"""

from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal

CENT = Decimal("0.01")
CALC = Decimal("0.0001")


def q2(value: Decimal) -> Decimal:
    """Rotunjeste la 2 zecimale, half-up. Singura functie care produce sume finale."""
    return Decimal(value).quantize(CENT, rounding=ROUND_HALF_UP)


def q4(value: Decimal) -> Decimal:
    """Precizie de calcul intern."""
    return Decimal(value).quantize(CALC, rounding=ROUND_HALF_UP)


@dataclass(frozen=True)
class Line:
    quantity: Decimal
    unit_price: Decimal          # BT-146, nu poate fi negativ (BR-27)
    vat_category: str            # BT-118: S, Z, E, AE, K, G, O
    vat_percent: Decimal | None  # BT-119
    vat_included: bool = False

    def net(self) -> Decimal:
        """BT-131. Rotunjit la 2 zecimale — asta intra in XML si in suma BT-106."""
        if self.unit_price < 0:
            raise ValueError("BR-27: pretul unitar nu poate fi negativ")
        gross = q4(self.quantity * self.unit_price)
        if self.vat_included and self.vat_percent is not None:
            gross = q4(gross / (Decimal(1) + self.vat_percent / Decimal(100)))
        return q2(gross)


@dataclass(frozen=True)
class VatSubtotal:
    category: str                # BT-118
    percent: Decimal | None      # BT-119
    taxable: Decimal             # BT-116
    tax_amount: Decimal          # BT-117


@dataclass(frozen=True)
class Totals:
    line_total: Decimal          # BT-106
    allowance_total: Decimal     # BT-107
    charge_total: Decimal        # BT-108
    tax_exclusive: Decimal       # BT-109
    tax_amount: Decimal          # BT-110
    tax_inclusive: Decimal       # BT-112
    prepaid: Decimal             # BT-113
    rounding: Decimal            # BT-114
    payable: Decimal             # BT-115
    breakdown: list[VatSubtotal] # BG-23


def compute(
    lines: list[Line],
    doc_allowances: Decimal = Decimal(0),
    doc_charges: Decimal = Decimal(0),
    prepaid: Decimal = Decimal(0),
    rounding: Decimal = Decimal(0),
) -> Totals:
    """Calculeaza BG-22 si BG-23 conform regulilor de corelatie BR-CO.

    Deducerile si taxele la nivel de document se repartizeaza pe cote proportional
    cu baza fiecarei cote, apoi se rotunjesc; diferenta de rotunjire cade pe cea
    mai mare baza, ca suma BT-116 sa dea exact BT-109.
    """
    nets = [ln.net() for ln in lines]
    line_total = q2(sum(nets, Decimal(0)))                        # BT-106
    allowance_total = q2(doc_allowances)                          # BT-107
    charge_total = q2(doc_charges)                                # BT-108
    tax_exclusive = q2(line_total - allowance_total + charge_total)  # BT-109

    groups: OrderedDict[tuple[str, Decimal | None], Decimal] = OrderedDict()
    for ln, net in zip(lines, nets, strict=True):
        key = (ln.vat_category, ln.vat_percent)
        groups[key] = groups.get(key, Decimal(0)) + net

    adjustment = tax_exclusive - line_total
    breakdown: list[VatSubtotal] = []
    if line_total != 0 and adjustment != 0:
        allocated = Decimal(0)
        keys = list(groups)
        for i, key in enumerate(keys):
            base = groups[key]
            if i == len(keys) - 1:
                share = adjustment - allocated
            else:
                share = q2(adjustment * base / line_total)
                allocated += share
            groups[key] = q2(base + share)

    for (category, percent), taxable in groups.items():
        rate = percent or Decimal(0)
        tax = q2(taxable * rate / Decimal(100))
        breakdown.append(VatSubtotal(category, percent, q2(taxable), tax))

    tax_amount = q2(sum((b.tax_amount for b in breakdown), Decimal(0)))  # BT-110
    tax_inclusive = q2(tax_exclusive + tax_amount)                       # BT-112
    payable = q2(tax_inclusive - q2(prepaid) + q2(rounding))             # BT-115

    return Totals(
        line_total=line_total,
        allowance_total=allowance_total,
        charge_total=charge_total,
        tax_exclusive=tax_exclusive,
        tax_amount=tax_amount,
        tax_inclusive=tax_inclusive,
        prepaid=q2(prepaid),
        rounding=q2(rounding),
        payable=payable,
        breakdown=breakdown,
    )
