"""Secventele de elemente impuse de XSD-ul OASIS UBL 2.1.

De ce exista fisierul asta separat: XSD-ul defineste fiecare tip ca `xsd:sequence`,
nu `xsd:all`. Un element corect, cu valoare corecta, pus in pozitia gresita pica
la validarea pe schema — INAINTE sa se ajunge la regulile de business, deci fara
mesaj `BR-...` care sa spuna ce e gresit. E cea mai enervanta clasa de respingere.

Tinandu-le ca date, si nu implicit in ordinea instructiunilor din generator,
obtinem doua lucruri: se pot verifica automat (vezi tests/test_ubl_sequence.py)
si se corecteaza intr-un singur loc cand se schimba versiunea UBL.

PROVENIENTA: secventele de mai jos sunt transcrise din UBL 2.1 (OASIS Standard,
04.11.2013) si din maparea de sintaxa EN 16931-3-2. NU au fost verificate rulate
impotriva XSD-ului oficial in mediul in care au fost scrise — nu exista acces la
retea acolo. Inainte de primul upload real:

    1. descarca `ro16931-ubl-1.0.9` in SCHEMATRON_PATH (vezi schematron/README.md)
    2. ruleaza `pytest tests/test_ubl_schematron.py` — se activeaza singur cand
       gaseste artefactele
    3. valideaza un XML generat si la endpointul public ANAF (vezi
       app/core/anaf/validare.py)

Pana atunci, trateaza ordinea ca pe o ipoteza bine informata, nu ca pe un fapt.
"""

from __future__ import annotations

# Radacina documentului. Pentru cod 381 se emite CreditNote, nu Invoice: ANAF are
# endpointuri si parametri `standard` diferiti pentru cele doua (UBL vs CN).
INVOICE: tuple[str, ...] = (
    "UBLExtensions",
    "UBLVersionID",
    "CustomizationID",
    "ProfileID",
    "ProfileExecutionID",
    "ID",
    "CopyIndicator",
    "UUID",
    "IssueDate",
    "IssueTime",
    "DueDate",
    "InvoiceTypeCode",
    "Note",
    "TaxPointDate",
    "DocumentCurrencyCode",
    "TaxCurrencyCode",
    "PricingCurrencyCode",
    "PaymentCurrencyCode",
    "PaymentAlternativeCurrencyCode",
    "AccountingCostCode",
    "AccountingCost",
    "LineCountNumeric",
    "BuyerReference",
    "InvoicePeriod",
    "OrderReference",
    "BillingReference",
    "DespatchDocumentReference",
    "ReceiptDocumentReference",
    "StatementDocumentReference",
    "OriginatorDocumentReference",
    "ContractDocumentReference",
    "AdditionalDocumentReference",
    "ProjectReference",
    "Signature",
    "AccountingSupplierParty",
    "AccountingCustomerParty",
    "PayeeParty",
    "BuyerCustomerParty",
    "SellerSupplierParty",
    "TaxRepresentativeParty",
    "Delivery",
    "DeliveryTerms",
    "PaymentMeans",
    "PaymentTerms",
    "PrepaidPayment",
    "AllowanceCharge",
    "TaxExchangeRate",
    "PricingExchangeRate",
    "PaymentExchangeRate",
    "PaymentAlternativeExchangeRate",
    "TaxTotal",
    "WithholdingTaxTotal",
    "LegalMonetaryTotal",
    "InvoiceLine",
)

