document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed - Straight Hand Layout");

    // DOM Elements
    // ... (dealButton, submitButton, etc. as before)
    const playerHandArea = document.getElementById('player-hand-area-straight'); // 改用新的手牌区ID
    // ... (pileWrappers, pileDropzones, messageElements, etc. as before)

    // API URL, Card visuals & values, Game State (draggedCardInfo 的 source 不再有 'arc')
    // ... (大部分保持不变) ...
    // let draggedCardInfo = null; // {value, element, source: 'hand' | 'pile', pileNameIfFromPile: 'front'|'middle'|'back'}


    // --- Init ---
    // ... (调用 setupEventListeners, resetGameUI, showGameMessage) ...


    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // ... (按钮事件监听器不变) ...

        pileDropzones.forEach(zone => { /* ... (不变) ... */ });

        if(playerHandArea) { // 改用 playerHandArea
            playerHandArea.addEventListener('dragover', handleDragOver);
            playerHandArea.addEventListener('drop', handleDropOnHandArea); // 新的drop处理器
        } else {
            console.error("SCRIPT ERROR: playerHandArea element not found!");
        }
        // ...
    }

    // --- UI Update Functions ---
    // ... (showGameMessage, resetGameUI, updatePileCountsAndLabels, displayHandAnalysis 不变或微调DOM目标) ...
    function resetGameUI() {
        // ...
        if(playerHandArea) playerHandArea.innerHTML = ''; // 清空新的手牌区
        // ...
    }


    // --- Card Creation and STRAIGHT Hand Rendering ---
    function createBasicCardElement(cardStr) { /* ... (不变) ... */ }

    function createCardElementForHand(cardStr) { // 用于手牌区的卡牌
        const cardDiv = createBasicCardElement(cardStr);
        // Drag events for cards from hand
        cardDiv.addEventListener('dragstart', (e) => handleDragStart(e, cardDiv, 'hand')); // source is 'hand'
        cardDiv.addEventListener('dragend', handleDragEnd);
        // Optional: click to select visual, if direct drag is hard
        cardDiv.addEventListener('click', () => {
            // Toggle a 'selected-for-drag' class, then drag must start from this selected card
            const currentlySelected = playerHandArea.querySelector('.card.selected-for-drag');
            if(currentlySelected && currentlySelected !== cardDiv) {
                currentlySelected.classList.remove('selected-for-drag');
            }
            cardDiv.classList.toggle('selected-for-drag');
        });
        return cardDiv;
    }

    function renderPlayerHandStraight() { // 渲染直线手牌
        if (!playerHandArea) { console.error("SCRIPT ERROR: playerHandArea not found for rendering"); return; }
        playerHandArea.innerHTML = ''; // Clear existing cards

        currentMyHandCards.forEach((cardObj) => { // currentMyHandCards现在只存手牌区的牌
            playerHandArea.appendChild(cardObj.element);
        });
        console.log(`SCRIPT: Rendered ${currentMyHandCards.length} cards in straight hand area.`);
    }

    function addCardToPlayerHand(cardValue) { // 添加到直线手牌区
        // Check if card already in hand (by value)
        if (currentMyHandCards.some(c => c.value === cardValue)) {
            console.warn(`SCRIPT: Card ${cardValue} already in hand. Skipping add.`);
            return;
        }
        const cardElement = createCardElementForHand(cardValue);
        currentMyHandCards.push({ value: cardValue, element: cardElement });
        // Sort here if you want hand to always be sorted after adding, or rely on sort button
        // currentMyHandCards.sort(...);
        renderPlayerHandStraight();
    }

    function removeCardFromPlayerHand(cardValue) { // 从直线手牌区移除
        const cardIndex = currentMyHandCards.findIndex(c => c.value === cardValue);
        if (cardIndex > -1) {
            currentMyHandCards.splice(cardIndex, 1);
        }
        // No re-render needed here if element is moved by drag-drop,
        // but if called programmatically, then renderPlayerHandStraight() might be needed.
    }


    // --- Game Action Handlers ---
    async function handleDealNewHand(isCalledByAi = false) {
        // ... (重置UI,禁用按钮等) ...
        try {
            const response = await fetch(`${API_URL}?action=deal`);
            // ... (处理响应) ...
            if (data.success && data.hand && Array.isArray(data.hand)) {
                originalHand = [...data.hand];
                currentMyHandCards = []; // 清空当前手牌数据
                originalHand.forEach((cardStr) => addCardToPlayerHand(cardStr)); // 添加到直线手牌区
                // renderPlayerHandStraight(); // addCardToPlayerHand calls it

                // ... (显示提示，启用按钮等) ...
                if (isAi托管Active && ai托管RoundsLeft > 0) {
                    setTimeout(ai托管ProcessCurrentHand, AI_THINKING_DELAY);
                }
            } // ...
        } // ...
    }

    function handleSortHand() {
        currentMyHandCards.sort((a, b) => { /* ... (排序逻辑不变) ... */ });
        renderPlayerHandStraight(); // 重新渲染排序后的直线手牌
        showGameMessage('手牌已整理。', 'info');
    }

    function handleResetArrangement() {
        // ... (将墩内牌移回手牌区的逻辑) ...
        cardsToReturnToHand.forEach(cardObj => {
            addCardToPlayerHand(cardObj.value); // 添加回直线手牌区
        });
        // renderPlayerHandStraight(); // addCardToPlayerHand calls it
        // ... (清空墩，更新标签等) ...
    }

    async function handleAiSuggest(isCalledByAi托管 = false) {
        // ... (获取手牌逻辑不变) ...
        try {
            // ... (fetch AI Suggest) ...
            if (result.success && result.suggestion) {
                // ...
                handleResetArrangement(); // 清空墩，牌回到手牌区
                await new Promise(resolve => setTimeout(resolve, 50));
                placeSuggestedCards(result.suggestion.front, frontHandPileWrapper, frontHandData);
                // ... (为中墩和尾墩调用 placeSuggestedCards) ...
                updatePileCountsAndLabels();
                checkIfReadyToSubmit();
                // ...
            } // ...
        } // ...
    }

    function placeSuggestedCards(suggestedCardsArray, targetPileWrapper, targetPileDataArray) {
        // ...
        suggestedCardsArray.forEach(cardValueToPlace => {
            const cardIndexInHand = currentMyHandCards.findIndex(cardObj => cardObj.value === cardValueToPlace);
            if (cardIndexInHand > -1) {
                const cardObj = currentMyHandCards[cardIndexInHand];
                removeCardFromPlayerHand(cardObj.value); // 从手牌数据移除

                targetPileDataArray.push(cardObj);
                targetPileWrapper.appendChild(cardObj.element);
                cardObj.element.classList.remove('selected-for-drag'); // 移除手牌区的选中样式

                // 更新拖拽监听器，源变为 'pile'
                cardObj.element.removeEventListener('dragstart', handleDragStart);
                cardObj.element.addEventListener('dragstart', (ev) => handleDragStart(ev, cardObj.element, 'pile', targetPileWrapper.parentElement.dataset.pileName));
            } // ...
        });
        renderPlayerHandStraight(); // 更新手牌区显示 (移除已摆放的牌)
    }

    // handleSubmitHand 逻辑基本不变

    // --- Drag and Drop Handlers ---
    function handleDragStart(e, cardElement, source, pileName = null) {
        cardElement.classList.remove('selected-for-drag'); // 清除点击选中（如果有）
        draggedCardInfo = {
            value: cardElement.dataset.value,
            element: cardElement,
            source: source, // 'hand' or 'pile'
            pileNameIfFromPile: pileName
        };
        // ... (setData, effectAllowed, add 'dragging' class) ...
    }
    // handleDragEnd, handleDragOver, handleDragEnter, handleDragLeave 不变

    function handleDropOnPile(e) {
        // ...
        if (targetPileData.length < maxCards) {
            if (draggedCardInfo.source === 'hand') {
                removeCardFromPlayerHand(draggedCardInfo.value); // 从手牌数据移除
            } else if (draggedCardInfo.source === 'pile' && draggedCardInfo.pileNameIfFromPile) {
                removeCardDataFromSpecificPile(draggedCardInfo.value, draggedCardInfo.pileNameIfFromPile);
            }
            // ... (添加到目标墩数据和DOM，更新监听器) ...
            targetPileWrapper.appendChild(draggedCardInfo.element); // 移动DOM元素
            draggedCardInfo.element.removeEventListener('dragstart', handleDragStart); // 清除旧的
            draggedCardInfo.element.addEventListener('dragstart', (ev) => handleDragStart(ev, draggedCardInfo.element, 'pile', targetPileName));

        } // ...
        renderPlayerHandStraight(); // 更新手牌区，以防万一有牌被错误移除但未正确放回
    }

    function handleDropOnHandArea(e) { // 牌从墩拖拽回手牌区
        e.preventDefault();
        if (!draggedCardInfo || draggedCardInfo.source === 'hand') {
            // 如果是从手牌区拖到手牌区（可能是为了重新排序，如果支持的话）
            if(draggedCardInfo && draggedCardInfo.source === 'hand' && playerHandArea) {
                 playerHandArea.appendChild(draggedCardInfo.element); // 简单地追加
                 // 可能需要重新排序 currentMyHandCards 数组并重新渲染以反映顺序
            }
            return;
        }
        if (draggedCardInfo.source === 'pile' && draggedCardInfo.pileNameIfFromPile) {
            removeCardDataFromSpecificPile(draggedCardInfo.value, draggedCardInfo.pileNameIfFromPile);
            addCardToPlayerHand(draggedCardInfo.value); // 添加回手牌区数据并渲染
            // addCardToPlayerHand 内部会创建新的 element 并绑定 'hand' source 的 dragstart

            updatePileCountsAndLabels();
            checkIfReadyToSubmit();
        }
    }
    // removeCardDataFromSpecificPile, getSuitClass 不变

    // AI托管相关函数 (handleAi托管ButtonClick, handleAi托管Selection, startAi托管, stopAi托管, ai托管ProcessCurrentHand)
    // 需要确保它们在调用 handleDealNewHand, handleAiSuggest, handleSubmitHand 时传递正确的 isCalledByAi 参数
    // 并且在 resetGameUI 和其他UI更新中考虑到托管状态。

});
