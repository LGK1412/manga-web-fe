export function getAssetCandidates(
  apiBase: string,
  filePath?: string,
  folder = "assets/licenses",
) {
  if (!filePath) return [];
  if (/^https?:\/\//i.test(filePath)) return [filePath];
  if (filePath.startsWith("/")) return [`${apiBase}${filePath}`];
  if (filePath.includes(folder)) {
    return [`${apiBase}/${filePath.replace(/^\/+/, "")}`];
  }
  return [`${apiBase}/${folder}/${filePath.replace(/^\/+/, "")}`];
}

export function formatDateTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
