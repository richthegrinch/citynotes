import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvent,
  // useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";

// For search bar
import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import "leaflet-control-geocoder";
import { useMap } from "react-leaflet";

import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

const MAX_WORDS = 12;
const MAX_CHARACTERS = 70;

// Fix leaflet marker icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

// Mood icons
const moodIcons = {
  happy: new L.DivIcon({ html: "😊", className: "emoji-icon", iconSize: [30, 30] }),
  sad: new L.DivIcon({ html: "😢", className: "emoji-icon", iconSize: [30, 30] }),
  excited: new L.DivIcon({ html: "🎉", className: "emoji-icon", iconSize: [30, 30] }),
  calm: new L.DivIcon({ html: "🌿", className: "emoji-icon", iconSize: [30, 30] }),
  default: new L.DivIcon({ html: "📍", className: "emoji-icon", iconSize: [30, 30] }),
};


const getWordCount = (text) => {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
};

//Search bar function
function GeocoderControl() {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const geocoder = L.Control.geocoder({
      defaultMarkGeocode: false,
    })
      .on("markgeocode", function (e) {
        const bbox = e.geocode.bbox;
        const bounds = L.latLngBounds(bbox);
        map.fitBounds(bounds);
      })
      .addTo(map);

    return () => {
      geocoder.remove();
    };
  }, [map]);

  return null;
}


function AddMarkerOnClick({ isAdding, onMapClick }) {
  useMapEvent("click", (e) => {
    if (isAdding) {
      onMapClick(e.latlng);
    }
  });
  return null;
}

function EditableMarker({
  entry,
  isEditing,
  onEditClick,
  onDelete,
  onUpdate,
  onClose,
  noteText,
  setNoteText,
  mood,
  setMood,
  moodIcons,
}) {
  const justOpenedRef = useRef(false);
  const handlePopupOpen = () => {
    console.log("Popup opened for entry", entry.id); // Debug: Popup opened
    justOpenedRef.current = true;
  };
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (
      getWordCount(noteText) > MAX_WORDS ||
      noteText.length > MAX_CHARACTERS
    ) {
      alert("Your entry is too long. Please shorten it.");
      return;
    }
    onUpdate(noteText, mood);
  };

  return (
    <Marker
      position={[entry.lat, entry.lng]}
      icon={moodIcons[entry.mood] || moodIcons.default}
      eventHandlers={{
        popupopen: handlePopupOpen, // Directly handling popup open
      }}
    >
      <Popup open={isEditing}>

        {isEditing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onUpdate(noteText, mood);
            }}
          >
            <textarea
              value={noteText}
              onChange={(e) => {
                const text = e.target.value;
                const words = getWordCount(text);
                if (words <= MAX_WORDS && text.length <= MAX_CHARACTERS) {
                  setNoteText(text);
                }
              }}
              rows={3}
              style={{ width: "100%" }}
              //required
            />
            <small style={{ color: noteText.length >= MAX_CHARACTERS || getWordCount(noteText) >= MAX_WORDS ? "red" : "gray" }}>
              {getWordCount(noteText)} / {MAX_WORDS} words • {noteText.length} / {MAX_CHARACTERS} characters
            </small>

            <select value={mood} onChange={(e) => setMood(e.target.value)}>
              <option value="happy">😊 Happy</option>
              <option value="sad">😢 Sad</option>
              <option value="excited">🎉 Excited</option>
              <option value="calm">🌿 Calm</option>
            </select>
            <br />
            <button type="submit">Update</button>
          </form>
        ) : (
          <div>
            <strong>{entry.mood}</strong>
            <br />
            {entry.text}
            <br />
            <small>{new Date(entry.timestamp).toLocaleString()}</small>
            <br />
            {entry.fromSession && (
              <>
                <button onClick={onEditClick}>Edit</button>
                <button onClick={onDelete}>Delete</button>
              </>
            )}
          </div>
        )}
      </Popup>
    </Marker>
  );
}