# CreditNote difera de Invoice in antet: TaxPointDate vine INAINTE de codul de tip,
# iar codul se numeste CreditNoteTypeCode. Nu presupune ca sunt identice.
CREDIT_NOTE: tuple[str, ...] = (
    "UBLExtensions",
    "UBLVersionID",
    "CustomizationID",
    "ProfileID",
    "ProfileExecutionID",
    "ID",
    "CopyIndicator",
    "UUID",
    "IssueDate",
    "IssueTime",
    "DueDate",
    "TaxPointDate",
    "CreditNoteTypeCode",
    "Note",
    "DocumentCurrencyCode",
    "TaxCurrencyCode",
    "PricingCurrencyCode",
    "PaymentCurrencyCode",
    "PaymentAlternativeCurrencyCode",
    "AccountingCostCode",
    "AccountingCost",
    "LineCountNumeric",
    "BuyerReference",
    "InvoicePeriod",
    "DiscrepancyResponse",
    "OrderReference",
    "BillingReference",
    "DespatchDocumentReference",
    "ReceiptDocumentReference",
    "StatementDocumentReference",
    "OriginatorDocumentReference",
    "ContractDocumentReference",
    "AdditionalDocumentReference",
    "ProjectReference",
    "Signature",
    "AccountingSupplierParty",
    "AccountingCustomerParty",
    "PayeeParty",
    "BuyerCustomerParty",
    "SellerSupplierParty",
    "TaxRepresentativeParty",
    "Delivery",
    "DeliveryTerms",
    "PaymentMeans",
    "PaymentTerms",
    "PrepaidPayment",
    "AllowanceCharge",
    "TaxExchangeRate",
    "PricingExchangeRate",
    "PaymentExchangeRate",
    "PaymentAlternativeExchangeRate",
    "TaxTotal",
    "WithholdingTaxTotal",
    "LegalMonetaryTotal",
    "CreditNoteLine",
)

PARTY: tuple[str, ...] = (
    "MarkCareIndicator",
    "MarkAttentionIndicator",
    "WebsiteURI",
    "LogoReferenceID",
    "EndpointID",
    "IndustryClassificationCode",
    "PartyIdentification",
    "PartyName",
    "Language",
    "PostalAddress",
    "PhysicalLocation",
    "PartyTaxScheme",
    "PartyLegalEntity",
    "Contact",
    "Person",
    "AgentParty",
    "ServiceProviderParty",
    "PowerOfAttorney",
    "FinancialAccount",
)

ADDRESS: tuple[str, ...] = (
    "ID",
    "AddressTypeCode",
    "AddressFormatCode",
    "Postbox",
    "Floor",
    "Room",
    "StreetName",
    "AdditionalStreetName",
    "BlockName",
    "BuildingName",
    "BuildingNumber",
    "InhouseMail",
    "Department",
    "MarkAttention",
    "MarkCare",
    "PlotIdentification",
    "CitySubdivisionName",
    "CityName",
    "PostalZone",
    "CountrySubentity",
    "CountrySubentityCode",
    "Region",
    "District",
    "TimezoneOffset",
    "AddressLine",
    "Country",
    "LocationCoordinate",
)

PARTY_LEGAL_ENTITY: tuple[str, ...] = (
    "RegistrationName",
    "CompanyID",
    "RegistrationDate",
    "RegistrationExpirationDate",
    "CompanyLegalFormCode",
    "CompanyLegalForm",
    "SoleProprietorshipIndicator",
    "CompanyLiquidationStatusCode",
    "CorporateStockAmount",
    "FullyPaidSharesIndicator",
    "RegistrationAddress",
    "CorporateRegistrationScheme",
    "HeadOfficeParty",
    "ShareholderParty",
)

CONTACT: tuple[str, ...] = (
    "ID",
    "Name",
    "Telephone",
    "Telefax",
    "ElectronicMail",
    "Note",
    "OtherCommunication",
)

DELIVERY: tuple[str, ...] = (
    "ID",
    "Quantity",
    "MinimumQuantity",
    "MaximumQuantity",
    "ActualDeliveryDate",
    "ActualDeliveryTime",
    "LatestDeliveryDate",
    "LatestDeliveryTime",
    "TrackingID",
    "DeliveryAddress",
    "AlternativeDeliveryLocation",
    "DeliveryLocation",
    "RequestedDeliveryPeriod",
    "PromisedDeliveryPeriod",
    "EstimatedDeliveryPeriod",
    "CarrierParty",
    "DeliveryParty",
    "NotifyParty",
    "Despatch",
    "DeliveryTerms",
    "MinimumDeliveryUnit",
    "MaximumDeliveryUnit",
    "Shipment",
)

