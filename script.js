let allEvents = [];
let filteredEvents = [];
// 【変更】複数の条件を記憶できるように、それぞれを []（配列）にしました
let currentFilters = {
  feature: ['すべて'],
  category: ['すべて'],
  date: ['すべて'],
  area: ['すべて'],
  age: ['すべて']
};

document.addEventListener('DOMContentLoaded', () => {
  loadCSVData();
  setupAreaAndAgeFilters();
  
  const finishedArea = document.getElementById('swipe-finished');
  if (finishedArea) {
    finishedArea.classList.add('hidden');
  }
  
  document.getElementById('enter-app-btn').addEventListener('click', () => {
    switchScreen('home-screen');
    document.getElementById('bottom-nav').style.display = 'flex';
  });

  setupGridMenu();
  setupFeedbackForm();
  
  document.getElementById('start-btn').addEventListener('click', () => {
    applyFilters();
    renderCards();
    switchScreen('swipe-screen');
  });

  document.getElementById('skip-btn').addEventListener('click', () => {
    const cards = document.querySelectorAll('.card');
    if (cards.length > 0) {
      const topCard = cards[cards.length - 1];
      removeTopCard(topCard, -1000);
    }
  });

  document.getElementById('like-btn').addEventListener('click', () => {
    const cards = document.querySelectorAll('.card');
    if (cards.length > 0) {
      const topCard = cards[cards.length - 1];
      const eventId = topCard.getAttribute('data-id');
      if (eventId) {
        saveToFavorites(eventId);
      }
      showLikeStamp();
      removeTopCard(topCard, 1000); 
    }
  });

  document.getElementById('restart-btn').addEventListener('click', () => {
    switchScreen('filter-screen');
  });

  const backBtn = document.getElementById('back-to-list-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      switchScreen('favorite-screen');
    });
  }

  document.querySelectorAll('.reset-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      resetAllFilters();
    });
  });
});

function loadCSVData() {
  Papa.parse('events.csv', {
    download: true,
    header: true,
    complete: function(results) {
      allEvents = results.data.filter(event => event.id);
      generateDateFilterButtons();
      generateFeatureFilterButtons();
    }
  });
}

function generateFeatureFilterButtons() {
  const container = document.getElementById('filter-feature');
  if (!container) return;

  const features = [...new Set(allEvents.map(e => e.feature).filter(f => f && f.trim() !== ''))];
  container.innerHTML = `<button class="filter-btn feature-btn active" data-val="すべて">すべて</button>`;

  features.forEach(feature => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn feature-btn';
    btn.setAttribute('data-val', feature);
    btn.textContent = feature;
    container.appendChild(btn);
  });

  setupFeatureFilterButtons();
}

function generateDateFilterButtons() {
  const container = document.getElementById('filter-date');
  if (!container) return;

  const months = [...new Set(allEvents.map(e => e.event_start_month).filter(m => m && m.toString().trim() !== ''))];
  months.sort((a, b) => Number(a) - Number(b));

  container.innerHTML = `<button class="filter-btn active" data-val="すべて">すべて</button>`;

  months.forEach(month => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.setAttribute('data-val', month);
    btn.textContent = `${month}月`;
    container.appendChild(btn);
  });

  setupDateFilterButtons();
}

// 【新規追加】ボタンの複数選択（ON/OFF）を賢くコントロールする共通の仕組み
function handleFilterToggle(e, group) {
  const clickedValue = e.target.getAttribute('data-val');
  const buttons = document.querySelectorAll(`#filter-${group} .filter-btn`);
  const allBtn = Array.from(buttons).find(b => b.getAttribute('data-val') === 'すべて');

  if (clickedValue === 'すべて') {
    // 「すべて」が押されたら、他の選択を全部消して「すべて」だけにする
    currentFilters[group] = ['すべて'];
    buttons.forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
  } else {
    // 個別のボタンが押された場合
    if (e.target.classList.contains('active')) {
      // 既にONなら、OFFにする（選択解除）
      e.target.classList.remove('active');
      currentFilters[group] = currentFilters[group].filter(val => val !== clickedValue);
      
      // もし何も選択されていない状態になったら、自動的に「すべて」をONにする
      if (currentFilters[group].length === 0) {
        currentFilters[group] = ['すべて'];
        if (allBtn) allBtn.classList.add('active');
      }
    } else {
      // OFFなら、ONにする（選択追加）
      e.target.classList.add('active');
      
      // 「すべて」の選択を外す
      currentFilters[group] = currentFilters[group].filter(val => val !== 'すべて');
      currentFilters[group].push(clickedValue);
      if (allBtn) allBtn.classList.remove('active');
    }
  }
}

