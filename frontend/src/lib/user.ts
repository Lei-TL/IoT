import { getToken } from "./auth";
import { decodeJwtPayload } from "./jwt";

export function getUsernameFromToken() {
  const token = getToken();
  if (!token) return "admin";
  const payload = decodeJwtPayload(token);
  const username = payload?.username;
  return typeof username === "string" && username.length ? username : "admin";
}

