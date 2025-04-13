//IMPORTS
//map basics
import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvent,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./App.css";
//location search
import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import "leaflet-control-geocoder";
//firebase
import { db } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import happyIcon from "./assets/happy.gif";
import cryingIcon from "./assets/crying.gif";
import danceFloorIcon from "./assets/dance-floor.gif";
import chillIcon from "./assets/relaxed.gif";
import flirtyIcon from "./assets/flirty.gif";


const MAX_CHARACTERS = 70;

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});


const moodIcons = {
  happy: new L.Icon({
    iconUrl: happyIcon,
    iconSize: [60, 60],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  }),
  sad: new L.Icon({
    iconUrl: cryingIcon,
    iconSize: [80, 80],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  }),
  lively: new L.Icon({
    iconUrl: danceFloorIcon,
    iconSize: [60, 60],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  }),
  calm: new L.Icon({
    iconUrl: chillIcon,
    iconSize: [80, 80],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  }),
  romantic: new L.Icon({
    iconUrl: flirtyIcon,
    iconSize: [60, 60],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  }),
  default: new L.DivIcon({
    html: "📍",
    className: "emoji-icon",
    iconSize: [30, 30],
  }),
};

//functions

//search bar
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

//add pin on click
function AddMarkerOnClick({ isAdding, onMapClick }) {
  useMapEvent("click", (e) => {
    if (isAdding) {
      onMapClick(e.latlng);
    }
  });
  return null;
}

//allow editing of pin
function EditableMarker({
  entry,
  isEditing,
  onEditClick,
  onDelete,
  onUpdate,
  noteText,
  setNoteText,
  mood,
  setMood,
  moodIcons,
  markerRefs,
}) {

  const justOpenedRef = useRef(false);
  useEffect(() => {
    if (markerRefs.current && entry.id) {
      markerRefs.current[entry.id] = markerRefs.current[entry.id] || {}; // Initialize if not already
    }
  }, [entry.id, markerRefs]);
  const handlePopupOpen = () => {
    console.log("Popup opened for entry", entry.id);
    justOpenedRef.current = true;
  };

  // const handleFormSubmit = (e) => {
  //   e.preventDefault();
  //   if (
  //     // getWordCount(noteText) > MAX_WORDS ||
  //     noteText.length > MAX_CHARACTERS
  //   ) {
  //     alert("Your entry is too long. Please shorten it.");
  //     return;
  //   }
  //   onUpdate(noteText, mood);
  // };

  return (
    <Marker
      position={[entry.lat, entry.lng]}
      icon={moodIcons[entry.mood] || moodIcons.default}
      eventHandlers={{
        popupopen: handlePopupOpen,
      }}
      ref={(ref) => {
        if (ref && entry.id) {
          markerRefs.current[entry.id] = ref; // Store marker reference by note.id
        }
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
                if (text.length <= MAX_CHARACTERS) {
                  setNoteText(text);
                }
              }}
              rows={3}
              style={{ width: "100%" }}
              //required
            />
            {/* <small style={{ color: noteText.length >= MAX_CHARACTERS || getWordCount(noteText) >= MAX_WORDS ? "red" : "gray" }}> */}
            <small style={{ color: noteText.length >= MAX_CHARACTERS? "red" : "white" }}>
              {noteText.length} / {MAX_CHARACTERS} characters
            </small>

            <select className="mood-select-edit" value={mood} onChange={(e) => setMood(e.target.value)}>
              <option value="all">All</option>
              <option value="happy">☺️ Happy</option>
              <option value="sad">😢 Sad</option>
              <option value="lively">💃 Lively</option>
              <option value="calm">🧘‍♀️ Calm</option>
              <option value="romantic">💕 Romantic</option>
            </select>
            <br />
            <button type="submit">Update</button>
          </form>
        ) : (
          <div className="popup-text">
            <strong style={{ color: "white", fontSize: "13px"}}>
              {entry.text}
            </strong>
            <br />
            <small style={{fontSize: "10px", marginRight:"20px"}}>{new Date(entry.timestamp).toLocaleDateString()}</small>
            <small style={{fontSize: "10px", textAlign: "right"}}>{entry.lat.toFixed(4)}, {entry.lng.toFixed(4)}</small>
            <br />
            {entry.fromSession && (
              <>
                <button className="edit-button" onClick={onEditClick}>Edit</button>
                <button className="delete-button" onClick={onDelete}>Delete</button>
              </>
            )}
          </div>
        )}
      </Popup>
    </Marker>
  );
}

