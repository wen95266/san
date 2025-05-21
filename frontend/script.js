document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dealButton = document.getElementById('deal-button');
    const submitButton = document.getElementById('submit-button');
    const resetButton = document.getElementById('reset-button');
    const sortButton = document.getElementById('sort-button');
    const aiSuggestButton = document.getElementById('ai-suggest-button');
    const roundResultButton = document.getElementById('round-result-button'); // 新按钮

    const playerHandDisplayArc = document.getElementById('player-hand-display-arc'); // 新的手牌区
    const frontHandPileWrapper = document.getElementById('front-hand-pile').querySelector('.cards-wrapper');
    const middleHandPileWrapper = document.getElementById('middle-hand-pile').querySelector('.cards-wrapper');
    const backHandPileWrapper = document.getElementById('back-hand-pile').querySelector('.cards-wrapper');
    const pileDropzones = [
        document.getElementById('front-hand-pile'),
        document.getElementById('middle-hand-pile'),
        document.getElementById('back-hand-pile')
    ];

    const gameMessageTextElement = document.getElementById('game-message');
    const gameMessageOverlayElement = document.getElementById('game-message-overlay');
    const handAnalysisContainer = document.getElementById('hand-analysis-display-container');


    const myPlayerNameElement = document.getElementById('my-player-name');
    const myPlayerScoreElement = document.getElementById('my-player-score');
    const myPlayerStatusElement = document.getElementById('my-player-status'); // 实际的状态文字已移除，用按钮代替

    // API URL
    const API_URL = 'https://9526.ip-ddns.com/thirteen_api/api.php';
    console.log("Using API_URL:", API_URL);

    // Card visuals & values
    const suits = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
    const ranks = { /* ... as before ... */ };
    const rankValues = { /* ... as before ... */ };

    // Game State
    let originalHand = [];
    let currentMyHandCards = []; // 存储对象 {value: "S A", element: HTMLDivElement, originalIndex: int }
    let frontHandData = []; // {value, element}
    let middleHandData = [];
    let backHandData = [];
    let draggedCardInfo = null; // {value, element, source: 'arc' | 'pile', pileNameIfFromPile: 'front'|'middle'|'back'}

    // Arc layout parameters (can be adjusted)
    const ARC_RADIUS = 250; // px, distance from pivot point to card center (approx)
    const ARC_ANGLE_SPREAD = 70; // degrees, total spread for 13 cards
    const CARD_WIDTH_EFFECTIVE_FOR_ARC = 30; // px, effective width for spacing in arc


    // --- Init ---
    setupEventListeners();
    resetGameUI();
    showGameMessage('点击“新局”开始。');
    myPlayerNameElement.textContent = "玩家_" + Math.random().toString(36).substring(2, 6);
    // myPlayerStatusElement is removed/repurposed by roundResultButton

    // --- Event Listeners Setup ---
    function setupEventListeners() {
        if(dealButton) dealButton.addEventListener('click', handleDealNewHand);
        // ... other button listeners ...
        if(submitButton) submitButton.addEventListener('click', handleSubmitHand);
        if(resetButton) resetButton.addEventListener('click', handleResetArrangement);
        if(sortButton) sortButton.addEventListener('click', handleSortHand);
        if(aiSuggestButton) aiSuggestButton.addEventListener('click', handleAiSuggest);
        if(roundResultButton) roundResultButton.addEventListener('click', () => {
            // Placeholder: show detailed round result modal or info
            showGameMessage('本局详细结果功能待开发。', 'info');
        });


        pileDropzones.forEach(zone => {
            if(zone){
                zone.addEventListener('dragover', handleDragOver);
                zone.addEventListener('dragenter', handleDragEnter);
                zone.addEventListener('dragleave', handleDragLeave);
                zone.addEventListener('drop', handleDropOnPile); // Renamed
            }
        });

        // Drop listener for playerHandDisplayArc (to return cards from piles to hand)
        if(playerHandDisplayArc) {
            playerHandDisplayArc.addEventListener('dragover', handleDragOver);
            playerHandDisplayArc.addEventListener('drop', handleDropOnArc);
        }
    }

    // --- UI Update Functions ---
    function showGameMessage(message, type = 'info') { /* ... as before ... */ }

    function resetGameUI() {
        originalHand = [];
        currentMyHandCards = [];
        frontHandData = []; middleHandData = []; backHandData = [];

        if(playerHandDisplayArc) playerHandDisplayArc.innerHTML = '';
        if(frontHandPileWrapper) frontHandPileWrapper.innerHTML = '';
        // ... clear other pile wrappers ...
        if(middleHandPileWrapper) middleHandPileWrapper.innerHTML = '';
        if(backHandPileWrapper) backHandPileWrapper.innerHTML = '';


        if(dealButton) { dealButton.textContent = '新局'; dealButton.disabled = false; }
        if(submitButton) submitButton.style.display = 'none';
        // ... hide other buttons ...
        if(resetButton) resetButton.style.display = 'none';
        if(sortButton) sortButton.style.display = 'none';
        if(aiSuggestButton) aiSuggestButton.style.display = 'none';
        if(roundResultButton) roundResultButton.style.display = 'none';


        updatePileCountsAndLabels();
        if(handAnalysisContainer) handAnalysisContainer.innerHTML = ''; // Clear analysis
        if(myPlayerScoreElement) myPlayerScoreElement.textContent = "本局得分: 0";
    }

    function updatePileCountsAndLabels() { /* ... as before ... */ }

    function displayHandAnalysis(analysis) {
        if (!handAnalysisContainer || !analysis) return;
        let analysisHTML = `<h4>牌型分析:</h4>`;
        // ... (rest of the display logic from previous version, ensure it targets handAnalysisContainer)
        const pilesOrder = ['front', 'middle', 'back'];
        const pilesDisplayNames = {'front': '头墩', 'middle': '中墩', 'back': '尾墩'};
        pilesOrder.forEach(pileKey => {
            if (analysis[pileKey]) {
                analysisHTML += `<p><strong>${pilesDisplayNames[pileKey]}:</strong> ${analysis[pileKey].name || '未知'} 
                                 <em>(${analysis[pileKey].cards.join(', ')})</em></p>`;
            }
        });
        handAnalysisContainer.innerHTML = analysisHTML;
    }


    // --- Card Creation and ARC Rendering ---
    function createCardElement(cardStr, indexInHand) { // Pass index for arc positioning
        const cardDiv = createBasicCardElement(cardStr); // Use a helper for common parts
        cardDiv.dataset.originalIndex = indexInHand; // Store original index for stable sort/ID
        // Drag events for cards
        cardDiv.addEventListener('dragstart', (e) => handleDragStart(e, cardDiv, 'arc')); // Pass source
        cardDiv.addEventListener('dragend', handleDragEnd);
        // Click to select for drag (alternative to direct drag on complex layouts)
        // cardDiv.addEventListener('click', () => selectCardForDrag(cardDiv));
        return cardDiv;
    }

    function createBasicCardElement(cardStr) { // Helper for card DOM structure
        const [suitKeyFull, rankKey] = cardStr.split(' ');
        const suitKey = suitKeyFull.charAt(0).toUpperCase();

        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.classList.add(getSuitClass(suitKey));
        cardDiv.dataset.value = `${suitKey} ${rankKey}`;
        cardDiv.draggable = true;

        const rankSpan = document.createElement('span'); rankSpan.classList.add('rank');
        rankSpan.textContent = ranks[rankKey] || rankKey;
        const suitSpan = document.createElement('span'); suitSpan.classList.add('suit');
        suitSpan.textContent = suits[suitKey] || suitKey;
        cardDiv.appendChild(rankSpan); cardDiv.appendChild(suitSpan);
        return cardDiv;
    }


    function renderPlayerHandArc() {
        if (!playerHandDisplayArc) return;
        playerHandDisplayArc.innerHTML = ''; // Clear existing cards

        const numCards = currentMyHandCards.length;
        if (numCards === 0) return;

        const angleStep = ARC_ANGLE_SPREAD / (numCards > 1 ? numCards -1 : 1);
        const startAngle = -ARC_ANGLE_SPREAD / 2;

        currentMyHandCards.forEach((cardObj, i) => {
            const angle = numCards === 1 ? 0 : startAngle + i * angleStep;
            cardObj.element.style.transform = `translateX(-50%) rotate(${angle}deg)`;
            // Overlap cards slightly视觉上更好看，通过调整z-index
            cardObj.element.style.zIndex = i;
            playerHandDisplayArc.appendChild(cardObj.element);
        });
    }

    function addCardToPlayerHandArc(cardValue, originalIndex) {
        const cardElement = createCardElement(cardValue, originalIndex);
        currentMyHandCards.push({ value: cardValue, element: cardElement, originalIndex: originalIndex });
        // Sort here if you want hand to always be sorted, or rely on sort button
        currentMyHandCards.sort((a,b) => a.originalIndex - b.originalIndex); // Keep original deal order initially
        renderPlayerHandArc();
    }

    function removeCardFromPlayerHandArc(cardValue) {
        const cardIndex = currentMyHandCards.findIndex(c => c.value === cardValue);
        if (cardIndex > -1) {
            currentMyHandCards.splice(cardIndex, 1);
        }
        renderPlayerHandArc(); // Re-render to adjust arc
    }


    // --- Game Action Handlers ---
    async function handleDealNewHand() {
        console.log("handleDealNewHand called");
        showGameMessage('正在发牌...', 'info');
        resetGameUI();
        // ... (disable buttons, set status) ...
        if(dealButton) dealButton.disabled = true;

        try {
            const response = await fetch(`${API_URL}?action=deal`);
            if (!response.ok) throw new Error(`发牌服务请求失败: ${response.status}`);
            const data = await response.json();

            if (data.success && data.hand) {
                originalHand = [...data.hand];
                originalHand.forEach((cardStr, index) => addCardToPlayerHandArc(cardStr, index));
                // renderPlayerHandArc(); // addCardToPlayerHandArc now calls render

                showGameMessage('请拖拽手牌理牌。', 'info');
                // ... (enable relevant buttons) ...
                if(dealButton) dealButton.textContent = '新局';
                if(resetButton) resetButton.style.display = 'inline-block';
                if(sortButton) sortButton.style.display = 'inline-block';
                if(aiSuggestButton) aiSuggestButton.style.display = 'inline-block';

            } else { throw new Error(data.message || '后端发牌逻辑错误'); }
        } catch (error) { /* ... error handling ... */ }
        finally { if(dealButton) dealButton.disabled = false; }
    }

    function handleSortHand() {
        currentMyHandCards.sort((a, b) => {
            const valA = rankValues[a.value.split(' ')[1]];
            const valB = rankValues[b.value.split(' ')[1]];
            if (valA !== valB) return valB - valA; // Desc by rank
            return suits[a.value.split(' ')[0]].localeCompare(suits[b.value.split(' ')[0]]); // Asc by suit
        });
        // Update originalIndex after sort if you want the visual order to reflect sort for subsequent renders
        currentMyHandCards.forEach((cardObj, index) => cardObj.originalIndex = index);
        renderPlayerHandArc();
        showGameMessage('手牌已整理。', 'info');
    }

    function handleResetArrangement() {
        // Move all cards from piles back to hand arc
        const cardsToReturnToHand = [];
        [frontHandData, middleHandData, backHandData].forEach(pileData => {
            pileData.forEach(cardObj => cardsToReturnToHand.push(cardObj));
        });

        frontHandData = []; middleHandData = []; backHandData = [];
        if(frontHandPileWrapper) frontHandPileWrapper.innerHTML = '';
        if(middleHandPileWrapper) middleHandPileWrapper.innerHTML = '';
        if(backHandPileWrapper) backHandPileWrapper.innerHTML = '';


        cardsToReturnToHand.forEach(cardObj => {
            // Find if this card was originally in hand to restore its originalIndex for sorting
            const originalCard = originalHand.find(origCardStr => origCardStr === cardObj.value);
            const originalIdx = originalHand.indexOf(originalCard);
            addCardToPlayerHandArc(cardObj.value, originalIdx !== -1 ? originalIdx : currentMyHandCards.length);
        });
        // addCardToPlayerHandArc calls renderPlayerHandArc

        showGameMessage('牌墩已清空。', 'info');
        if(submitButton) submitButton.style.display = 'none';
        updatePileCountsAndLabels();
        if(handAnalysisContainer) handAnalysisContainer.innerHTML = '';
    }

    async function handleAiSuggest() {
        // ... (logic to get 13 cards for suggestion, similar to previous version)
        let handToSuggest = originalHand.length === 13 ? [...originalHand] : [];
        if (handToSuggest.length !== 13) { /* error message */ return; }

        showGameMessage('AI建议生成中...', 'info');
        if(aiSuggestButton) aiSuggestButton.disabled = true;
        try {
            const response = await fetch(`${API_URL}?action=aiSuggest`, { /* ... */ });
            const result = await response.json();
            if (result.success && result.suggestion) {
                handleResetArrangement(); // Clear board, put all cards in hand arc
                setTimeout(() => { // Allow reset to render
                    placeSuggestedCards(result.suggestion.front, frontHandPileWrapper, frontHandData);
                    placeSuggestedCards(result.suggestion.middle, middleHandPileWrapper, middleHandData);
                    placeSuggestedCards(result.suggestion.back, backHandPileWrapper, backHandData);
                    updatePileCountsAndLabels();
                    checkIfReadyToSubmit();
                    showGameMessage('AI建议已应用 (仅供参考)。', 'success');
                }, 100); // Small delay for visual update
            } else { /* error message */ }
        } catch (error) { /* error message */ }
        finally { if(aiSuggestButton) aiSuggestButton.disabled = false; }
    }

    function placeSuggestedCards(suggestedCardsArray, targetPileWrapper, targetPileDataArray) {
        suggestedCardsArray.forEach(cardValueToPlace => {
            const cardIndexInHand = currentMyHandCards.findIndex(cardObj => cardObj.value === cardValueToPlace);
            if (cardIndexInHand > -1) {
                const cardObj = currentMyHandCards[cardIndexInHand]; // Get ref
                // Remove from hand arc data and DOM
                removeCardFromPlayerHandArc(cardObj.value); // This will re-render arc

                // Add to pile data and DOM
                targetPileDataArray.push(cardObj); // Add the same object {value, element, originalIndex}
                targetPileWrapper.appendChild(cardObj.element); // Move the DOM element
                // Reset transform from arc layout for pile display
                cardObj.element.style.transform = 'none';
                cardObj.element.style.zIndex = 'auto';
                // Add event listener for dragging from pile
                cardObj.element.removeEventListener('dragstart', handleDragStart); // Remove old arc listener
                cardObj.element.addEventListener('dragstart', (e) => handleDragStart(e, cardObj.element, 'pile', targetPileWrapper.parentElement.dataset.pileName));
            }
        });
        // renderPlayerHandArc(); // Called by removeCardFromPlayerHandArc
    }


    async function handleSubmitHand() {
        // ... (validation and payload creation as before) ...
        const payload = { /* ... */ };
        showGameMessage('正在提交比牌...', 'info');
        // ... (disable buttons) ...
        if(handAnalysisContainer) handAnalysisContainer.innerHTML = ''; // Clear old analysis

        try {
            const response = await fetch(`${API_URL}?action=submitHand`, { /* ... */ });
            const result = await response.json();
            if (!response.ok) throw new Error(/* ... */);

            if (result.success) {
                showGameMessage(`比牌完成！得分: ${result.score || 0}.`, 'success');
                if (result.analysis) displayHandAnalysis(result.analysis);
                // ... (update score, set status, show round result button) ...
                if(roundResultButton) roundResultButton.style.display = 'inline-block';
                if(submitButton) submitButton.style.display = 'none';
                if(myPlayerScoreElement && result.score !== undefined) {
                     myPlayerScoreElement.textContent = `本局得分: ${result.score}`;
                }

            } else { /* handle backend rejection (e.g.,倒水) */ }
        } catch (error) { /* handle fetch error */ }
        finally { /* re-enable buttons if not end of round */ }
    }

    function checkIfReadyToSubmit() { /* ... as before ... */ }


    // --- Drag and Drop Handlers ---
    function handleDragStart(e, cardElement, source, pileName = null) {
        cardElement.classList.add('selected-for-drag'); // Special style for arc card being dragged
        draggedCardInfo = {
            value: cardElement.dataset.value,
            element: cardElement,
            source: source, // 'arc' or 'pile'
            pileNameIfFromPile: pileName
        };
        e.dataTransfer.setData('text/plain', draggedCardInfo.value);
        e.dataTransfer.effectAllowed = 'move';
        // .dragging class will be added by a general dragstart if needed,
        // or rely on .selected-for-drag for arc
        setTimeout(() => { if(cardElement) cardElement.classList.add('dragging');}, 0);
    }

    function handleDragEnd(e) {
        if(draggedCardInfo && draggedCardInfo.element) {
            draggedCardInfo.element.classList.remove('selected-for-drag', 'dragging');
        }
        draggedCardInfo = null;
        pileDropzones.forEach(zone => { if(zone) zone.classList.remove('drag-over'); });
    }

    function handleDragOver(e) { /* ... as before ... */ }
    function handleDragEnter(e) { /* ... as before ... */ }
    function handleDragLeave(e) { /* ... as before ... */ }

    function handleDropOnPile(e) { // Dropping onto a pile (front, middle, back)
        e.preventDefault();
        const dropzoneElement = e.target.closest('.hand-pile-dropzone');
        if (!dropzoneElement || !draggedCardInfo) return;

        dropzoneElement.classList.remove('drag-over');
        const targetPileName = dropzoneElement.dataset.pileName;
        const targetPileWrapper = dropzoneElement.querySelector('.cards-wrapper');
        const maxCards = parseInt(dropzoneElement.dataset.maxCards);

        let targetPileData;
        if (targetPileName === 'front') targetPileData = frontHandData;
        // ... (get targetPileData for middle and back) ...
        else if (targetPileName === 'middle') targetPileData = middleHandData;
        else targetPileData = backHandData;


        if (targetPileData.length < maxCards) {
            // Remove from source
            if (draggedCardInfo.source === 'arc') {
                removeCardFromPlayerHandArc(draggedCardInfo.value);
            } else if (draggedCardInfo.source === 'pile' && draggedCardInfo.pileNameIfFromPile) {
                removeCardDataFromSpecificPile(draggedCardInfo.value, draggedCardInfo.pileNameIfFromPile);
                // The element is already out of its original pile wrapper due to drag
            }

            // Add to target pile
            targetPileData.push({ value: draggedCardInfo.value, element: draggedCardInfo.element, originalIndex: draggedCardInfo.element.dataset.originalIndex });
            targetPileWrapper.appendChild(draggedCardInfo.element);
            // Reset transform and z-index from arc layout
            draggedCardInfo.element.style.transform = 'none';
            draggedCardInfo.element.style.zIndex = 'auto';
            draggedCardInfo.element.classList.remove('selected-for-drag'); // ensure this is off

            // Update drag listener for the card, now it's in a pile
            draggedCardInfo.element.removeEventListener('dragstart', handleDragStart); // Might be an old one
            draggedCardInfo.element.addEventListener('dragstart', (ev) => handleDragStart(ev, draggedCardInfo.element, 'pile', targetPileName));


            updatePileCountsAndLabels();
            checkIfReadyToSubmit();
        } else {
            showGameMessage(`${targetPileName.toUpperCase()}墩已满!`, 'error');
            // If full, and card was from arc, it should snap back.
            // This needs more advanced drag revert logic or just re-add to arc if not placed.
            // For now, dragend will remove .dragging, it might just visually pop back.
        }
        // draggedCardInfo = null; // Cleared in dragend
    }

    function handleDropOnArc(e) { // Dropping back onto the hand arc area
        e.preventDefault();
        if (!draggedCardInfo || draggedCardInfo.source === 'arc') {
            // If dragged from arc to arc (reordering) or no valid drag, do nothing or handle reorder
            if(draggedCardInfo && draggedCardInfo.source === 'arc') { // re-ordering attempt
                // Simple re-append to force re-calc in renderPlayerHandArc, or implement specific reorder logic
                playerHandDisplayArc.appendChild(draggedCardInfo.element);
                renderPlayerHandArc();
            }
            return;
        }

        // Card is from a pile, return it to hand arc
        if (draggedCardInfo.source === 'pile' && draggedCardInfo.pileNameIfFromPile) {
            removeCardDataFromSpecificPile(draggedCardInfo.value, draggedCardInfo.pileNameIfFromPile);
            // The element is already out of its pile wrapper due to drag start

            // Add back to hand arc (JS data and DOM)
            addCardToPlayerHandArc(draggedCardInfo.value, parseInt(draggedCardInfo.element.dataset.originalIndex));
            // addCardToPlayerHandArc handles adding to currentMyHandCards and rendering arc

            updatePileCountsAndLabels();
            checkIfReadyToSubmit();
        }
        // draggedCardInfo = null; // Cleared in dragend
    }

    function removeCardDataFromSpecificPile(cardValue, pileName) {
        if (pileName === 'front') frontHandData = frontHandData.filter(c => c.value !== cardValue);
        else if (pileName === 'middle') middleHandData = middleHandData.filter(c => c.value !== cardValue);
        else if (pileName === 'back') backHandData = backHandData.filter(c => c.value !== cardValue);
    }


    // --- Utility ---
    function getSuitClass(suitKey) { /* ... as before ... */ }
});
