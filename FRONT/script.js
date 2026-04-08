// -------------------------------
// SÉLECTION DES ÉLÉMENTS HTML
// -------------------------------
const cardsContainer = document.getElementById("cards-container");
const searchResults = document.getElementById("search-results");
const searchInput = document.getElementById("search");

let gourmandises = [];

// -------------------------------
// DONNÉES DÉMO  ← AJOUT
// -------------------------------
const DEMO_DATA = [
  { id: "d1", nom: "Croissant", origine: "Paris, France", categorie: "patisseries-française",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400",
    historique: "Le croissant est né à Vienne au XVIIe siècle et adopté par la France au XIXe.",
    recette: "https://www.marmiton.org/recettes/recette_croissants_23614.aspx",
    adresse_lat: 48.8566, adresse_lng: 2.3522 },
  { id: "d2", nom: "Éclair au chocolat", origine: "Lyon, France", categorie: "patisseries-française",
    image: "https://images.unsplash.com/photo-1603532648955-039310d9ed75?w=400",
    historique: "Inventé par Marie-Antoine Carême, pâtissier du XIXe siècle.",
    adresse_lat: 45.7640, adresse_lng: 4.8357 },
  { id: "d3", nom: "Tiramisu", origine: "Venise, Italie", categorie: "patisseries_europeennes",
    image: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400",
    historique: "Dessert emblématique du nord de l'Italie, apparu dans les années 1960.",
    adresse_lat: 45.4408, adresse_lng: 12.3155 },
  { id: "d4", nom: "Cheesecake", origine: "New York, USA", categorie: "patisseries_americaines",
    image: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400",
    historique: "Le cheesecake new-yorkais est devenu une icône de la pâtisserie américaine.",
    adresse_lat: 40.7128, adresse_lng: -74.0060 }
];

const renderDemoBanner = () => {
  const isDemo = localStorage.getItem("demo_mode");
  if (!isDemo) return;
  const banner = document.createElement("div");
  banner.id = "demo-banner";
  banner.style.cssText = "position:fixed;top:0;left:0;width:100%;background:#c9a227;color:#08040f;padding:6px;text-align:center;font-size:0.8rem;letter-spacing:0.05em;z-index:101;height:32px;line-height:20px;";
  banner.innerHTML = `Mode démo — données fictives &nbsp;|&nbsp; <a href="login.html" onclick="localStorage.clear()" style="font-weight:bold;color:#08040f;">Se connecter</a> &nbsp;|&nbsp; <a href="register.html" style="font-weight:bold;color:#08040f;">Créer un compte</a>`;
  document.body.prepend(banner);
};

// -------------------------------
// AUTH HELPERS
// -------------------------------
// En production sur Vercel, l'API est sur le même domaine
// En développement local, utiliser localhost:4242
const API = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:4242'
  : '';  // Même domaine sur Vercel — les routes /auth, /gourmandises etc. sont sur le même host

const authHeaders = () => {
  const token = localStorage.getItem("token");
  const isDemo = localStorage.getItem("demo_mode");
  return {
    "Content-Type": "application/json",
    ...(token && !isDemo ? { "Authorization": `Bearer ${token}` } : {})
  };
};


const handleAuthError = (status) => {
  if (status === 401 || status === 403) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    alert("Session expirée, veuillez vous reconnecter.");
    window.location.href = "login.html";
    return true;
  }
  return false;
};

const isLoggedIn = () => !!localStorage.getItem("token");

