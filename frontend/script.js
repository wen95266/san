document.addEventListener('DOMContentLoaded', () => {
    console.log("十三水游戏脚本初始化...");

    // DOM Elements
    const dealBtn = document.getElementById('deal-btn');
    const sortBtn = document.getElementById('sort-btn');
    const resetBtn = document.getElementById('reset-btn');
    const aiSuggestBtn = document.getElementById('ai-suggest-btn');
    const ai托管Btn = document.getElementById('ai-托管-btn');
    const submitBtn = document.getElementById('submit-btn');

    const playerHandArea = document.getElementById('player-hand-cards-area');
    const pileDropzones = {
        front: document.getElementById('front-hand-pile'),
        middle: document.getElementById('middle-hand-pile'),
        back: document.getElementById('back-hand-pile')
    };
    const pileWrappers = {
        front: pileDropzones.front?.querySelector('.cards-wrapper'),
        middle: pileDropzones.middle?.querySelector('.cards-wrapper'),
        back: pileDropzones.back?.querySelector('.cards-wrapper')
    };
    const handAnalysisDisplay = document.getElementById('hand-analysis-display');

    const playerNameDisplay = document.getElementById('player-name-display');
    const playerScoreDisplay = document.getElementById('player-score-display');
    const ai托管Info = document.getElementById('ai-托管-info');

    const gameMessagePopup = document.getElementById('game-message-popup');
    const ai托管OptionsModal = document.getElementById('ai-托管-options-modal');

    // API URL
    const API_URL = 'https://9526.ip-ddns.com/thirteen_api/api.php';
    console.log("API URL:", API_URL);

    // Card Definitions
    const SUITS_DISPLAY = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
    const RANKS_DISPLAY = { 'A': 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K' };
    const RANK_VALUES_SORT = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14};

    // Game State
    let currentHandCards = []; // { value: "S A", element: DOMElement } in player's hand area
    let arrangedPilesData = { front: [], middle: [], back: [] }; // { value: "S A", element: DOMElement }
    let originalDealtHand = []; // Store initially dealt 13 cards (strings "S A")
    let draggedCardInfo = null; // { value, element, sourceArea: 'hand' | 'pile', sourcePileName: 'front'|'middle'|'back' }

    let isAi托管Active = false;
    let ai托管RoundsTotal = 0;
    let ai托管RoundsLeft = 0;
    const AI_OPERATION_DELAY = 1200; // ms for AI "thinking"
    const AI_NEXT_ROUND_DELAY = 2500; // ms between AI托管 rounds

    // --- Initialization ---
    function initGame() {
        setupEventListeners();
        resetGameUI();
        if(playerNameDisplay) playerNameDisplay.textContent = "玩家_" + Math.random().toString(36).substring(2, 6);
        showGameMessage("点击“新局”开始游戏");
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        dealBtn?.addEventListener('click', () => handleDealNewHand());
        sortBtn?.addEventListener('click', handleSortHand);
        resetBtn?.addEventListener('click', handleResetArrangement);
        aiSuggestBtn?.addEventListener('click', () => handleAiSuggest());
        ai托管Btn?.addEventListener('click', toggleAi托管Modal);
        submitBtn?.addEventListener('click', () => handleSubmitHand());

        Object.values(pileDropzones).forEach(zone => {
            if (!zone) return;
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragenter', handleDragEnter);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDropOnPile);
        });

        playerHandArea?.addEventListener('dragover', handleDragOver);
        playerHandArea?.addEventListener('drop', handleDropOnHandArea);

        ai托管OptionsModal?.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', (e) => {
                const rounds = parseInt(e.target.dataset.rounds);
                selectAi托管Rounds(rounds);
            });
        });
    }

    // --- UI Update Functions ---
    function showGameMessage(message, type = 'info', duration = 3000) {
        if (!gameMessagePopup || !gameMessagePopup.firstChild) return;
        const p = gameMessagePopup.firstChild;
        p.textContent = message;
        gameMessagePopup.className = ''; // Reset classes
        if (type === 'error') gameMessagePopup.classList.add('error');
        else if (type === 'success') gameMessagePopup.classList.add('success');
        
        gameMessagePopup.style.display = 'block';
        gameMessagePopup.classList.add('visible');
        setTimeout(() => {
            gameMessagePopup.classList.remove('visible');
            // Keep display:none after transition if you have CSS transition for opacity
            // setTimeout(() => { gameMessagePopup.style.display = 'none'; }, 300); // Match CSS transition
        }, duration);
    }

    function resetGameUI(isNewRound = true) {
        currentHandCards = [];
        arrangedPilesData = { front: [], middle: [], back: [] };
        if(isNewRound) originalDealtHand = [];

        playerHandArea.innerHTML = '';
        Object.values(pileWrappers).forEach(pw => { if(pw) pw.innerHTML = ''; });
        if(handAnalysisDisplay) handAnalysisDisplay.innerHTML = '';

        updatePileLabels();
        toggleActionButtons(false); // Hide all action buttons except 'New Game'
        if(dealBtn && !isAi托管Active) dealBtn.disabled = false;
        if(playerScoreDisplay && isNewRound) playerScoreDisplay.textContent = "本局得分: 0";
        if(ai托管Info) ai托管Info.style.display = 'none';
    }

    function updatePileLabels() {
        for (const pileName in pileDropzones) {
            const zone = pileDropzones[pileName];
            const label = zone?.querySelector('.pile-label');
            if (label) {
                const max = zone.dataset.maxCards;
                label.textContent = `${label.textContent.split(' ')[0]} (${arrangedPilesData[pileName].length}/${max})`;
            }
        }
    }

    function toggleActionButtons(showGameInProgressButtons) {
        if(sortBtn) sortBtn.style.display = showGameInProgressButtons ? 'inline-block' : 'none';
        if(resetBtn) resetBtn.style.display = showGameInProgressButtons ? 'inline-block' : 'none';
        if(aiSuggestBtn) aiSuggestBtn.style.display = showGameInProgressButtons ? 'inline-block' : 'none';
        if(ai托管Btn) ai托管Btn.style.display = showGameInProgressButtons ? 'inline-block' : 'none';
        if(submitBtn) submitBtn.style.display = 'none'; // Submit shown only when ready
    }
    
    function displayAnalysis(analysisData) {
        if(!handAnalysisDisplay) return;
        let html = '<h4>牌型分析:</h4>';
        for(const pile of ['front', 'middle', 'back']) {
            const pileName = pile === 'front' ? '头墩' : (pile === 'middle' ? '中墩' : '尾墩');
            html += `<p><strong>${pileName}:</strong> 
                     ${analysisData[pile]?.name || '-'} 
                     <em>(${analysisData[pile]?.cards?.join(' ') || ''})</em></p>`;
        }
        handAnalysisDisplay.innerHTML = html;
    }

    // --- Card Element Creation & Rendering ---
    function createCardDOMElement(cardValue) {
        const [suitChar, rankChar] = cardValue.split(' ');
        const el = document.createElement('div');
        el.className = 'card';
        el.classList.add(getSuitClass(suitChar));
        el.dataset.value = cardValue;
        el.draggable = true;
        el.innerHTML = `<span class="rank">${RANKS_DISPLAY[rankChar] || rankChar}</span>
                        <span class="suit">${SUITS_DISPLAY[suitChar] || suitChar}</span>`;
        el.addEventListener('dragstart', (e) => handleDragStart(e, el));
        el.addEventListener('dragend', handleDragEnd);
        return el;
    }

    function renderPlayerHand() {
        if(!playerHandArea) return;
        playerHandArea.innerHTML = '';
        currentHandCards.forEach(cardObj => playerHandArea.appendChild(cardObj.element));
    }

    function addCardToHandData(cardValue) {
        const element = createCardDOMElement(cardValue);
        currentHandCards.push({ value: cardValue, element });
    }
    
    function removeCardFromHandData(cardValue) {
        currentHandCards = currentHandCards.filter(c => c.value !== cardValue);
    }

    function addCardToPileData(cardValue, pileName, cardElement) {
        arrangedPilesData[pileName].push({ value: cardValue, element: cardElement });
    }

    function removeCardFromPileData(cardValue, pileName) {
        arrangedPilesData[pileName] = arrangedPilesData[pileName].filter(c => c.value !== cardValue);
    }


    // --- Game Logic Handlers ---
    async function handleDealNewHand(isAiCall = false) {
        console.log("Attempting to deal new hand. AI Call:", isAiCall);
        if (!isAiCall) stopAi托管(); // User action cancels AI托管
        resetGameUI(true); // Full reset for new round
        if(dealBtn) dealBtn.disabled = true;
        showGameMessage("正在发牌...", "info", 1500);

        try {
            const response = await fetch(`${API_URL}?action=deal`);
            if (!response.ok) throw new Error(`API发牌失败: ${response.status}`);
            const data = await response.json();
            if (!data.success || !data.hand) throw new Error(data.message || "后端发牌数据错误");

            originalDealtHand = [...data.hand];
            originalDealtHand.forEach(cv => addCardToHandData(cv));
            renderPlayerHand();
            toggleActionButtons(true);
            if(dealBtn && !isAiCall) dealBtn.disabled = false; // Re-enable if user dealt

            if (isAi托管Active && ai托管RoundsLeft > 0) {
                showGameMessage(`AI托管: 第 ${ai托管RoundsTotal - ai托管RoundsLeft + 1} 局理牌中...`, "info");
                setTimeout(ai托管ProcessRound, AI_OPERATION_DELAY);
            }

        } catch (err) {
            console.error("发牌错误:", err);
            showGameMessage(err.message, "error");
            if(dealBtn) dealBtn.disabled = false;
        }
    }

    function handleSortHand() {
        currentHandCards.sort((a, b) => {
            const valA = RANK_VALUES_SORT[a.value.split(' ')[1]];
            const valB = RANK_VALUES_SORT[b.value.split(' ')[1]];
            if (valA !== valB) return valB - valA; // Rank descending
            return a.value.split(' ')[0].localeCompare(b.value.split(' ')[0]); // Suit ascending
        });
        renderPlayerHand();
        showGameMessage("手牌已整理", "info", 1500);
    }

    function handleResetArrangement() {
        if(handAnalysisDisplay) handAnalysisDisplay.innerHTML = '';
        // Move all cards from piles back to hand
        for (const pileName in arrangedPilesData) {
            arrangedPilesData[pileName].forEach(cardObj => addCardToHandData(cardObj.value));
            arrangedPilesData[pileName] = []; // Clear pile data
            if(pileWrappers[pileName]) pileWrappers[pileName].innerHTML = ''; // Clear pile DOM
        }
        renderPlayerHand();
        updatePileLabels();
        if(submitBtn) submitBtn.style.display = 'none';
        showGameMessage("牌墩已清空，请重新理牌", "info");
    }

    async function handleAiSuggest(isAi托管Call = false) {
        let current13Cards = originalDealtHand; // Default to original if no cards on board
        if (currentHandCards.length + arrangedPilesData.front.length + arrangedPilesData.middle.length + arrangedPilesData.back.length === 13){
            current13Cards = currentHandCards.map(c=>c.value)
                .concat(arrangedPilesData.front.map(c=>c.value))
                .concat(arrangedPilesData.middle.map(c=>c.value))
                .concat(arrangedPilesData.back.map(c=>c.value));
        } else if (originalDealtHand.length !== 13) {
             showGameMessage("请先发牌后再使用AI建议", "error"); return Promise.reject("No cards");
        }

        if(!isAi托管Call) showGameMessage("AI建议生成中...", "info", 2000);
        if(aiSuggestBtn && !isAi托管Call) aiSuggestBtn.disabled = true;

        try {
            const response = await fetch(`${API_URL}?action=aiSuggest`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ hand: current13Cards })
            });
            if (!response.ok
