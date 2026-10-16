/**
 * Extracts a human-readable, informative error string from any backend, network,
 * or runtime error object. Never produces "[object Object]".
 *
 * @param {any} err - The error object, string, or response data
 * @param {number|string} [statusCode] - Optional HTTP status code
 * @returns {string} Clean, human-readable error description
 */
export function extractErrorMessage(err, statusCode) {
  if (!err) {
    return statusCode ? `Request failed (HTTP ${statusCode}).` : "An unknown error occurred.";
  }

  // If already a primitive string
  if (typeof err === "string") {
    const trimmed = err.trim();
    if (trimmed && trimmed !== "[object Object]") {
      return trimmed;
    }
  }

  // If Error instance where message is a string
  if (err instanceof Error && typeof err.message === "string") {
    const trimmed = err.message.trim();
    if (trimmed && trimmed !== "[object Object]") {
      return trimmed;
    }
  }

  // Helper to safely unpack a Pydantic / FastAPI detail structure
  const unpackDetail = (detail) => {
    if (!detail) return null;

    // String detail
    if (typeof detail === "string") {
      const trimmed = detail.trim();
      return trimmed && trimmed !== "[object Object]" ? trimmed : null;
    }

    // Array of details (e.g. FastAPI 422 validation errors)
    if (Array.isArray(detail)) {
      const messages = detail
        .map((item) => {
          if (!item) return "";
          if (typeof item === "string") return item;
          if (typeof item === "object") {
            const loc = Array.isArray(item.loc) ? item.loc.filter((x) => x !== "body").join(".") : "";
            const msg = item.msg || item.message || JSON.stringify(item);
            return loc ? `${loc}: ${msg}` : msg;
          }
          return String(item);
        })
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.join("; ");
      }
    }

    // Object detail (dictionary)
    if (typeof detail === "object") {
      if (typeof detail.message === "string") return detail.message;
      if (typeof detail.error === "string") return detail.error;
      if (typeof detail.msg === "string") return detail.msg;
      try {
        return JSON.stringify(detail);
      } catch {
        return null;
      }
    }

    return null;
  };

  // Check common FastAPI / Axios / Fetch response bodies
  const candidateDetail =
    unpackDetail(err?.response?.data?.detail) ||
    unpackDetail(err?.data?.detail) ||
    unpackDetail(err?.detail) ||
    unpackDetail(err?.response?.data?.message) ||
    unpackDetail(err?.data?.message) ||
    unpackDetail(err?.message) ||
    unpackDetail(err?.error);

  if (candidateDetail) {
    return statusCode ? `HTTP ${statusCode}: ${candidateDetail}` : candidateDetail;
  }

  // Fallback serialization if object
  if (typeof err === "object") {
    try {
      const serialized = JSON.stringify(err);
      if (serialized && serialized !== "{}" && serialized !== "[]") {
        return statusCode ? `HTTP ${statusCode}: ${serialized}` : serialized;
      }
    } catch {
      // ignore
    }
  }

  return statusCode
    ? `Backend operation failed (HTTP ${statusCode}).`
    : "Backend operation failed. Please retry.";
}
