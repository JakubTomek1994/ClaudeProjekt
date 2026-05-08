import { Document, Page, Text, View } from "@react-pdf/renderer";

import {
  CASE_TYPE_LABELS,
  RESOLUTION_LABELS,
} from "@/lib/case/labels";
import { formatDate } from "@/lib/format";

import { FieldRow, Footer, Header, Section, Signatures } from "./components";
import { pdfStyles } from "./styles";

export type ResolutionProtocolData = {
  caseNumber: string;
  type: keyof typeof CASE_TYPE_LABELS;
  receivedAt: Date;
  decidedAt?: Date | null;
  resolvedAt?: Date | null;
  resolution?: keyof typeof RESOLUTION_LABELS | null;
  resolutionNote?: string | null;
  refundAmount?: number | null;
  refundedAt?: Date | null;
  customer: {
    name?: string | null;
    email: string;
    phone?: string | null;
  };
  items: Array<{
    productName: string;
    productSku?: string | null;
    quantity: number;
    defectType?: string | null;
  }>;
};

const RESOLUTION_TONE: Record<keyof typeof RESOLUTION_LABELS, string> = {
  REPAIR: "Reklamace byla uznána a bude vyřízena formou opravy.",
  REPLACEMENT: "Reklamace byla uznána a bude vyřízena formou výměny zboží.",
  DISCOUNT: "Reklamace byla uznána a bude vyřízena formou přiměřené slevy.",
  REFUND: "Reklamace byla uznána a bude vyřízena vrácením kupní ceny.",
  REJECTED: "Reklamace byla zamítnuta.",
  PARTIAL: "Reklamace byla uznána částečně.",
};

export function ResolutionProtocol({ data }: { data: ResolutionProtocolData }) {
  const isReklamace = data.type === "REKLAMACE";
  return (
    <Document
      title={`Protokol o vyřízení ${data.caseNumber}`}
      author="Reklamace"
      subject={`Protokol o vyřízení reklamace ${data.caseNumber}`}
    >
      <Page size="A4" style={pdfStyles.page}>
        <Header
          protocolTitle="Protokol o vyřízení"
          caseNumber={data.caseNumber}
          date={formatDate(new Date())}
        />

        <Text style={pdfStyles.pageTitle}>
          {isReklamace ? "Vyřízení reklamace" : "Vyřízení odstoupení od smlouvy"}
        </Text>
        <Text style={pdfStyles.pageSubtitle}>
          {isReklamace
            ? "Rozhodnutí o reklamaci dle § 2106 obč. zák."
            : "Vyřízení odstoupení od smlouvy dle § 1829 obč. zák."}
        </Text>

        <View style={pdfStyles.divider} />

        <View style={pdfStyles.twoCols}>
          <View style={pdfStyles.col}>
            <Section title="Zákazník">
              <FieldRow label="Jméno / firma" value={data.customer.name ?? "—"} />
              <FieldRow label="Email" value={data.customer.email} />
              <FieldRow label="Telefon" value={data.customer.phone} />
            </Section>
          </View>
          <View style={pdfStyles.col}>
            <Section title="Případ">
              <FieldRow label="Číslo" value={data.caseNumber} />
              <FieldRow label="Typ" value={CASE_TYPE_LABELS[data.type]} />
              <FieldRow label="Přijato" value={formatDate(data.receivedAt)} />
              <FieldRow
                label="Rozhodnuto"
                value={data.decidedAt ? formatDate(data.decidedAt) : "—"}
              />
              <FieldRow
                label="Vyřízeno"
                value={data.resolvedAt ? formatDate(data.resolvedAt) : "—"}
              />
            </Section>
          </View>
        </View>

        {data.resolution && (
          <View style={pdfStyles.highlightBox}>
            <Text style={pdfStyles.highlightLabel}>Způsob vyřízení</Text>
            <Text style={pdfStyles.highlightValue}>
              {RESOLUTION_LABELS[data.resolution]}
            </Text>
            <Text style={[pdfStyles.paragraph, { marginTop: 4, marginBottom: 0 }]}>
              {RESOLUTION_TONE[data.resolution]}
            </Text>
          </View>
        )}

        <Section title={`Předmět reklamace (${data.items.length})`}>
          {data.items.map((it, idx) => (
            <View key={idx} style={pdfStyles.itemBox}>
              <View style={pdfStyles.itemTitleRow}>
                <Text style={pdfStyles.itemName}>{it.productName}</Text>
                <Text>{it.quantity} ks</Text>
              </View>
              {it.productSku && (
                <Text style={pdfStyles.itemSku}>SKU: {it.productSku}</Text>
              )}
              {it.defectType && (
                <Text style={pdfStyles.itemDefect}>Reklamovaná vada: {it.defectType}</Text>
              )}
            </View>
          ))}
        </Section>

        {data.resolutionNote && (
          <Section title="Odůvodnění">
            <Text style={pdfStyles.paragraph}>{data.resolutionNote}</Text>
          </Section>
        )}

        {data.refundAmount !== null && data.refundAmount !== undefined && (
          <Section title="Finanční vypořádání">
            <FieldRow
              label="Vrácená částka"
              value={`${data.refundAmount.toFixed(2)} CZK`}
            />
            {data.refundedAt && (
              <FieldRow label="Datum vrácení" value={formatDate(data.refundedAt)} />
            )}
          </Section>
        )}

        <View style={pdfStyles.legalBlock}>
          <Text>
            Toto vyřízení je činěno v souladu s ustanoveními zákona č. 89/2012 Sb.,
            občanský zákoník, ve znění pozdějších předpisů. V případě nesouhlasu s
            výsledkem reklamace má spotřebitel právo obrátit se na Českou obchodní
            inspekci (www.coi.cz) v rámci mimosoudního řešení sporu.
          </Text>
        </View>

        <Signatures
          leftLabel="Podpis zákazníka (převzetí)"
          rightLabel="Podpis odpovědné osoby"
        />

        <Footer caseNumber={data.caseNumber} />
      </Page>
    </Document>
  );
}
