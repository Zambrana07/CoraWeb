/**
 * Home.jsx — pantalla principal: el mapa de residuos.
 *
 * No dibuja el mapa aquí. lazy() lo descarga en un archivo aparte
 * para que Login y las otras páginas no carguen Leaflet de entrada.
 * Mientras llega, se ve "Cargando mapa...".
 */
import { Suspense, lazy } from 'react';

const MyMapComponent = lazy(() => import('../components/myMapComponent'));

function Home() {
  return (
    <div className="app">
      <div className="map-container">
        <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Cargando mapa...</div>}>
          <MyMapComponent />
        </Suspense>
      </div>
    </div>
  )
}
export default Home
