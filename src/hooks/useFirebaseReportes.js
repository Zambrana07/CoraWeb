/**
 * Real-time subscription to Firestore "reportes" (map posts).
 *
 * Last updated: 2026-06-04 09:38 CST — perfil sync with myMapComponent.
 */

import { useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { firestoreDocToProfilePost } from "../lib/reportesMapper";

export function useFirebaseReportes() {
  const [mapPosts, setMapPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const reportesRef = collection(db, "reportes");
    const q = query(reportesRef);

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const posts = [];
        querySnapshot.forEach((docSnap) => {
          posts.push(firestoreDocToProfilePost(docSnap));
        });
        posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setMapPosts(posts);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error al leer reportes para perfil:", err);
        setError(err);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { mapPosts, loading, error };
}
