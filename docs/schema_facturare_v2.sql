-- ============================================================
-- Schema program facturare RO — v2
-- Construita pe modelul CIUS-RO / EN 16931, nu pe UI
-- Vezi efactura_spec.md pentru regulile de validare
-- PostgreSQL 15+
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM-uri si nomenclatoare fixe
-- ============================================================

-- ISO 3166-2:RO. Judetul se scrie NUMAI asa in XML.
CREATE TABLE county (
    code        char(5) PRIMARY KEY,       -- RO-B, RO-CJ, RO-IF...
    name        text NOT NULL,             -- eticheta pentru UI
    is_bucharest boolean NOT NULL DEFAULT false
);
INSERT INTO county (code, name, is_bucharest) VALUES
 ('RO-AB','Alba',false),('RO-AR','Arad',false),('RO-AG','Arges',false),
 ('RO-BC','Bacau',false),('RO-BH','Bihor',false),('RO-BN','Bistrita-Nasaud',false),
 ('RO-BT','Botosani',false),('RO-BV','Brasov',false),('RO-BR','Braila',false),
 ('RO-B','Bucuresti',true),('RO-BZ','Buzau',false),('RO-CS','Caras-Severin',false),
 ('RO-CL','Calarasi',false),('RO-CJ','Cluj',false),('RO-CT','Constanta',false),
 ('RO-CV','Covasna',false),('RO-DB','Dambovita',false),('RO-DJ','Dolj',false),
 ('RO-GL','Galati',false),('RO-GR','Giurgiu',false),('RO-GJ','Gorj',false),
 ('RO-HR','Harghita',false),('RO-HD','Hunedoara',false),('RO-IL','Ialomita',false),
 ('RO-IS','Iasi',false),('RO-IF','Ilfov',false),('RO-MM','Maramures',false),
 ('RO-MH','Mehedinti',false),('RO-MS','Mures',false),('RO-NT','Neamt',false),
 ('RO-OT','Olt',false),('RO-PH','Prahova',false),('RO-SM','Satu Mare',false),
 ('RO-SJ','Salaj',false),('RO-SB','Sibiu',false),('RO-SV','Suceava',false),
 ('RO-TR','Teleorman',false),('RO-TM','Timis',false),('RO-TL','Tulcea',false),
 ('RO-VS','Vaslui',false),('RO-VL','Valcea',false),('RO-VN','Vrancea',false);

-- UN/ECE Recommendation 20. BT-130 cere codul, nu "buc".
CREATE TABLE measuring_unit (
    code        text PRIMARY KEY,          -- H87, HUR, KGM, MTR...
    label_ro    text NOT NULL,             -- afisat pe PDF si in UI
    label_en    text
);
INSERT INTO measuring_unit (code, label_ro, label_en) VALUES
 ('H87','buc','piece'),('HUR','ora','hour'),('DAY','zi','day'),('MON','luna','month'),
 ('ANN','an','year'),('KGM','kg','kilogram'),('GRM','g','gram'),('TNE','tona','tonne'),
 ('MTR','m','metre'),('MMT','mm','millimetre'),('CMT','cm','centimetre'),
 ('KMT','km','kilometre'),('MTK','mp','square metre'),('MTQ','mc','cubic metre'),
 ('LTR','l','litre'),('MLT','ml','millilitre'),('SET','set','set'),
 ('PR','pereche','pair'),('KWH','kWh','kilowatt hour'),('C62','unitate','unit');

-- Coduri categorie TVA EN 16931 (BT-118)
CREATE TABLE vat_category (
    code            char(2) PRIMARY KEY,
    name            text NOT NULL,
    requires_reason boolean NOT NULL DEFAULT false
);
INSERT INTO vat_category (code, name, requires_reason) VALUES
 ('S','Cota standard',false),
 ('Z','Cota zero',false),
 ('E','Scutit de TVA',true),
 ('AE','Taxare inversa',true),
 ('K','Livrare intracomunitara scutita',true),
 ('G','Export scutit',true),
 ('O','Neimpozabil / in afara sferei',true),
 ('L','Canare',false),
 ('M','Ceuta si Melilla',false);

-- Coduri mijloc de plata UNTDID 4461 (BT-81), subsetul uzual
CREATE TABLE payment_means_code (
    code text PRIMARY KEY,
    name text NOT NULL
);
INSERT INTO payment_means_code (code, name) VALUES
 ('10','Numerar'),('20','Cec'),('30','Virament bancar'),('42','Plata in cont bancar'),
 ('48','Card bancar'),('49','Debit direct'),('58','SEPA credit transfer'),
 ('59','SEPA direct debit'),('97','Compensare');

