"""Validator local BR-RO.

Ruleaza INAINTE de alocarea numarului de serie. O factura care pica aici nu
consuma un numar. Acopera regulile din docs/efactura_spec.md §3.

Nu inlocuieste schematronul oficial (ro16931-ubl-1.0.9) — e prima plasa, cea care
prinde 90% din respingeri direct in formular, cu mesaj in romana.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Any, Literal

from app.core.validation.cui import is_valid_cnp, is_valid_cui, normalize_cui

Severity = Literal["fatal", "warning"]

SECTOR_RE = re.compile(r"^SECTOR[1-6]$")
COUNTY_RE = re.compile(r"^RO-(AB|AR|AG|BC|BH|BN|BT|BV|BR|B|BZ|CS|CL|CJ|CT|CV|DB|DJ|GL|GR|"
                       r"GJ|HR|HD|IL|IS|IF|MM|MH|MS|NT|OT|PH|SM|SJ|SB|SV|TR|TM|TL|VS|VL|VN)$")
INVOICE_TYPE_CODES = {"380", "381", "384", "389", "751"}
TAX_POINT_CODES = {"3", "35", "432"}
EXEMPTION_CATEGORIES = {"E", "K", "G", "O", "AE", "Z"}
CUSTOMIZATION_ID = ("urn:cen.eu:en16931:2017#compliant#"
                    "urn:efactura.mfinante.ro:CIUS-RO:1.0.1")


@dataclass
class Finding:
    rule: str
    severity: Severity
    field_path: str
    message: str
    bt_ref: str | None = None


@dataclass
class Report:
    findings: list[Finding] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not any(f.severity == "fatal" for f in self.findings)

    def add(self, rule: str, path: str, message: str,
            severity: Severity = "fatal", bt: str | None = None) -> None:
        self.findings.append(Finding(rule, severity, path, message, bt))


def _decimals(value: Decimal) -> int:
    exponent = Decimal(value).as_tuple().exponent
    return -exponent if isinstance(exponent, int) and exponent < 0 else 0


def _check_address(rep: Report, prefix: str, addr: dict[str, Any],
                   rules: tuple[str, str, str, str]) -> None:
    r_addr, r_city, r_county_present, r_bucharest = rules
    if not (addr.get("address1") or "").strip():
        rep.add(r_addr, f"{prefix}.address1", "Adresa (linia 1) este obligatorie.")
    elif len(addr["address1"]) > 150:
        rep.add(r_addr, f"{prefix}.address1", "Adresa depaseste 150 de caractere.")
    city = (addr.get("city") or "").strip()
    if not city:
        rep.add(r_city, f"{prefix}.city", "Localitatea este obligatorie.")
    elif len(city) > 50:
        rep.add(r_city, f"{prefix}.city", "Localitatea depaseste 50 de caractere.")
    county = (addr.get("county") or "").strip()
    country = (addr.get("country") or "").strip().upper()
    if country == "RO":
        if not county:
            rep.add(r_county_present, f"{prefix}.county",
                    "Judetul este obligatoriu pentru adresele din Romania.")
        elif not COUNTY_RE.match(county):
            rep.add(r_county_present, f"{prefix}.county",
                    f"Judetul trebuie sa fie cod ISO 3166-2:RO (ex. RO-CJ), nu '{county}'.")
        if county == "RO-B" and not SECTOR_RE.match(city):
            rep.add(r_bucharest, f"{prefix}.city",
                    "Pentru Bucuresti (RO-B), localitatea trebuie sa fie "
                    "SECTOR1...SECTOR6, nu numele orasului.")
    postal = addr.get("postal_code") or ""
    if len(postal) > 20:
        rep.add("BR-RO-LEN", f"{prefix}.postal_code", "Codul postal depaseste 20 de caractere.")


def validate(doc: dict[str, Any]) -> Report:
    """Valideaza un document. `doc` e dictul plat produs de serializatorul intern."""
    rep = Report()

    # --- identificare ---
    number = (doc.get("invoice_id") or "").strip()
    if not number:
        rep.add("BR-RO-010", "invoice_id", "Numarul facturii este obligatoriu.", bt="BT-1")
    else:
        if not re.search(r"\d", number):
            rep.add("BR-RO-010", "invoice_id",
                    "Numarul facturii trebuie sa contina cel putin o cifra.", bt="BT-1")
        if len(number) > 200:
            rep.add("BR-RO-010", "invoice_id", "Numarul depaseste 200 de caractere.", bt="BT-1")

    if doc.get("customization_id") != CUSTOMIZATION_ID:
        rep.add("BR-RO-001", "customization_id",
                "CustomizationID nu este cel cerut de CIUS-RO.", bt="BT-24")

    type_code = str(doc.get("invoice_type_code") or "")
    if type_code not in INVOICE_TYPE_CODES:
        rep.add("BR-RO-020_1", "invoice_type_code",
                f"Cod tip document invalid: '{type_code}'. "
                "Permise: 380, 381, 384, 389, 751.", bt="BT-3")
    if doc.get("is_credit_note") and type_code != "381":
        rep.add("BR-RO-020_2", "invoice_type_code",
                "Pentru nota de creditare, singurul cod permis este 381.", bt="BT-3")

    # --- vanzator ---
    seller = doc.get("seller") or {}
    if not (seller.get("vat_id") or seller.get("legal_reg_id") or seller.get("fiscal_rep_vat")):
        rep.add("BR-RO-065", "seller",
                "Vanzatorul trebuie sa aiba cod TVA (BT-31), identificator de "
                "inregistrare (BT-32) sau TVA reprezentant fiscal (BT-63).")
    if seller.get("country", "RO").upper() == "RO":
        raw = seller.get("legal_reg_id") or seller.get("vat_id") or ""
        if raw and not is_valid_cui(raw):
            rep.add("ERRIdentif", "seller.legal_reg_id",
                    "Cifra de control a CUI-ului vanzatorului este gresita. "
                    "ANAF respinge separat de schematron.")
        if raw and normalize_cui(raw) != re.sub(r"^RO", "", str(raw).strip(), flags=re.I):
            rep.add("ERRIdentif", "seller.legal_reg_id",
                    "CUI-ul contine spatii sau caractere invalide. "
                    "Normalizeaza la salvare.", severity="warning")
    _check_address(rep, "seller", seller,
                   ("BR-RO-081", "BR-RO-091", "BR-RO-110", "BR-RO-100"))

    # --- cumparator ---
    buyer = doc.get("buyer") or {}
    if not (buyer.get("vat_id") or buyer.get("legal_reg_id")):
        rep.add("BR-RO-120", "buyer",
                "Cumparatorul trebuie sa aiba identificator (BT-47) sau cod TVA (BT-48).")
    if buyer.get("country", "RO").upper() == "RO":
        raw = buyer.get("legal_reg_id") or buyer.get("vat_id") or ""
        if raw:
            valid = is_valid_cnp(raw) if buyer.get("is_person") else is_valid_cui(raw)
            if not valid:
                label = "CNP-ul" if buyer.get("is_person") else "CUI-ul"
                rep.add("ERRIdentif", "buyer.legal_reg_id",
                        f"Cifra de control a {label} cumparatorului este gresita.")
    _check_address(rep, "buyer", buyer,
                   ("BR-RO-082", "BR-RO-092", "BR-RO-111", "BR-RO-101"))

    # --- livrare ---
    delivery = doc.get("delivery")
    if delivery:
        _check_address(rep, "delivery", delivery,
                       ("BR-RO-180", "BR-RO-201", "BR-RO-211", "BR-RO-202"))

    # --- date ---
    for path, bt, rule in (("issue_date", "BT-2", "BR-RO-DT001"),
                           ("tax_point_date", "BT-7", "BR-RO-DT002"),
                           ("due_date", "BT-9", "BR-RO-DT003"),
                           ("delivery_date", "BT-72", "BR-RO-DT004")):
        value = doc.get(path)
        if value is not None and not isinstance(value, date):
            rep.add(rule, path, "Data trebuie sa fie in format YYYY-MM-DD.", bt=bt)
    if not doc.get("issue_date"):
        rep.add("BR-RO-DT001", "issue_date", "Data emiterii este obligatorie.", bt="BT-2")

    tp_code = doc.get("tax_point_code")
    if tp_code is not None and str(tp_code) not in TAX_POINT_CODES:
        rep.add("BR-RO-040", "tax_point_code",
                "Codul datei de exigibilitate trebuie sa fie 3, 35 sau 432.", bt="BT-8")

    start, end = doc.get("period_start"), doc.get("period_end")
    if start and end and end < start:
        rep.add("BR-CO-19", "period_end",
                "Sfarsitul perioadei este inainte de inceput.", bt="BT-74")

    # --- moneda ---
    currency = (doc.get("currency") or "RON").upper()
    tax_currency = (doc.get("tax_currency") or "RON").upper()
    if currency != "RON" and tax_currency != "RON":
        rep.add("BR-RO-030", "tax_currency",
                "Daca moneda documentului nu este RON, moneda TVA trebuie sa fie RON.",
                bt="BT-6")

    # --- linii ---
    lines = doc.get("lines") or []
    if not lines:
        rep.add("BR-16", "lines", "Factura trebuie sa aiba cel putin o linie.")
    for i, line in enumerate(lines):
        path = f"lines[{i}]"
        name = (line.get("name") or "").strip()
        if not name:
            rep.add("BR-25", f"{path}.name", "Denumirea articolului este obligatorie.",
                    bt="BT-153")
        elif len(name) > 100:
            rep.add("BR-RO-L1013", f"{path}.name",
                    "Denumirea articolului depaseste 100 de caractere.", bt="BT-153")
        if len(line.get("description") or "") > 200:
            rep.add("BR-RO-L1014", f"{path}.description",
                    "Descrierea articolului depaseste 200 de caractere.", bt="BT-154")
        price = line.get("unit_price")
        if price is None:
            rep.add("BR-24", f"{path}.unit_price", "Pretul unitar este obligatoriu.",
                    bt="BT-146")
        elif Decimal(price) < 0:
            rep.add("BR-27", f"{path}.unit_price",
                    "Pretul unitar nu poate fi negativ. Foloseste AllowanceCharge "
                    "pentru discount.", bt="BT-146")
        if not line.get("unit_code"):
            rep.add("BR-23", f"{path}.unit_code",
                    "Codul unitatii de masura (UN/ECE Rec 20) este obligatoriu.", bt="BT-130")
        net = line.get("net")
        if net is not None and _decimals(Decimal(net)) > 2:
            rep.add("BR-DEC-RO-23", f"{path}.net",
                    "Valoarea neta de linie are mai mult de 2 zecimale.", bt="BT-131")
        if not line.get("saft_tax_code"):
            rep.add("D406-TAXCODE", f"{path}.saft_tax_code",
                    "Codul de taxa SAF-T lipseste. D406 il cere pe fiecare linie.",
                    severity="warning")

    # --- zecimale pe totaluri ---
    for key, bt in (("line_total", "BT-106"), ("tax_exclusive", "BT-109"),
                    ("tax_amount", "BT-110"), ("tax_inclusive", "BT-112"),
                    ("payable", "BT-115")):
        value = doc.get(key)
        if value is not None and _decimals(Decimal(value)) > 2:
            rep.add("BR-DEC-RO", key, "Suma are mai mult de 2 zecimale.", bt=bt)

    # --- corelatii aritmetice ---
    totals = {k: Decimal(doc[k]) for k in
              ("line_total", "allowance_total", "charge_total", "tax_exclusive",
               "tax_amount", "tax_inclusive", "prepaid", "rounding", "payable")
              if doc.get(k) is not None}
    if {"line_total", "allowance_total", "charge_total", "tax_exclusive"} <= totals.keys():
        expected = (totals["line_total"] - totals["allowance_total"]
                    + totals["charge_total"])
        if expected != totals["tax_exclusive"]:
            rep.add("BR-CO-13", "tax_exclusive",
                    f"BT-109 ar trebui sa fie {expected}, nu {totals['tax_exclusive']}.")
    if {"tax_exclusive", "tax_amount", "tax_inclusive"} <= totals.keys():
        expected = totals["tax_exclusive"] + totals["tax_amount"]
        if expected != totals["tax_inclusive"]:
            rep.add("BR-CO-15", "tax_inclusive",
                    f"BT-112 ar trebui sa fie {expected}, nu {totals['tax_inclusive']}.")
    if {"tax_inclusive", "prepaid", "rounding", "payable"} <= totals.keys():
        expected = totals["tax_inclusive"] - totals["prepaid"] + totals["rounding"]
        if expected != totals["payable"]:
            rep.add("BR-CO-16", "payable",
                    f"BT-115 ar trebui sa fie {expected}, nu {totals['payable']}.")

    # --- defalcare TVA ---
    breakdown = doc.get("vat_breakdown") or []
    if not breakdown:
        rep.add("BR-CO-18", "vat_breakdown", "Defalcarea TVA (BG-23) este obligatorie.")
    else:
        sum_taxable = sum(Decimal(b["taxable"]) for b in breakdown)
        sum_tax = sum(Decimal(b["tax_amount"]) for b in breakdown)
        if "tax_exclusive" in totals and sum_taxable != totals["tax_exclusive"]:
            rep.add("BR-CO-14", "vat_breakdown",
                    f"Suma bazelor BT-116 ({sum_taxable}) difera de BT-109 "
                    f"({totals['tax_exclusive']}).")
        if "tax_amount" in totals and sum_tax != totals["tax_amount"]:
            rep.add("BR-CO-14", "vat_breakdown",
                    f"Suma TVA BT-117 ({sum_tax}) difera de BT-110 "
                    f"({totals['tax_amount']}).")
        for i, group in enumerate(breakdown):
            category = group.get("category")
            percent = Decimal(group.get("percent") or 0)
            taxable = Decimal(group["taxable"])
            tax = Decimal(group["tax_amount"])
            expected = (taxable * percent / Decimal(100)).quantize(Decimal("0.01"))
            if tax != expected:
                rep.add("BR-CO-17", f"vat_breakdown[{i}].tax_amount",
                        f"TVA calculat gresit: {tax} in loc de {expected}.")
            if category in EXEMPTION_CATEGORIES and not (
                    group.get("exemption_reason") or group.get("exemption_code")):
                rep.add("BR-E-10", f"vat_breakdown[{i}].exemption_reason",
                        f"Categoria '{category}' cere motiv de scutire (BT-120) "
                        "sau cod de scutire (BT-121).")

    # --- storno ---
    if doc.get("is_storno"):
        if not doc.get("preceding_invoice_id"):
            rep.add("BG-3", "preceding_invoice_id",
                    "Stornarea cere referinta la factura corectata (BT-25).")
        if type_code not in {"384", "381"}:
            rep.add("BR-RO-020_1", "invoice_type_code",
                    "Stornarea foloseste codul 384 sau nota de creditare 381.", bt="BT-3")

    # --- lungimi diverse ---
    for key, limit, bt in (("buyer_accounting_ref", 100, "BT-19"),
                           ("payment_terms", 300, "BT-20"),
                           ("contract_number", 200, "BT-12"),
                           ("order_number", 200, "BT-13")):
        value = doc.get(key)
        if value and len(value) > limit:
            rep.add("BR-RO-LEN", key, f"Depaseste {limit} de caractere.", bt=bt)

    notes = doc.get("notes") or []
    if len(notes) > 20:
        rep.add("BR-RO-A020", "notes",
                "Maximum 20 de comentarii pe factura (BT-22).")
    for i, note in enumerate(notes):
        if len(note) > 300:
            rep.add("BR-RO-A020", f"notes[{i}]",
                    "Comentariul depaseste 300 de caractere.", bt="BT-22")

    return rep
