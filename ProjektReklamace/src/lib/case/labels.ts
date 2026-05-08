import type {
  CaseItemStatus,
  CaseSource,
  CaseStatus,
  CaseType,
  CustomerSource,
  Direction,
  Channel,
  DocumentType,
  Resolution,
} from "@/generated/prisma/client";

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  REKLAMACE: "Reklamace",
  ODSTOUPENI: "Odstoupení od smlouvy",
};

export const CASE_TYPE_LABELS_SHORT: Record<CaseType, string> = {
  REKLAMACE: "Reklamace",
  ODSTOUPENI: "Odstoupení",
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  NEW: "Nové",
  UNDER_REVIEW: "Posuzuje se",
  WITH_SUPPLIER: "U dodavatele",
  WAITING_CUSTOMER: "Čeká na zákazníka",
  DECIDED: "Rozhodnuto",
  WAITING_RETURN: "Čeká na vrácení zboží",
  GOODS_RECEIVED: "Zboží přijato",
  REFUND_PENDING: "Schváleno k vrácení",
  RESOLVED: "Vyřízeno",
  CLOSED: "Uzavřeno",
  REJECTED: "Zamítnuto",
  CANCELLED: "Zrušeno",
};

export const CASE_SOURCE_LABELS: Record<CaseSource, string> = {
  EMAIL: "Email",
  WEB_FORM: "Web formulář",
  PHONE: "Telefon",
  IN_PERSON: "Osobně",
  MANUAL: "Ručně zadáno",
};

export const CUSTOMER_SOURCE_LABELS: Record<CustomerSource, string> = {
  MANUAL: "Ručně zadán",
  EMAIL: "Z příchozího emailu",
  CSV_IMPORT: "CSV import (Shoptet)",
  CASE_CREATION: "Z vytvoření případu",
};

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  REPAIR: "Oprava",
  REPLACEMENT: "Výměna",
  DISCOUNT: "Sleva",
  REFUND: "Vrácení peněz",
  REJECTED: "Zamítnuto",
  PARTIAL: "Částečně uznáno",
};

export const CASE_ITEM_STATUS_LABELS: Record<CaseItemStatus, string> = {
  PENDING: "Posuzuje se",
  APPROVED: "Uznáno",
  REJECTED: "Zamítnuto",
  PARTIAL: "Částečně",
};

export const DIRECTION_LABELS: Record<Direction, string> = {
  INCOMING: "Příchozí",
  OUTGOING: "Odchozí",
  INTERNAL: "Interní",
};

export const CHANNEL_LABELS: Record<Channel, string> = {
  EMAIL: "Email",
  PHONE: "Telefon",
  IN_PERSON: "Osobně",
  WRITTEN: "Písemně",
  WEB_FORM: "Web formulář",
  INTERNAL_NOTE: "Interní poznámka",
};

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  PHOTO_DEFECT: "Foto vady",
  INVOICE: "Faktura",
  DELIVERY_NOTE: "Dodací list",
  CLAIM_PROTOCOL: "Reklamační protokol",
  RESOLUTION_PROTOCOL: "Protokol o vyřízení",
  WITHDRAWAL_FORM: "Formulář pro odstoupení",
  SERVICE_REPORT: "Posudek servisu",
  CREDIT_NOTE: "Dobropis",
  SHIPPING_LABEL: "Štítek pro odeslání",
  OTHER: "Ostatní",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  CREATED: "Případ založen",
  STATUS_CHANGED: "Změna stavu",
  ASSIGNED: "Přiřazeno",
  NOTE_ADDED: "Přidán záznam komunikace",
  EMAIL_SENT: "Odeslán email",
  EMAIL_RECEIVED: "Přijat email",
  DOCUMENT_UPLOADED: "Nahrán dokument",
  DOCUMENT_DELETED: "Smazán dokument",
  PDF_GENERATED: "Vygenerováno PDF",
  RESOLUTION_SET: "Stanoveno řešení",
  DEADLINE_WARNING: "Varování před lhůtou",
};
