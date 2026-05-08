import { Document, Page, Text, View } from "@react-pdf/renderer";

import { CASE_SOURCE_LABELS } from "@/lib/case/labels";
import { formatDate } from "@/lib/format";

import { FieldRow, Footer, Header, Section, Signatures } from "./components";
import { pdfStyles } from "./styles";

export type ClaimProtocolData = {
  caseNumber: string;
  receivedAt: Date;
  deadlineAt: Date;
  source: keyof typeof CASE_SOURCE_LABELS;
  description?: string | null;
  customer: {
    name?: string | null;
    email: string;
    phone?: string | null;
    street?: string | null;
    city?: string | null;
    zip?: string | null;
    country?: string | null;
    isCompany?: boolean;
    ico?: string | null;
    dic?: string | null;
  };
  order?: {
    shoptetNumber: string;
    orderDate: Date;
    totalAmount: number;
    currency: string;
  } | null;
  items: Array<{
    productName: string;
    productSku?: string | null;
    quantity: number;
    defectType?: string | null;
    defectDesc?: string | null;
    supplier?: string | null;
  }>;
};

function customerAddress(c: ClaimProtocolData["customer"]) {
  return [c.street, c.zip, c.city, c.country].filter(Boolean).join(", ");
}

export function ClaimProtocol({ data }: { data: ClaimProtocolData }) {
  return (
    <Document
      title={`Reklamační protokol ${data.caseNumber}`}
      author="Reklamace"
      subject={`Reklamační protokol – přijetí, ${data.caseNumber}`}
    >
      <Page size="A4" style={pdfStyles.page}>
        <Header
          protocolTitle="Reklamační protokol"
          caseNumber={data.caseNumber}
          date={formatDate(new Date())}
        />

        <Text style={pdfStyles.pageTitle}>Potvrzení o přijetí reklamace</Text>
        <Text style={pdfStyles.pageSubtitle}>
          Tímto potvrzujeme přijetí reklamace dle § 2099 a násl. zákona č. 89/2012 Sb.,
          občanský zákoník.
        </Text>

        <View style={pdfStyles.divider} />

        <View style={pdfStyles.twoCols}>
          <View style={pdfStyles.col}>
            <Section title="Zákazník">
              <FieldRow label="Jméno / firma" value={data.customer.name ?? "—"} />
              <FieldRow label="Email" value={data.customer.email} />
              <FieldRow label="Telefon" value={data.customer.phone} />
              <FieldRow label="Adresa" value={customerAddress(data.customer) || "—"} />
              {data.customer.isCompany && (
                <>
                  <FieldRow label="IČO" value={data.customer.ico} />
                  <FieldRow label="DIČ" value={data.customer.dic} />
                </>
              )}
            </Section>
          </View>
          <View style={pdfStyles.col}>
            <Section title="Reklamace">
              <FieldRow label="Číslo" value={data.caseNumber} />
              <FieldRow label="Datum přijetí" value={formatDate(data.receivedAt)} />
              <FieldRow label="Vstupní kanál" value={CASE_SOURCE_LABELS[data.source]} />
            </Section>

            {data.order && (
              <Section title="Objednávka">
                <FieldRow label="Číslo" value={data.order.shoptetNumber} />
                <FieldRow label="Datum" value={formatDate(data.order.orderDate)} />
                <FieldRow
                  label="Hodnota"
                  value={`${data.order.totalAmount.toFixed(2)} ${data.order.currency}`}
                />
              </Section>
            )}
          </View>
        </View>

        <View style={pdfStyles.highlightBox}>
          <Text style={pdfStyles.highlightLabel}>Lhůta pro vyřízení reklamace</Text>
          <Text style={pdfStyles.highlightValue}>
            Do {formatDate(data.deadlineAt)} (30 dní od přijetí)
          </Text>
        </View>

        <Section title={`Reklamované zboží (${data.items.length})`}>
          {data.items.map((it, idx) => (
            <View key={idx} style={pdfStyles.itemBox}>
              <View style={pdfStyles.itemTitleRow}>
                <Text style={pdfStyles.itemName}>{it.productName}</Text>
                <Text>{it.quantity} ks</Text>
              </View>
              {it.productSku && (
                <Text style={pdfStyles.itemSku}>SKU: {it.productSku}</Text>
              )}
              {it.supplier && (
                <Text style={pdfStyles.itemSku}>Dodavatel: {it.supplier}</Text>
              )}
              {(it.defectType || it.defectDesc) && (
                <Text style={pdfStyles.itemDefect}>
                  Vada: {it.defectType ?? "—"}
                  {it.defectDesc ? ` — ${it.defectDesc}` : ""}
                </Text>
              )}
            </View>
          ))}
        </Section>

        {data.description && (
          <Section title="Popis problému zákazníkem">
            <Text style={pdfStyles.paragraph}>{data.description}</Text>
          </Section>
        )}

        <View style={pdfStyles.legalBlock}>
          <Text>
            Poučení: O reklamaci bude rozhodnuto bez zbytečného odkladu, nejpozději do 30
            dnů od jejího uplatnění (§ 2173 obč. zák.). V případě, že prodávající ve lhůtě
            o reklamaci nerozhodne, má zákazník stejná práva, jako by se jednalo o
            podstatné porušení smlouvy. O výsledku reklamace bude zákazník vyrozuměn
            písemně (e-mailem nebo doporučeným dopisem).
          </Text>
          <Text style={{ marginTop: 4 }}>
            Spotřebitel má dále právo na informace dle § 1820 obč. zák. a v případě sporu
            právo na mimosoudní řešení sporu prostřednictvím České obchodní inspekce
            (www.coi.cz).
          </Text>
        </View>

        <Signatures
          leftLabel="Podpis zákazníka"
          rightLabel="Podpis odpovědné osoby"
        />

        <Footer caseNumber={data.caseNumber} />
      </Page>
    </Document>
  );
}
