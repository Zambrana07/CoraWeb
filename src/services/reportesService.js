/**
 * Firebase CRUD for map reportes (admin).
 * Updated: 2026-06-04
 */

import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { profilePostToFirestore } from "../lib/reportesMapper";

export async function updateReporte(post) {
  const ref = doc(db, "reportes", post.id);
  await updateDoc(ref, profilePostToFirestore(post));
}

export async function deleteReporte(id) {
  await deleteDoc(doc(db, "reportes", id));
}

export async function setReporteVerified(id, verified) {
  const ref = doc(db, "reportes", id);
  await updateDoc(ref, { verificado: verified });
}
