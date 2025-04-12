import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "./App.css";
import { useState } from "react";
import { useMapEvent } from "react-leaflet";


// Fix default marker icon issue in Leaflet + React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

function App() {
  const [isAdding, setIsAdding] = useState(false); // whether user is placing a pin
  const [tempMarker, setTempMarker] = useState(null); // position clicked on map
  const [entries, setEntries] = useState([]); // saved pins
  const [showForm, setShowForm] = useState(false); // toggle form visibility
  const [noteText, setNoteText] = useState(""); // text input
  const [mood, setMood] = useState("happy"); // default mood
  function AddMarkerOnClick({ isAdding, onMapClick }) {
    useMapEvent("click", (e) => {
      if (isAdding) {
        onMapClick(e.latlng);
      }
    });
    return null;
  }
  return (
    <div style={{ height: "100vh", width: "100vw" }}>
        <button
          onClick={() => {
            setIsAdding(true);
            alert("Click on the map to drop your memory 🌱");
          }}
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            zIndex: 1000,
            padding: "0.5rem 1rem",
            background: "green",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Plant a Memory 🌱
      </button>
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
        {isAdding && (
          <AddMarkerOnClick
            isAdding={isAdding}
            onMapClick={(latlng) => {
              setTempMarker(latlng);
              setShowForm(true);
              setIsAdding(false);
            }}
          />
        )}
        {showForm && tempMarker && (
          <Marker position={tempMarker}>
            <Popup onClose={() => setShowForm(false)}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const newEntry = {
                    id: Date.now(),
                    lat: tempMarker.lat,
                    lng: tempMarker.lng,
                    text: noteText,
                    mood: mood,
                    timestamp: new Date().toISOString(),
                  };
                  setEntries([...entries, newEntry]);
                  setNoteText("");
                  setMood("happy");
                  setTempMarker(null);
                  setShowForm(false);
                }}
              >
                <textarea
                  placeholder="Your memory..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  required
                  rows={3}
                  style={{ width: "100%" }}
                />
                <select value={mood} onChange={(e) => setMood(e.target.value)}>
                  <option value="happy">😊 Happy</option>
                  <option value="sad">😢 Sad</option>
                  <option value="nostalgic">🌙 Nostalgic</option>
                </select>
                <br />
                <button type="submit">Save</button>
              </form>
            </Popup>
          </Marker>
        )}
        {entries.map((entry) => (
          <Marker key={entry.id} position={[entry.lat, entry.lng]}>
            <Popup>
              <strong>{entry.mood}</strong> <br />
              {entry.text}
              <br />
              <small>{new Date(entry.timestamp).toLocaleString()}</small>
            </Popup>
          </Marker>
        ))}

      </MapContainer>
    </div>
  );
}

export default App;