// 各種ボタンに新しい複数選択機能を設定する
function setupFeatureFilterButtons() {
  const buttons = document.querySelectorAll('#filter-feature .filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => handleFilterToggle(e, 'feature'));
  });
}

function setupDateFilterButtons() {
  const buttons = document.querySelectorAll('#filter-date .filter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', (e) => handleFilterToggle(e, 'date'));
  });
}

function setupAreaAndAgeFilters() {
  const groups = ['area', 'age'];
  groups.forEach(group => {
    const buttons = document.querySelectorAll(`#filter-${group} .filter-btn`);
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => handleFilterToggle(e, group));
    });
  });
}

// 【変更】複数の条件の「どれか一つにでも当てはまればOK」というルールに変更
function applyFilters() {
  filteredEvents = allEvents.filter(event => {
    // 配列の中に「すべて」が含まれているか、またはイベントの項目が配列の中に含まれていればOK
    const matchFeature = currentFilters.feature.includes('すべて') || currentFilters.feature.includes(event.feature);
    const matchCategory = !currentFilters.category || currentFilters.category.includes('すべて') || currentFilters.category.includes(event.category);
    const matchDate = currentFilters.date.includes('すべて') || currentFilters.date.includes(String(event.event_start_month));
    const matchArea = currentFilters.area.includes('すべて') || currentFilters.area.includes(event.area);
    const matchAge = currentFilters.age.includes('すべて') || currentFilters.age.includes(event.age);
    
    // 全てのカテゴリーで条件をクリアしたカードだけを残す
    return matchFeature && matchCategory && matchDate && matchArea && matchAge;
  });
}

