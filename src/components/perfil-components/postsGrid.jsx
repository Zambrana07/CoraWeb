import { useState } from "react";
import PostCard from "./postcard";
import PostModal from "./postModal";

const PostsGrid = ({
  posts,
  isAdmin,
  mapPostsLoading = false,
  onDeletePost,
  onVerifyPost,
  onSavePost,
}) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleViewPost = (post) => {
    setSelectedPost(post);
    setModalMode("view");
    setIsModalOpen(true);
  };

  const handleCreatePost = () => {
    setSelectedPost({
      id: Date.now(),
      title: "",
      description: "",
      image_url: "",
      verified: false,
      fromMap: false,
    });
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleEditPost = (post) => {
    setSelectedPost(post);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleDeletePost = (id) => {
    onDeletePost(id);
  };

  const handleVerifyPost = (id) => {
    onVerifyPost(id);
  };

  const handleSavePost = async (updatedPost) => {
    setSaving(true);
    try {
      await onSavePost(updatedPost, modalMode);
      setIsModalOpen(false);
    } catch {
      /* parent shows alert */
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="posts-section">
      <div className="posts-header">
        <h2>Publicados</h2>
        {isAdmin && (
          <button
            type="button"
            className="create-post-btn"
            onClick={handleCreatePost}
          >
            + Nuevo
          </button>
        )}
      </div>

      {mapPostsLoading && posts.length === 0 ? (
        <div className="empty-posts">
          <p>Cargando reportes del mapa…</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-posts">
          <p>
            No hay publicaciones. Crea un reporte en el mapa para verlo aquí.
          </p>
        </div>
      ) : (
        <div className="posts-grid">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              isAdmin={isAdmin}
              onView={handleViewPost}
              onEdit={handleEditPost}
              onDelete={handleDeletePost}
              onVerify={handleVerifyPost}
            />
          ))}
        </div>
      )}

      <PostModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        post={selectedPost}
        onSave={handleSavePost}
        saving={saving}
      />
    </section>
  );
};

export default PostsGrid;
