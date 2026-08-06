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