export default function App() {
  const [isAdding, setIsAdding] = useState(false);
  const [tempMarker, setTempMarker] = useState(null);
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [mood, setMood] = useState("happy");
  const [editingId, setEditingId] = useState(null);

  const handleSave = (e) => {
    e.preventDefault();
  
    const wordCount = getWordCount(noteText);
    const charCount = noteText.length;
  
    if (wordCount > MAX_WORDS || charCount > MAX_CHARACTERS) {
      alert(
        `Your entry is too long.\n\nWord limit: ${wordCount}/${MAX_WORDS}\nCharacter limit: ${charCount}/${MAX_CHARACTERS}`
      );
      return; // ❌ Stop here if it’s over the limit
    }
  
    if (editingId !== null) {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === editingId
            ? {
                ...entry,
                text: noteText,
                mood,
                timestamp: new Date().toISOString(),
              }
            : entry
        )
      );
    } else {
      const newEntry = {
        id: Date.now(),
        lat: tempMarker.lat,
        lng: tempMarker.lng,
        text: noteText,
        mood,
        timestamp: new Date().toISOString(),
        fromSession: true,
      };
      setEntries((prev) => [...prev, newEntry]);
    }
  
    resetForm(); // ✅ Reset form only if valid
  };
  

  const resetForm = () => {
    setNoteText("");
    setMood("happy");
    setTempMarker(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleDelete = (id) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    resetForm();
  };

  return (
    <div style={{ height: "100vh", width: "100vw" }}>

      <MapContainer
        center={[38.9869, -76.9426]}
        zoom={15}
        scrollWheelZoom={true}
        tap = {false}
        closePopupOnClick = {false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

        {/* Search bar */}
        <div
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            zIndex: 1000,
          }}
        >
          <GeocoderControl
            position="topright"
          />
        </div>

        <div
          style={{
            position: "absolute",
            top: "3.5rem", // below the search
            right: "1rem",
            zIndex: 999,
          }}
        >
          <button
            onClick={() => {
              setIsAdding(true);
              alert("Click on the map to drop a note 📜");
            }}
            style={{
              padding: "0.5rem 1rem",
              background: "green",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              whiteSpace: "nowrap", // 💡 prevent line breaks
              fontSize: "1rem", // optional: make text more readable
            }}
          >
            Drop a Note 📜
        </button>
        </div>

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

        {entries.map((entry) => (
          <EditableMarker
            key={entry.id}
            entry={entry}
            isEditing={editingId === entry.id}
            onEditClick={() => {
              console.log("Edit clicked for entry", entry.id);
              setEditingId(entry.id);
              setNoteText(entry.text);
              setMood(entry.mood);
            }}
            onDelete={() => handleDelete(entry.id)}
            onUpdate={(updatedText, updatedMood) => {
              setEntries((prev) =>
                prev.map((ent) =>
                  ent.id === entry.id
                    ? {
                        ...ent,
                        text: updatedText,
                        mood: updatedMood,
                        timestamp: new Date().toISOString(),
                      }
                    : ent
                )
              );
              resetForm();
            }}
            onClose={() => {
              if (editingId === entry.id) resetForm();
            }}
            noteText={noteText}
            setNoteText={setNoteText}
            mood={mood}
            setMood={setMood}
            moodIcons={moodIcons}
          />
        ))}

        {showForm && tempMarker && (
          <Marker position={tempMarker} icon={moodIcons[mood] || moodIcons.default}>
            <Popup
              onClose={resetForm}
              autoClose={false}
              closeOnClick={false}
            >
              <form onSubmit={handleSave}>
                <textarea
                  placeholder="Your memory..."
                  value={noteText}
                  onChange={(e) => {
                    const text = e.target.value;
                    const words = getWordCount(text);
                    if (words <= MAX_WORDS && text.length <= MAX_CHARACTERS) {
                      setNoteText(text);
                    }
                  }}
                  //required
                  rows={3}
                  style={{ width: "100%" }}
                />
                <small style={{ color: noteText.length >= MAX_CHARACTERS || getWordCount(noteText) >= MAX_WORDS ? "red" : "gray" }}>
                  {getWordCount(noteText)} / {MAX_WORDS} words • {noteText.length} / {MAX_CHARACTERS} characters
                </small>

                <select value={mood} onChange={(e) => setMood(e.target.value)}>
                  <option value="happy">😊 Happy</option>
                  <option value="sad">😢 Sad</option>
                  <option value="excited">🎉 Excited</option>
                  <option value="calm">🌿 Calm</option>
                </select>
                <br />
                <button type="submit">Save</button>
              </form>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