//main
export default function App() {
  const [isAdding, setIsAdding] = useState(false);
  const [tempMarker, setTempMarker] = useState(null);
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [mood, setMood] = useState("happy");
  const [editingId, setEditingId] = useState(null);
  const mapRef = useRef();
  const [minZoom, setMinZoom] = useState(2);
  const [selectedMood, setSelectedMood] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [showDropNoteModal, setShowDropNoteModal] = useState(false);
  const [dontShowAgainChecked, setDontShowAgainChecked] = useState(false);
  const newMarkerRef = useRef(null);
  const markerRefs = useRef({});


  useEffect(() => {
    let mouseDownTarget = null;
    let mouseDownX = 0;
    let mouseDownY = 0;
  
    const handleMouseDown = (e) => {
      mouseDownTarget = e.target;
      mouseDownX = e.clientX;
      mouseDownY = e.clientY;
    };
  
    const handleMouseUp = (e) => {
      const popup = document.querySelector(".leaflet-popup-content");
  
      const dx = Math.abs(e.clientX - mouseDownX);
      const dy = Math.abs(e.clientY - mouseDownY);
      const movedFar = dx > 5 || dy > 5; // adjust threshold as needed
  
      if (popup && !popup.contains(e.target) && !movedFar) {
        if (showForm && tempMarker) {
          resetForm(); // user clicked outside, not dragged
        }
      }
    };
  
    if (showForm) {
      document.addEventListener("mousedown", handleMouseDown);
      document.addEventListener("mouseup", handleMouseUp);

    }

    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [showForm, tempMarker]);

  const exploreRandomNote = () => {
    console.log(mapRef.current)
    if (entries.length === 0 || !mapRef.current) return;
  
    const randomIndex = Math.floor(Math.random() * entries.length);
    const note = entries[randomIndex];
  
    mapRef.current.setView([note.lat, note.lng], 19); // Zoom in
  
    const markerRef = markerRefs.current[note.id];
    console.log("marker ref: ", markerRef)
    if (markerRef) {
      markerRef.openPopup(); // Trigger popup
    }
  };
  

useEffect(() => {
  const calculateMinZoom = () => {
    const map = mapRef.current;
    if (!map) return;

    const bounds = map.getBounds();
    const worldBounds = L.latLngBounds([[-85, -180], [85, 180]]);

    const requiredZoom = map.getBoundsZoom(worldBounds, false);
    setMinZoom(requiredZoom);
  };

  if (mapRef.current) {
    calculateMinZoom();
  }
}, []);

  useEffect(() => {
    const handleResize = () => {
      if (mapRef.current) {
        const worldBounds = L.latLngBounds([[-85, -180], [85, 180]]);
        const zoom = mapRef.current.getBoundsZoom(worldBounds, false);
        setMinZoom(zoom);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchEntries = async () => {
      const snapshot = await getDocs(collection(db, "entries"));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        fromSession: false, // ✅ Mark as NOT from this session
      }));
          setEntries(data);
    };
  
    fetchEntries();
  }, []);

  useEffect(() => {
    const mapContainer = document.querySelector(".leaflet-container");
  
    if (mapContainer) {
      if (isAdding) {
        mapContainer.classList.add("map-crosshair");
      } else {
        mapContainer.classList.remove("map-crosshair");
      }
    }
  
    // clean up just in case
    return () => {
      if (mapContainer) {
        mapContainer.classList.remove("map-crosshair");
      }
    };
  }, [isAdding]);

  useEffect(() => {
    if (showForm && tempMarker) {
      openNewMarkerPopup();
    }
  }, [showForm, tempMarker]);

  const handleSave = async (e) => {
    e.preventDefault();
  
    const charCount = noteText.length;
  
    if (charCount > MAX_CHARACTERS) {
      alert(
        `Your entry is too long.\n\nCharacter limit: ${charCount}/${MAX_CHARACTERS}`
      );
      return; 
    }
     
    const newEntry = {
      lat: tempMarker.lat,
      lng: tempMarker.lng,
      text: noteText,
      mood,
      timestamp: new Date().toISOString(),
      fromSession: true,
    };
  

    const entryToSave = { ...newEntry };
    delete entryToSave.fromSession;

    const docRef = await addDoc(collection(db, "entries"), entryToSave);
    setEntries((prev) => [...prev, { ...newEntry, id: docRef.id }]);


    resetForm();
  };
  

  const openNewMarkerPopup = () => {
    if (newMarkerRef.current) {
      setTimeout(() => {
        newMarkerRef.current.openPopup();
      }, 100); // Slight delay to ensure DOM mount
    }
  };

  const resetForm = () => {
    setNoteText("");
    setMood("happy");
    setTempMarker(null);
    setEditingId(null);
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "entries", id));
    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    resetForm();
  };
  

  return (
    <div style={{ height: "100vh", width: "100vw" }}>
      <div style={{
        position: "absolute",
        top: "10px",
        left: "80px",
        zIndex: 1000,
        background: "white",
        backgroundColor: "green",
        padding: "8px",
        borderRadius: "8px",
        boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
        color: "white",
      }}>
        <label htmlFor="moodFilter">Filter by Mood: </label>
        <select
          style={{width:"18%"}}
          id="moodFilter"
          value={selectedMood}
          onChange={(e) => setSelectedMood(e.target.value)}
        >
          <option value="all">All</option>
          <option value="happy">😊 Happy</option>
          <option value="sad">😢 Sad</option>
          <option value="lively">💃 Lively</option>
          <option value="calm">🧘‍♀️ Calm</option>
          <option value="romantic">💕 Romantic</option>
        </select>

        <label htmlFor="textFilter"> Search Text: </label>
        <input
          className="textFilterInput"
          id="textFilter"
          type="text"
          placeholder="Search notes..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ padding: "4px", borderRadius: "4px", border: "none"}}
        />

{showDropNoteModal && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000,
    }}
  >
    <div
      style={{
        background: "white",
        padding: "20px",
        borderRadius: "8px",
        maxWidth: "400px",
        width: "90%",
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        textAlign: "center",
      }}
    >
      <p style={{color: "black"}}>📍 Click anywhere on the map to drop a note!</p>
      <label style={{ fontSize: "0.9rem", color: "black"}}>
        <input
          type="checkbox"
          checked={dontShowAgainChecked}
          onChange={(e) => setDontShowAgainChecked(e.target.checked)}
        />
        {" "}Don't show this popup again
      </label>
      <br />
      <button
        style={{
          marginTop: "10px",
          padding: "0.4rem 1rem",
          background: "green",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
        onClick={() => {
          if (dontShowAgainChecked) {
            sessionStorage.setItem("hideDropNotePopup", "true");
          }
          setIsAdding(true); // 🟢 Start the drop
          setShowDropNoteModal(false); // 🔴 Close modal
        }}
      >
        Got it!
      </button>
    </div>
  </div>
)}

      </div>

      

      <MapContainer
        center={[38.9869, -76.9426]}
        zoom={15}
        scrollWheelZoom={true}
        minZoom={minZoom}
        tap = {false}
        closePopupOnClick = {false}
        style={{ height: "100%", width: "100%" }}
        maxBounds={[
          [-85, -180],
          [85, 180],
        ]}
        whenReady={(map) => {
          mapRef.current = map.target; // ✅ map.target is the Leaflet map instance
        }}
        maxBoundsViscosity={1.0} 
        whenCreated={(mapInstance) => {
          mapRef.current = mapInstance; // ✅ capture the map instance here
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />

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
            top: "3.5rem",
            right: "1rem",
            zIndex: 999,
          }}
        >
        <button
          onClick={() => {
            const hidePopup = sessionStorage.getItem("hideDropNotePopup") === "true";
            if (hidePopup) {
              setIsAdding(true);
            } else {
              setShowDropNoteModal(true);
            }
          }}
          style={{
            padding: "0.5rem 1rem",
            background: "green",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontSize: "1rem",
            boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.3)",
            marginRight: "12px"
          }}
        >
          Drop a Note 📜
        </button>
        <button
          style={{
            padding: "0.5rem 1rem",
            background: "green",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            whiteSpace: "nowrap",
            fontSize: "1rem",
            boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.3)"
          }}
          disabled={entries.length === 0}
           onClick={exploreRandomNote}
          >
            🎲 Surprise Note
        </button>


        </div>

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

        {entries
        .filter(entry => 
          {
            const moodMatches = selectedMood === "all" || entry.mood === selectedMood;
            const textMatches = entry.text.toLowerCase().includes(searchText.toLowerCase());
            return moodMatches && textMatches;
          })
        .map((entry) => (
          <EditableMarker
            key={entry.id}
            entry={entry}
            ref={(ref) => {
              if (ref) markerRefs.current[entry.id] = ref;
            }}
            isEditing={editingId === entry.id}
            onEditClick={() => {
              console.log("Edit clicked for entry", entry.id);
              setEditingId(entry.id);
              setNoteText(entry.text);
              setMood(entry.mood);
            }}
            onDelete={() => handleDelete(entry.id)}
            onUpdate={(updatedText, updatedMood) => {
              const updatedEntry = {
                ...entry,
                text: updatedText,
                mood: updatedMood,
                timestamp: new Date().toISOString(),
              };
            
              const docRef = doc(db, "entries", entry.id);
              updateDoc(docRef, updatedEntry);
            
              setEntries(prev =>
                prev.map(ent => (ent.id === entry.id ? updatedEntry : ent))
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
            markerRefs={markerRefs}
          />
        ))}

        {showForm && tempMarker && (
          <Marker position={tempMarker} icon={moodIcons[mood] || moodIcons.default} ref={newMarkerRef} >
            <Popup
              onClose={resetForm}
              autoClose={false}
              closeOnClick={false}
              //closeButton={true}
            >
              <form onSubmit={handleSave}>
                <textarea
                  placeholder="Leave a note"
                  value={noteText}
                  onChange={(e) => {
                    const text = e.target.value;
                    //const words = getWordCount(text);
                    if (text.length <= MAX_CHARACTERS) {
                      setNoteText(text);
                    }
                  }}
                  //required
                  rows={3}
                  style={{ width: "97%" }}
                />
                <small style={{ color: noteText.length >= MAX_CHARACTERS ? "red" : "white", fontSize:9, marginTop:0 }}>
                  {noteText.length} / {MAX_CHARACTERS} characters
                </small>

                <select className="mood-select" value={mood} onChange={(e) => setMood(e.target.value)}>
                  <option value="happy">😊 Happy</option>
                  <option value="sad">😢 Sad</option>
                  <option value="lively">💃 Lively</option>
                  <option value="calm">🧘‍♀️ Calm</option>
                  <option value="romantic">💕 Romantic</option>
                </select>
                <br />
                <button className="save-button" type="submit">Save</button>
              </form>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