// Injecte un bouton connexion/déconnexion dans le DOM
const renderAuthNav = () => {
  let nav = document.getElementById("auth-nav");
  if (!nav) {
    nav = document.createElement("div");
    nav.id = "auth-nav";
   nav.style.cssText ="position:fixed;top:14px;right:18px;z-index:9999;";
    document.body.appendChild(nav);
  }
if (isLoggedIn()) {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    nav.innerHTML = `
      <span style="color:rgba(221,170,32,0.5);font-size:0.75rem;font-family:sans-serif;letter-spacing:0.04em;">${user.email || ""}</span>
      <button id="fav-nav-btn" aria-label="Mes favoris" style="position:relative;background:transparent;border:1px solid rgba(221,170,32,0.45);color:#ddaa20;padding:6px 14px;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;border-radius:20px;font-family:sans-serif;display:inline-flex;align-items:center;gap:6px;min-height:36px;">
        ♥ Favoris
        <span id="fav-drawer-badge" style="display:none;background:#c9a227;color:#08040f;border-radius:50%;width:18px;height:18px;font-size:0.65rem;font-weight:600;align-items:center;justify-content:center;">0</span>
      </button>
      <button id="logout-btn" style="background:transparent;border:1px solid rgba(221,170,32,0.45);color:#ddaa20;padding:6px 14px;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;border-radius:20px;font-family:sans-serif;min-height:36px;">Déconnexion</button>
    `;
    document.getElementById("fav-nav-btn").addEventListener("click", openFavDrawer);
    document.getElementById("logout-btn").addEventListener("click", () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("demo_mode"); // ← AJOUT : nettoie aussi le mode démo
      window.location.reload();
    });
    updateFavBadge();
  } else {
    nav.innerHTML = `
      <a href="login.html" style="background:transparent;border:1px solid rgba(221,170,32,0.45);color:#ddaa20;padding:6px 14px;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;cursor:pointer;border-radius:20px;font-family:sans-serif;text-decoration:none;display:inline-flex;align-items:center;min-height:36px;">Connexion</a>
    `;
  }
};

// -------------------------------
// CARTE LEAFLET
// -------------------------------
const API_OLD_REMOVED = null; // ancienne déclaration déplacée en haut
let map;
let markersLayer;

let goldIcon = null;

