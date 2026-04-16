import MyMapComponent from '../components/myMapComponent';
import '../styles/App.css';
import Header from "../components/Header";
import Footer from "../components/Footer";

function App() {
    return (
        <div className="app">
            <Header />
            <div className="map-container"> 
                <MyMapComponent />
            </div>
            <Footer /> 
        </div>
    );
}

export default App;