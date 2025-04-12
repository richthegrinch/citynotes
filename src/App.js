import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";

// Fix default marker icon issue in Leaflet + React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

function App() {
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      {/* Map container renders the map in React */} 
      <MapContainer
        center={[38.9869, -76.9426]} //starting location
        zoom={15} //how zoomed in the map starts
        scrollWheelZoom={true} //allow scrolling
        style={{ height: "100%", width: "100%" }} //set the height and width
      >
        {/* The actual background map*/}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {/* UMD Chapel popup static marker*/}
        <Marker position={[38.9869, -76.9426]}>
          <Popup>This is UMD Chapel Garden 🌼</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default App;