-- ============================================================
-- FIRME
-- ============================================================

CREATE TABLE company (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- BG-4 Seller
    bt31_vat_id         text,                        -- cod TVA, cu prefix RO
    bt32_legal_reg_id   text,                        -- CUI / identificator inregistrare
    bt27_name           text NOT NULL,               -- max 200
    bt28_trading_name   text,                        -- max 200
    bt33_legal_info     text,                        -- max 1000: J40/..., capital social
    bt34_electronic_addr text,                       -- adresa electronica (EAS)
    bt35_address1       text NOT NULL,               -- max 150
    bt36_address2       text,                        -- max 100
    address3            text,                        -- max 100
    bt37_city           text NOT NULL,               -- max 50; SECTORn daca RO-B
    bt38_postal_code    text,                        -- max 20
    bt39_county         char(5) REFERENCES county(code),
    bt40_country        char(2) NOT NULL DEFAULT 'RO',
    contact_name        text,                        -- max 100
    contact_phone       text,                        -- max 100
    contact_email       text,                        -- max 100
    vat_payer           boolean NOT NULL DEFAULT true,
    vat_on_collection   boolean NOT NULL DEFAULT false,  -- TVA la incasare
    -- preferinte
    logo_path           text,
    default_language    char(2) NOT NULL DEFAULT 'RO',
    default_currency    char(3) NOT NULL DEFAULT 'RON',
    exchange_source     text NOT NULL DEFAULT 'bnr_today',
    exchange_markup_pct numeric(6,4) NOT NULL DEFAULT 0,
    spv_auto_send_days  smallint CHECK (spv_auto_send_days BETWEEN 0 AND 4),
    spv_environment     text NOT NULL DEFAULT 'test'
                        CHECK (spv_environment IN ('test','prod')),
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_company_bucharest CHECK (
        bt40_country <> 'RO' OR bt39_county <> 'RO-B'
        OR bt37_city ~ '^SECTOR[1-6]$'
    ),
    CONSTRAINT ck_company_fiscal_id CHECK (
        bt31_vat_id IS NOT NULL OR bt32_legal_reg_id IS NOT NULL
    )
);

CREATE TABLE bank_account (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    bt84_iban   text NOT NULL,
    bt85_name   text,                                -- max 200
    bt86_bic    text,
    bank        text,
    currency    char(3) NOT NULL DEFAULT 'RON',
    is_default  boolean NOT NULL DEFAULT false
);

CREATE TABLE work_station (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id  uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    name        text NOT NULL DEFAULT 'Sediu',
    UNIQUE (company_id, name)
);

-- ============================================================
-- UTILIZATORI
-- ============================================================

