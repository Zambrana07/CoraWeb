import React from "react";
import "../assets/styles/perfil.css";

function Profile(){
  const posts = Array(6).fill(null);

  return (
    <div className="profile-container">
      <div className="header">
        <div className="avatar"></div>

        <div className="stats">
          <div>
            <strong>10</strong>
            <span>Posts</span>
          </div>
          <div>
            <strong>10</strong>
            <span>Verificados</span>
          </div>
          <div>
            <strong>10</strong>
            <span>Conexiones</span>
          </div>
        </div>
      </div>

      <div className="content">
        <h1>Alan Brito</h1>

        <section>
          <h2>Sobre Mí</h2>
          <p>Lorem ipsum dolor sit amet blablabka uehfue e</p>
        </section>

        <section>
          <h2>Publicados</h2>
          <div className="posts-grid">
            {posts.map((_, index) => (
              <div className="post-card" key={index}>
                <div className="post-actions">
                  <span>✎</span>
                  <span>🗑</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;