document.addEventListener('DOMContentLoaded', () => {
    console.log("十三水游戏脚本初始化 - 动态尾墩V3");

    // DOM Elements
    const dealBtn = document.getElementById('deal-btn');
    const sortBtn = document.getElementById('sort-btn');
    const resetBtn = document.getElementById('reset-btn');
    const aiSuggestBtn = document.getElementById('ai-suggest-btn');
    const ai托管Btn = document.getElementById('ai-托管-btn');
    const submitBtn = document.getElementById('submit-btn');

    // *** 主要修改这里的DOM引用 ***
    const playerHandAndBackPileZone = document.getElementById('player-hand-and-back-pile-zone');
    const frontPileZone = document.getElementById('player-front-pile-zone');
    const middlePileZone = document.getElementById('player-middle-pile-zone');

    // Wrappers for cards within dropzones
    const frontPileWrapper = frontPileZone?.querySelector('.cards-wrapper');
    const middlePileWrapper = middlePileZone?.querySelector('.cards-wrapper');
    // playerHandAndBackPileZone IS the wrapper for hand/back cards directly

    // const handAnalysisDisplay = document.getElementById('hand-analysis-display'); // 暂时不用

    const playerNameDisplay = document.getElementById('player-name-display');
    const playerScoreDisplay = document.getElementById('player-score-display');
    const ai托管Info = document.getElementById('ai-托管-info');

    const gameMessagePopup = document.getElementById('game-message-popup');
    const ai托管OptionsModal = document.getElementById('ai-托管-options-modal');

    const API_URL = 'https://9526.ip-ddns.com/thirteen_api/api.php';
    console.log("API URL:", API_URL);

    const SUITS_DISPLAY = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
    const RANKS_DISPLAY = { /* ... */ }; // 保持不变
    const RANK_VALUES_SORT = { /* ... */ }; // 保持不变

    // Game State
    let all13CardsData = []; // 存储13张牌的对象 { value: "S A", element: DOM, currentZone: 'hand'|'front'|'middle'}
    let originalDealtHandStrings = []; // ["S A", "H K", ...]

    let draggedCardInfo = null; // { value, element, originalZone: 'hand'|'front'|'middle' }

    let isAi托管Active = false; /* ... AI托管变量不变 ... */

    // --- Initialization ---
    function initGame() {
        console.log("SCRIPT: Initializing game...");
        setupEventListeners();
        resetGameUI();
        // ... (playerNameDisplay, showGameMessage)
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        console.log("SCRIPT: Setting up event listeners...");
        dealBtn?.addEventListener('click', () => handleDealNewHand());
        // ... (其他按钮监听器)

        // Drop targets: frontPileZone, middlePileZone, playerHandAndBackPileZone
        [frontPileZone, middlePileZone, playerHandAndBackPileZone].forEach(zone => {
            if (!zone) { console.warn("A primary dropzone is null."); return; }
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragenter', handleDragEnterGeneric); // Generic enter/leave for all
            zone.addEventListener('dragleave', handleDragLeaveGeneric);
            zone.addEventListener('drop', handleDrop); // Universal drop handler
        });
        // ... (AI托管模态框监听器)
        console.log("SCRIPT: Event listeners setup complete.");
    }

    // --- UI Update & Rendering ---
    function showGameMessage(message, type = 'info', duration = 3000) { /* ... (不变) ... */ }

    function resetGameUI(isNewRound = true) {
        console.log("SCRIPT: Resetting game UI...");
        all13CardsData = [];
        if(isNewRound) originalDealtHandStrings = [];

        playerHandAndBackPileZone.innerHTML = `<div class="zone-label hand-zone-label">手牌 (0张)</div>`; // Reset label
        frontPileWrapper.innerHTML = '';
        middlePileWrapper.innerHTML = '';
        // if(handAnalysisDisplay) handAnalysisDisplay.innerHTML = '';

        updateAllZoneLabels();
        toggleActionButtons(false);
        // ... (dealBtn, playerScoreDisplay, ai托管Info)
    }

    function updateAllZoneLabels() {
        const frontCards = all13CardsData.filter(c => c.currentZone === 'front');
        const middleCards = all13CardsData.filter(c => c.currentZone === 'middle');
        const handBackCards = all13CardsData.filter(c => c.currentZone === 'hand');

        frontPileZone.querySelector('.zone-label').textContent = `头墩 (${frontCards.length}/3)`;
        middlePileZone.querySelector('.zone-label').textContent = `中墩 (${middleCards.length}/5)`;

        let handBackLabel = `手牌 (${handBackCards.length}张)`;
        if (frontCards.length === 3 && middleCards.length === 5) {
            handBackLabel = `尾墩 (${handBackCards.length}/5)`;
        }
        playerHandAndBackPileZone.querySelector('.zone-label').textContent = handBackLabel;
    }

    function toggleActionButtons(showGameInProgressButtons) { /* ... (不变) ... */ }
    // function displayAnalysis(analysisData) { /* ... (不变, 如果需要的话) ... */ }

    function createCardDOMElement(cardValue) { /* ... (不变, 但确保dragstart会正确设置draggedCardInfo) ... */
        const el = createBasicCardElement(cardValue); // Assuming createBasicCardElement is your previous card creator
        el.addEventListener('dragstart', (e) => {
            // Determine source when drag starts
            let sourceZone = 'hand'; // Default
            if (frontPileWrapper.contains(el)) sourceZone = 'front';
            else if (middlePileWrapper.contains(el)) sourceZone = 'middle';
            handleDragStart(e, el, sourceZone);
        });
        el.addEventListener('dragend', handleDragEnd);
        return el;
    }
    
    function createBasicCardElement(cardValue){ // Renamed from previous for clarity
        const [suitCharServer, rankChar] = cardValue.split(' ');
        const suitChar = suitCharServer.charAt(0).toUpperCase();
        const el = document.createElement('div');
        el.className = 'card';
        el.classList.add(getSuitClass(suitChar));
        el.dataset.value = `${suitChar} ${rankChar}`;
        el.draggable = true;
        el.innerHTML = `<span class="rank">${RANKS_DISPLAY[rankChar] || rankChar}</span>
                        <span class="suit">${SUITS_DISPLAY[suitChar] || suitChar}</span>`;
        return el;
    }


    function rerenderAllZones() { // Single function to update all card displays
        playerHandAndBackPileZone.querySelectorAll('.card').forEach(c => c.remove()); // Clear existing cards, keep label
        frontPileWrapper.innerHTML = '';
        middlePileWrapper.innerHTML = '';

        all13CardsData.forEach(cardObj => {
            if (cardObj.currentZone === 'front' && frontPileWrapper) {
                frontPileWrapper.appendChild(cardObj.element);
            } else if (cardObj.currentZone === 'middle' && middlePileWrapper) {
                middlePileWrapper.appendChild(cardObj.element);
            } else if (cardObj.currentZone === 'hand' && playerHandAndBackPileZone) { // 'hand' is the red zone
                playerHandAndBackPileZone.appendChild(cardObj.element);
            }
        });
        updateAllZoneLabels();
        checkIfReadyToSubmit();
    }


    // --- Game Logic Handlers ---
    async function handleDealNewHand(isAiCall = false) {
        console.log("SCRIPT: handleDealNewHand called. AI Call:", isAiCall);
        // ... (stopAi托管 if !isAiCall) ...
        resetGameUI(true);
        // ... (dealBtn.disabled, showGameMessage) ...
        try {
            // ... (fetch API) ...
            if (data.success && data.hand && Array.isArray(data.hand)) {
                originalDealtHandStrings = [...data.hand];
                all13CardsData = originalDealtHandStrings.map(val => ({
                    value: val,
                    element: createCardDOMElement(val), // createCardDOMElement now adds drag listeners
                    currentZone: 'hand' // Initially all in hand/back zone
                }));
                rerenderAllZones();
                toggleActionButtons(true);
                // ... (dealBtn re-enable, AI托管 logic) ...
            } // ...
        } // ...
    }

    function handleSortHand() { // Sorts cards currently in the 'hand' zone
        const handCardsToSort = all13CardsData.filter(c => c.currentZone === 'hand');
        handCardsToSort.sort((a, b) => { /* ... (排序逻辑不变, 作用于 a.value 和 b.value) ... */ });
        
        // Rebuild all13CardsData to maintain overall card list but with sorted hand cards
        const pileCards = all13CardsData.filter(c => c.currentZone !== 'hand');
        all13CardsData = [...pileCards, ...handCardsToSort]; // This might change order if not careful, better to sort in place for 'hand' only
        
        // Simpler: just re-render, the visual order in hand zone will reflect sort
        rerenderAllZones();
        showGameMessage("手牌已整理", "info", 1500);
    }


    function handleResetArrangement() {
        // ... (clear analysis display) ...
        all13CardsData.forEach(cardObj => cardObj.currentZone = 'hand'); // Move all to hand
        rerenderAllZones();
        // ... (submitBtn hide, showGameMessage) ...
    }

    async function handleAiSuggest(isAi托管Call = false) {
        // ... (get current13Cards (all originalDealtHandStrings)) ...
        try {
            // ... (fetch AI Suggest) ...
            if (result.success && result.suggestion) {
                // ... (show message) ...
                // Apply suggestion: update currentZone for each card
                const { front, middle, back } = result.suggestion;
                const suggestedArrangement = { front, middle, back };
                
                all13CardsData.forEach(cardObj => cardObj.currentZone = 'hand'); // Reset all to hand first

                for (const pileName in suggestedArrangement) {
                    suggestedArrangement[pileName].forEach(cardValueToPlace => {
                        const cardToMove = all13CardsData.find(c => c.value === cardValueToPlace && c.currentZone === 'hand');
                        if (cardToMove) {
                            cardToMove.currentZone = pileName;
                        } else {
                            // Fallback: if card already "moved" by a previous pile in suggestion, try to find it anywhere
                            const alreadyMovedCard = all13CardsData.find(c => c.value === cardValueToPlace);
                            if(alreadyMovedCard && (pileName === 'front' || pileName === 'middle' || pileName === 'back')) { // 'back' is 'hand' zone
                                alreadyMovedCard.currentZone = (pileName === 'back') ? 'hand' : pileName;
                            } else {
                                console.warn(`AI Suggest: Card ${cardValueToPlace} for ${pileName} not found or double-assigned.`);
                            }
                        }
                    });
                }
                rerenderAllZones();
                // ... (checkIfReadyToSubmit) ...
                return Promise.resolve(result.suggestion);
            } // ...
        } // ...
    }
    // placeCardsFromSuggestion is now integrated into handleAiSuggest's logic

    async function handleSubmitHand(isAiCall = false) {
        const payload = {
            front: all13CardsData.filter(c => c.currentZone === 'front').map(c => c.value),
            middle: all13CardsData.filter(c => c.currentZone === 'middle').map(c => c.value),
            //尾墩是所有currentZone === 'hand'的牌
            back: all13CardsData.filter(c => c.currentZone === 'hand').map(c => c.value)
        };
        // ... (validate payload counts) ...
        // ... (rest of submit logic, showGameMessage, fetch, handle result, AI托管 next round) ...
    }

    function checkIfReadyToSubmit() {
        const frontCount = all13CardsData.filter(c => c.currentZone === 'front').length;
        const middleCount = all13CardsData.filter(c => c.currentZone === 'middle').length;
        //尾墩是自动形成的，所以不需要检查其数量是否明确为5，而是检查头中墩是否满了
        if (frontCount === 3 && middleCount === 5) {
            // 手牌区此时就是尾墩，其数量应该是 13 - 3 - 5 = 5
            if(submitBtn && !isAi托管Active) {
                submitBtn.style.display = 'inline-block';
                submitBtn.disabled = false;
            }
        } else {
            if(submitBtn) submitBtn.style.display = 'none';
        }
    }

    // --- Drag and Drop Handlers ---
    function handleDragStart(e, cardElement, sourceZoneName) { // sourceZoneName: 'hand', 'front', 'middle'
        draggedCardInfo = {
            value: cardElement.dataset.value,
            element: cardElement,
            originalZone: sourceZoneName
        };
        // ... (setData, effectAllowed, add 'dragging' class)
    }
    function handleDragEnd(e) { /* ... (不变) ... */ }
    function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }

    function handleDragEnterGeneric(e) {
        e.preventDefault();
        const dropzone = e.target.closest('.droptarget-pile, .droptarget-hand');
        if (dropzone) dropzone.classList.add('drag-over');
    }
    function handleDragLeaveGeneric(e) {
        const dropzone = e.target.closest('.droptarget-pile, .droptarget-hand');
        if (dropzone && !dropzone.contains(e.relatedTarget)) {
            dropzone.classList.remove('drag-over');
        }
    }

    function handleDrop(e) { // Universal drop handler
        e.preventDefault();
        const targetZoneElement = e.target.closest('.droptarget-pile, .droptarget-hand');
        if (!targetZoneElement || !draggedCardInfo) return;
        targetZoneElement.classList.remove('drag-over');

        const targetZoneName = targetZoneElement.dataset.pileName || (targetZoneElement === playerHandAndBackPileZone ? 'hand' : null);
        if (!targetZoneName) { console.error("Could not determine target zone name on drop."); return; }

        const cardToMove = all13CardsData.find(c => c.value === draggedCardInfo.value);
        if (!cardToMove) { console.error("Dragged card data not found in all13CardsData."); return; }

        const maxCardsForTarget = targetZoneElement.dataset.maxCards ? parseInt(targetZoneElement.dataset.maxCards) : Infinity;
        const currentCardsInTarget = all13CardsData.filter(c => c.currentZone === targetZoneName).length;

        if (cardToMove.currentZone === targetZoneName) { // Dropped back into the same zone
            rerenderAllZones(); // Just re-render to fix position if needed
            return;
        }

        if (targetZoneName !== 'hand' && currentCardsInTarget >= maxCardsForTarget) {
            showGameMessage(`${targetZoneElement.querySelector('.zone-label').textContent.split('(')[0].trim()}已满!`, "error");
            rerenderAllZones(); // Revert visual drag
            return;
        }

        // Proceed with move
        cardToMove.currentZone = targetZoneName;
        rerenderAllZones(); // Re-render all zones to reflect the change
    }
    // handleDropOnPile and handleDropOnPlayerHandArea are now combined into handleDrop

    // --- AI 托管 Functions ---
    // ... (toggleAi托管Modal, selectAi托管Rounds, startAi托管, stopAi托管, updateAi托管UIState, ai托管ProcessRound - 逻辑基本不变) ...
    // Make sure ai托管ProcessRound calls the correct handleAiSuggest and handleSubmitHand

    function getSuitClass(suitKey) { /* ... (不变) ... */ }
    initGame();
});