CREATE TABLE app_user (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email         text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    full_name     text,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE company_user (
    company_id uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    role       text NOT NULL CHECK (role IN ('owner','accountant','operator','viewer')),
    PRIMARY KEY (company_id, user_id)
);

-- ============================================================
-- NOMENCLATOARE PER FIRMA
-- ============================================================

CREATE TABLE vat_rate (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id    uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    name          text NOT NULL,                     -- 'Normala', 'Redusa', 'Scutit'
    percent       numeric(5,2) NOT NULL,
    category_code char(2) NOT NULL REFERENCES vat_category(code),
    -- SAF-T: TaxCode din TaxTable. Obligatoriu pe FIECARE linie de factura in D406.
    -- Lipsa lui este eroarea nr. 1 la validarea D406.
    saft_tax_code text NOT NULL,
    saft_tax_type text NOT NULL DEFAULT 'TVA',
    exempt_reason text,                              -- BT-120, obligatoriu pt E/K/G/O/AE
    exempt_code   text,                              -- BT-121
    is_default    boolean NOT NULL DEFAULT false,
    valid_from    date NOT NULL DEFAULT CURRENT_DATE,
    valid_to      date,
    UNIQUE (company_id, name, valid_from)
);

CREATE TABLE doc_series (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    doc_type     text NOT NULL CHECK (doc_type IN
                    ('factura','proforma','aviz','chitanta','bon_comanda')),
    name         text NOT NULL,
    start_number bigint NOT NULL DEFAULT 1,
    next_number  bigint NOT NULL DEFAULT 1,
    padding      smallint NOT NULL DEFAULT 4,
    description  text,
    is_default   boolean NOT NULL DEFAULT false,
    is_active    boolean NOT NULL DEFAULT true,
    UNIQUE (company_id, doc_type, name)
);

CREATE TABLE client (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    -- BG-7 Buyer
    bt48_vat_id         text,                        -- cod TVA
    bt47_legal_reg_id   text,                        -- CUI sau CNP
    is_person           boolean NOT NULL DEFAULT false,
    bt44_name           text NOT NULL,               -- max 200
    bt45_trading_name   text,
    bt49_electronic_addr text,
    legal_info          text,                        -- J40/...
    bt50_address1       text,                        -- max 150; obligatoriu pt SPV
    bt51_address2       text,                        -- max 100
    address3            text,
    bt52_city           text,                        -- max 50; obligatoriu pt SPV
    bt53_postal_code    text,                        -- max 20
    bt54_county         char(5) REFERENCES county(code),
    bt55_country        char(2) NOT NULL DEFAULT 'RO',
    contact_name        text,
    contact_phone       text,
    contact_email       text,
    iban                text,
    bank                text,
    code                text,                        -- cod client intern
    vat_payer           boolean NOT NULL DEFAULT false,
    payment_days        smallint,
    created_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_client_bucharest CHECK (
        bt55_country <> 'RO' OR bt54_county <> 'RO-B'
        OR bt52_city ~ '^SECTOR[1-6]$'
    )
);
CREATE INDEX ON client (company_id, bt47_legal_reg_id);
CREATE INDEX ON client USING gin (to_tsvector('simple', bt44_name));

-- BG-13 Delivery / punct de lucru client
CREATE TABLE client_location (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id         uuid NOT NULL REFERENCES client(id) ON DELETE CASCADE,
    bt70_name         text,
    bt71_location_id  text,
    bt75_address1     text NOT NULL,                 -- BR-RO-180
    bt76_address2     text,
    address3          text,
    bt77_city         text NOT NULL,                 -- BR-RO-201
    bt78_postal_code  text,
    bt79_county       char(5) NOT NULL REFERENCES county(code),   -- BR-RO-211
    bt80_country      char(2) NOT NULL DEFAULT 'RO',
    CONSTRAINT ck_loc_bucharest CHECK (
        bt80_country <> 'RO' OR bt79_county <> 'RO-B'
        OR bt77_city ~ '^SECTOR[1-6]$'
    )
);

CREATE TABLE product (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    bt153_name      text NOT NULL CHECK (length(bt153_name) <= 100),
    bt154_description text CHECK (length(bt154_description) <= 200),
    bt155_seller_code text,
    bt156_buyer_code  text,
    bt157_gtin        text,                          -- EAN
    bt158_class_code  text,                          -- CPV sau NC
    bt158_class_scheme text,                         -- 'CPV', 'STI' (NC), 'ZZZ'
    bt159_origin_country char(2),
    unit_code       text NOT NULL DEFAULT 'H87' REFERENCES measuring_unit(code),
    product_type    text NOT NULL DEFAULT 'Serviciu' CHECK (product_type IN
        ('Marfa','Materii prime','Materiale consumabile','Semifabricate','Produs finit',
         'Produs rezidual','Produse agricole','Animale si pasari','Ambalaje',
         'Obiecte de inventar','Serviciu')),
    price           numeric(18,4),
    currency        char(3) NOT NULL DEFAULT 'RON',
    vat_rate_id     uuid REFERENCES vat_rate(id),
    vat_included    boolean NOT NULL DEFAULT false,
    is_salable      boolean NOT NULL DEFAULT true,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON product (company_id, bt155_seller_code);

-- ============================================================
-- DOCUMENTE
-- ============================================================

CREATE TABLE document (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      uuid NOT NULL REFERENCES company(id) ON DELETE RESTRICT,
    doc_type        text NOT NULL CHECK (doc_type IN
                      ('factura','proforma','aviz','chitanta','bon_comanda')),

    -- BT-3: 380 factura | 381 nota creditare | 384 factura corectata
    --       389 autofactura | 751 informativ contabil
    bt3_type_code   char(3) CHECK (bt3_type_code IN ('380','381','384','389','751')),
    bt24_customization_id text NOT NULL DEFAULT
      'urn:cen.eu:en16931:2017#compliant#urn:efactura.mfinante.ro:CIUS-RO:1.0.1',
    bt23_business_process text,

    series_id       uuid NOT NULL REFERENCES doc_series(id),
    series_name     text NOT NULL,
    number          bigint NOT NULL,
    -- BT-1 = series_name || lpad(number), trebuie sa contina o cifra (BR-RO-010)
    bt1_invoice_id  text NOT NULL CHECK (bt1_invoice_id ~ '[0-9]'
                                         AND length(bt1_invoice_id) <= 200),

    client_id       uuid REFERENCES client(id),
    client_snapshot jsonb NOT NULL,
    seller_snapshot jsonb NOT NULL,
    delivery_snapshot jsonb,

    bt2_issue_date      date NOT NULL DEFAULT CURRENT_DATE,
    bt9_due_date        date,
    bt7_tax_point_date  date,
    -- BT-8: 3 = data emiterii | 35 = data livrarii | 432 = data platii
    bt8_tax_point_code  text CHECK (bt8_tax_point_code IN ('3','35','432')),
    bt72_delivery_date  date,
    bt73_period_start   date,
    bt74_period_end     date,

    bt5_currency        char(3) NOT NULL DEFAULT 'RON',
    bt6_tax_currency    char(3) NOT NULL DEFAULT 'RON',
    exchange_rate       numeric(18,6),
    -- BNR publica la 13:00, aplicabil zilei urmatoare. O factura emisa dimineata
    -- foloseste cursul zilei bancare precedente. Data cursului != data facturii.
    fx_rate_date        date,
    fx_rate_source      text,

    -- referinte
    bt10_buyer_reference    text,
    bt12_contract_number    text CHECK (length(bt12_contract_number) <= 200),
    bt12_contract_date      date,
    bt13_order_number       text CHECK (length(bt13_order_number) <= 200),
    bt14_sales_order        text CHECK (length(bt14_sales_order) <= 200),
    bt15_reception_notice   text CHECK (length(bt15_reception_notice) <= 200),
    bt16_despatch_notice    text CHECK (length(bt16_despatch_notice) <= 200),
    bt17_tender_reference   text CHECK (length(bt17_tender_reference) <= 200),
    bt18_object_identifier  text,
    bt19_buyer_accounting   text CHECK (length(bt19_buyer_accounting) <= 100),
    bt20_payment_terms      text CHECK (length(bt20_payment_terms) <= 300),
    bt46_buyer_identifier   text,

    -- BG-3: factura precedenta (storno / corectie)
    bt25_preceding_invoice_id   text,
    bt26_preceding_invoice_date date,

    -- date interne, nu ajung in XML
    issuer_name         text,
    issuer_id           text,
    deputy_name         text,
    deputy_identity_card text,
    deputy_auto         text,
    sales_agent         text,
    work_station_id     uuid REFERENCES work_station(id),
    internal_note       text,
    language            char(2) NOT NULL DEFAULT 'RO',
    -- precizia interna de calcul; serializarea in XML e mereu la 2 zecimale
    calc_precision      smallint NOT NULL DEFAULT 2 CHECK (calc_precision BETWEEN 2 AND 4),

    -- BG-22 totaluri, toate rotunjite la 2 zecimale
    bt106_line_total        numeric(18,2) NOT NULL DEFAULT 0,
    bt107_allowance_total   numeric(18,2) NOT NULL DEFAULT 0,
    bt108_charge_total      numeric(18,2) NOT NULL DEFAULT 0,
    bt109_tax_exclusive     numeric(18,2) NOT NULL DEFAULT 0,
    bt110_tax_amount        numeric(18,2) NOT NULL DEFAULT 0,
    bt111_tax_amount_ron    numeric(18,2),
    bt112_tax_inclusive     numeric(18,2) NOT NULL DEFAULT 0,
    bt113_prepaid           numeric(18,2) NOT NULL DEFAULT 0,
    bt114_rounding          numeric(18,2) NOT NULL DEFAULT 0,
    bt115_payable           numeric(18,2) NOT NULL DEFAULT 0,
    total_collected         numeric(18,2) NOT NULL DEFAULT 0,

    -- trei axe ortogonale de stare, nu una singura
    doc_status      text NOT NULL DEFAULT 'draft'
                    CHECK (doc_status IN ('draft','issued','canceled','deleted')),
    payment_status  text NOT NULL DEFAULT 'unpaid'
                    CHECK (payment_status IN ('unpaid','partial','paid','overdue','writeoff')),
    -- spv_status oglindeste efactura_job; 'unknown' NU inseamna esec (timeout != esec)
    spv_status      text NOT NULL DEFAULT 'not_sent'
                    CHECK (spv_status IN ('not_sent','queued','processing','validated',
                                          'rejected','unknown','not_applicable')),
    canceled_at     timestamptz,

    -- imuabilitatea acopera si REPREZENTAREA, nu doar datele:
    -- o factura veche nu se regenereaza cu logo sau sablon nou
    template_id       text,
    template_version  text,
    rendered_pdf_path text,
    rendered_pdf_sha256 text,
    rendered_at       timestamptz,

    -- concurenta optimista: emiterea vizeaza o versiune exacta a ciornei
    draft_version   integer NOT NULL DEFAULT 1,

    ref_document_id uuid REFERENCES document(id),
    ref_kind        text CHECK (ref_kind IN ('from_proforma','from_notice','storno')),

    idempotency_key text,
    created_by      uuid REFERENCES app_user(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),

    UNIQUE (company_id, doc_type, series_name, number),
    UNIQUE (company_id, idempotency_key),
    -- BR-RO-030
    CONSTRAINT ck_tax_currency CHECK (bt5_currency = 'RON' OR bt6_tax_currency = 'RON'),
    -- BG-3 obligatoriu la storno
    CONSTRAINT ck_storno_ref CHECK (
        ref_kind <> 'storno' OR bt25_preceding_invoice_id IS NOT NULL
    )
);
CREATE INDEX ON document (company_id, bt2_issue_date DESC);
CREATE INDEX ON document (client_id);
CREATE INDEX ON document (doc_status) WHERE doc_status = 'issued';
CREATE INDEX ON document (payment_status) WHERE payment_status IN ('unpaid','overdue');

-- BG-1: maxim 20 aparitii (BR-RO-A020), fiecare max 300 caractere
CREATE TABLE document_note (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    position    smallint NOT NULL,
    bt22_note   text NOT NULL CHECK (length(bt22_note) <= 300),
    UNIQUE (document_id, position)
);

-- BG-25: liniile facturii
CREATE TABLE document_line (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id         uuid NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    bt126_line_id       text NOT NULL,
    position            smallint NOT NULL,

    product_id          uuid REFERENCES product(id),
    bt153_name          text NOT NULL CHECK (length(bt153_name) <= 100),
    name_translation    text,
    bt154_description   text CHECK (length(bt154_description) <= 200),
    bt155_seller_code   text,
    bt156_buyer_code    text,
    bt157_gtin          text,
    bt158_class_code    text,
    bt158_class_scheme  text,
    bt159_origin_country char(2),

    bt129_quantity      numeric(18,4) NOT NULL DEFAULT 1,
    bt130_unit_code     text NOT NULL REFERENCES measuring_unit(code),
    unit_translation    text,
    bt146_item_price    numeric(18,4) NOT NULL CHECK (bt146_item_price >= 0),  -- BR-27
    bt149_base_quantity numeric(18,4),
    bt131_line_net      numeric(18,2) NOT NULL DEFAULT 0,
    bt127_note          text CHECK (length(bt127_note) <= 300),
    bt133_accounting_ref text CHECK (length(bt133_accounting_ref) <= 100),

    -- categoria si cota TVA salvate ca istoric, nu ca FK
    bt151_vat_category  char(2) NOT NULL REFERENCES vat_category(code),
    bt152_vat_percent   numeric(5,2),
    vat_name            text,
    saft_tax_code       text,                        -- copiat din vat_rate la emitere
    saft_tax_type       text,
    vat_included        boolean NOT NULL DEFAULT false,

    exchange_rate       numeric(18,6),
    management          text,

    UNIQUE (document_id, position)
);

-- BG-32: atribute articol, maxim 50 per linie (BR-RO-A052)
CREATE TABLE line_item_attribute (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    line_id     uuid NOT NULL REFERENCES document_line(id) ON DELETE CASCADE,
    bt160_name  text NOT NULL CHECK (length(bt160_name) <= 50),
    bt161_value text NOT NULL CHECK (length(bt161_value) <= 100)
);

-- BG-20 / BG-21 (document) si BG-27 / BG-28 (linie)
-- Discounturile NU se exprima prin pret negativ.
CREATE TABLE allowance_charge (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id         uuid NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    line_id             uuid REFERENCES document_line(id) ON DELETE CASCADE,
    is_charge           boolean NOT NULL DEFAULT false,  -- false = deducere
    amount              numeric(18,2) NOT NULL,          -- BT-92 / BT-99 / BT-136 / BT-141
    base_amount         numeric(18,2),                   -- BT-93 / BT-100 / BT-137 / BT-142
    percentage          numeric(6,3),
    reason              text CHECK (length(reason) <= 100),
    reason_code         text,
    vat_category        char(2) REFERENCES vat_category(code),
    vat_percent         numeric(5,2)
);

-- BG-23: defalcarea TVA. Se calculeaza si se stocheaza, nu se deriva la generare.
CREATE TABLE vat_breakdown (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id         uuid NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    bt118_category      char(2) NOT NULL REFERENCES vat_category(code),
    bt119_percent       numeric(5,2),
    bt116_taxable       numeric(18,2) NOT NULL,
    bt117_tax_amount    numeric(18,2) NOT NULL,
    bt120_exempt_reason text,
    bt121_exempt_code   text,
    UNIQUE (document_id, bt118_category, bt119_percent)
);

-- BG-16: mijloace de plata
CREATE TABLE payment_means (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id         uuid NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    bt81_code           text NOT NULL REFERENCES payment_means_code(code),
    bt82_name           text CHECK (length(bt82_name) <= 100),
    bt83_remittance_info text CHECK (length(bt83_remittance_info) <= 140),
    bt84_iban           text,
    bt85_account_name   text CHECK (length(bt85_account_name) <= 200),
    bt86_bic            text,
    bt88_card_holder    text CHECK (length(bt88_card_holder) <= 200)
);

-- BG-24: documente atasate
CREATE TABLE document_attachment (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id         uuid NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    bt122_ref_id        text NOT NULL,
    bt123_description   text,
    bt125_file_path     text,
    mime_type           text,
    filename            text
);

-- ============================================================
-- INCASARI
-- ============================================================

CREATE TABLE payment (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     uuid NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    payment_type    text NOT NULL CHECK (payment_type IN
        ('Chitanta','Bon fiscal','Bon fiscal card','Alta incasare numerar',
         'Ordin de plata','Mandat postal','Card','CEC','Bilet ordin',
         'Alta incasare banca','Ramburs')),
    series_id       uuid REFERENCES doc_series(id),
    document_number text,
    issue_date      date NOT NULL DEFAULT CURRENT_DATE,
    value           numeric(18,2) NOT NULL,
    mentions        text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- e-FACTURA / SPV
-- ============================================================

CREATE TABLE spv_credential (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id         uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    environment        text NOT NULL CHECK (environment IN ('test','prod')),
    access_token       text NOT NULL,               -- criptat in Vault
    refresh_token      text NOT NULL,               -- criptat in Vault
    access_expires_at  timestamptz NOT NULL,        -- +90 zile
    refresh_expires_at timestamptz NOT NULL,        -- +365 zile; ALERTA la -14 zile
    authorized_by      uuid REFERENCES app_user(id),
    authorized_at      timestamptz NOT NULL DEFAULT now(),
    last_refreshed_at  timestamptz,
    UNIQUE (company_id, environment)
);

CREATE TABLE efactura_job (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     uuid NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    direction       text NOT NULL DEFAULT 'out' CHECK (direction IN ('out','in')),
    standard        text NOT NULL DEFAULT 'UBL' CHECK (standard IN ('UBL','CII','CN','RASP')),
    is_b2c          boolean NOT NULL DEFAULT false,
    flag_extern     boolean NOT NULL DEFAULT false,
    flag_autofactura boolean NOT NULL DEFAULT false,
    flag_executare  boolean NOT NULL DEFAULT false,

    -- FORMAT / CANAL / DOVADA sunt trei obiecte diferite, nu unul
    channel         text NOT NULL DEFAULT 'spv' CHECK (channel IN ('spv','email','peppol')),
    api_host        text NOT NULL DEFAULT 'api.anaf.ro',
    environment     text NOT NULL DEFAULT 'test' CHECK (environment IN ('test','prod')),

    -- -1 netrimisa | 0 in prelucrare | 1 validata | 2 erori
    status_code     smallint NOT NULL DEFAULT -1,
    anaf_stare      text,          -- 'in prelucrare' | 'ok' | 'nok' | 'XML cu erori...'
    -- timeout != esec. 'unknown' cere verificare, nu retrimitere.
    is_unknown      boolean NOT NULL DEFAULT false,
    status_text     text,
    xml_ubl         text,
    xml_size_bytes  integer CHECK (xml_size_bytes IS NULL OR xml_size_bytes <= 10485760),
    index_incarcare text,
    id_descarcare   text,
    zip_path        text,
    signature_path  text,
    error_detail    jsonb,

    scheduled_at    timestamptz,
    sent_at         timestamptz,
    resolved_at     timestamptz,
    -- bt2_issue_date + 5 ZILE LUCRATOARE (OUG 89/2025), calculat cu public_holiday
    legal_deadline  date,
    -- ANAF pastreaza factura in SPV doar 60 de zile. Dupa, arhiva e pierduta definitiv.
    download_deadline date,
    downloaded_at     timestamptz,

    -- ANAF: max 100 stareMesaj/zi per index_incarcare, max 10 descarcare/zi per id
    status_queries_today   smallint NOT NULL DEFAULT 0,
    downloads_today        smallint NOT NULL DEFAULT 0,
    quota_reset_date       date NOT NULL DEFAULT CURRENT_DATE,

    attempts        smallint NOT NULL DEFAULT 0,
    created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON efactura_job (status_code) WHERE status_code IN (-1, 0);
CREATE INDEX ON efactura_job (scheduled_at) WHERE sent_at IS NULL;
CREATE INDEX ON efactura_job (legal_deadline) WHERE status_code <> 1;

-- Rezultatele validatorului local, inainte de upload
CREATE TABLE validation_result (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid NOT NULL REFERENCES document(id) ON DELETE CASCADE,
    rule_code   text NOT NULL,       -- 'BR-RO-100', 'BR-DEC-RO-23'
    severity    text NOT NULL CHECK (severity IN ('fatal','warning')),
    bt_ref      text,
    message     text NOT NULL,
    field_path  text,                -- pentru a evidentia campul in UI
    checked_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON validation_result (document_id, severity);

-- ============================================================
-- ARHIVARE, EVENIMENTE, CURSURI
-- ============================================================

-- Pastrare 5 ani de la 1 IULIE a anului urmator exercitiului financiar
-- (art. 25 Legea 82/1991, modificat prin Legea 36/2023).
-- Situatiile financiare: 10 ani (art. 28 alin. 2^1).
-- ORIGINALUL LEGAL este XML-ul semnat de ANAF; PDF-ul are rol informativ.
CREATE TABLE archive_entry (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      uuid NOT NULL REFERENCES company(id),
    document_id     uuid REFERENCES document(id),
    kind            text NOT NULL CHECK (kind IN ('xml_sent','zip_spv','pdf','signature')),
    is_legal_original boolean NOT NULL DEFAULT false,  -- true doar pentru zip_spv / xml semnat
    file_path       text NOT NULL,
    sha256          text NOT NULL,
    size_bytes      bigint NOT NULL,
    retain_until    date NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE event_log (
    id          bigserial PRIMARY KEY,
    company_id  uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    topic       text NOT NULL,
    entity_id   uuid,
    payload     jsonb NOT NULL,
    user_id     uuid REFERENCES app_user(id),
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON event_log (company_id, created_at DESC);

CREATE TABLE exchange_rate_bnr (
    rate_date  date NOT NULL,
    currency   char(3) NOT NULL,
    rate       numeric(18,6) NOT NULL,
    PRIMARY KEY (rate_date, currency)
);

-- Necesar pentru termenul de 5 ZILE LUCRATOARE (OUG 89/2025, din 01.01.2026).
-- Calculul se face conform Regulamentului (CEE, Euratom) 1182/71.
-- Fara acest tabel nu poti calcula corect legal_deadline.
CREATE TABLE public_holiday (
    holiday_date date PRIMARY KEY,
    name         text NOT NULL,
    country      char(2) NOT NULL DEFAULT 'RO'
);

-- Monitorizarea pragului de 395.000 lei (art. 310 Cod fiscal).
-- La depasire, inregistrarea in scopuri de TVA se cere CHIAR LA DATA depasirii,
-- iar factura care depaseste pragul se emite deja cu TVA.
CREATE TABLE vat_threshold_tracker (
    company_id      uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    fiscal_year     smallint NOT NULL,
    threshold_value numeric(18,2) NOT NULL DEFAULT 395000.00,
    turnover_ytd    numeric(18,2) NOT NULL DEFAULT 0,
    alert_at_pct    smallint NOT NULL DEFAULT 80,
    alerted_at      timestamptz,
    exceeded_at     date,
    PRIMARY KEY (company_id, fiscal_year)
);

-- ============================================================
-- REGULI IMPLEMENTATE IN COD, NU IN DDL
-- ============================================================
-- 1. Numerotare: SELECT next_number FROM doc_series ... FOR UPDATE, increment
--    in aceeasi tranzactie cu INSERT document. Fara gauri in serie.
-- 2. Stergere permisa DOAR daca number = max(number) din serie. Altfel anulare.
-- 3. Storno: document nou, bt3_type_code = '384' (sau CreditNote '381'),
--    ref_kind = 'storno', bt25/bt26 completate, linii cu cantitati negative.
-- 4. Rotunjire: calculeaza la calc_precision, apoi rotunjeste la 2 zecimale
--    la nivel de linie; totalurile se recalculeaza DIN valorile rotunjite,
--    altfel pica BR-CO (corelatia linii-totaluri).
-- 5. vat_breakdown se recalculeaza la fiecare salvare a documentului:
--    grupare pe (bt151_vat_category, bt152_vat_percent),
--    bt117 = round(bt116 * bt119 / 100, 2).
-- 6. Validatorul local ruleaza toate cele 30 de reguli din efactura_spec.md
--    si populeaza validation_result. status_code ramane -1 daca exista 'fatal'.
-- 7. Worker SPV: respecta quota (100 stareMesaj/zi/index, 10 descarcare/zi/id),
--    reseteaza contoarele la schimbarea zilei, backoff exponential la 5xx.
-- 8. Alerta refresh token la refresh_expires_at - 14 zile.
-- 9. Alerta legal_deadline: factura emisa si netrimisa la 2 zile de termen.
-- 10. Codurile de judet si unitatile de masura sunt FK, nu text liber.

-- ============================================================
-- SAF-T / D406 — mapari obligatorii
-- ============================================================

-- Nomenclatoarele ANAF pentru D406. Enum-urile interne trebuie mapate,
-- altfel exportul nu trece validarea.
CREATE TABLE saft_nomenclature (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nomenclature text NOT NULL CHECK (nomenclature IN
        ('invoice_type','payment_mechanism','county','country','currency',
         'account_chart','tax_table','uom')),
    anaf_code    text NOT NULL,
    label        text NOT NULL,
    internal_key text,          -- valoarea corespondenta din enum-urile aplicatiei
    valid_from   date NOT NULL DEFAULT CURRENT_DATE,
    valid_to     date,
    UNIQUE (nomenclature, anaf_code, valid_from)
);

-- Contul contabil pe care se mapeaza venitul, pentru sectiunea GeneralLedgerEntries.
-- Alimentat de contabil o singura data, per tip de produs.
CREATE TABLE revenue_account_map (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id   uuid NOT NULL REFERENCES company(id) ON DELETE CASCADE,
    product_type text NOT NULL,
    account_id   text NOT NULL,        -- 704, 705, 707...
    UNIQUE (company_id, product_type)
);

-- ============================================================
-- REGULI SUPLIMENTARE (v2.1)
-- ============================================================
-- 11. TaxCode: la emitere se copiaza saft_tax_code din vat_rate pe fiecare
--     document_line. Fara el, D406 pica cu "elementul TaxCode ar fi trebuit
--     sa apara de minimum 1 ori".
-- 12. CUI-ul se normalizeaza la SALVARE, nu la export: fara spatii, fara
--     caractere invizibile. Un spatiu in codul fiscal invalideaza D406.
-- 13. Cross-verificare e-Factura <-> D406: ANAF compara automat sumele, datele
--     si CUI-ul. index_incarcare trebuie sa insoteasca factura in exportul
--     pentru SalesInvoices.
-- 14. Alocarea numarului se face DUPA ce validatorul local trece.
--     O factura care pica validarea nu consuma un numar de serie.
-- 15. Stergerea: verificarea "ultimul din serie" se face in ACEEASI tranzactie
--     atomica cu stergerea (SELECT ... FOR UPDATE pe doc_series), nu la
--     randarea butonului. Blocata suplimentar daca exista index_incarcare.
-- 16. Emiterea vizeaza draft_version exact. Daca versiunea din DB difera de cea
--     confirmata in UI, operatiunea se opreste si se arata diferentele.
-- 17. Dupa restaurare din backup: reconciliaza starea externa (SPV, email trimis,
--     incasari) INAINTE de repornirea joburilor. Altfel se retrimit facturi
--     si emailuri deja trimise.
-- 18. retain_until = 1 iulie a anului urmator exercitiului financiar + 5 ani.
--     Pentru situatii financiare: + 10 ani.
-- 19. download_deadline = sent_at + 60 zile. Alerta la 45 de zile.
--     Dupa 60 de zile arhiva nu mai exista in SPV si nu mai poate fi recuperata.
