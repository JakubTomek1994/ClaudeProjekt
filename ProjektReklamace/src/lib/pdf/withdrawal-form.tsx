import { Document, Page, Text, View } from "@react-pdf/renderer";

import { COMPANY } from "@/lib/company";
import { formatDate } from "@/lib/format";

import { FieldRow, Footer, Header, Section, Signatures } from "./components";
import { pdfStyles } from "./styles";

export type WithdrawalFormData = {
  caseNumber: string;
  receivedAt: Date;
  customer: {
    name?: string | null;
    email: string;
    phone?: string | null;
    street?: string | null;
    city?: string | null;
    zip?: string | null;
    country?: string | null;
  };
  order?: {
    shoptetNumber: string;
    orderDate: Date;
  } | null;
  items: Array<{
    productName: string;
    productSku?: string | null;
    quantity: number;
  }>;
};

function customerAddress(c: WithdrawalFormData["customer"]) {
  return [c.street, c.zip, c.city, c.country].filter(Boolean).join(", ");
}

export function WithdrawalForm({ data }: { data: WithdrawalFormData }) {
  return (
    <Document
      title={`Odstoupení od smlouvy ${data.caseNumber}`}
      author="Reklamace"
      subject="Formulář pro odstoupení od smlouvy"
    >
      <Page size="A4" style={pdfStyles.page}>
        <Header
          protocolTitle="Odstoupení od smlouvy"
          caseNumber={data.caseNumber}
          date={formatDate(new Date())}
        />

        <Text style={pdfStyles.pageTitle}>Formulář pro odstoupení od smlouvy</Text>
        <Text style={pdfStyles.pageSubtitle}>
          (Vyplňte tento formulář a pošlete jej zpět pouze v případě, že chcete odstoupit
          od smlouvy. Formulář dle přílohy č. 1 nař. vlády č. 363/2013 Sb.)
        </Text>

        <View style={pdfStyles.divider} />

        <Section title="Adresát">
          <Text style={pdfStyles.paragraph}>
            <Text style={{ fontWeight: 700 }}>{COMPANY.name}</Text>
            {"\n"}
            {COMPANY.street}, {COMPANY.zip} {COMPANY.city}
            {"\n"}
            IČO: {COMPANY.ico}
            {COMPANY.dic ? ` · DIČ: ${COMPANY.dic}` : ""}
            {"\n"}
            {COMPANY.email} · {COMPANY.phone}
          </Text>
        </Section>

        <Section title="Oznámení">
          <Text style={pdfStyles.paragraph}>
            Já / my (*) tímto oznamuji/oznamujeme, že odstupuji/odstupujeme od smlouvy o
            nákupu níže uvedeného zboží:
          </Text>
        </Section>

        <Section title="Předmět odstoupení">
          {data.items.map((it, idx) => (
            <View key={idx} style={pdfStyles.itemBox}>
              <View style={pdfStyles.itemTitleRow}>
                <Text style={pdfStyles.itemName}>{it.productName}</Text>
                <Text>{it.quantity} ks</Text>
              </View>
              {it.productSku && (
                <Text style={pdfStyles.itemSku}>SKU: {it.productSku}</Text>
              )}
            </View>
          ))}
        </Section>

        <View style={pdfStyles.twoCols}>
          <View style={pdfStyles.col}>
            <Section title="Údaje o objednávce">
              <FieldRow
                label="Datum objednání"
                value={data.order ? formatDate(data.order.orderDate) : "—"}
              />
              <FieldRow
                label="Číslo objednávky"
                value={data.order?.shoptetNumber ?? "—"}
              />
              <FieldRow label="Datum přijetí" value={formatDate(data.receivedAt)} />
            </Section>
          </View>
          <View style={pdfStyles.col}>
            <Section title="Spotřebitel">
              <FieldRow label="Jméno" value={data.customer.name ?? "—"} />
              <FieldRow label="Email" value={data.customer.email} />
              <FieldRow label="Telefon" value={data.customer.phone} />
              <FieldRow label="Adresa" value={customerAddress(data.customer) || "—"} />
            </Section>
          </View>
        </View>

        <View style={pdfStyles.legalBlock}>
          <Text>
            Spotřebitel má právo odstoupit od smlouvy ve lhůtě 14 dnů ode dne převzetí
            zboží (§ 1829 obč. zák.). V případě odstoupení od smlouvy bude kupní cena
            vrácena bez zbytečného odkladu, nejpozději do 14 dnů od doručení odstoupení,
            a to stejným platebním prostředkem, jaký byl použit pro provedení původní
            transakce, nedohodnou-li se strany jinak.
          </Text>
          <Text style={{ marginTop: 4 }}>
            (*) Nehodící se škrtněte nebo údaje doplňte.
          </Text>
        </View>

        <Signatures
          leftLabel="Datum a podpis spotřebitele(ů) (pouze pokud je formulář zasílán v listinné podobě)"
          rightLabel="Datum a podpis odpovědné osoby (potvrzení o přijetí)"
        />

        <Footer caseNumber={data.caseNumber} />
      </Page>
    </Document>
  );
}