const initMap = () => {
  map = L.map("map").setView([48.8566, 2.3522], 3);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  // goldIcon créé ici — Leaflet est garanti disponible
  goldIcon = L.divIcon({
    className: "",
    html: `<div style="
      background: linear-gradient(135deg, #ddaa20, #b8ba37);
      width: 32px; height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -35]
  });
};

const addMarker = (g) => {
  if (!g.adresse_lat || !g.adresse_lng) return;
  const marker = L.marker([g.adresse_lat, g.adresse_lng], { icon: goldIcon });
  marker.bindPopup(`
    <div style="text-align:center; min-width:180px;">
      ${g.image ? `<img src="${g.image}" style="width:100%; height:100px; object-fit:cover; border-radius:6px; margin-bottom:6px;" />` : ""}
      <strong style="color:#ddaa20; font-size:1rem;">${g.nom}</strong><br/>
      ${g.origine ? `<em style="color:#666;">${g.origine}</em><br/>` : ""}
      ${g.adresse ? `<span style="font-size:0.8rem;">📍 ${g.adresse}</span><br/>` : ""}
      ${g.recette ? `<a href="${g.recette}" target="_blank" style="color:#ddaa20; font-weight:bold;">Voir la recette →</a>` : ""}
    </div>
  `);
  markersLayer.addLayer(marker);
};

const refreshMarkers = () => {
  if (!map) return;
  markersLayer.clearLayers();
  gourmandises.forEach(g => addMarker(g));
};

// -------------------------------
// CATÉGORIES & ORDRE D'AFFICHAGE
// -------------------------------
const categoriesMapping = {
  "patisseries-française": "Pâtisseries françaises",
  "patisseries_europeennes": "Pâtisseries européennes",
  "patisseries_americaines": "Pâtisseries américaines"
};

const categoriesOrder = [
  "Pâtisseries françaises",
  "Pâtisseries européennes",
  "Pâtisseries américaines"
];

// -------------------------------
// CRÉER UNE CARTE DE PÂTISSERIE
// -------------------------------
const createCard = (g) => {
  const card = document.createElement("div");
  card.className = "card";

  const title = document.createElement("h3");
  title.textContent = g.nom + (g.origine ? ` (${g.origine})` : "");
  card.appendChild(title);

  // ❤️ BOUTON FAVORI DORÉ
  const favBtn = document.createElement("button");
  favBtn.className = "fav-btn";
  const favs = JSON.parse(localStorage.getItem("favoris") || "[]");
  const isFav = favs.some(f => f.id === g.id);
  favBtn.innerHTML = isFav
    ? `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`
    : `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>`;

  favBtn.title = isFav ? "Retirer des favoris" : "Ajouter aux favoris";

  favBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    let favs = JSON.parse(localStorage.getItem("favoris") || "[]");
    const index = favs.findIndex(f => f.id === g.id);

    if (index === -1) {
      favs.push(g);
      favBtn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
      favBtn.title = "Retirer des favoris";
    } else {
      favs.splice(index, 1);
      favBtn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>`;
      favBtn.title = "Ajouter aux favoris";
    }
    localStorage.setItem("favoris", JSON.stringify(favs));
    updateFavBadge();
    // Rafraîchir le drawer favoris s'il est ouvert
    if (document.getElementById("fav-drawer")) refreshFavDrawer();
  });

  card.appendChild(favBtn);

  if (g.image) {
    const img = document.createElement("img");
    img.src = g.image;
    img.alt = g.nom;
    card.appendChild(img);
  }

  if (g.historique) {
    const p = document.createElement("p");
    p.textContent = g.historique;
    card.appendChild(p);
  }

  if (g.recette) {
    const link = document.createElement("a");
    link.href = g.recette;
    link.target = "_blank";
    link.textContent = "Voir la recette";
    card.appendChild(link);
  }

  // BOUTON MODIFIER
  const modifyBtn = document.createElement("button");
  modifyBtn.textContent = "✏️ Modifier";
  modifyBtn.className = "modify-btn";

  const formEdit = document.createElement("form");
  formEdit.className = "form-ajout";
  formEdit.style.display = "none";
  formEdit.innerHTML = `
  <input placeholder="Nom" value="${g.nom || ''}" required />
  <input placeholder="Origine (ex: Paris, France)" value="${g.origine || ''}" />
  <input placeholder="Image (URL : https://...jpg ou .png)" value="${g.image || ''}" />
  <textarea placeholder="Anecdote (texte libre...)" rows="3">${g.historique || ''}</textarea>
  <input placeholder="Recette (URL : https://monsite.com/recette)" value="${g.recette || ''}" />
  <input placeholder="📍 Adresse (ex: 75 rue de Rivoli, Paris)" value="${g.adresse || ''}" id="edit-adresse-${g.id || Math.random()}" />
  <button type="submit">💾 Sauvegarder</button>
`;

  modifyBtn.addEventListener("click", () => {
    formEdit.style.display = formEdit.style.display === "flex" ? "none" : "flex";
  });

  formEdit.addEventListener("submit", async (e) => {
    e.preventDefault();
    const inputs = formEdit.querySelectorAll("input, textarea");
    g.nom        = inputs[0].value;
    g.origine    = inputs[1].value;
    g.image      = inputs[2].value;
    g.historique = inputs[3].value;
    g.recette    = inputs[4].value;
    g.adresse    = inputs[5].value;

    if (g.adresse) {
      try {
        const geoRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(g.adresse)}`
        );
        const geoData = await geoRes.json();
        if (geoData.length > 0) {
          g.adresse_lat = parseFloat(geoData[0].lat);
          g.adresse_lng = parseFloat(geoData[0].lon);
        }
      } catch (err) {
        console.error("Erreur géocodage :", err);
      }
    }

    if (g.id) {
      try {
        const putRes = await fetch(`${API}/gourmandises/${g.id}`, {
          method: "PUT",
          headers: authHeaders(),
          body: JSON.stringify(g)
        });
        if (handleAuthError(putRes.status)) return;
      } catch (err) {
        console.error("Erreur modification :", err);
      }
    }

    title.textContent = g.nom + (g.origine ? ` (${g.origine})` : "");
    const existingImg = card.querySelector("img");
    if (g.image) {
      if (existingImg) existingImg.src = g.image;
      addImageToSlider(g.image);
    }

    refreshMarkers();
    if (g.adresse_lat && map) {
      map.setView([g.adresse_lat, g.adresse_lng], 10);
    }

    formEdit.style.display = "none";
  });

  if (!isLoggedIn()) modifyBtn.style.display = "none";
  card.appendChild(modifyBtn);
  card.appendChild(formEdit);

  // BOUTON SUPPRIMER
  if (g.id && isLoggedIn() && !localStorage.getItem("demo_mode")) {
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "🗑️ Supprimer";
    deleteBtn.className = "delete-btn";

    let confirmStep = false;
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();

      if (!confirmStep) {
        confirmStep = true;
        deleteBtn.textContent = "⚠️ Confirmer la suppression ?";
        deleteBtn.style.borderColor = "#e07070";
        deleteBtn.style.color = "#e07070";
        setTimeout(() => {
          if (confirmStep) {
            confirmStep = false;
            deleteBtn.textContent = "🗑️ Supprimer";
            deleteBtn.style.borderColor = "";
            deleteBtn.style.color = "";
          }
        }, 3000);
        return;
      }

      try {
        const delRes = await fetch(`${API}/gourmandises/${g.id}`, {
          method: "DELETE",
          headers: authHeaders()
        });
        if (handleAuthError(delRes.status)) return;

        if (delRes.ok) {
          gourmandises = gourmandises.filter(x => x.id !== g.id);
          card.style.transition = "opacity 0.3s, transform 0.3s";
          card.style.opacity = "0";
          card.style.transform = "scale(0.95)";
          setTimeout(() => {
            card.remove();
            refreshMarkers();
          }, 300);
        }
      } catch (err) {
        console.error("Erreur suppression :", err);
      }
    });

    card.appendChild(deleteBtn);
  }

  return card;
};

// -------------------------------
// DRAWER
// -------------------------------
const openDrawer = (categorie, items) => {
  const existing = document.getElementById("cat-drawer");
  const existingOv = document.getElementById("drawer-overlay");
  if (existing) existing.remove();
  if (existingOv) existingOv.remove();

  const overlay = document.createElement("div");
  overlay.id = "drawer-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.addEventListener("click", closeDrawer);
  document.body.appendChild(overlay);

  const drawer = document.createElement("div");
  drawer.id = "cat-drawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-label", "Pâtisseries — " + categorie);

  const drawerHeader = document.createElement("div");
  drawerHeader.className = "drawer-header";

  const drawerTitle = document.createElement("h3");
  drawerTitle.className = "drawer-title";
  drawerTitle.textContent = categorie;

  const drawerClose = document.createElement("button");
  drawerClose.className = "drawer-close";
  drawerClose.setAttribute("aria-label", "Fermer");
  drawerClose.textContent = "✕";
  drawerClose.addEventListener("click", closeDrawer);

  drawerHeader.appendChild(drawerTitle);
  drawerHeader.appendChild(drawerClose);
  drawer.appendChild(drawerHeader);

  const drawerContent = document.createElement("div");
  drawerContent.className = "drawer-content";

  if (isLoggedIn()) {
    const addBtn = document.createElement("button");
    addBtn.textContent = "+ Ajouter une pâtisserie";
    addBtn.className = "add-btn";
    drawerContent.appendChild(addBtn);

    const formAdd = document.createElement("form");
    formAdd.className = "form-ajout";
    formAdd.style.display = "none";
    const inp1 = document.createElement("input"); inp1.placeholder = "Nom de la pâtisserie"; inp1.required = true;
    const inp2 = document.createElement("input"); inp2.placeholder = "Origine (ex: Lyon, France)";
    const inp3 = document.createElement("input"); inp3.placeholder = "Image (URL)";
    const ta   = document.createElement("textarea"); ta.placeholder = "Anecdote..."; ta.rows = 3;
    const inp4 = document.createElement("input"); inp4.placeholder = "Recette (URL)";
    const subm = document.createElement("button"); subm.type = "submit"; subm.textContent = "Ajouter";
    [inp1, inp2, inp3, ta, inp4, subm].forEach(el => formAdd.appendChild(el));
    drawerContent.appendChild(formAdd);

    addBtn.addEventListener("click", () => {
      const isOpen = formAdd.style.display === "flex";
      formAdd.style.display = isOpen ? "none" : "flex";
      addBtn.textContent = isOpen ? "+ Ajouter une pâtisserie" : "✕ Annuler";
    });

    formAdd.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const newItem = {
        nom: inp1.value, origine: inp2.value,
        image: inp3.value, historique: ta.value,
        recette: inp4.value, categorie
      };
      try {
        const postRes = await fetch(`${API}/gourmandises`, {
          method: "POST", headers: authHeaders(), body: JSON.stringify(newItem)
        });
        if (handleAuthError(postRes.status)) return;
        const saved = await postRes.json();
        newItem.id = saved.id;
      } catch (err) { console.error("Erreur ajout :", err); }
      gourmandises.push(newItem);
      const card = createCard(newItem);
      card.addEventListener("click", () => showCardDetail(newItem));
      drawerContent.appendChild(card);
      if (newItem.image) addImageToSlider(newItem.image);
      formAdd.reset();
      formAdd.style.display = "none";
      addBtn.textContent = "+ Ajouter une pâtisserie";
    });
  }

  if (items.length === 0) {
    const empty = document.createElement("p");
    empty.className = "drawer-empty";
    empty.textContent = "Aucune pâtisserie dans cette catégorie.";
    drawerContent.appendChild(empty);
  } else {
    items.forEach(g => {
      const card = createCard(g);
      card.addEventListener("click", () => showCardDetail(g));
      drawerContent.appendChild(card);
    });
  }

  drawer.appendChild(drawerContent);
  document.body.appendChild(drawer);

  requestAnimationFrame(() => { drawer.classList.add("open"); overlay.classList.add("open"); });

  const onKey = (e) => {
    if (e.key === "Escape") { closeDrawer(); document.removeEventListener("keydown", onKey); }
  };
  document.addEventListener("keydown", onKey);
};

const closeDrawer = () => {
  const drawer  = document.getElementById("cat-drawer");
  const overlay = document.getElementById("drawer-overlay");
  if (drawer)  { drawer.classList.remove("open");  drawer.addEventListener("transitionend",  () => drawer.remove(),  { once: true }); }
  if (overlay) { overlay.classList.remove("open"); overlay.addEventListener("transitionend", () => overlay.remove(), { once: true }); }
};

const showCardDetail = (g) => {
  // On ne touche plus aux sliders — ils ont leur propre conteneur
  searchResults.innerHTML = "";
  const selectedCard = createCard(g);
  selectedCard.style.position = "relative";
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.className = "close-btn";
  closeBtn.addEventListener("click", (ev) => {
    ev.stopPropagation();
    searchResults.innerHTML = "";
  });
  selectedCard.appendChild(closeBtn);
  searchResults.appendChild(selectedCard);
};

// -------------------------------
// AFFICHAGE DES COLONNES — navigation compacte, drawer au clic
// -------------------------------
const displayColumns = (list) => {
  cardsContainer.innerHTML = "";

  categoriesOrder.forEach(categorie => {
    const items = list.filter(g => categoriesMapping[g.categorie] === categorie || g.categorie === categorie);
    const column = document.createElement("div");
    column.className = "category-column";

    const titre = document.createElement("h2");
    titre.textContent = categorie;
    titre.setAttribute("role", "button");
    titre.setAttribute("tabindex", "0");
    titre.setAttribute("aria-label", categorie + " — " + items.length + " pâtisserie(s)");

    const badge = document.createElement("span");
    badge.className = "cat-badge";
    badge.textContent = items.length;
    badge.setAttribute("aria-hidden", "true");
    titre.appendChild(badge);

    titre.addEventListener("click", () => openDrawer(categorie, items));
    titre.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") openDrawer(categorie, items); });

    column.appendChild(titre);
    cardsContainer.appendChild(column);
  });
};


// -------------------------------
// RECHERCHE AVEC AFFICHAGE CARTE
// -------------------------------
searchInput.addEventListener("input", e => {
  const query = e.target.value.toLowerCase().trim();
  searchResults.innerHTML = "";
  if (!query) return;
  const filtered = gourmandises.filter(g => g.nom.toLowerCase().includes(query));
  filtered.forEach(g => {
    const card = createCard(g);
    searchResults.appendChild(card);
  });
});

// -------------------------------
// SLIDER AUTOMATIQUE DES IMAGES
// -------------------------------
let sliderTimer  = null;
let slidersRunning = false;
// Conteneur dédié aux sliders — indépendant de search-results
let sliderContainer = null;

const buildSliderContainer = () => {
  if (sliderContainer) return; // déjà créé
  sliderContainer = document.createElement("div");
  sliderContainer.id = "slider-container";
  // Insérer avant #search-results dans col-mid
  const colMid = searchResults.parentElement;
  colMid.insertBefore(sliderContainer, searchResults);
};

const getUniqueImages = () => {
  // Déduplique les URLs d'images
  const seen = new Set();
  const imgs = [];
  gourmandises.forEach(g => {
    if (g.image && !seen.has(g.image)) { seen.add(g.image); imgs.push(g.image); }
  });
  return imgs;
};

const startSlider = () => {
  buildSliderContainer();
  const images = getUniqueImages();
  if (!images.length) return;

  stopSlider();
  sliderContainer.innerHTML = "";
  slidersRunning = true;

  // idx pointe sur slider1, idx+1 sur slider2 — jamais identiques
  // Si une seule image, slider2 n'apparaît pas
  let idx = 0;

  // Slider 1
  const wrap1 = document.createElement("div");
  wrap1.className = "slider-card";
  const img1 = document.createElement("img");
  img1.alt = "Pâtisserie";
  img1.style.transition = "opacity 0.35s ease";
  wrap1.appendChild(img1);
  sliderContainer.appendChild(wrap1);

  // Slider 2 — seulement si ≥ 2 images distinctes
  let img2 = null;
  if (images.length >= 2) {
    const wrap2 = document.createElement("div");
    wrap2.className = "slider-card slider-card-2";
    img2 = document.createElement("img");
    img2.alt = "Pâtisserie";
    img2.style.transition = "opacity 0.35s ease";
    wrap2.appendChild(img2);
    sliderContainer.appendChild(wrap2);
  }

  const applyImages = (fade) => {
    if (fade) {
      img1.style.opacity = "0";
      if (img2) img2.style.opacity = "0";
    }
    const apply = () => {
      const i1 = idx % images.length;
      const i2 = (idx + 1) % images.length;
      // Garantie : i1 !== i2 quand length >= 2
      img1.src = images[i1];
      if (img2) img2.src = images[i2];
      if (fade) {
        img1.style.opacity = "1";
        if (img2) img2.style.opacity = "1";
      }
    };
    fade ? setTimeout(apply, 350) : apply();
  };

  applyImages(false); // initial sans fondu

  const tick = () => {
    if (!slidersRunning) return;
    idx = (idx + 1) % images.length;
    applyImages(true);
    sliderTimer = setTimeout(tick, 3800);
  };

  sliderTimer = setTimeout(tick, 3800);
};

const stopSlider = () => {
  slidersRunning = false;
  if (sliderTimer) { clearTimeout(sliderTimer); sliderTimer = null; }
};

searchInput.addEventListener("focus", stopSlider);
searchInput.addEventListener("blur", () => {
  if (!searchInput.value) startSlider();
});

// -------------------------------
// AJOUTER IMAGE AU SLIDER
// -------------------------------
const addImageToSlider = () => {
  // Les images viennent de gourmandises directement — on relance juste
  stopSlider();
  startSlider();
};

// -------------------------------
// BOUTON AJOUTER UNE CATÉGORIE
// -------------------------------
const appendAddCategoryBtn = () => {
  const existing = document.querySelector(".category-btn-wrapper");
  if (existing) existing.remove();

  const addCategoryBtn = document.createElement("button");
  addCategoryBtn.textContent = "+ Ajouter une catégorie";
  addCategoryBtn.className = "add-category-btn";
  if (!isLoggedIn()) addCategoryBtn.style.display = "none";

  const formCategory = document.createElement("form");
  formCategory.className = "form-ajout";
  formCategory.innerHTML = `
    <input id="new-cat-name" placeholder="Nom de la catégorie" required />
    <button type="submit">Créer</button>
  `;

  const categoryBtnWrapper = document.createElement("div");
  categoryBtnWrapper.className = "category-btn-wrapper";
  categoryBtnWrapper.appendChild(addCategoryBtn);
  categoryBtnWrapper.appendChild(formCategory);
  cardsContainer.appendChild(categoryBtnWrapper);

  addCategoryBtn.addEventListener("click", () => {
    formCategory.style.display = formCategory.style.display === "flex" ? "none" : "flex";
  });

  formCategory.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nomCat = document.getElementById("new-cat-name").value.trim();
    if (!nomCat) return;

    try {
      const catRes = await fetch(`${API}/categories`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ nom: nomCat })
      });
      if (handleAuthError(catRes.status)) return;
    } catch (err) {
      console.error("Erreur sauvegarde catégorie :", err);
    }

    categoriesOrder.push(nomCat);
    categoriesMapping[nomCat] = nomCat;

    const newColumn = document.createElement("div");
    newColumn.className = "category-column";

    const titre = document.createElement("h2");
    titre.textContent = nomCat;
    newColumn.appendChild(titre);

    const toggleWrapper = document.createElement("div");
    toggleWrapper.style.display = "none";
    toggleWrapper.style.flexDirection = "column";
    toggleWrapper.style.gap = "20px";
    newColumn.appendChild(toggleWrapper);

    const addBtn = document.createElement("button");
    addBtn.textContent = "+ Ajouter";
    addBtn.className = "add-btn";
    toggleWrapper.appendChild(addBtn);

    const formAdd = document.createElement("form");
    formAdd.className = "form-ajout";
    formAdd.innerHTML = `
      <input placeholder="Nom de la pâtisserie" required />
      <input placeholder="Origine (ex: Lyon, France ou New York, USA)" />
      <input placeholder="Image (URL : https://...jpg ou .png)" />
      <textarea placeholder="Anecdote (texte libre, raconte l'histoire de la pâtisserie...)" rows="3"></textarea>
      <input placeholder="Recette (URL : https://monsite.com/recette)" />
      <input placeholder="📍 Adresse (ex: 75 rue de Rivoli, Paris)" />
      <button type="submit">Ajouter</button>
    `;
    toggleWrapper.appendChild(formAdd);

    addBtn.addEventListener("click", () => {
      formAdd.style.display = "flex";
      addBtn.style.display = "none";
    });

    formAdd.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const inputs = formAdd.querySelectorAll("input, textarea");
      const newItem = {
        nom: inputs[0].value,
        origine: inputs[1].value,
        image: inputs[2].value,
        historique: inputs[3].value,
        recette: inputs[4].value,
        categorie: nomCat
      };

      const adresseValue = inputs[5].value;
      newItem.adresse = adresseValue;

      if (newItem.adresse) {
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(newItem.adresse)}`
          );
          const geoData = await geoRes.json();
          if (geoData.length > 0) {
            newItem.adresse_lat = parseFloat(geoData[0].lat);
            newItem.adresse_lng = parseFloat(geoData[0].lon);
          }
        } catch (err) {
          console.error("Erreur géocodage d'ajout :", err);
        }
      }

      try {
        const postRes2 = await fetch(`${API}/gourmandises`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(newItem)
        });
        if (handleAuthError(postRes2.status)) return;
        const saved = await postRes2.json();
        newItem.id = saved.id;
      } catch (err) {
        console.error("Erreur ajout pâtisserie :", err);
      }

      gourmandises.push(newItem);
      const card = createCard(newItem);
      toggleWrapper.appendChild(card);
      if (newItem.image) addImageToSlider(newItem.image);
      formAdd.reset();
      formAdd.style.display = "none";
      addBtn.style.display = "block";
    });

    titre.addEventListener("click", () => {
      toggleWrapper.style.display =
        toggleWrapper.style.display === "none" ? "flex" : "none";
    });

    cardsContainer.insertBefore(newColumn, categoryBtnWrapper);
    formCategory.reset();
    formCategory.style.display = "none";
  });
};


