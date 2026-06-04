/*
====================================================
PERFIL PAGE
====================================================

Esta página representa el perfil principal del usuario.

Su responsabilidad es:

1. Mantener el estado global del perfil.
2. Mantener el estado de las publicaciones.
3. Controlar si el usuario tiene permisos de administrador.
4. Pasar la información necesaria a los componentes hijos.

Actualmente utiliza datos temporales (mock data),
pero en futuras versiones estos datos serán obtenidos
desde Supabase.
*/

import { useState } from "react";

// Componentes de la página de perfil
import PfStats from "../components/perfil-components/perfil-stats";
import Abtme from "../components/perfil-components/abtme";
import PostsGrid from "../components/perfil-components/postsGrid";
import AdminLogin from "../components/perfil-components/adminLogin";
import Header from "../components/Header";
import Footer from "../components/Footer";
import '../styles/perfil.css';

const Perfil = () => {

  /*
  ====================================================
  PERFIL STATE
  ====================================================

  Almacena toda la información básica del usuario.

  Se utiliza un único objeto para mantener relacionados
  todos los datos del perfil y facilitar futuras
  actualizaciones desde una base de datos.
  */

  const [perfil, setPerfil] = useState({
    name: "Alan Brito",

    aboutMe:
      "Welcome to my profile. Here you'll find projects, achievements, and verified posts.",

    profileImage:
      "https://placehold.co/250x250/png",
  });

  /*
  ====================================================
  POSTS STATE
  ====================================================

  Guarda todas las publicaciones asociadas al perfil.

  Cada publicación contiene:

  - id: identificador único
  - title: título
  - description: descripción
  - image_url: imagen asociada
  - verified: indica si fue aprobada por un administrador

  El estado se mantiene en el componente padre para que
  todos los componentes hijos trabajen sobre la misma
  fuente de datos.
  */

  const [posts, setPosts] = useState([
    {
      id: 1,
      title: "My First Post",
      description: "Example description",
      image_url: "https://placehold.co/600x600/png",
      verified: true,
    },
    {
      id: 2,
      title: "Another Post",
      description: "Another example description",
      image_url: "https://placehold.co/600x600/png",
      verified: false,
    },
  ]);

  /*
  ====================================================
  ADMIN STATE
  ====================================================

  Determina si el usuario actual tiene permisos
  administrativos.

  Cuando es true:
  - Puede editar información del perfil.
  - Puede gestionar publicaciones.
  - Puede acceder a herramientas administrativas.

  Cuando es false:
  - Solo puede visualizar contenido.
  */

  const [isAdmin, setIsAdmin] = useState(false);

  /*
  ====================================================
  ESTADÍSTICAS DERIVADAS
  ====================================================

  Estos valores NO se almacenan en un estado porque
  pueden calcularse directamente a partir de los posts.

  Esto evita duplicación de información y mantiene
  una única fuente de verdad.
  */

  // Cantidad de publicaciones verificadas
  const verifiedCount = posts.filter(
    (post) => post.verified
  ).length;

  // Cantidad total de publicaciones
  const totalPosts = posts.length;

  return (
    <div className="profile-page-wrapper page-transition">
      <Header />

      <main className="profile-page">

      {/* ------------------------------------------------
          LOGIN DE ADMINISTRADOR
          ------------------------------------------------

          Permite activar o desactivar el modo admin.

          Recibe:
          - isAdmin: estado actual
          - setIsAdmin: función para actualizarlo
      */}
      <AdminLogin
        isAdmin={isAdmin}
        setIsAdmin={setIsAdmin}
      />

      {/* ------------------------------------------------
          INFORMACIÓN DEL PERFIL
          ------------------------------------------------

          Muestra nombre, imagen y demás información
          principal del usuario.

          Si isAdmin es true, permite edición.
      */}
      <PfStats
        perfil={perfil}
        setPerfil={setPerfil}
        isAdmin={isAdmin}
      />

      {/* ------------------------------------------------
          ESTADÍSTICAS
          ------------------------------------------------

          Muestra información calculada automáticamente
          a partir de las publicaciones.
      */}
      <section className="profile-stats">

        <div className="stat-card connections">
          <h2>{verifiedCount}</h2>
          <p>Verificados</p>
        </div>

        <div className="stat-card verified">
          <h2>{totalPosts}</h2>
          <p>Posts</p>
        </div>

      </section>

      {/* ------------------------------------------------
          ABOUT ME
          ------------------------------------------------

          Muestra la descripción personal del usuario.

          Si el administrador está autenticado,
          puede modificar el contenido.
      */}
      <Abtme
        perfil={perfil}
        setPerfil={setPerfil}
        isAdmin={isAdmin}
      />

      {/* ------------------------------------------------
          POSTS GRID
          ------------------------------------------------

          Muestra todas las publicaciones del perfil.

          Recibe acceso completo al estado de posts
          para permitir:

          - Crear publicaciones
          - Editar publicaciones
          - Eliminar publicaciones
          - Verificar publicaciones
      */}
      <PostsGrid
        posts={posts}
        setPosts={setPosts}
        isAdmin={isAdmin}
      />

      </main>

      <Footer />
    </div>
  );
};

export default Perfil;