export const TYPE_LABELS: Record<string, string> = {
  LECTURE_NOTE: "Ders notu", PAST_EXAM: "Çıkmış sınav", MIDTERM: "Vize", FINAL: "Final",
  MAKEUP: "Bütünleme", SUMMARY: "Ders özeti", PRESENTATION: "Sunum",
  WORKSHEET: "Ödev / çalışma kâğıdı", FORMULA_SHEET: "Formül föyü", PRACTICE_EXAM: "Deneme sınavı", OTHER: "Diğer",
};
export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Taslak", PENDING_REVIEW: "İnceleme bekliyor", AI_REVIEW: "Yapay zekâ kontrolünde",
  ADMIN_REVIEW: "Yönetici incelemesi bekliyor", NEEDS_CHANGES: "Düzeltme gerekli",
  PUBLISHED: "Yayımlandı", REJECTED: "Reddedildi", UNPUBLISHED: "Yayından kaldırıldı",
};
export const DECISION_LABELS: Record<string, string> = {
  APPROVE: "Onaylandı", REJECT: "Reddedildi", REQUEST_CHANGES: "Düzeltme istendi", UNPUBLISH: "Yayından kaldırıldı",
};