PAYMENT_MEANS: tuple[str, ...] = (
    "ID",
    "PaymentMeansCode",
    "PaymentDueDate",
    "PaymentChannelCode",
    "InstructionID",
    "InstructionNote",
    "PaymentID",
    "CardAccount",
    "PayeeFinancialAccount",
    "PayerFinancialAccount",
    "CreditAccount",
    "PaymentMandate",
    "TradeFinancing",
)

TAX_TOTAL: tuple[str, ...] = ("TaxAmount", "RoundingAmount", "TaxEvidenceIndicator",
                              "TaxIncludedIndicator", "TaxSubtotal")

TAX_SUBTOTAL: tuple[str, ...] = (
    "TaxableAmount",
    "TaxAmount",
    "CalculatedTaxAmount",
    "TaxSubtotalCalculationSequenceNumeric",
    "TransactionCurrencyTaxAmount",
    "Percent",
    "BaseUnitMeasure",
    "PerUnitAmount",
    "TierRange",
    "TierRatePercent",
    "TaxCategory",
)

TAX_CATEGORY: tuple[str, ...] = (
    "ID",
    "Name",
    "Percent",
    "BaseUnitMeasure",
    "PerUnitAmount",
    "TaxExemptionReasonCode",
    "TaxExemptionReason",
    "TierRange",
    "TierRatePercent",
    "TaxScheme",
)

MONETARY_TOTAL: tuple[str, ...] = (
    "LineExtensionAmount",
    "TaxExclusiveAmount",
    "TaxInclusiveAmount",
    "AllowanceTotalAmount",
    "ChargeTotalAmount",
    "PrepaidAmount",
    "PayableRoundingAmount",
    "PayableAmount",
)

# InvoiceLine si CreditNoteLine difera doar prin numele cantitatii
# (InvoicedQuantity vs CreditedQuantity), restul secventei e identic.
INVOICE_LINE: tuple[str, ...] = (
    "ID",
    "UUID",
    "Note",
    "SampleIndicator",
    "InvoicedQuantity",
    "LineExtensionAmount",
    "TaxPointDate",
    "AccountingCostCode",
    "AccountingCost",
    "PaymentPurposeCode",
    "FreeOfChargeIndicator",
    "InvoicePeriod",
    "OrderLineReference",
    "DespatchLineReference",
    "ReceiptLineReference",
    "BillingReference",
    "DocumentReference",
    "PricingReference",
    "OriginatorParty",
    "Delivery",
    "PaymentTerms",
    "AllowanceCharge",
    "TaxTotal",
    "WithholdingTaxTotal",
    "Item",
    "Price",
    "DeliveryTerms",
    "SubInvoiceLine",
    "ItemPriceExtension",
)

CREDIT_NOTE_LINE: tuple[str, ...] = tuple(
    "CreditedQuantity" if name == "InvoicedQuantity"
    else "SubCreditNoteLine" if name == "SubInvoiceLine"
    else name
    for name in INVOICE_LINE
)

ITEM: tuple[str, ...] = (
    "Description",
    "PackQuantity",
    "PackSizeNumeric",
    "CatalogueIndicator",
    "Name",
    "HazardousRiskIndicator",
    "AdditionalInformation",
    "Keyword",
    "BrandName",
    "ModelName",
    "BuyersItemIdentification",
    "SellersItemIdentification",
    "ManufacturersItemIdentification",
    "StandardItemIdentification",
    "CatalogueItemIdentification",
    "AdditionalItemIdentification",
    "CatalogueDocumentReference",
    "ItemSpecificationDocumentReference",
    "OriginAddress",
    "OriginCountry",
    "CommodityClassification",
    "TransactionConditions",
    "HazardousItem",
    "ClassifiedTaxCategory",
    "AdditionalItemProperty",
    "ManufacturerParty",
    "InformationContentProviderParty",
    "OriginAddress2",
    "ItemInstance",
    "Certificate",
    "Dimension",
)

PRICE: tuple[str, ...] = (
    "PriceAmount",
    "BaseQuantity",
    "PriceChangeReason",
    "PriceTypeCode",
    "PriceType",
    "OrderableUnitFactorRate",
    "ValidityPeriod",
    "PriceList",
    "AllowanceCharge",
    "PricingExchangeRate",
)

