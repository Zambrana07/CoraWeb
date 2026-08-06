/**
 * Real-time reportes from map → perfil.
 * Updated: 2026-06-04
 */

import { useCallback, useEffect, useState } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";
import { firestoreDocToProfilePost } from "../lib/reportesMapper";
import {
  deleteReporte,
  setReporteVerified,
  updateReporte,
} from "../services/reportesService";

export function useFirebaseReportes() {
  const [mapPosts, setMapPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "reportes"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const posts = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.latitud != null && data.longitud != null) {
            posts.push(firestoreDocToProfilePost(docSnap));
          }
        });
        posts.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setMapPosts(posts);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error leyendo reportes:", err);
        setError(err);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  const updateMapPost = useCallback(async (post) => {
    await updateReporte(post);
  }, []);

  const deleteMapPost = useCallback(async (id) => {
    await deleteReporte(id);
  }, []);

  const toggleMapPostVerified = useCallback(async (id, verified) => {
    await setReporteVerified(id, verified);
  }, []);

  return {
    mapPosts,
    loading,
    error,
    updateMapPost,
    deleteMapPost,
    toggleMapPostVerified,
  };
}
