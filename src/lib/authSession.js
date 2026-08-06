export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  if (!user?.id) {
    clearStoredUser();
    return null;
  }

  const normalized = {
    id: user.id,
    rol: Number(user.rol ?? user.rol_id),
  };

  localStorage.setItem("user", JSON.stringify(normalized));
  return normalized;
}

export function clearStoredUser() {
  localStorage.removeItem("user");
}

export function isAdminRole(rol) {
  return Number(rol) === 2;
}

export function isAdminUser(user = getStoredUser()) {
  return Boolean(user?.id) && isAdminRole(user.rol);
}

export function shouldKeepStoredUser(storedUser, responseData) {
  if (!storedUser?.id) {
    return false;
  }

  return Boolean(responseData?.ok && responseData?.perfil);
}
