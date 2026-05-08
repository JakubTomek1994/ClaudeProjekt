import { Text, View } from "@react-pdf/renderer";

import { COMPANY } from "@/lib/company";

import { pdfStyles } from "./styles";

export function Header({
  protocolTitle,
  caseNumber,
  date,
}: {
  protocolTitle: string;
  caseNumber: string;
  date: string;
}) {
  return (
    <View style={pdfStyles.header} fixed>
      <View style={pdfStyles.headerLeft}>
        <Text style={pdfStyles.headerLogo}>R</Text>
        <View>
          <Text style={pdfStyles.companyName}>{COMPANY.name}</Text>
          <Text style={pdfStyles.companyContact}>
            {COMPANY.street}, {COMPANY.zip} {COMPANY.city} · IČO {COMPANY.ico}
            {COMPANY.dic ? ` · DIČ ${COMPANY.dic}` : ""}
          </Text>
          <Text style={pdfStyles.companyContact}>
            {COMPANY.email} · {COMPANY.phone}
          </Text>
        </View>
      </View>
      <View style={pdfStyles.protocolMeta}>
        <Text style={pdfStyles.protocolNumber}>{caseNumber}</Text>
        <Text>{protocolTitle}</Text>
        <Text>Datum vystavení: {date}</Text>
      </View>
    </View>
  );
}

export function Footer({ caseNumber }: { caseNumber: string }) {
  return (
    <View style={pdfStyles.footer} fixed>
      <Text>
        {COMPANY.name} · {COMPANY.web}
      </Text>
      <Text
        render={({ pageNumber, totalPages }) =>
          `${caseNumber} · Strana ${pageNumber} z ${totalPages}`
        }
      />
    </View>
  );
}

export function FieldRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode | string | null | undefined;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <View style={pdfStyles.fieldRow}>
      <Text style={pdfStyles.fieldLabel}>{label}</Text>
      <Text style={pdfStyles.fieldValue}>{String(value)}</Text>
    </View>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={pdfStyles.section}>
      <Text style={pdfStyles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function Signatures({ leftLabel, rightLabel }: { leftLabel: string; rightLabel: string }) {
  return (
    <View style={pdfStyles.signatureGrid}>
      <View style={pdfStyles.signatureBox}>
        <View style={pdfStyles.signatureLine} />
        <Text style={pdfStyles.signatureLabel}>{leftLabel}</Text>
      </View>
      <View style={pdfStyles.signatureBox}>
        <View style={pdfStyles.signatureLine} />
        <Text style={pdfStyles.signatureLabel}>{rightLabel}</Text>
      </View>
    </View>
  );
}
