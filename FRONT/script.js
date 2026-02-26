// -------------------------------
// SÉLECTION DES ÉLÉMENTS HTML
// -------------------------------
const cardsContainer = document.getElementById("cards-container");
const searchResults = document.getElementById("search-results");
const searchInput = document.getElementById("search");

// Liste des gourmandises récupérées du backend
let gourmandises = [];

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

  return card;
};

// -------------------------------
// AFFICHAGE DES COLONNES
// -------------------------------
const displayColumns = (list) => {
  cardsContainer.innerHTML = "";

  categoriesOrder.forEach(categorie => {
    const items = list.filter(g => categoriesMapping[g.categorie] === categorie);
    const column = document.createElement("div");
    column.className = "category-column";

    // Titre cliquable
    const titre = document.createElement("h2");
    titre.textContent = categorie;
    column.appendChild(titre);

    // Wrapper cartes + formulaire caché
    const toggleWrapper = document.createElement("div");
    toggleWrapper.style.display = "none";
    column.appendChild(toggleWrapper);

    // Bouton + Ajouter pâtisserie
    const addBtn = document.createElement("button");
    addBtn.textContent = "+ Ajouter";
    addBtn.className = "add-btn";
    toggleWrapper.appendChild(addBtn);

    // Formulaire caché
    const formAdd = document.createElement("form");
    formAdd.className = "form-ajout";
    formAdd.style.display = "none";
    formAdd.innerHTML = `
      <input placeholder="Nom" required />
      <input placeholder="Origine" />
      <input placeholder="URL Image" />
      <input placeholder="Historique / Anecdote" />
      <input placeholder="Lien recette" />
      <button type="submit">Ajouter</button>
    `;
    toggleWrapper.appendChild(formAdd);

    // Ajouter les cartes
    items.forEach(g => {
      const card = createCard(g);
      toggleWrapper.appendChild(card);

      card.addEventListener("click", () => {
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
      });
    });

    // Événements toggle formulaire et colonne
    addBtn.addEventListener("click", () => {
      formAdd.style.display = "block";
      addBtn.style.display = "none";
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

// Slider s'arrête si l'utilisateur interagit
searchInput.addEventListener("focus", stopSlider);
cardsContainer.addEventListener("click", (e) => {
  if (e.target.closest(".card")) stopSlider();
});
searchInput.addEventListener("blur", () => {
  if (!searchInput.value) startSlider();
});

// -------------------------------
// FETCH BACKEND
// -------------------------------
const fetchGourmandises = async () => {
  try {
    const res = await fetch("http://localhost:4242/gourmandises");
    gourmandises = await res.json();
    displayColumns(gourmandises);
    startSlider();
  } catch (err) {
    console.error(err);
    cardsContainer.innerHTML = "<p>Impossible de charger les gourmandises.</p>";
  }
};

fetchGourmandises();