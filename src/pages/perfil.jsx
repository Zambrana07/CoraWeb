/*
====================================================
PERFIL PAGE
====================================================
*/

import { useEffect, useMemo, useState } from "react";
import PfStats from "../components/perfil-components/perfil-stats";
import Abtme from "../components/perfil-components/abtme";
import PostsGrid from "../components/perfil-components/postsGrid";
import AdminLogin from "../components/perfil-components/adminLogin";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useFirebaseReportes } from "../hooks/useFirebaseReportes";
import "../styles/perfil.css";

const Perfil = () => {
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflowY;
    document.body.style.overflow = "auto";
    document.documentElement.style.overflowY = "auto";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflowY = prevHtml;
    };
  }, []);

  const [perfil, setPerfil] = useState({
    name: "Alan Brito",
    aboutMe:
      "Hola! Estoy usando Cora, patrocinado por Armonia.",
    profileImage: "https://placehold.co/250x250/png",
  });

  const {
    mapPosts,
    loading: mapPostsLoading,
    updateMapPost,
    deleteMapPost,
    toggleMapPostVerified,
  } = useFirebaseReportes();

  const [localPosts, setLocalPosts] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const posts = useMemo(
    () => [...mapPosts, ...localPosts],
    [mapPosts, localPosts],
  );

  const verifiedCount = posts.filter((post) => post.verified).length;
  const totalPosts = posts.length;

  const handleDeletePost = async (id) => {
    const target = posts.find((p) => p.id === id);
    if (!target) return;
    if (
      !window.confirm(
        target.fromMap
          ? "¿Eliminar este reporte del mapa?"
          : "Delete this post?",
      )
    ) {
      return;
    }
    if (target.fromMap) {
      try {
        await deleteMapPost(id);
      } catch (err) {
        console.error(err);
        window.alert("No se pudo eliminar el reporte.");
      }
      return;
    }
    setLocalPosts((prev) => prev.filter((p) => p.id !== id));
  };

  const handleVerifyPost = async (id) => {
    const target = posts.find((p) => p.id === id);
    if (!target) return;
    const nextVerified = !target.verified;
    if (target.fromMap) {
      try {
        await toggleMapPostVerified(id, nextVerified);
      } catch (err) {
        console.error(err);
        window.alert("No se pudo actualizar la verificación.");
      }
      return;
    }
    setLocalPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, verified: nextVerified } : p,
      ),
    );
  };

  const handleSavePost = async (updatedPost, modalMode) => {
    if (modalMode === "create") {
      setLocalPosts((prev) => [{ ...updatedPost, fromMap: false }, ...prev]);
      return;
    }

    if (modalMode === "edit" && updatedPost.fromMap) {
      try {
        await updateMapPost(updatedPost);
      } catch (err) {
        console.error(err);
        window.alert("No se pudo guardar los cambios del reporte.");
        throw err;
      }
      return;
    }

    if (modalMode === "edit") {
      setLocalPosts((prev) =>
        prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)),
      );
    }
  };

  return (
    <div className="profile-page-wrapper page-transition">
      <Header />

      <main className="profile-page">
        <AdminLogin isAdmin={isAdmin} setIsAdmin={setIsAdmin} />

        <PfStats
          perfil={perfil}
          setPerfil={setPerfil}
          isAdmin={isAdmin}
          verifiedCount={verifiedCount}
          totalPosts={totalPosts}
        />

        <Abtme perfil={perfil} setPerfil={setPerfil} isAdmin={isAdmin} />

        <PostsGrid
          posts={posts}
          isAdmin={isAdmin}
          mapPostsLoading={mapPostsLoading}
          onDeletePost={handleDeletePost}
          onVerifyPost={handleVerifyPost}
          onSavePost={handleSavePost}
        />
      </main>

      <Footer />
    </div>
  );
};

export default Perfil;
