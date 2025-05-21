document.addEventListener('DOMContentLoaded', () => {
    console.log("十三水游戏脚本初始化 - 经典桌面布局");

    // DOM Elements
    // ... (dealBtn, submitBtn, etc. as before)
    const playerHandArea = document.getElementById('player-hand-cards-bottom-bar'); // *** 改用新的底部手牌区ID ***
    // ... (pileDropzones, pileWrappers, handAnalysisDisplay, etc. as before)

    // API URL, Card Definitions, Game State (draggedCardInfo.sourceArea 会是 'bottomHand' | 'pile')
    // ... (大部分保持不变) ...


    // --- Init ---
    // ... (调用 setupEventListeners, resetGameUI, showGameMessage) ...


    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // ... (按钮事件监听器不变) ...
        Object.values(pileDropzones).forEach(zone => { /* ... (不变) ... */ });

        if(playerHandArea) { // *** 改用 playerHandArea ***
            playerHandArea.addEventListener('dragover', handleDragOver);
            playerHandArea.addEventListener('drop', handleDropOnPlayerHandArea); // 新的drop处理器名称
        } else {
            console.error("SCRIPT ERROR: playerHandArea (bottom bar) element not found!");
        }
        // ...
    }

    // --- UI Update Functions ---
    function resetGameUI(isNewRound = true) {
        // ...
        if(playerHandArea) playerHandArea.innerHTML = ''; // *** 清空新的底部手牌区 ***
        // ...
    }
    // ... (showGameMessage, updatePileLabels, toggleActionButtons, displayAnalysis 不变或微调) ...


    // --- Card Element Creation & Hand Rendering (for Bottom Bar) ---
    function createCardDOMElement(cardValue) { /* ... (不变) ... */ }

    function createCardElementForBottomHand(cardValue) { // 用于底部手牌区的卡牌
        const el = createCardDOMElement(cardValue);
        el.addEventListener('dragstart', (e) => handleDragStart(e, el, 'bottomHand')); // source is 'bottomHand'
        el.addEventListener('dragend', handleDragEnd);
        // Optional: click to select/highlight
        el.addEventListener('click', () => {
            // Simple toggle for a visual cue, actual drag logic is via dragstart
            el.classList.toggle('card-selected-visual');
            setTimeout(()=> el.classList.remove('card-selected-visual'), 300);
        });
        return el;
    }

    function renderPlayerBottomHand() { // 渲染底部直线手牌
        if (!playerHandArea) { console.error("SCRIPT ERROR: playerHandArea (bottom bar) not found for rendering"); return; }
        playerHandArea.innerHTML = '';

        currentHandCards.forEach((cardObj) => {
            // Ensure drag listeners are for 'bottomHand' source
            cardObj.element.removeEventListener('dragstart', handleDragStart);
            cardObj.element.addEventListener('dragstart', (e) => handleDragStart(e, cardObj.element, 'bottomHand'));
            cardObj.element.removeEventListener('dragend', handleDragEnd);
            cardObj.element.addEventListener('dragend', handleDragEnd);
            playerHandArea.appendChild(cardObj.element);
        });
        console.log(`SCRIPT: Rendered ${currentHandCards.length} cards in bottom hand area.`);
    }

    function addCardToBottomHandData(cardValue) { // 添加到直线手牌区数据
        if (currentHandCards.some(c => c.value === cardValue)) { return; }
        const element = createCardElementForBottomHand(cardValue); // Use correct creator
        currentHandCards.push({ value: cardValue, element });
    }

    function removeCardFromBottomHandData(cardValue) { // 从直线手牌区数据移除
        currentHandCards = currentHandCards.filter(c => c.value !== cardValue);
    }


    // --- Game Logic Handlers ---
    async function handleDealNewHand(isAiCall = false) {
        // ... (重置UI,禁用按钮等) ...
        try {
            // ... (fetch deal data) ...
            if (data.success && data.hand && Array.isArray(data.hand)) {
                originalDealtHand = [...data.hand];
                currentHandCards = [];
                originalDealtHand.forEach(cv => addCardToBottomHandData(cv)); // *** 添加到新的底部手牌区 ***
                renderPlayerBottomHand(); // *** 渲染新的底部手牌区 ***

                // ... (显示提示，启用按钮等) ...
                if (isAi托管Active && ai托管RoundsLeft > 0) { /* ... */ }
            } // ...
        } // ...
    }

    function handleSortHand() {
        currentHandCards.sort((a, b) => { /* ... (排序逻辑不变) ... */ });
        renderPlayerBottomHand(); // *** 重新渲染排序后的底部手牌 ***
        showGameMessage("手牌已整理", "info", 1500);
    }

    function handleResetArrangement() {
        // ... (将墩内牌移回手牌区的逻辑) ...
        cardsToReturn.forEach(cv => {
            if(!currentHandCards.some(c => c.value === cv)) {
                addCardToBottomHandData(cv); // *** 添加回新的底部手牌区数据 ***
            }
        });
        renderPlayerBottomHand(); // *** 渲染底部手牌区 ***
        // ... (清空墩，更新标签等) ...
    }

    async function handleAiSuggest(isAi托管Call = false) {
        // ... (获取手牌逻辑不变) ...
        try {
            // ... (fetch AI Suggest) ...
            if (result.success && result.suggestion) {
                // ...
                handleResetArrangement(); // 清空墩，牌回到新的底部手牌区
                await new Promise(resolve => setTimeout(resolve, 50));
                placeCardsFromSuggestion(result.suggestion.front, 'front');
                // ... (为中墩和尾墩调用 placeCardsFromSuggestion) ...
                updatePileLabels();
                checkIfReadyToSubmit();
                // ...
            } // ...
        } // ...
    }

    function placeCardsFromSuggestion(suggestedCardValues, pileName) {
        // ...
        suggestedCardValues.forEach(cardValue => {
            const handCardIndex = currentHandCards.findIndex(c => c.value === cardValue);
            if (handCardIndex > -1) {
                const cardObj = currentHandCards.splice(handCardIndex, 1)[0]; // 从手牌数据移除
                addCardToPileData(cardValue, pileName, cardObj.element);
                pileWrappers[pileName].appendChild(cardObj.element);
                // (确保更新卡牌的dragstart监听源为'pile') - addCardToPileData已处理
            } // ...
        });
        renderPlayerBottomHand(); // *** 更新底部手牌区显示 ***
    }

    // handleSubmitHand 逻辑基本不变

    // --- Drag and Drop Handlers ---
    function handleDragStart(e, cardElement, sourceArea, sourcePileName = null) {
        // cardElement.classList.remove('card-selected-visual'); // Remove visual selection
        draggedCardInfo = {
            value: cardElement.dataset.value,
            element: cardElement,
            sourceArea: sourceArea, // 'bottomHand' or 'pile'
            sourcePileName: sourcePileName
        };
        // ... (setData, effectAllowed, add 'dragging' class) ...
    }
    // handleDragEnd, handleDragOver, handleDragEnter, handleDragLeave 不变

    function handleDropOnPile(e) {
        // ...
        if (arrangedPilesData[targetPileName].length < maxCards) {
            if (draggedCardInfo.sourceArea === 'bottomHand') { // *** 改为 bottomHand ***
                removeCardFromBottomHandData(draggedCardInfo.value);
                renderPlayerBottomHand(); // *** 更新底部手牌区 ***
            } else if (draggedCardInfo.sourceArea === 'pile' && draggedCardInfo.sourcePileName) {
                removeCardFromPileData(draggedCardInfo.value, draggedCardInfo.sourcePileName);
            }
            // ... (添加到目标墩数据和DOM，更新监听器) ...
            addCardToPileData(draggedCardInfo.value, targetPileName, draggedCardInfo.element);
            targetPileWrapper.appendChild(draggedCardInfo.element);

        } // ...
        // renderPlayerBottomHand(); // May not be needed here if source was pile
    }

    function handleDropOnPlayerHandArea(e) { // *** 牌从墩拖拽回底部手牌区 ***
        e.preventDefault();
        if (!draggedCardInfo || draggedCardInfo.sourceArea === 'bottomHand') {
            if (draggedCardInfo && draggedCardInfo.sourceArea === 'bottomHand' && playerHandArea) {
                 playerHandArea.appendChild(draggedCardInfo.element);
            }
            return;
        }
        if (draggedCardInfo.sourceArea === 'pile' && draggedCardInfo.sourcePileName) {
            removeCardFromPileData(draggedCardInfo.value, draggedCardInfo.sourcePileName);
            addCardToBottomHandData(draggedCardInfo.value); // *** 添加回底部手牌区数据 ***
            renderPlayerBottomHand(); // *** 重新渲染底部手牌区 ***

            updatePileLabels();
            checkIfReadyToSubmit();
        }
    }
    // ... (AI托管相关函数、removeCardFromPileData, getSuitClass 不变或只需微调DOM引用) ...

    // --- Start the game ---
    initGame();
});
