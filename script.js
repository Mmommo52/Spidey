// Variable global para guardar la última ubicación de la araña
let ultimaUbicacionSpider = null;

// Modificar la función que carga las arañas para que recuerde la última
async function cargarPuntosHistoricos(id) {
    if (!marcadoresAraña) return;
    marcadoresAraña.clearLayers();

    try {
        const lecturasRef = collection(db, "rastreos", id, "lecturas");
        const q = query(lecturasRef, orderBy("timestamp", "asc"));
        const querySnapshot = await getDocs(q);
        
        let bounds = [];

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const lat = data.lat;
            const lng = data.lng;
            
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
            
            // Actualizamos la última posición registrada
            ultimaUbicacionSpider = [lat, lng];
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

// BOTÓN RASTREAR: Al presionarlo, redirige y centra el mapa directamente en la araña
window.accionRastrearObjetivo = function() {
    if (ultimaUbicacionSpider) {
        // Hace zoom y centra la pantalla exactamente en la última araña registrada
        map.setView(ultimaUbicacionSpider, 18);
        document.getElementById('banner-status').innerHTML = "OBJETIVO CENTRADO<br>EN RADAR";
    } else {
        alert("No hay puntos de acceso registrados todavía.");
    }
};