ALLOWANCE_CHARGE: tuple[str, ...] = (
    "ID",
    "ChargeIndicator",
    "AllowanceChargeReasonCode",
    "AllowanceChargeReason",
    "MultiplierFactorNumeric",
    "PrepaidIndicator",
    "SequenceNumeric",
    "Amount",
    "BaseAmount",
    "AccountingCostCode",
    "AccountingCost",
    "PaymentMeans",
    "TaxCategory",
    "TaxTotal",
    "PaymentTerms",
)

# Numele local al tipului UBL -> secventa lui. Cheia e numele elementului asa cum
# apare in document, ca verificarea sa poata cobori recursiv fara sa stie XSD-ul.
BY_ELEMENT: dict[str, tuple[str, ...]] = {
    "Invoice": INVOICE,
    "CreditNote": CREDIT_NOTE,
    "AccountingSupplierParty": ("CustomerAssignedAccountID", "AdditionalAccountID",
                                "DataSendingCapability", "Party", "DespatchContact",
                                "AccountingContact", "SellerContact"),
    "AccountingCustomerParty": ("CustomerAssignedAccountID", "SupplierAssignedAccountID",
                                "AdditionalAccountID", "Party", "DeliveryContact",
                                "AccountingContact", "BuyerContact"),
    "Party": PARTY,
    "PayeeParty": PARTY,
    "TaxRepresentativeParty": PARTY,
    "DeliveryParty": PARTY,
    "PostalAddress": ADDRESS,
    "DeliveryAddress": ADDRESS,
    "Address": ADDRESS,
    "RegistrationAddress": ADDRESS,
    "PartyLegalEntity": PARTY_LEGAL_ENTITY,
    "Contact": CONTACT,
    "Delivery": DELIVERY,
    "DeliveryLocation": ("ID", "Description", "Conditions", "CountrySubentity",
                         "CountrySubentityCode", "LocationTypeCode",
                         "InformationURI", "Name", "ValidityPeriod", "Address",
                         "SubsidiaryLocation", "LocationCoordinate"),
    "PaymentMeans": PAYMENT_MEANS,
    "PayeeFinancialAccount": ("ID", "Name", "AliasName", "AccountTypeCode",
                              "AccountFormatCode", "CurrencyCode", "PaymentNote",
                              "FinancialInstitutionBranch", "Country"),
    "PaymentTerms": ("ID", "PaymentMeansID", "PrepaidPaymentReferenceID", "Note",
                     "ReferenceEventCode", "SettlementDiscountPercent",
                     "PenaltySurchargePercent", "PaymentPercent", "Amount",
                     "SettlementDiscountAmount", "PenaltyAmount", "PaymentTermsDetailsURI",
                     "PaymentDueDate", "InstallmentDueDate", "InvoicingPartyReference",
                     "SettlementPeriod", "PenaltyPeriod", "ExchangeRate", "ValidityPeriod"),
    "TaxTotal": TAX_TOTAL,
    "TaxSubtotal": TAX_SUBTOTAL,
    "TaxCategory": TAX_CATEGORY,
    "ClassifiedTaxCategory": TAX_CATEGORY,
    "TaxScheme": ("ID", "Name", "TaxTypeCode", "CurrencyCode", "JurisdictionRegionAddress"),
    "PartyTaxScheme": ("RegistrationName", "CompanyID", "TaxLevelCode",
                       "ExemptionReasonCode", "ExemptionReason", "RegistrationAddress",
                       "TaxScheme"),
    "LegalMonetaryTotal": MONETARY_TOTAL,
    "InvoiceLine": INVOICE_LINE,
    "CreditNoteLine": CREDIT_NOTE_LINE,
    "Item": ITEM,
    "Price": PRICE,
    "AllowanceCharge": ALLOWANCE_CHARGE,
    "InvoicePeriod": ("StartDate", "StartTime", "EndDate", "EndTime", "DurationMeasure",
                      "DescriptionCode", "Description"),
    "OrderReference": ("ID", "SalesOrderID", "CopyIndicator", "UUID", "IssueDate",
                       "IssueTime", "CustomerReference", "OrderTypeCode",
                       "DocumentReference"),
    "BillingReference": ("InvoiceDocumentReference", "SelfBilledInvoiceDocumentReference",
                         "CreditNoteDocumentReference",
                         "SelfBilledCreditNoteDocumentReference",
                         "DebitNoteDocumentReference", "ReminderDocumentReference",
                         "AdditionalDocumentReference", "BillingReferenceLine"),
    "InvoiceDocumentReference": ("ID", "CopyIndicator", "UUID", "IssueDate", "IssueTime",
                                 "DocumentTypeCode", "DocumentType", "XPath",
                                 "LanguageID", "LocaleCode", "VersionID",
                                 "DocumentStatusCode", "DocumentDescription",
                                 "Attachment", "ValidityPeriod", "IssuerParty",
                                 "ResultOfVerification"),
}
# Referintele de document impart aceeasi secventa.
for _ref in ("ContractDocumentReference", "OrderReferenceDocumentReference",
             "DespatchDocumentReference", "ReceiptDocumentReference",
             "OriginatorDocumentReference", "AdditionalDocumentReference"):
    BY_ELEMENT[_ref] = BY_ELEMENT["InvoiceDocumentReference"]

