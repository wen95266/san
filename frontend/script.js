document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    // DOM Elements
    const dealButton = document.getElementById('deal-button');
    const submitButton = document.getElementById('submit-button');
    const resetButton = document.getElementById('reset-button');
    const sortButton = document.getElementById('sort-button');
    const aiSuggestButton = document.getElementById('ai-suggest-button');
    const roundResultButton = document.getElementById('round-result-button');

    const playerHandDisplayArc = document.getElementById('player-hand-display-arc');
    const frontHandPileWrapper = document.getElementById('front-hand-pile') ? document.getElementById('front-hand-pile').querySelector('.cards-wrapper') : null;
    const middleHandPileWrapper = document.getElementById('middle-hand-pile') ? document.getElementById('middle-hand-pile').querySelector('.cards-wrapper') : null;
    const backHandPileWrapper = document.getElementById('back-hand-pile') ? document.getElementById('back-hand-pile').querySelector('.cards-wrapper') : null;
    const pileDropzones = [
        document.getElementById('front-hand-pile'),
        document.getElementById('middle-hand-pile'),
        document.getElementById('back-hand-pile')
    ].filter(el => el != null); // Filter out nulls if any pile is missing

    const gameMessageTextElement = document.getElementById('game-message');
    const gameMessageOverlayElement = document.getElementById('game-message-overlay');
    const handAnalysisContainer = document.getElementById('hand-analysis-display-container');

    const myPlayerNameElement = document.getElementById('my-player-name');
    const myPlayerScoreElement = document.getElementById('my-player-score');

    // API URL
    const API_URL = 'https://9526.ip-ddns.com/thirteen_api/api.php';
    console.log("SCRIPT: Using API_URL:", API_URL);

    // Card visuals & values
    const suits = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
    const ranks = { 'A': 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K' };
    const rankValues = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14};

    // Game State
    let originalHand = [];
    let currentMyHandCards = [];
    let frontHandData = [], middleHandData = [], backHandData = [];
    let draggedCardInfo = null;

    // Arc layout parameters
    const ARC_RADIUS_CSS_OFFSET = 180;
    const ARC_ANGLE_SPREAD = 65;
    const CARD_WIDTH_EFFECTIVE_FOR_ARC = 28; // Adjusted for potentially smaller cards/tighter spread


    // --- Init ---
    if (document.readyState === 'loading') {
        console.error("SCRIPT: DOM not ready for init, this shouldn't happen with DOMContentLoaded");
    } else {
        console.log("SCRIPT: Initializing game...");
        setupEventListeners();
        resetGameUI();
        showGameMessage('点击“新局”开始游戏。');
        if(myPlayerNameElement) myPlayerNameElement.textContent = "玩家_" + Math.random().toString(36).substring(2, 6);
        console.log("SCRIPT: Game initialized.");
    }


    // --- Event Listeners Setup ---
    function setupEventListeners() {
        console.log("SCRIPT: Setting up event listeners...");
        if(dealButton) {
            dealButton.addEventListener('click', handleDealNewHand);
            console.log("SCRIPT: Deal button listener attached.");
        } else console.error("SCRIPT ERROR: Deal button not found!");

        if(submitButton) submitButton.addEventListener('click', handleSubmitHand); else console.error("SCRIPT ERROR: Submit button not found!");
        if(resetButton) resetButton.addEventListener('click', handleResetArrangement); else console.error("SCRIPT ERROR: Reset button not found!");
        if(sortButton) sortButton.addEventListener('click', handleSortHand); else console.error("SCRIPT ERROR: Sort button not found!");
        if(aiSuggestButton) aiSuggestButton.addEventListener('click', handleAiSuggest); else console.error("SCRIPT ERROR: AI Suggest button not found!");
        if(roundResultButton) roundResultButton.addEventListener('click', () => showGameMessage('本局详细结果功能待开发。', 'info'));

        pileDropzones.forEach((zone, index) => {
            if(zone){
                zone.addEventListener('dragover', handleDragOver);
                zone.addEventListener('dragenter', handleDragEnter);
                zone.addEventListener('dragleave', handleDragLeave);
                zone.addEventListener('drop', handleDropOnPile);
            } else {
                console.error(`SCRIPT ERROR: Pile dropzone ${index} is missing!`);
            }
        });

        if(playerHandDisplayArc) {
            playerHandDisplayArc.addEventListener('dragover', handleDragOver);
            playerHandDisplayArc.addEventListener('drop', handleDropOnArc);
        } else {
            console.error("SCRIPT ERROR: playerHandDisplayArc element not found!");
        }
        console.log("SCRIPT: Event listeners setup complete.");
    }

    // --- UI Update Functions ---
    function showGameMessage(message, type = 'info') {
        if (!gameMessageTextElement || !gameMessageOverlayElement) {
            console.error("SCRIPT ERROR: Game message elements not found for message:", message);
            return;
        }
        // ... (rest of showGameMessage as before)
        gameMessageTextElement.textContent = message;
        gameMessageOverlayElement.classList.remove('error', 'success', 'visible'); // Ensure visible is removed before re-adding
        if (type === 'error') gameMessageOverlayElement.classList.add('error');
        else if (type === 'success') gameMessageOverlayElement.classList.add('success');
        gameMessageOverlayElement.classList.add('visible');
        setTimeout(() => {
            if(gameMessageOverlayElement) gameMessageOverlayElement.classList.remove('visible');
        }, message.length > 40 ? 4500 : 3000);
    }

    function resetGameUI() {
        console.log("SCRIPT: Resetting game UI...");
        originalHand = []; currentMyHandCards = [];
        frontHandData = []; middleHandData = []; backHandData = [];

        if(playerHandDisplayArc) playerHandDisplayArc.innerHTML = '';
        if(frontHandPileWrapper) frontHandPileWrapper.innerHTML = '';
        if(middleHandPileWrapper) middleHandPileWrapper.innerHTML = '';
        if(backHandPileWrapper) backHandPileWrapper.innerHTML = '';

        if(dealButton) { dealButton.textContent = '新局'; dealButton.disabled = false; }
        if(submitButton) submitButton.style.display = 'none';
        if(resetButton) resetButton.style.display = 'none';
        if(sortButton) sortButton.style.display = 'none';
        if(aiSuggestButton) aiSuggestButton.style.display = 'none';
        if(roundResultButton) roundResultButton.style.display = 'none';

        updatePileCountsAndLabels();
        if(handAnalysisContainer) handAnalysisContainer.innerHTML = '';
        if(myPlayerScoreElement) myPlayerScoreElement.textContent = "本局得分: 0";
        console.log("SCRIPT: Game UI reset complete.");
    }

    function updatePileCountsAndLabels() {
        pileDropzones.forEach(zone => {
            if (!zone) return;
            const pileName = zone.dataset.pileName; // Use data-pile-name directly
            let currentPileData;
            let pileDisplayName = zone.querySelector('.pile-label') ? zone.querySelector('.pile-label').textContent.split(' ')[0] : pileName.charAt(0).toUpperCase() + pileName.slice(1);


            if (pileName === 'front') currentPileData = frontHandData;
            else if (pileName === 'middle') currentPileData = middleHandData;
            else if (pileName === 'back') currentPileData = backHandData;
            else return; // Should not happen

            const maxCards = parseInt(zone.dataset.maxCards);
            const labelElement = zone.querySelector('.pile-label');
            if(labelElement) labelElement.textContent = `${pileDisplayName} (${currentPileData.length}/${maxCards})`;
        });
    }

    function displayHandAnalysis(analysis) {
        // ... (as before, targeting handAnalysisContainer)
        if (!handAnalysisContainer || !analysis) {
            if(handAnalysisContainer) handAnalysisContainer.innerHTML = '';
            return;
        }
        let analysisHTML = `<h4>牌型分析:</h4>`;
        const pilesOrder = ['front', 'middle', 'back'];
        const pilesDisplayNames = {'front': '头墩', 'middle': '中墩', 'back': '尾墩'};
        pilesOrder.forEach(pileKey => {
            if (analysis[pileKey]) {
                analysisHTML += `<p><strong>${pilesDisplayNames[pileKey]}:</strong> ${analysis[pileKey].name || '-'} 
                                 <em>(${analysis[pileKey].cards.join(' ')})</em></p>`;
            } else {
                 analysisHTML += `<p><strong>${pilesDisplayNames[pileKey]}:</strong> -</p>`;
            }
        });
        handAnalysisContainer.innerHTML = analysisHTML;
    }

    // --- Card Creation and ARC Rendering ---
    function createBasicCardElement(cardStr) {
        // ... (as before)
        const [suitKeyFull, rankKey] = cardStr.split(' ');
        const suitKey = suitKeyFull.charAt(0).toUpperCase();

        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.classList.add(getSuitClass(suitKey));
        // Normalize card value stored in dataset for consistency, e.g., "S A" not "Spade A"
        cardDiv.dataset.value = `${suitKey} ${rankKey}`;
        cardDiv.draggable = true;

        const rankSpan = document.createElement('span'); rankSpan.classList.add('rank');
        rankSpan.textContent = ranks[rankKey] || rankKey;
        const suitSpan = document.createElement('span'); suitSpan.classList.add('suit');
        suitSpan.textContent = suits[suitKey] || suitKey; // Use mapped suit char for display
        cardDiv.appendChild(rankSpan); cardDiv.appendChild(suitSpan);
        return cardDiv;
    }

    function createCardElementForArc(cardStr, indexInHand) {
        const cardDiv = createBasicCardElement(cardStr);
        cardDiv.dataset.originalIndex = indexInHand;
        cardDiv.addEventListener('dragstart', (e) => handleDragStart(e, cardDiv, 'arc'));
        cardDiv.addEventListener('dragend', handleDragEnd);
        return cardDiv;
    }

    function renderPlayerHandArc() {
        if (!playerHandDisplayArc) { console.error("SCRIPT ERROR: playerHandDisplayArc not found for rendering"); return; }
        playerHandDisplayArc.innerHTML = '';

        const numCards = currentMyHandCards.length;
        if (numCards === 0) return;

        let angleStep;
        if (numCards > 1) {
            angleStep = Math.min(9, Math.max(4.5, ARC_ANGLE_SPREAD / (numCards - 1))); // Adjusted step
        } else {
            angleStep = 0;
        }
        const startAngle = numCards > 1 ? -((numCards - 1) * angleStep) / 2 : 0;

        currentMyHandCards.forEach((cardObj, i) => {
            const angle = startAngle + i * angleStep;
            cardObj.element.style.transform = `translateX(-50%) rotate(${angle}deg)`;
            cardObj.element.style.zIndex = i;
            playerHandDisplayArc.appendChild(cardObj.element);
        });
        console.log(`SCRIPT: Rendered ${numCards} cards in arc.`);
    }

    function addCardToPlayerHandArc(cardValue, originalIndex) {
        // Check if card already in hand (by value, assuming unique cards in original deal)
        if (currentMyHandCards.some(c => c.value === cardValue)) {
            console.warn(`SCRIPT: Card ${cardValue} already in hand arc. Skipping add.`);
            return;
        }
        const cardElement = createCardElementForArc(cardValue, originalIndex);
        currentMyHandCards.push({ value: cardValue, element: cardElement, originalIndex: originalIndex });
        currentMyHandCards.sort((a,b) => a.originalIndex - b.originalIndex);
        renderPlayerHandArc();
    }

    function removeCardFromPlayerHandArc(cardValue) {
        const cardIndex = currentMyHandCards.findIndex(c => c.value === cardValue);
        if (cardIndex > -1) {
            currentMyHandCards.splice(cardIndex, 1);
            // Element is removed from DOM by appending it elsewhere or by renderPlayerHandArc clearing
        }
        renderPlayerHandArc();
    }


    // --- Game Action Handlers ---
    async function handleDealNewHand() {
        console.log("SCRIPT: handleDealNewHand called");
        showGameMessage('正在发牌...', 'info');
        resetGameUI();
        if(dealButton) dealButton.disabled = true;

        try {
            console.log("SCRIPT: Attempting to fetch from API:", API_URL + "?action=deal");
            const response = await fetch(`${API_URL}?action=deal`);
            console.log("SCRIPT: Deal fetch response status:", response.status);
            if (!response.ok) {
                const errorText = await response.text();
                console.error("SCRIPT: Deal API error response text:", errorText);
                throw new Error(`发牌API请求失败: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log("SCRIPT: Deal data received:", data);

            if (data.success && data.hand && Array.isArray(data.hand)) {
                originalHand = [...data.hand];
                currentMyHandCards = []; // Clear before adding new cards
                originalHand.forEach((cardStr, index) => addCardToPlayerHandArc(cardStr, index));
                // renderPlayerHandArc(); // addCardToPlayerHandArc calls it

                showGameMessage('请拖拽手牌理牌。', 'info');
                if(dealButton) dealButton.textContent = '新局';
                if(resetButton) resetButton.style.display = 'inline-block';
                if(sortButton) sortButton.style.display = 'inline-block';
                if(aiSuggestButton) aiSuggestButton.style.display = 'inline-block';
            } else {
                console.error("SCRIPT: Deal API success false or hand missing/invalid:", data);
                throw new Error(data.message || '后端发牌数据格式错误');
            }
        } catch (error) {
            console.error('SCRIPT ERROR: 发牌操作失败:', error);
            showGameMessage(`发牌失败: ${error.message}`, 'error');
        } finally {
            if(dealButton) dealButton.disabled = false;
        }
    }

    function handleSortHand() {
        // ... (as before)
        currentMyHandCards.sort((a, b) => {
            const valA = rankValues[a.value.split(' ')[1]];
            const valB = rankValues[b.value.split(' ')[1]];
            if (valA !== valB) return valB - valA; // Desc by rank
            // Ensure suits object is used for sorting by suit char
            const suitCharA = a.value.split(' ')[0];
            const suitCharB = b.value.split(' ')[0];
            return (suits[suitCharA] || suitCharA).localeCompare(suits[suitCharB] || suitCharB);
        });
        currentMyHandCards.forEach((cardObj, index) => cardObj.originalIndex = index); // Update originalIndex after sort
        renderPlayerHandArc();
        showGameMessage('手牌已整理。', 'info');
    }

    function handleResetArrangement() {
        // ... (as before, ensure addCardToPlayerHandArc is used)
        console.log("SCRIPT: Resetting arrangement");
        const cardsToReturnToHand = [];
        [frontHandData, middleHandData, backHandData].forEach(pileData => {
            pileData.forEach(cardObj => cardsToReturnToHand.push(cardObj));
        });

        frontHandData = []; middleHandData = []; backHandData = [];
        if(frontHandPileWrapper) frontHandPileWrapper.innerHTML = '';
        if(middleHandPileWrapper) middleHandPileWrapper.innerHTML = '';
        if(backHandPileWrapper) backHandPileWrapper.innerHTML = '';

        currentMyHandCards = []; // Clear hand before re-adding
        cardsToReturnToHand.forEach(cardObj => {
            // Use the originalIndex stored on the card object if available
            addCardToPlayerHandArc(cardObj.value, cardObj.originalIndex !== undefined ? cardObj.originalIndex : currentMyHandCards.length);
        });
        // addCardToPlayerHandArc calls renderPlayerHandArc

        showGameMessage('牌墩已清空。', 'info');
        if(submitButton) submitButton.style.display = 'none';
        updatePileCountsAndLabels();
        if(handAnalysisContainer) handAnalysisContainer.innerHTML = '';
    }

    async function handleAiSuggest() {
        // ... (as before, ensure placeSuggestedCards is robust)
        let handToSuggest = [];
        // Collect all current cards regardless of location
        const allCurrentCardsOnBoard = new Set();
        currentMyHandCards.forEach(c => allCurrentCardsOnBoard.add(c.value));
        [frontHandData, middleHandData, backHandData].forEach(pile => pile.forEach(c => allCurrentCardsOnBoard.add(c.value)));

        if (allCurrentCardsOnBoard.size === 13) {
            handToSuggest = Array.from(allCurrentCardsOnBoard);
        } else if (originalHand.length === 13) {
            console.warn("AI Suggest: Not all 13 cards accounted for on board, using original hand for suggestion.");
            handToSuggest = [...originalHand];
        } else {
            showGameMessage('AI建议需要13张完整手牌。', 'error');
            return;
        }


        showGameMessage('AI建议生成中...', 'info');
        if(aiSuggestButton) aiSuggestButton.disabled = true;
        try {
            const response = await fetch(`${API_URL}?action=aiSuggest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hand: handToSuggest }),
            });
            const result = await response.json();
            if (result.success && result.suggestion) {
                showGameMessage('AI建议已生成 (仅供参考)。', 'info');
                handleResetArrangement(); // Clears piles, moves all cards to hand arc
                // A small delay might be needed for DOM to update from reset before placing
                setTimeout(() => {
                    placeSuggestedCards(result.suggestion.front, frontHandPileWrapper, frontHandData);
                    placeSuggestedCards(result.suggestion.middle, middleHandPileWrapper, middleHandData);
                    placeSuggestedCards(result.suggestion.back, backHandPileWrapper, backHandData);
                    updatePileCountsAndLabels();
                    checkIfReadyToSubmit();
                }, 50); // 50ms delay
            } else {
                showGameMessage(`AI建议失败：${result.message || '未知错误'}`, 'error');
            }
        } catch (error) {
            console.error('AI建议请求失败:', error);
            showGameMessage(`AI建议请求异常：${error.message}`, 'error');
        } finally {
            if(aiSuggestButton) aiSuggestButton.disabled = false;
        }
    }

    function placeSuggestedCards(suggestedCardsArray, targetPileWrapper, targetPileDataArray) {
        if (!targetPileWrapper) { console.error("SCRIPT ERROR: Target pile wrapper not found for placing cards"); return; }
        console.log("SCRIPT: Placing suggested cards for pile:", targetPileWrapper.parentElement.id, suggestedCardsArray);

        suggestedCardsArray.forEach(cardValueToPlace => {
            const cardIndexInHand = currentMyHandCards.findIndex(cardObj => cardObj.value === cardValueToPlace);
            if (cardIndexInHand > -1) {
                const cardObj = currentMyHandCards[cardIndexInHand];
                removeCardFromPlayerHandArc(cardObj.value); // This removes from data and re-renders arc

                targetPileDataArray.push(cardObj); // Add card object to pile data
                targetPileWrapper.appendChild(cardObj.element); // Move DOM element

                cardObj.element.style.transform = 'none'; // Reset arc transform
                cardObj.element.style.zIndex = 'auto';
                cardObj.element.classList.remove('selected-for-drag');

                // Update drag listener for the card, now it's in a pile
                cardObj.element.removeEventListener('dragstart', handleDragStart); // Remove previous one
                cardObj.element.addEventListener('dragstart', (ev) => handleDragStart(ev, cardObj.element, 'pile', targetPileWrapper.parentElement.dataset.pileName));
            } else {
                console.warn(`SCRIPT: AI Suggest - Card ${cardValueToPlace} not found in current hand arc.`);
            }
        });
        // renderPlayerHandArc(); // removeCardFromPlayerHandArc already calls this
    }

    async function handleSubmitHand() {
        // ... (as before, with robust error display and UI updates)
        const frontValues = frontHandData.map(c => c.value);
        const middleValues = middleHandData.map(c => c.value);
        const backValues = backHandData.map(c => c.value);

        if (frontValues.length !== 3 || middleValues.length !== 5 || backValues.length !== 5) {
            showGameMessage('牌墩张数不正确！头3中5尾5。', 'error');
            return;
        }
        const payload = { front: frontValues, middle: middleValues, back: backValues };
        showGameMessage('正在提交比牌...', 'info');
        // ... disable buttons ...
        if(submitButton) submitButton.disabled = true;
        if(resetButton) resetButton.disabled = true;
        if(sortButton) sortButton.disabled = true;
        if(aiSuggestButton) aiSuggestButton.disabled = true;

        if(handAnalysisContainer) handAnalysisContainer.innerHTML = '';

        try {
            const response = await fetch(`${API_URL}?action=submitHand`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || `提交失败: HTTP ${response.status}`);

            if (result.success) {
                showGameMessage(`比牌完成！得分: ${result.score !== undefined ? result.score : '-'}. ${result.message || ''}`, 'success');
                if (result.analysis) displayHandAnalysis(result.analysis);
                if(roundResultButton) roundResultButton.style.display = 'inline-block';
                if(submitButton) submitButton.style.display = 'none';
                if(myPlayerScoreElement && result.score !== undefined) {
                     myPlayerScoreElement.textContent = `本局得分: ${result.score}`;
                }
            } else {
                showGameMessage(`提交被拒：${result.message}`, 'error');
                if (result.analysis) displayHandAnalysis(result.analysis);
                // Re-enable buttons for correction
                if(submitButton) submitButton.disabled = false;
                if(resetButton) resetButton.disabled = false;
                if(sortButton) sortButton.disabled = false;
                if(aiSuggestButton) aiSuggestButton.disabled = false;
            }
        } catch (error) {
            console.error('SCRIPT ERROR: 提交牌型操作失败:', error);
            showGameMessage(`提交出错：${error.message}`, 'error');
            if(submitButton) submitButton.disabled = false;
            if(resetButton) resetButton.disabled = false;
            if(sortButton) sortButton.disabled = false;
            if(aiSuggestButton) aiSuggestButton.disabled = false;
        }
    }

    function checkIfReadyToSubmit() {
        // ... (as before)
        const totalArranged = frontHandData.length + middleHandData.length + backHandData.length;
        if (totalArranged === 13 && currentMyHandCards.length === 0) {
            if(submitButton) {
                submitButton.style.display = 'inline-block';
                submitButton.disabled = false;
            }
        } else {
            if(submitButton) submitButton.style.display = 'none';
        }
    }

    // --- Drag and Drop Handlers ---
    function handleDragStart(e, cardElement, source, pileName = null) {
        // ... (as before)
        if (source === 'arc') {
            cardElement.classList.add('selected-for-drag');
        }
        draggedCardInfo = {
            value: cardElement.dataset.value,
            element: cardElement,
            source: source,
            pileNameIfFromPile: pileName,
            originalIndex: cardElement.dataset.originalIndex // Persist originalIndex
        };
        e.dataTransfer.setData('text/plain', draggedCardInfo.value);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => { if(cardElement) cardElement.classList.add('dragging');}, 0);
    }

    function handleDragEnd(e) {
        // ... (as before)
        if(draggedCardInfo && draggedCardInfo.element) {
            draggedCardInfo.element.classList.remove('selected-for-drag', 'dragging');
        }
        draggedCardInfo = null;
        pileDropzones.forEach(zone => { if(zone) zone.classList.remove('drag-over'); });
    }
    function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    function handleDragEnter(e) { e.preventDefault(); const dz = e.target.closest('.hand-pile-dropzone'); if(dz) dz.classList.add('drag-over'); }
    function handleDragLeave(e) { const dz = e.target.closest('.hand-pile-dropzone'); if(dz && !dz.contains(e.relatedTarget)) dz.classList.remove('drag-over');}


    function handleDropOnPile(e) {
        // ... (as before, ensure originalIndex is preserved in cardObj when adding to pileData)
        e.preventDefault();
        const dropzoneElement = e.target.closest('.hand-pile-dropzone');
        if (!dropzoneElement || !draggedCardInfo) return;

        dropzoneElement.classList.remove('drag-over');
        const targetPileName = dropzoneElement.dataset.pileName;
        const targetPileWrapper = dropzoneElement.querySelector('.cards-wrapper');
        if (!targetPileWrapper) { console.error("Target pile wrapper not found in dropzone:", dropzoneElement); return; }
        const maxCards = parseInt(dropzoneElement.dataset.maxCards);

        let targetPileData;
        if (targetPileName === 'front') targetPileData = frontHandData;
        else if (targetPileName === 'middle') targetPileData = middleHandData;
        else if (targetPileName === 'back') targetPileData = backHandData;
        else return;

        if (targetPileData.length < maxCards) {
            if (draggedCardInfo.source === 'arc') {
                removeCardFromPlayerHandArc(draggedCardInfo.value);
            } else if (draggedCardInfo.source === 'pile' && draggedCardInfo.pileNameIfFromPile) {
                removeCardDataFromSpecificPile(draggedCardInfo.value, draggedCardInfo.pileNameIfFromPile);
            }

            // Preserve originalIndex when moving to pile
            targetPileData.push({ value: draggedCardInfo.value, element: draggedCardInfo.element, originalIndex: draggedCardInfo.originalIndex });
            targetPileWrapper.appendChild(draggedCardInfo.element);
            draggedCardInfo.element.style.transform = 'none';
            draggedCardInfo.element.style.zIndex = 'auto';
            draggedCardInfo.element.classList.remove('selected-for-drag');

            draggedCardInfo.element.removeEventListener('dragstart', handleDragStart);
            draggedCardInfo.element.addEventListener('dragstart', (ev) => handleDragStart(ev, draggedCardInfo.element, 'pile', targetPileName));

            updatePileCountsAndLabels();
            checkIfReadyToSubmit();
        } else {
            showGameMessage(`${targetPileName.charAt(0).toUpperCase() + targetPileName.slice(1)}墩已满!`, 'error');
             // Simple revert: if card was from arc, re-add it. If from pile, it just visually snaps back (no data change).
            if (draggedCardInfo.source === 'arc') {
                addCardToPlayerHandArc(draggedCardInfo.value, draggedCardInfo.originalIndex);
            }
        }
        // draggedCardInfo cleared in dragend
    }

    function handleDropOnArc(e) {
        // ... (as before, ensure originalIndex from dataset is used when re-adding to arc)
        e.preventDefault();
        if (!draggedCardInfo || draggedCardInfo.source === 'arc') {
            if(draggedCardInfo && draggedCardInfo.source === 'arc' && playerHandDisplayArc) {
                playerHandDisplayArc.appendChild(draggedCardInfo.element); // Re-append for potential re-order visual
                renderPlayerHandArc(); // Re-calculate arc positions
            }
            return;
        }
        if (draggedCardInfo.source === 'pile' && draggedCardInfo.pileNameIfFromPile) {
            removeCardDataFromSpecificPile(draggedCardInfo.value, draggedCardInfo.pileNameIfFromPile);
            const originalIdx = parseInt(draggedCardInfo.element.dataset.originalIndex); // Get originalIndex
            addCardToPlayerHandArc(draggedCardInfo.value, isNaN(originalIdx) ? currentMyHandCards.length : originalIdx);
            updatePileCountsAndLabels();
            checkIfReadyToSubmit();
        }
        // draggedCardInfo cleared in dragend
    }

    function removeCardDataFromSpecificPile(cardValue, pileName) {
        // ... (as before)
        if (pileName === 'front') frontHandData = frontHandData.filter(c => c.value !== cardValue);
        else if (pileName === 'middle') middleHandData = middleHandData.filter(c => c.value !== cardValue);
        else if (pileName === 'back') backHandData = backHandData.filter(c => c.value !== cardValue);
    }

    // --- Utility ---
    function getSuitClass(suitKey) {
        const suitLower = suitKey.charAt(0).toLowerCase();
        if (suitLower === 'h') return 'hearts';
        if (suitLower === 'd') return 'diamonds';
        if (suitLower === 's') return 'spades';
        if (suitLower === 'c') return 'clubs';
        return '';
    }
});
