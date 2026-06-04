import { Navigate } from "react-router-dom";

const AUTH_KEY = "coraAuth";
const USER_KEY = "coraUser";
const REPORTER_KEY = "coraReporterName";

export function isAuthenticated() {
  return sessionStorage.getItem(AUTH_KEY) === "true";
}

export function getCurrentUser() {
  return sessionStorage.getItem(USER_KEY) || "";
}

export function getReporterName() {
  return sessionStorage.getItem(REPORTER_KEY) || getCurrentUser();
}

export function setReporterName(name) {
  const trimmed = name?.trim();
  if (trimmed) {
    sessionStorage.setItem(REPORTER_KEY, trimmed);
  }
}

export function setAuthenticated(value, username = "") {
  if (value) {
    sessionStorage.setItem(AUTH_KEY, "true");
    if (username) {
      sessionStorage.setItem(USER_KEY, username);
      if (!sessionStorage.getItem(REPORTER_KEY)) {
        sessionStorage.setItem(REPORTER_KEY, username);
      }
    }
  } else {
    sessionStorage.removeItem(AUTH_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(REPORTER_KEY);
  }
}

function normalizeName(value) {
  return (value || "").trim().toLowerCase();
}

export function isOwnReport(marker) {
  const user = normalizeName(getCurrentUser());
  const reporter = normalizeName(getReporterName());
  if (!user && !reporter) return false;

  const creadoPor = normalizeName(marker.creadoPor);
  const reportadoPor = normalizeName(marker.name);

  if (creadoPor && (creadoPor === user || creadoPor === reporter)) {
    return true;
  }

  if (!creadoPor && reportadoPor && (reportadoPor === user || reportadoPor === reporter)) {
    return true;
  }

  return false;
}

export default function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
