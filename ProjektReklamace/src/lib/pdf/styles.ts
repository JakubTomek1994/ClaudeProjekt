import { StyleSheet } from "@react-pdf/renderer";

import { PDF_FONT_FAMILY } from "./fonts";

const COLORS = {
  text: "#202020",
  muted: "#5a5a5a",
  border: "#cfcfcf",
  brand: "#e1142e",
  bgMuted: "#f4f4f4",
};

export const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 10,
    color: COLORS.text,
    paddingTop: 36,
    paddingBottom: 50,
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 22,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerLogo: {
    width: 28,
    height: 28,
    backgroundColor: COLORS.brand,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: 700,
    textAlign: "center",
    paddingTop: 4,
    marginRight: 10,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 700,
  },
  companyContact: {
    fontSize: 8,
    color: COLORS.muted,
  },
  protocolMeta: {
    alignItems: "flex-end",
    fontSize: 8,
    color: COLORS.muted,
  },
  protocolNumber: {
    fontSize: 13,
    fontWeight: 700,
    color: COLORS.text,
    marginBottom: 2,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 9,
    color: COLORS.muted,
    marginBottom: 18,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 14,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    color: COLORS.muted,
    marginBottom: 6,
  },
  twoCols: {
    flexDirection: "row",
    gap: 16,
  },
  col: {
    flex: 1,
  },
  fieldRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  fieldLabel: {
    width: 100,
    color: COLORS.muted,
    fontSize: 9,
  },
  fieldValue: {
    flex: 1,
    fontSize: 10,
  },
  itemBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 8,
    marginBottom: 6,
  },
  itemTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  itemName: {
    fontWeight: 700,
    fontSize: 11,
  },
  itemSku: {
    fontSize: 8,
    color: COLORS.muted,
  },
  itemDefect: {
    fontSize: 9,
    marginTop: 4,
    color: COLORS.text,
  },
  paragraph: {
    fontSize: 9,
    lineHeight: 1.4,
    marginBottom: 6,
  },
  legalBlock: {
    backgroundColor: COLORS.bgMuted,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.brand,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 8,
    lineHeight: 1.45,
    color: COLORS.muted,
    marginBottom: 14,
  },
  signatureGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  signatureBox: {
    width: "45%",
  },
  signatureLine: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.text,
    marginBottom: 4,
    height: 30,
  },
  signatureLabel: {
    fontSize: 8,
    color: COLORS.muted,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7,
    color: COLORS.muted,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 6,
  },
  highlightBox: {
    borderWidth: 1,
    borderColor: COLORS.brand,
    backgroundColor: "#fdf2f4",
    padding: 8,
    marginBottom: 12,
  },
  highlightLabel: {
    fontSize: 8,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: COLORS.brand,
    marginBottom: 2,
  },
  highlightValue: {
    fontSize: 11,
    fontWeight: 700,
  },
});

export { COLORS };