function resetAllFilters() {
  currentFilters = {
    feature: ['すべて'],
    category: ['すべて'],
    date: ['すべて'],
    area: ['すべて'],
    age: ['すべて']
  };
  document.querySelectorAll('.filter-btn').forEach(btn => {
    if (btn.getAttribute('data-val') === 'すべて') {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
  });
  
  const targetScreen = document.getElementById(screenId);
  if(targetScreen) {
      targetScreen.classList.add('active');
  }

  document.querySelectorAll('.nav-item').forEach(nav => {
    if (nav.getAttribute('data-screen') === screenId) {
      nav.classList.add('active');
    } else {
      nav.classList.remove('active');
    }
  });

  if (screenId === 'swipe-screen') {
    updateSwipeScreenDisplay();
  }

  if (screenId === 'favorite-screen') {
    renderFavorites();
  }
}

function updateSwipeScreenDisplay() {
  const cards = document.querySelectorAll('.card');
  const finishedArea = document.getElementById('swipe-finished');
  const actionControls = document.getElementById('action-controls');
  const swipeHint = document.getElementById('swipe-hint');
  
  if (cards.length > 0) {
    if(finishedArea) finishedArea.classList.add('hidden');
    if(actionControls) actionControls.classList.remove('hidden');
    if(swipeHint) swipeHint.classList.remove('hidden');
  } else {
    if(finishedArea) finishedArea.classList.remove('hidden');
    if(actionControls) actionControls.classList.add('hidden');
    if(swipeHint) swipeHint.classList.add('hidden');
  }
}

function formatDateText(startM, startD, endM, endD) {
  if (!startM || !startD) return "";
  let text = `${startM}月${startD}日`;
  if (endM && endD) {
    text += ` 〜 ${endM}月${endD}日`;
  }
  return text;
}

function renderCards() {
  const container = document.getElementById('card-container');
  const existingCards = container.querySelectorAll('.card');
  existingCards.forEach(card => card.remove());

  const finishedArea = document.getElementById('swipe-finished');
  const actionControls = document.getElementById('action-controls');
  const swipeHint = document.getElementById('swipe-hint');

  if (filteredEvents.length === 0) {
    const noEventMsg = document.createElement('p');
    noEventMsg.className = 'card'; 
    noEventMsg.style = "text-align:center; margin-top:50px; font-weight:bold; position:relative; z-index:10; background:transparent; box-shadow:none;";
    noEventMsg.innerHTML = '条件にあうイベントが<br>見つからなかったよ><';
    container.appendChild(noEventMsg);

    if(finishedArea) finishedArea.classList.add('hidden');
    if(actionControls) actionControls.classList.add('hidden');
    if(swipeHint) swipeHint.classList.add('hidden');
    return;
  }

  [...filteredEvents].reverse().forEach((event) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.setAttribute('data-id', event.id);
    
    const eventDateText = formatDateText(event.event_start_month, event.event_start_day, event.event_end_month, event.event_end_day);
    const appDateText = formatDateText(event.app_start_month, event.app_start_day, event.app_end_month, event.app_end_day);
    
    let imageHtml = "";
    if (event.image && event.image.trim() !== "") {
      imageHtml = `<img src="${event.image}" alt="${event.name}">`;
    }

    let appHtml = "";
    if (appDateText !== "") {
      appHtml = `<p class="app-badge">⚠️ 申込: ${appDateText}</p>`;
    }

    let organizerHtml = "";
    if (event.organizer && event.organizer.trim() !== "") {
      organizerHtml = `<p>🏢 主催: ${event.organizer}</p>`;
    }

    let feeHtml = "";
    if (event.fee && event.fee.trim() !== "") {
      feeHtml = `<p>💰 料金: ${event.fee}</p>`;
    }

    let categoryHtml = "";
    if (event.category && event.category.trim() !== "") {
      categoryHtml = `<p>🏷️ カテゴリー: ${event.category}</p>`;
    }
    
    card.innerHTML = `
      <div class="card-stamp stamp-like">LIKE ❤️</div>
      <div class="card-stamp stamp-skip">SKIP 👋</div>
      ${imageHtml}
      <div class="card-info">
        <h3>${event.name}</h3>
        <p>🕒 ${eventDateText}</p>
        <p>📍 ${event.area}</p>
        <p>🧒 ${event.age}</p>
        ${categoryHtml}
        ${feeHtml}
        ${organizerHtml}
        ${appHtml}
        <a href="${event.url}" target="_blank" rel="noopener noreferrer" class="detail-btn">詳しくはこちら 🔗</a>
      </div>
    `;
    
    container.appendChild(card);
  });

  updateSwipeScreenDisplay();
  initSwipeOnTopCard();
}

function initSwipeOnTopCard() {
  const cards = document.querySelectorAll('.card');
  if (cards.length === 0) return;

  const topCard = cards[cards.length - 1];
  const hammer = new Hammer(topCard);
  const stampLike = topCard.querySelector('.stamp-like');
  const stampSkip = topCard.querySelector('.stamp-skip');

  hammer.on('pan', (e) => {
    const x = e.deltaX;
    const y = e.deltaY;
    const rotate = x * 0.05;
    topCard.style.transform = `translate(${x}px, ${y}px) rotate(${rotate}deg)`;

    const opacity = Math.min(Math.abs(x) / 100, 1);
    if (x > 0) {
      if (stampLike) stampLike.style.opacity = opacity;
      if (stampSkip) stampSkip.style.opacity = 0;
    } else {
      if (stampSkip) stampSkip.style.opacity = opacity;
      if (stampLike) stampLike.style.opacity = 0;
    }
  });

  hammer.on('panend', (e) => {
    const threshold = 90;
    if (stampLike) stampLike.style.opacity = 0;
    if (stampSkip) stampSkip.style.opacity = 0;

    if (e.deltaX > threshold) {
      saveToFavorites(topCard.getAttribute('data-id'));
      showLikeStamp();
      removeTopCard(topCard, 1000); 
    } else if (e.deltaX < -threshold) {
      removeTopCard(topCard, -1000);
    } else {
      topCard.style.transform = 'translate(0px, 0px) rotate(0deg)';
    }
  });
}

