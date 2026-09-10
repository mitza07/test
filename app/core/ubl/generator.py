"""Generator UBL 2.1 / CIUS-RO.

Consuma EXACT acelasi dict pe care il valideaza `app.core.validation.br_ro.validate`.
Nu exista doua forme de date intre validare si serializare — daca ar exista, ai
valida o structura si ai trimite alta.

Ordinea de emitere respecta secventele din `app.core.ubl.sequence`. Citeste
docstring-ul de acolo inainte sa modifici ceva: XSD-ul OASIS impune `xsd:sequence`,
iar un element pus gresit pica pe schema, fara mesaj de business rule.

Regula de rotunjire: serializarea produce intotdeauna 2 zecimale pentru sume
(constrangerea 1 din CLAUDE.md). Calculul intern la 4 zecimale ramane in
`app.core.rounding`; aici e ultimul pas, deci aici se taie.

Fluxul corect de emitere este: valideaza -> aloca numar -> genereaza UBL.
Generatorul NU valideaza; primeste un document despre care se stie deja ca trece.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from lxml import etree

from app.core.rounding import q2

NS_INVOICE = "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
NS_CREDIT_NOTE = "urn:oasis:names:specification:ubl:schema:xsd:CreditNote-2"
NS_CAC = "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
NS_CBC = "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"

UBL_VERSION = "2.1"
# BT-24. Regula BR-RO-001: sirul exact, fara alte majuscule sau separatori.
CUSTOMIZATION_ID = ("urn:cen.eu:en16931:2017#compliant#"
                    "urn:efactura.mfinante.ro:CIUS-RO:1.0.1")
PROFILE_ID = "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0"

# Cod 381 = nota de creditare. ANAF o primeste ca document CreditNote, cu alt
# parametru `standard` la upload (CN, nu UBL) si alt endpoint de validare (FCN).
CREDIT_NOTE_TYPE_CODE = "381"


class UblError(ValueError):
    """Documentul nu poate fi serializat. Semnaleaza o eroare de program, nu de date:
    datele se resping mai devreme, in validator."""


# --- formatare -------------------------------------------------------------

def _amount(value: Any) -> str:
    """Sume: exact 2 zecimale. Ultimul punct in care se rotunjeste ceva."""
    return f"{q2(Decimal(str(value))):.2f}"


def _plain(value: Decimal, max_decimals: int) -> str:
    """Zecimal fara notatie stiintifica si fara zerouri finale inutile.

    `str(Decimal('1E+1'))` da '1E+1', care nu e un `xsd:decimal` valid. Trebuie
    fortat prin `format(..., 'f')`.
    """
    quantized = value.quantize(Decimal(1).scaleb(-max_decimals))
    normalized = quantized.normalize()
    text = format(normalized, "f")
    return text


def _quantity(value: Any) -> str:
    """BT-129. Nu intra sub regula celor 2 zecimale; schema o stocheaza la 4."""
    return _plain(Decimal(str(value)), 4)


def _price(value: Any) -> str:
    """BT-146. NU e in lista BR-DEC-RO din sectiunea 2.5 a specificatiei, deci poate
    avea mai mult de 2 zecimale. Un pret de 0,3333 lei/bucata e legitim.

    Minimum doua zecimale, insa: exemplele ANAF scriu 100.00, nu 100.
    """
    text = _plain(Decimal(str(value)), 4)
    if "." not in text:
        return f"{text}.00"
    whole, _, fraction = text.partition(".")
    return f"{whole}.{fraction.ljust(2, '0')}"


def _percent(value: Any) -> str:
    """BT-119 / BT-152."""
    return _plain(Decimal(str(value or 0)), 2)


def _date(value: Any) -> str:
    """BT-2 si celelalte: `YYYY-MM-DD`, exact 10 caractere (BR-RO-DT001)."""
    if isinstance(value, date):
        return value.isoformat()
    text = str(value)
    if len(text) != 10:
        raise UblError(f"Data trebuie sa aiba formatul YYYY-MM-DD, nu '{text}'.")
    return text


def _text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


# --- constructie de elemente ----------------------------------------------

def _cbc(parent: etree._Element, tag: str, value: Any, **attrs: Any) -> etree._Element | None:
    """Element cbc. Nu emite nimic daca valoarea e goala — un element gol e mai
    rau decat unul absent: trece de „obligatoriu" si pica pe continut.

    Parametrul se numeste `tag`, nu `name`, pentru ca `name` e un atribut XML real
    (BT-82, pe PaymentMeansCode) si s-ar ciocni cu **attrs.
    """
    text = _text(value)
    if text is None:
        return None
    element = etree.SubElement(parent, f"{{{NS_CBC}}}{tag}")
    element.text = text
    for key, attr_value in attrs.items():
        if attr_value is not None:
            element.set(key, str(attr_value))
    return element


def _cac(parent: etree._Element, tag: str) -> etree._Element:
    return etree.SubElement(parent, f"{{{NS_CAC}}}{tag}")


# Categoria „O" = neimpozabil, in afara sferei TVA. Spre deosebire de E, Z, G, K si
# AE — care cer cota 0 prezenta — la O cota trebuie sa LIPSEASCA: BR-O-5 pentru
# BT-152 pe linie, BR-O-6 pentru BT-119 in defalcare.
CATEGORY_WITHOUT_RATE = "O"


def _tax_category(parent: etree._Element, tag: str, category: str,
                  percent: Any, *, exemption_code: Any = None,
                  exemption_reason: Any = None) -> None:
    """Grupul de categorie TVA, in ordinea din `sequence.TAX_CATEGORY`."""
    node = _cac(parent, tag)
    _cbc(node, "ID", category)                                 # BT-118 / BT-151
    if category != CATEGORY_WITHOUT_RATE:
        _cbc(node, "Percent", _percent(percent))               # BT-119 / BT-152
    _cbc(node, "TaxExemptionReasonCode", exemption_code)       # BT-121
    _cbc(node, "TaxExemptionReason", exemption_reason)         # BT-120
    scheme = _cac(node, "TaxScheme")
    _cbc(scheme, "ID", "VAT")


# --- parti (BG-4 vanzator, BG-7 cumparator) --------------------------------

def _address(parent: etree._Element, name: str, addr: dict[str, Any]) -> None:
    """BG-5 / BG-8 / BG-15. Ordinea din `sequence.ADDRESS`.

    Judetul merge in CountrySubentity ca ISO 3166-2:RO (BR-RO-110/111/212).
    Regula Bucuresti (localitate = SECTORn cand judetul e RO-B) se verifica in
    validator, nu aici — aici doar se scrie ce a trecut validarea.
    """
    node = _cac(parent, name)
    _cbc(node, "StreetName", addr.get("address1"))            # BT-35 / BT-50 / BT-75
    _cbc(node, "AdditionalStreetName", addr.get("address2"))  # BT-36 / BT-51 / BT-76
    _cbc(node, "CityName", addr.get("city"))                  # BT-37 / BT-52 / BT-77
    _cbc(node, "PostalZone", addr.get("postal_code"))         # BT-38 / BT-53 / BT-78
    _cbc(node, "CountrySubentity", addr.get("county"))        # BT-39 / BT-54 / BT-79
    if _text(addr.get("address3")):
        line = _cac(node, "AddressLine")
        _cbc(line, "Line", addr.get("address3"))              # BT-163 / BT-164
    country = _cac(node, "Country")
    _cbc(country, "IdentificationCode", (addr.get("country") or "RO").upper())


def _party(parent: etree._Element, wrapper: str, party: dict[str, Any],
           *, is_seller: bool) -> None:
    """BG-4 sau BG-7, in ordinea din `sequence.PARTY`."""
    holder = _cac(parent, wrapper)
    node = _cac(holder, "Party")

    # BT-34 / BT-49: adresa electronica. schemeID descrie tipul adresei; EM = email.
    endpoint = party.get("electronic_address")
    if _text(endpoint):
        _cbc(node, "EndpointID", endpoint,
             schemeID=party.get("electronic_address_scheme") or "EM")

    # BT-29 (vanzator) / BT-46 (cumparator)
    for identifier in party.get("identifiers") or []:
        ident_node = _cac(node, "PartyIdentification")
        if isinstance(identifier, dict):
            _cbc(ident_node, "ID", identifier.get("value"),
                 schemeID=identifier.get("scheme"))
        else:
            _cbc(ident_node, "ID", identifier)

    # BT-28 / BT-45: numele comercial, daca difera de denumirea legala
    if _text(party.get("trading_name")):
        name_node = _cac(node, "PartyName")
        _cbc(name_node, "Name", party.get("trading_name"))

    _address(node, "PostalAddress", party)

    # BT-31 / BT-48: codul de TVA, CU prefixul RO. Distinct de BT-32 / BT-47,
    # care e identificatorul de inregistrare si merge fara prefix.
    vat_id = _text(party.get("vat_id"))
    if vat_id:
        scheme_node = _cac(node, "PartyTaxScheme")
        _cbc(scheme_node, "CompanyID", vat_id)
        tax_scheme = _cac(scheme_node, "TaxScheme")
        _cbc(tax_scheme, "ID", "VAT")
    elif is_seller and _text(party.get("tax_registration_id")):
        # BT-32 pentru un vanzator neplatitor de TVA: acelasi grup, alta schema.
        scheme_node = _cac(node, "PartyTaxScheme")
        _cbc(scheme_node, "CompanyID", party.get("tax_registration_id"))
        tax_scheme = _cac(scheme_node, "TaxScheme")
        _cbc(tax_scheme, "ID", "!= VAT")

    legal = _cac(node, "PartyLegalEntity")
    _cbc(legal, "RegistrationName", party.get("name"))        # BT-27 / BT-44
    # Numarul de la Registrul Comertului, format J{judet}/{numar}/{an} (spec 1.6).
    _cbc(legal, "CompanyID", party.get("company_id") or party.get("legal_reg_id"))
    _cbc(legal, "CompanyLegalForm", party.get("legal_info"))  # BT-33

    contact_fields = ("contact_name", "contact_phone", "contact_email")
    if any(_text(party.get(field)) for field in contact_fields):
        contact = _cac(node, "Contact")
        _cbc(contact, "Name", party.get("contact_name"))          # BT-41 / BT-56
        _cbc(contact, "Telephone", party.get("contact_phone"))    # BT-42 / BT-57
        _cbc(contact, "ElectronicMail", party.get("contact_email"))  # BT-43 / BT-58


# --- corpul documentului ---------------------------------------------------

def _allowance_charge(parent: etree._Element, entry: dict[str, Any],
                      currency: str, *, with_tax_category: bool) -> None:
    """BG-20/BG-21 la nivel de document, BG-27/BG-28 la nivel de linie.

    Discountul se exprima EXCLUSIV asa. Pretul unitar negativ pica BR-27.
    """
    node = _cac(parent, "AllowanceCharge")
    _cbc(node, "ChargeIndicator", "true" if entry.get("is_charge") else "false")
    _cbc(node, "AllowanceChargeReasonCode", entry.get("reason_code"))
    _cbc(node, "AllowanceChargeReason", entry.get("reason"))
    if entry.get("percentage") is not None:
        _cbc(node, "MultiplierFactorNumeric", _percent(entry["percentage"]))
    _cbc(node, "Amount", _amount(entry["amount"]), currencyID=currency)
    if entry.get("base_amount") is not None:
        _cbc(node, "BaseAmount", _amount(entry["base_amount"]), currencyID=currency)
    if with_tax_category:
        _tax_category(node, "TaxCategory", entry.get("vat_category") or "S",
                      entry.get("vat_percent"))


def _tax_total(root: etree._Element, doc: dict[str, Any], currency: str) -> None:
    """BG-23. Defalcarea se ia din document, nu se recalculeaza aici.

    Se stocheaza la emitere tocmai ca sa poti audita ulterior de ce a picat o
    factura (decizia 6 din specificatie, sectiunea 5).
    """
    node = _cac(root, "TaxTotal")
    _cbc(node, "TaxAmount", _amount(doc["tax_amount"]), currencyID=currency)

    for group in doc.get("vat_breakdown") or []:
        subtotal = _cac(node, "TaxSubtotal")
        _cbc(subtotal, "TaxableAmount", _amount(group["taxable"]), currencyID=currency)
        _cbc(subtotal, "TaxAmount", _amount(group["tax_amount"]), currencyID=currency)
        _tax_category(subtotal, "TaxCategory", group["category"], group.get("percent"),
                      exemption_code=group.get("exemption_code"),
                      exemption_reason=group.get("exemption_reason"))

    # BT-111: TVA in moneda de contabilitate, cand documentul e in alta moneda.
    # Se exprima ca al doilea TaxTotal, cu TaxAmount si fara subtotaluri.
    #
    # BR-53: daca BT-6 e prezent, BT-111 e OBLIGATORIU. De asta BT-6 se emite doar
    # cand difera de moneda documentului (vezi build_tree) — si de asta lipsa lui
    # BT-111 in acel caz e eroare, nu element sarit.
    tax_currency = (doc.get("tax_currency") or "RON").upper()
    if tax_currency != currency:
        if doc.get("tax_amount_accounting") is None:
            raise UblError(
                f"Documentul e in {currency}, cu TVA raportat in {tax_currency}, "
                "dar lipseste `tax_amount_accounting` (BT-111). BR-53 il cere "
                "obligatoriu cand BT-6 e prezent. Converteste BT-110 la cursul "
                "din `fx_rate_date`."
            )
        accounting = _cac(root, "TaxTotal")
        _cbc(accounting, "TaxAmount", _amount(doc["tax_amount_accounting"]),
             currencyID=tax_currency)


def _monetary_total(root: etree._Element, doc: dict[str, Any], currency: str) -> None:
    """BG-22, in ordinea din `sequence.MONETARY_TOTAL`.

    Atentie: deducerile (BT-107) si taxele (BT-108) vin DUPA cele trei totaluri,
    nu inaintea lor, desi aritmetic le preced.
    """
    node = _cac(root, "LegalMonetaryTotal")
    _cbc(node, "LineExtensionAmount", _amount(doc["line_total"]), currencyID=currency)
    _cbc(node, "TaxExclusiveAmount", _amount(doc["tax_exclusive"]), currencyID=currency)
    _cbc(node, "TaxInclusiveAmount", _amount(doc["tax_inclusive"]), currencyID=currency)
    if Decimal(str(doc.get("allowance_total") or 0)) != 0:
        _cbc(node, "AllowanceTotalAmount", _amount(doc["allowance_total"]),
             currencyID=currency)
    if Decimal(str(doc.get("charge_total") or 0)) != 0:
        _cbc(node, "ChargeTotalAmount", _amount(doc["charge_total"]), currencyID=currency)
    if Decimal(str(doc.get("prepaid") or 0)) != 0:
        _cbc(node, "PrepaidAmount", _amount(doc["prepaid"]), currencyID=currency)
    if Decimal(str(doc.get("rounding") or 0)) != 0:
        _cbc(node, "PayableRoundingAmount", _amount(doc["rounding"]), currencyID=currency)
    _cbc(node, "PayableAmount", _amount(doc["payable"]), currencyID=currency)


def _net_unit_price(line: dict[str, Any]) -> Decimal:
    """BT-146 este pretul NET. Daca pretul introdus contine TVA, se scoate aici.

    Nu se rotunjeste la 2: pretul unitar nu e sub regula BR-DEC-RO.
    """
    if line.get("net_unit_price") is not None:
        return Decimal(str(line["net_unit_price"]))
    price = Decimal(str(line["unit_price"]))
    if line.get("vat_included") and line.get("vat_percent") is not None:
        rate = Decimal(str(line["vat_percent"]))
        price = price / (Decimal(1) + rate / Decimal(100))
    return price


def _line(root: etree._Element, line: dict[str, Any], position: int,
          currency: str, *, is_credit_note: bool) -> None:
    """BG-25."""
    node = _cac(root, "CreditNoteLine" if is_credit_note else "InvoiceLine")
    _cbc(node, "ID", line.get("line_id") or str(position))     # BT-126
    _cbc(node, "Note", line.get("note"))                       # BT-127
    quantity_element = "CreditedQuantity" if is_credit_note else "InvoicedQuantity"
    _cbc(node, quantity_element, _quantity(line.get("quantity", 1)),
         unitCode=line["unit_code"])                           # BT-129 + BT-130
    _cbc(node, "LineExtensionAmount", _amount(line["net"]), currencyID=currency)  # BT-131
    _cbc(node, "AccountingCost", line.get("accounting_ref"))   # BT-133

    if line.get("period_start") or line.get("period_end"):
        period = _cac(node, "InvoicePeriod")
        if line.get("period_start"):
            _cbc(period, "StartDate", _date(line["period_start"]))   # BT-134
        if line.get("period_end"):
            _cbc(period, "EndDate", _date(line["period_end"]))       # BT-135
    if line.get("order_line_reference"):
        order_ref = _cac(node, "OrderLineReference")
        _cbc(order_ref, "LineID", line["order_line_reference"])      # BT-132

    for entry in line.get("allowances") or []:
        _allowance_charge(node, entry, currency, with_tax_category=False)

    item = _cac(node, "Item")
    _cbc(item, "Description", line.get("description"))         # BT-154
    _cbc(item, "Name", line["name"])                           # BT-153
    if _text(line.get("buyer_code")):
        buyers = _cac(item, "BuyersItemIdentification")
        _cbc(buyers, "ID", line["buyer_code"])                 # BT-156
    if _text(line.get("seller_code")):
        sellers = _cac(item, "SellersItemIdentification")
        _cbc(sellers, "ID", line["seller_code"])               # BT-155
    if _text(line.get("gtin")):
        standard = _cac(item, "StandardItemIdentification")
        _cbc(standard, "ID", line["gtin"], schemeID=line.get("gtin_scheme") or "0160")
    if _text(line.get("origin_country")):
        origin = _cac(item, "OriginCountry")
        _cbc(origin, "IdentificationCode", line["origin_country"])   # BT-159
    if _text(line.get("class_code")):
        classification = _cac(item, "CommodityClassification")
        _cbc(classification, "ItemClassificationCode", line["class_code"],
             listID=line.get("class_scheme"))                  # BT-158

    _tax_category(item, "ClassifiedTaxCategory", line["vat_category"],
                  line.get("vat_percent"))

    # BG-32. Aici ajunge si codul SAF-T daca vrei sa fie vizibil in XML; nu e
    # cerut de CIUS-RO, dar e obligatoriu pe linie in D406 (spec. sectiunea 4).
    for attribute in line.get("attributes") or []:
        prop = _cac(item, "AdditionalItemProperty")
        _cbc(prop, "Name", attribute["name"])                  # BT-160
        _cbc(prop, "Value", attribute["value"])                # BT-161

    price = _cac(node, "Price")
    _cbc(price, "PriceAmount", _price(_net_unit_price(line)), currencyID=currency)
    if line.get("base_quantity") is not None:
        _cbc(price, "BaseQuantity", _quantity(line["base_quantity"]),
             unitCode=line["unit_code"])                       # BT-149


def build_tree(doc: dict[str, Any]) -> etree._Element:
    """Construieste arborele. `doc` e dictul intern, deja validat."""
    type_code = str(doc.get("invoice_type_code") or "380")
    is_credit_note = type_code == CREDIT_NOTE_TYPE_CODE
    root_name = "CreditNote" if is_credit_note else "Invoice"
    root_ns = NS_CREDIT_NOTE if is_credit_note else NS_INVOICE

    currency = (doc.get("currency") or "RON").upper()
    root = etree.Element(
        f"{{{root_ns}}}{root_name}",
        nsmap={None: root_ns, "cac": NS_CAC, "cbc": NS_CBC},
    )

    _cbc(root, "UBLVersionID", UBL_VERSION)
    _cbc(root, "CustomizationID", doc.get("customization_id") or CUSTOMIZATION_ID)
    _cbc(root, "ProfileID", doc.get("profile_id") or PROFILE_ID)
    _cbc(root, "ID", doc["invoice_id"])                        # BT-1
    _cbc(root, "IssueDate", _date(doc["issue_date"]))          # BT-2
    if doc.get("due_date"):
        _cbc(root, "DueDate", _date(doc["due_date"]))          # BT-9

    # Singura diferenta de antet intre cele doua radacini: la CreditNote,
    # TaxPointDate precede codul de tip; la Invoice il urmeaza, dupa Note.
    if is_credit_note:
        if doc.get("tax_point_date"):
            _cbc(root, "TaxPointDate", _date(doc["tax_point_date"]))   # BT-7
        _cbc(root, "CreditNoteTypeCode", type_code)                    # BT-3
        for note in doc.get("notes") or []:
            _cbc(root, "Note", note)                                   # BT-22
    else:
        _cbc(root, "InvoiceTypeCode", type_code)                       # BT-3
        for note in doc.get("notes") or []:
            _cbc(root, "Note", note)                                   # BT-22
        if doc.get("tax_point_date"):
            _cbc(root, "TaxPointDate", _date(doc["tax_point_date"]))   # BT-7

    _cbc(root, "DocumentCurrencyCode", currency)                       # BT-5
    tax_currency = (doc.get("tax_currency") or "RON").upper()
    # BR-RO-030: daca BT-5 nu e RON, BT-6 trebuie sa fie RON. Se emite doar cand
    # difera de moneda documentului — altfel e redundant.
    if tax_currency != currency:
        _cbc(root, "TaxCurrencyCode", tax_currency)                    # BT-6
    _cbc(root, "AccountingCost", doc.get("buyer_accounting_ref"))      # BT-19
    _cbc(root, "BuyerReference", doc.get("buyer_reference"))           # BT-10

    if doc.get("period_start") or doc.get("period_end"):
        period = _cac(root, "InvoicePeriod")
        if doc.get("period_start"):
            _cbc(period, "StartDate", _date(doc["period_start"]))      # BT-73
        if doc.get("period_end"):
            _cbc(period, "EndDate", _date(doc["period_end"]))          # BT-74
        _cbc(period, "DescriptionCode", doc.get("tax_point_code"))     # BT-8

    if doc.get("order_number") or doc.get("sales_order"):
        order = _cac(root, "OrderReference")
        _cbc(order, "ID", doc.get("order_number"))                     # BT-13
        _cbc(order, "SalesOrderID", doc.get("sales_order"))            # BT-14

    # BG-3: factura precedenta. Obligatoriu la storno (constrangerea 6 din CLAUDE.md:
    # o factura emisa nu se modifica, se corecteaza printr-un document nou).
    if doc.get("preceding_invoice_id"):
        billing = _cac(root, "BillingReference")
        reference = _cac(billing, "InvoiceDocumentReference")
        _cbc(reference, "ID", doc["preceding_invoice_id"])             # BT-25
        if doc.get("preceding_invoice_date"):
            _cbc(reference, "IssueDate", _date(doc["preceding_invoice_date"]))  # BT-26

    if doc.get("despatch_notice"):
        node = _cac(root, "DespatchDocumentReference")
        _cbc(node, "ID", doc["despatch_notice"])                       # BT-16
    if doc.get("reception_notice"):
        node = _cac(root, "ReceiptDocumentReference")
        _cbc(node, "ID", doc["reception_notice"])                      # BT-15
    if doc.get("tender_reference"):
        node = _cac(root, "OriginatorDocumentReference")
        _cbc(node, "ID", doc["tender_reference"])                      # BT-17
    if doc.get("contract_number"):
        node = _cac(root, "ContractDocumentReference")
        _cbc(node, "ID", doc["contract_number"])                       # BT-12
    for attachment in doc.get("attachments") or []:
        node = _cac(root, "AdditionalDocumentReference")
        _cbc(node, "ID", attachment.get("id"))                         # BT-122
        _cbc(node, "DocumentDescription", attachment.get("description"))  # BT-123

    _party(root, "AccountingSupplierParty", doc["seller"], is_seller=True)
    _party(root, "AccountingCustomerParty", doc["buyer"], is_seller=False)

    delivery = doc.get("delivery")
    if delivery:
        node = _cac(root, "Delivery")
        if delivery.get("date"):
            _cbc(node, "ActualDeliveryDate", _date(delivery["date"]))  # BT-72
        if delivery.get("address1") or delivery.get("location_id"):
            location = _cac(node, "DeliveryLocation")
            _cbc(location, "ID", delivery.get("location_id"),
                 schemeID=delivery.get("location_scheme"))             # BT-71
            if delivery.get("address1"):
                _address(location, "Address", delivery)                # BG-15
        if _text(delivery.get("name")):
            party = _cac(node, "DeliveryParty")
            name_node = _cac(party, "PartyName")
            _cbc(name_node, "Name", delivery["name"])                  # BT-70

    payment = doc.get("payment")
    if payment:
        node = _cac(root, "PaymentMeans")
        _cbc(node, "PaymentMeansCode", payment.get("means_code"),
             name=payment.get("means_name"))                           # BT-81 + BT-82
        _cbc(node, "PaymentID", payment.get("payment_id"))             # BT-83
        if _text(payment.get("iban")):
            account = _cac(node, "PayeeFinancialAccount")
            _cbc(account, "ID", payment["iban"])                       # BT-84
            _cbc(account, "Name", payment.get("account_name"))         # BT-85
            if _text(payment.get("bic")):
                branch = _cac(account, "FinancialInstitutionBranch")
                _cbc(branch, "ID", payment["bic"])                     # BT-86

    if _text(doc.get("payment_terms")):
        node = _cac(root, "PaymentTerms")
        _cbc(node, "Note", doc["payment_terms"])                       # BT-20

    for entry in doc.get("allowances") or []:
        _allowance_charge(root, entry, currency, with_tax_category=True)

    _tax_total(root, doc, currency)
    _monetary_total(root, doc, currency)

    for position, line in enumerate(doc.get("lines") or [], start=1):
        _line(root, line, position, currency, is_credit_note=is_credit_note)

    return root


def build(doc: dict[str, Any], *, pretty: bool = True) -> bytes:
    """XML gata de trimis. UTF-8 cu declaratie — ANAF primeste `Content-Type: application/xml`."""
    return etree.tostring(
        build_tree(doc),
        xml_declaration=True,
        encoding="UTF-8",
        pretty_print=pretty,
    )


def build_string(doc: dict[str, Any], *, pretty: bool = True) -> str:
    return build(doc, pretty=pretty).decode("utf-8")
