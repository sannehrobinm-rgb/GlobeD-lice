// -------------------------------
// SÉLECTION DES ÉLÉMENTS HTML
// -------------------------------
const cardsContainer = document.getElementById("cards-container");
const searchResults = document.getElementById("search-results");
const searchInput = document.getElementById("search");

// Liste des gourmandises récupérées du backend
let gourmandises = [];
// -------------------------------
// CARTE LEAFLET
// -------------------------------
let map;
let markersLayer;

const initMap = () => {
  map = L.map("map").setView([48.8566, 2.3522], 3); // centré monde

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 18
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
};

// Icône personnalisée dorée
const goldIcon = L.divIcon({
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
  g.nom       = inputs[0].value;
  g.origine   = inputs[1].value;
  g.image     = inputs[2].value;
  g.historique = inputs[3].value;
  g.recette   = inputs[4].value;
  g.adresse   = inputs[5].value;

  // Géocoder l'adresse → lat/lng via Nominatim (gratuit)
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

    // Sauvegarder dans Neon via PUT
    if (g.id) {
      try {
        await fetch(`http://localhost:4242/gourmandises/${g.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(g)
        });
      } catch (err) {
        console.error("Erreur modification :", err);
      }
    }

    // Mettre à jour la carte visuellement
    title.textContent = g.nom + (g.origine ? ` (${g.origine})` : "");
  const existingImg = card.querySelector("img");
  if (g.image) {
    if (existingImg) existingImg.src = g.image;
    addImageToSlider(g.image);
  }

  // Rafraîchir le marqueur sur la carte
  refreshMarkers();
  if (g.adresse_lat && map) {
    map.setView([g.adresse_lat, g.adresse_lng], 10);
  }

  formEdit.style.display = "none";
});

  card.appendChild(modifyBtn);
  card.appendChild(formEdit);

  return card;
};

// -------------------------------
// AFFICHAGE DES COLONNES
// -------------------------------
const displayColumns = (list) => {
  cardsContainer.innerHTML = "";

  categoriesOrder.forEach(categorie => {
    const items = list.filter(g => categoriesMapping[g.categorie] === categorie || g.categorie === categorie);
    const column = document.createElement("div");
    column.className = "category-column";

    const titre = document.createElement("h2");
    titre.textContent = categorie;
    column.appendChild(titre);

    const toggleWrapper = document.createElement("div");
    toggleWrapper.style.display = "none";
    column.appendChild(toggleWrapper);

    const addBtn = document.createElement("button");
    addBtn.textContent = "+ Ajouter";
    addBtn.className = "add-btn";
    toggleWrapper.appendChild(addBtn);

    const formAdd = document.createElement("form");
    formAdd.className = "form-ajout";
    formAdd.style.display = "none";
    formAdd.innerHTML = `
      <input placeholder="Nom de la pâtisserie" required />
      <input placeholder="Origine (ex: Lyon, France ou New York, USA)" />
      <input placeholder="Image (URL : https://...jpg ou .png)" />
      <textarea placeholder="Anecdote (texte libre, raconte l'histoire de la pâtisserie...)" rows="3"></textarea>
      <input placeholder="Recette (URL : https://monsite.com/recette)" />
      <button type="submit">Ajouter</button>
    `;
    toggleWrapper.appendChild(formAdd);

    items.forEach(g => {
      const card = createCard(g);
      toggleWrapper.appendChild(card);

      card.addEventListener("click", () => {
        stopSlider();
        searchResults.innerHTML = "";
        const selectedCard = createCard(g);
        selectedCard.style.position = "relative";

        const closeBtn = document.createElement("button");
        closeBtn.textContent = "✕";
        closeBtn.className = "close-btn";
        closeBtn.addEventListener("click", (ev) => {
          ev.stopPropagation();
          searchResults.innerHTML = "";
          startSlider();
        });

        selectedCard.appendChild(closeBtn);
        searchResults.appendChild(selectedCard);
      });
    });

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
        categorie: categorie
      };

      // Sauvegarder dans Neon via POST
      try {
        const res = await fetch("http://localhost:4242/gourmandises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItem)
        });
        const saved = await res.json();
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

    cardsContainer.appendChild(column);
  });
};

// -------------------------------
// RECHERCHE AVEC AFFICHAGE CARTE
// -------------------------------
searchInput.addEventListener("input", e => {
  const query = e.target.value.toLowerCase();
  searchResults.innerHTML = "";
  if (!query) return;

  const filtered = gourmandises.filter(g =>
    g.nom.toLowerCase().includes(query)
  );

  filtered.forEach(g => {
    const card = createCard(g);
    searchResults.appendChild(card);
  });
});

// -------------------------------
// SLIDER AUTOMATIQUE DES IMAGES
// -------------------------------
let sliderInterval;
const startSlider = () => {
  if (!gourmandises.length) return;
  const images = gourmandises.filter(g => g.image).map(g => g.image);
  let index = 0;
  if (!images.length) return;

  searchResults.innerHTML = "";
  const imgWrapper = document.createElement("div");
  imgWrapper.className = "slider-card";
  const img = document.createElement("img");
  img.src = images[index];
  imgWrapper.appendChild(img);
  searchResults.appendChild(imgWrapper);

  sliderInterval = setInterval(() => {
    index = (index + 1) % images.length;
    img.src = images[index];
  }, 3000);
};

const stopSlider = () => clearInterval(sliderInterval);

searchInput.addEventListener("focus", stopSlider);
cardsContainer.addEventListener("click", (e) => {
  if (e.target.closest(".card")) stopSlider();
});
searchInput.addEventListener("blur", () => {
  if (!searchInput.value) startSlider();
});

// -------------------------------
// AJOUTER IMAGE AU SLIDER
// -------------------------------
const addImageToSlider = (newImageUrl) => {
  const sliderImg = searchResults.querySelector(".slider-card img");
  if (!sliderImg) return;

  const allImages = gourmandises.filter(g => g.image).map(g => g.image);
  if (!allImages.includes(newImageUrl)) allImages.push(newImageUrl);

  stopSlider();
  let index = allImages.length - 1;
  sliderImg.src = allImages[index];

  sliderInterval = setInterval(() => {
    index = (index + 1) % allImages.length;
    sliderImg.src = allImages[index];
  }, 3000);
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

    // FETCH uniquement — pas de app.post ici
    try {
      await fetch("http://localhost:4242/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: nomCat })
      });
    } catch (err) {
      console.error("Erreur sauvegarde catégorie :", err);
    }

    // Ajouter au mapping local
    categoriesOrder.push(nomCat);
    categoriesMapping[nomCat] = nomCat;

    // Créer la nouvelle colonne
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
// Récupérer l'adresse saisie
const adresseValue = inputs[5].value;
newItem.adresse = adresseValue;

// Géocoder avec Nominatim (adresse → lat & lng)
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
      // Sauvegarder dans Neon via POST
      try {
        const res = await fetch("http://localhost:4242/gourmandises", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newItem)
        });
        const saved = await res.json();
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
// FETCH BACKEND
// -------------------------------
const fetchGourmandises = async () => {
  try {
    // Charger catégories custom depuis Neon
    const resCat = await fetch("http://localhost:4242/categories");
    const customCategories = await resCat.json();
    customCategories.forEach(cat => {
      if (!categoriesOrder.includes(cat.nom)) {
        categoriesOrder.push(cat.nom);
        categoriesMapping[cat.nom] = cat.nom;
      }
    });

    // Charger les pâtisseries
    const res = await fetch("http://localhost:4242/gourmandises");
    gourmandises = await res.json();

    displayColumns(gourmandises);
    appendAddCategoryBtn();
    startSlider();
    initMap();         // ← initialise la carte
    refreshMarkers();  // ← place les marqueurs existants

  } catch (err) {
    console.error(err);
    cardsContainer.innerHTML = "<p>Impossible de charger les gourmandises.</p>";
  }
};

fetchGourmandises();