// -------------------------------
// DRAWER FAVORIS
// -------------------------------
const getFavs = () => JSON.parse(localStorage.getItem("favoris") || "[]");

const updateFavBadge = () => {
  const badge = document.getElementById("fav-drawer-badge");
  if (!badge) return;
  const count = getFavs().length;
  badge.textContent = count;
  badge.style.display = count > 0 ? "flex" : "none";
};

const openFavDrawer = () => {
  const existing = document.getElementById("fav-drawer");
  const existingOv = document.getElementById("fav-drawer-overlay");
  if (existing) existing.remove();
  if (existingOv) existingOv.remove();

  const overlay = document.createElement("div");
  overlay.id = "fav-drawer-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.addEventListener("click", closeFavDrawer);
  document.body.appendChild(overlay);

  const drawer = document.createElement("div");
  drawer.id = "fav-drawer";
  drawer.setAttribute("role", "dialog");
  drawer.setAttribute("aria-label", "Mes favoris");

  const header = document.createElement("div");
  header.className = "drawer-header";

  const title = document.createElement("h3");
  title.className = "drawer-title";
  title.textContent = "Mes favoris";

  const closeBtn = document.createElement("button");
  closeBtn.className = "drawer-close";
  closeBtn.setAttribute("aria-label", "Fermer");
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", closeFavDrawer);

  header.appendChild(title);
  header.appendChild(closeBtn);
  drawer.appendChild(header);

  const content = document.createElement("div");
  content.className = "drawer-content";
  content.id = "fav-drawer-content";

  const favs = getFavs();
  if (favs.length === 0) {
    const empty = document.createElement("p");
    empty.className = "drawer-empty";
    empty.textContent = "Aucun favori pour l'instant. Cliquez sur ♥ sur une pâtisserie !";
    content.appendChild(empty);
  } else {
    favs.forEach(g => {
      const card = createCard(g);
      card.addEventListener("click", () => showCardDetail(g));
      // Bouton retirer du drawer
      const removeBtn = document.createElement("button");
      removeBtn.className = "fav-remove-btn";
      removeBtn.setAttribute("aria-label", "Retirer des favoris");
      removeBtn.textContent = "✕ Retirer";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        let f = getFavs();
        f = f.filter(x => x.id !== g.id);
        localStorage.setItem("favoris", JSON.stringify(f));
        updateFavBadge();
        card.style.transition = "opacity 0.25s, transform 0.25s";
        card.style.opacity = "0";
        card.style.transform = "translateX(20px)";
        setTimeout(() => card.remove(), 250);
        // Mettre à jour le coeur sur les cartes existantes
        document.querySelectorAll(".fav-btn").forEach(btn => {
          const parentCard = btn.closest(".card");
          if (parentCard && parentCard.querySelector("h3")?.textContent.includes(g.nom)) {
            btn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z"/></svg>`;
            btn.title = "Ajouter aux favoris";
          }
        });
      });
      card.appendChild(removeBtn);
      content.appendChild(card);
    });
  }

  drawer.appendChild(content);
  document.body.appendChild(drawer);

  requestAnimationFrame(() => { drawer.classList.add("open"); overlay.classList.add("open"); });

  const onKey = (e) => {
    if (e.key === "Escape") { closeFavDrawer(); document.removeEventListener("keydown", onKey); }
  };
  document.addEventListener("keydown", onKey);
};