function showLikeStamp() {
  const stamp = document.getElementById('like-stamp');
  if(stamp) {
    stamp.classList.add('show');
    setTimeout(() => { stamp.classList.remove('show'); }, 800);
  }
}

function removeTopCard(card, directionX) {
  card.style.transition = 'transform 0.4s ease-out';
  card.style.transform = `translate(${directionX}px, 0px) rotate(${directionX * 0.05}deg)`;
  
  setTimeout(() => {
    card.remove();
    updateSwipeScreenDisplay();
    
    const remainingCards = document.querySelectorAll('.card');
    if (remainingCards.length > 0) {
      initSwipeOnTopCard();
    }
  }, 400);
}

function saveToFavorites(id) {
  if(!id) return;
  let favorites = JSON.parse(localStorage.getItem('kidsNaviFavorites')) || [];
  if (!favorites.includes(id)) {
    favorites.push(id);
    localStorage.setItem('kidsNaviFavorites', JSON.stringify(favorites));
  }
}

function renderFavorites() {
  const listContainer = document.getElementById('favorite-list');
  listContainer.innerHTML = '';
  const favorites = JSON.parse(localStorage.getItem('kidsNaviFavorites')) || [];
  
  if (favorites.length === 0) {
    listContainer.innerHTML = '<p style="text-align:center; padding:30px; font-weight:bold; color:#777;">まだ「いきたい」に追加したイベントはないよ。</p>';
    return;
  }

  favorites.forEach(id => {
    const event = allEvents.find(e => e.id == id);
    if (event) {
      const item = document.createElement('div');
      item.className = 'favorite-item';
      item.innerHTML = `
        <img src="${event.image}" alt="${event.name}" onclick="showEventDetail('${event.id}')">
        <div class="favorite-details" onclick="showEventDetail('${event.id}')">
          <h3>${event.name}</h3>
          <p>${formatDateText(event.event_start_month, event.event_start_day, event.event_end_month, event.event_end_day)} / ${event.area}</p>
        </div>
        <button class="delete-btn" onclick="removeFavorite('${event.id}')">削除</button>
      `;
      listContainer.appendChild(item);
    }
  });
}

function removeFavorite(id) {
  let favorites = JSON.parse(localStorage.getItem('kidsNaviFavorites')) || [];
  favorites = favorites.filter(favId => favId != id);
  localStorage.setItem('kidsNaviFavorites', JSON.stringify(favorites));
  renderFavorites();
}

function showEventDetail(id) {
  const event = allEvents.find(e => e.id == id);
  if (!event) return;
  
  const eventDateText = formatDateText(event.event_start_month, event.event_start_day, event.event_end_month, event.event_end_day);
  const appDateText = formatDateText(event.app_start_month, event.app_start_day, event.app_end_month, event.app_end_day);
  
  let imageHtml = "";
  if (event.image && event.image.trim() !== "") {
    imageHtml = `<img src="${event.image}" alt="${event.name}">`;
  }

  let appHtml = "";
  if (appDateText !== "") {
    appHtml = `<p class="app-badge-detail"><strong>⚠️ 申込期間：</strong> ${appDateText}</p>`;
  }

  let organizerHtml = "";
  if (event.organizer && event.organizer.trim() !== "") {
    organizerHtml = `<p><strong>🏢 主催：</strong> ${event.organizer}</p>`;
  }

  let feeHtml = "";
  if (event.fee && event.fee.trim() !== "") {
    feeHtml = `<p><strong>💰 料金：</strong> ${event.fee}</p>`;
  }

  const content = document.getElementById('detail-content');
  if(content) {
      content.innerHTML = `
        ${imageHtml}
        <h2>${event.name}</h2>
        <p><strong>🕒 いつ：</strong> ${eventDateText}</p>
        ${appHtml}
        <p><strong>📍 どこで：</strong> ${event.area}</p>
        <p><strong>🧒 だれが対象：</strong> ${event.age}</p>
        ${feeHtml}
        ${organizerHtml}
        <a href="${event.url}" target="_blank" rel="noopener noreferrer" class="detail-url-btn">公式サイトをみる 🔗</a>
      `;
      switchScreen('detail-screen');
  }
}