for _ident in ("PartyIdentification", "BuyersItemIdentification",
               "SellersItemIdentification", "StandardItemIdentification"):
    BY_ELEMENT[_ident] = ("ID", "ExtendedID", "BarcodeSymbologyID", "PhysicalAttribute",
                          "MeasurementDimension", "IssuerParty")
BY_ELEMENT["PartyName"] = ("Name",)
BY_ELEMENT["Country"] = ("IdentificationCode", "Name")
BY_ELEMENT["OriginCountry"] = ("IdentificationCode", "Name")
BY_ELEMENT["CommodityClassification"] = ("NatureCode", "CargoTypeCode",
                                         "CommodityCode", "ItemClassificationCode")
BY_ELEMENT["AdditionalItemProperty"] = ("ID", "Name", "NameCode", "TestMethod", "Value",
                                        "ValueQuantity", "ValueQualifier",
                                        "ImportanceCode", "ListValue", "UsabilityPeriod",
                                        "ItemPropertyGroup", "RangeDimension",
                                        "ItemPropertyRange")
BY_ELEMENT["AddressLine"] = ("Line",)


def position(parent_element: str, child_element: str) -> int:
    """Indexul copilului in secventa parintelui. -1 daca nu e cunoscut.

    Necunoscut inseamna „nu am transcris secventa asta", nu „e valid oriunde".
    """
    order = BY_ELEMENT.get(parent_element)
    if order is None:
        return -1
    try:
        return order.index(child_element)
    except ValueError:
        return -1


def _local(tag: object) -> str:
    """Numele local, fara `{namespace}`."""
    text = str(tag)
    return text.rsplit("}", 1)[-1]


def violations(element: object) -> list[str]:
    """Elementele emise in afara secventei, recursiv. Lista goala = ordine corecta.

    Nu inlocuieste validarea pe XSD — verifica doar ce e transcris in modulul asta.
    Un copil necunoscut intr-un parinte cunoscut se raporteaza si el: fie e un
    element gresit, fie secventa e incompleta. Ambele merita privite.
    """
    found: list[str] = []
    parent_name = _local(element.tag)          # type: ignore[attr-defined]
    order = BY_ELEMENT.get(parent_name)

    if order is not None:
        previous_index = -1
        previous_name = ""
        for child in element:                  # type: ignore[attr-defined]
            child_name = _local(child.tag)
            if child_name not in order:
                found.append(
                    f"{parent_name}: copilul '{child_name}' nu apare in secventa cunoscuta"
                )
                continue
            index = order.index(child_name)
            if index < previous_index:
                found.append(
                    f"{parent_name}: '{child_name}' (pozitia {index}) este emis dupa "
                    f"'{previous_name}' (pozitia {previous_index})"
                )
            previous_index = max(previous_index, index)
            previous_name = child_name

    for child in element:                      # type: ignore[attr-defined]
        found.extend(violations(child))
    return found
