document.addEventListener('DOMContentLoaded', () => {
    console.log("十三水游戏脚本初始化 - 中央手牌布局");

    // DOM Elements
    const dealBtn = document.getElementById('deal-btn');
    const sortBtn = document.getElementById('sort-btn');
    const resetBtn = document.getElementById('reset-btn');
    // ... (其他按钮)

    // *** 修改手牌区的引用 ***
    const playerHandArea = document.getElementById('player-hand-cards-center-display');
    // ... (pileDropzones, pileWrappers, handAnalysisDisplay, etc. as before)

    // API URL, Card Definitions, Game State
    // ... (draggedCardInfo.sourceArea 会是 'centerHand' | 'pile')
    // ... (大部分保持不变) ...


    // --- Init ---
    // ... (调用 setupEventListeners, resetGameUI, showGameMessage) ...


    // --- Event Listeners Setup ---
    function setupEventListeners() {
        // ... (按钮事件监听器不变) ...
        Object.values(pileDropzones).forEach(zone => { /* ... (不变) ... */ });

        if(playerHandArea) { // *** 确保使用的是新的 playerHandArea ***
            playerHandArea.addEventListener('dragover', handleDragOver);
            playerHandArea.addEventListener('drop', handleDropOnPlayerHandArea);
        } else {
            console.error("SCRIPT ERROR: playerHandArea (center display) element not found!");
        }
        // ...
    }

    // --- UI Update Functions ---
    function resetGameUI(isNewRound = true) {
        // ...
        if(playerHandArea) playerHandArea.innerHTML = ''; // *** 清空新的中央手牌区 ***
        // ...
    }
    // ... (showGameMessage, updatePileLabels, toggleActionButtons, displayAnalysis 不变或微调) ...


    // --- Card Element Creation & Hand Rendering (for Center Display) ---
    function createCardDOMElement(cardValue) { /* ... (不变) ... */ }

    function createCardElementForCenterHand(cardValue) { // 用于中央手牌区的卡牌
        const el = createCardDOMElement(cardValue);
        el.addEventListener('dragstart', (e) => handleDragStart(e, el, 'centerHand')); // source is 'centerHand'
        el.addEventListener('dragend', handleDragEnd);
        el.addEventListener('click', () => { // 简单的点击选中视觉效果
            const currentlySelected = playerHandArea.querySelector('.card.selected-visual');
            if(currentlySelected && currentlySelected !== el) {
                currentlySelected.classList.remove('selected-visual');
            }
            el.classList.toggle('selected-visual');
        });
        return el;
    }

    function renderPlayerCenterHand() { // 渲染中央直线手牌
        if (!playerHandArea) { console.error("SCRIPT ERROR: playerHandArea (center display) not found for rendering"); return; }
        playerHandArea.innerHTML = '';

        currentHandCards.forEach((cardObj) => {
            cardObj.element.removeEventListener('dragstart', handleDragStart);
            cardObj.element.addEventListener('dragstart', (e) => handleDragStart(e, cardObj.element, 'centerHand'));
            cardObj.element.removeEventListener('dragend', handleDragEnd);
            cardObj.element.addEventListener('dragend', handleDragEnd);
            playerHandArea.appendChild(cardObj.element);
        });
        console.log(`SCRIPT: Rendered ${currentHandCards.length} cards in center hand area.`);
    }

    function addCardToCenterHandData(cardValue) { // 添加到中央手牌区数据
        if (currentHandCards.some(c => c.value === cardValue)) { return; }
        const element = createCardElementForCenterHand(cardValue); // Use correct creator
        currentHandCards.push({ value: cardValue, element });
    }

    function removeCardFromCenterHandData(cardValue) { // 从中央手牌区数据移除
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
                originalDealtHand.forEach(cv => addCardToCenterHandData(cv)); // *** 添加到新的中央手牌区 ***
                renderPlayerCenterHand(); // *** 渲染新的中央手牌区 ***

                // ... (显示提示，启用按钮等) ...
                if (isAi托管Active && ai托管RoundsLeft > 0) { /* ... */ }
            } // ...
        } // ...
    }

    function handleSortHand() {
        currentHandCards.sort((a, b) => { /* ... (排序逻辑不变) ... */ });
        renderPlayerCenterHand(); // *** 重新渲染排序后的中央手牌 ***
        showGameMessage("手牌已整理", "info", 1500);
    }

    function handleResetArrangement() {
        // ... (将墩内牌移回手牌区的逻辑) ...
        cardsToReturn.forEach(cv => {
            if(!currentHandCards.some(c => c.value === cv)) {
                addCardToCenterHandData(cv); // *** 添加回新的中央手牌区数据 ***
            }
        });
        renderPlayerCenterHand(); // *** 渲染中央手牌区 ***
        // ... (清空墩，更新标签等) ...
    }

    async function handleAiSuggest(isAi托管Call = false) {
        // ... (获取手牌逻辑不变) ...
        try {
            // ... (fetch AI Suggest) ...
            if (result.success && result.suggestion) {
                // ...
                handleResetArrangement(); // 清空墩，牌回到新的中央手牌区
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
                cardObj.element.classList.remove('selected-visual'); // 移除手牌区的选中样式
                // (确保更新卡牌的dragstart监听源为'pile') - addCardToPileData已处理
            } // ...
        });
        renderPlayerCenterHand(); // *** 更新中央手牌区显示 ***
    }

    // handleSubmitHand 逻辑基本不变

    // --- Drag and Drop Handlers ---
    function handleDragStart(e, cardElement, sourceArea, sourcePileName = null) {
        cardElement.classList.remove('selected-visual'); // 清除点击选中（如果有）
        draggedCardInfo = {
            value: cardElement.dataset.value,
            element: cardElement,
            sourceArea: sourceArea, // 'centerHand' or 'pile'
            sourcePileName: sourcePileName
        };
        // ... (setData, effectAllowed, add 'dragging' class) ...
    }
    // handleDragEnd, handleDragOver, handleDragEnter, handleDragLeave 不变

    function handleDropOnPile(e) {
        // ...
        if (arrangedPilesData[targetPileName].length < maxCards) {
            if (draggedCardInfo.sourceArea === 'centerHand') { // *** 改为 centerHand ***
                removeCardFromCenterHandData(draggedCardInfo.value);
                renderPlayerCenterHand(); // *** 更新中央手牌区 ***
            } else if (draggedCardInfo.sourceArea === 'pile' && draggedCardInfo.sourcePileName) {
                removeCardFromPileData(draggedCardInfo.value, draggedCardInfo.sourcePileName);
            }
            // ... (添加到目标墩数据和DOM，更新监听器) ...
            addCardToPileData(draggedCardInfo.value, targetPileName, draggedCardInfo.element);
            targetPileWrapper.appendChild(draggedCardInfo.element);

        } // ...
    }

    function handleDropOnPlayerHandArea(e) { // *** 牌从墩拖拽回中央手牌区 ***
        e.preventDefault();
        if (!draggedCardInfo || draggedCardInfo.sourceArea === 'centerHand') {
            if (draggedCardInfo && draggedCardInfo.sourceArea === 'centerHand' && playerHandArea) {
                 playerHandArea.appendChild(draggedCardInfo.element);
            }
            return;
        }
        if (draggedCardInfo.sourceArea === 'pile' && draggedCardInfo.sourcePileName) {
            removeCardFromPileData(draggedCardInfo.value, draggedCardInfo.sourcePileName);
            addCardToCenterHandData(draggedCardInfo.value); // *** 添加回中央手牌区数据 ***
            renderPlayerCenterHand(); // *** 重新渲染中央手牌区 ***

            updatePileLabels();
            checkIfReadyToSubmit();
        }
    }
    // ... (AI托管相关函数、removeCardFromPileData, getSuitClass 不变或只需微调DOM引用) ...

    // --- Start the game ---
    initGame();
});