function setupGridMenu() {
  const featureBtn = document.getElementById('menu-feature-btn');
  if (featureBtn) {
    featureBtn.addEventListener('click', () => {
      renderFeatureCards();
      switchScreen('feature-list-screen');
    });
  }

  const searchBtn = document.getElementById('menu-search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      switchScreen('filter-screen');
    });
  }

  const feedbackBtn = document.getElementById('menu-feedback-btn');
  if (feedbackBtn) {
    feedbackBtn.addEventListener('click', () => {
      switchScreen('feedback-screen');
    });
  }

  const permanentBtn = document.getElementById('menu-permanent-btn');
  if (permanentBtn) {
    permanentBtn.addEventListener('click', () => {
      renderCategoryCards();
      switchScreen('category-list-screen');
    });
  }
}

function renderFeatureCards() {
  const featContainer = document.getElementById('feature-cards-container');
  if (!featContainer) return;

  featContainer.innerHTML = '';
  const features = [...new Set(allEvents.map(e => e.feature).filter(f => f && f.trim() !== ''))];

  if (features.length === 0) {
    featContainer.innerHTML = '<p style="text-align:center; color:#888;">登録されている特集はまだないよ。</p>';
    return;
  }

  features.forEach(feature => {
    const count = allEvents.filter(e => e.feature === feature).length;
    const card = document.createElement('div');
    card.className = 'feature-card-item';
    card.innerHTML = `
      <div class="feature-card-title">
        <span>🌟</span>
        <span>${feature}</span>
      </div>
      <span class="feature-card-badge">${count}件</span>
    `;

    card.addEventListener('click', () => {
      currentFilters = {
        feature: [feature],
        category: ['すべて'],
        date: ['すべて'],
        area: ['すべて'],
        age: ['すべて']
      };
      updateFilterButtonStates();
      applyFilters();
      renderCards();
      switchScreen('swipe-screen');
    });

    featContainer.appendChild(card);
  });
}

function renderCategoryCards() {
  const catContainer = document.getElementById('permanent-category-cards-container');
  if (!catContainer) return;

  catContainer.innerHTML = '';
  const categories = [...new Set(allEvents.map(e => e.category).filter(c => c && c.trim() !== ''))];

  if (categories.length === 0) {
    catContainer.innerHTML = '<p style="text-align:center; color:#888;">登録されているカテゴリーはありません。</p>';
    return;
  }

  categories.forEach(cat => {
    const count = allEvents.filter(e => e.category === cat).length;
    const card = document.createElement('div');
    card.className = 'feature-card-item';
    card.innerHTML = `
      <div class="feature-card-title">
        <span>🏢</span>
        <span>${cat}</span>
      </div>
      <span class="feature-card-badge">${count}件</span>
    `;

    card.addEventListener('click', () => {
      currentFilters = {
        feature: ['すべて'],
        category: [cat],
        date: ['すべて'],
        area: ['すべて'],
        age: ['すべて']
      };
      updateFilterButtonStates();
      applyFilters();
      renderCards();
      switchScreen('swipe-screen');
    });

    catContainer.appendChild(card);
  });
}

function updateFilterButtonStates() {
  ['feature', 'date', 'area', 'age'].forEach(group => {
    const buttons = document.querySelectorAll(`#filter-${group} .filter-btn`);
    buttons.forEach(btn => {
      const val = btn.getAttribute('data-val');
      if (currentFilters[group] && currentFilters[group].includes(val)) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  });
}

function setupFeedbackForm() {
  const form = document.getElementById('feedback-form');
  const thankyou = document.getElementById('feedback-thankyou');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = document.getElementById('feedback-text').value;
      if (text.trim() !== '') {
        let feedbacks = JSON.parse(localStorage.getItem('kidsNaviFeedbacks')) || [];
        feedbacks.push({ date: new Date().toISOString(), text: text });
        localStorage.setItem('kidsNaviFeedbacks', JSON.stringify(feedbacks));

        if (thankyou) thankyou.classList.remove('hidden');
        form.reset();
        setTimeout(() => {
          if (thankyou) thankyou.classList.add('hidden');
          switchScreen('home-screen');
        }, 1800);
      }
    });
  }
}