const closeFavDrawer = () => {
  const drawer  = document.getElementById("fav-drawer");
  const overlay = document.getElementById("fav-drawer-overlay");
  if (drawer)  { drawer.classList.remove("open");  drawer.addEventListener("transitionend", () => drawer.remove(), { once: true }); }
  if (overlay) { overlay.classList.remove("open"); overlay.addEventListener("transitionend", () => overlay.remove(), { once: true }); }
};

const refreshFavDrawer = () => {
  closeFavDrawer();
  setTimeout(openFavDrawer, 320);
};

// -------------------------------
// FETCH BACKEND — requêtes parallèles
// -------------------------------
const fetchGourmandises = async () => {
  try {
    // Lancer la carte immédiatement sans attendre les données
    initMap();
    renderAuthNav();
renderDemoBanner();

const isDemo = localStorage.getItem("demo_mode");
if (isDemo) {
  gourmandises = DEMO_DATA;
  displayColumns(gourmandises);
  appendAddCategoryBtn();
  startSlider();
  refreshMarkers();
  return;
}

    // Requêtes catégories + pâtisseries en parallèle
    const [resCat, res] = await Promise.all([
      fetch(`${API}/categories`),
      fetch(`${API}/gourmandises`)
    ]);

    const [customCategories, data] = await Promise.all([
      resCat.json(),
      res.json()
    ]);

    customCategories.forEach(cat => {
      if (!categoriesOrder.includes(cat.nom)) {
        categoriesOrder.push(cat.nom);
        categoriesMapping[cat.nom] = cat.nom;
      }
    });

    gourmandises = data;

    displayColumns(gourmandises);
    appendAddCategoryBtn();
    startSlider();
    refreshMarkers();

  } catch (err) {
    console.error(err);
    cardsContainer.innerHTML = "<p>Impossible de charger les gourmandises.</p>";
  }
};

// -------------------------------
// PROTECTION DE LA PAGE
// -------------------------------
if (!isLoggedIn()) {
  // Pas de token → redirect login, on ne charge rien
  window.location.href = "login.html";
} else {
  fetchGourmandises();
}
