import MyMapComponent from '../../components/myMapComponent';
import '../styles/App.css';

function App() {
    return (
        <div className="app">
            {/* Aquí llamamos al componente que ya tienes guardado 
               en su propio archivo dentro de la carpeta /components 
            */}
            <MyMapComponent />
        </div>
    );
}

export default App;