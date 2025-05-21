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
        console.log("SCRIPT: Initializing game...");
        setupEventListeners();
        resetGameUI();
        if(playerNameDisplay) playerNameDisplay.textContent = "玩家_" + Math.random().toString(36).substring(2, 6);
        showGameMessage("点击“新局”开始游戏");
        console.log("SCRIPT: Game initialized.");
    }

    // --- Event Listeners ---
    function setupEventListeners() {
        console.log("SCRIPT: Setting up event listeners...");
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
        console.log("SCRIPT: Event listeners setup complete.");
    }

    // --- UI Update Functions ---
    function showGameMessage(message, type = 'info', duration = 3000) {
        if (!gameMessagePopup || !gameMessagePopup.firstChild) {
            console.error("SCRIPT ERROR: Game message popup or its p tag not found for message:", message);
            return;
        }
        const p = gameMessagePopup.firstChild;
        p.textContent = message;
        gameMessagePopup.className = ''; // Reset classes
        if (type === 'error') gameMessagePopup.classList.add('error');
        else if (type === 'success') gameMessagePopup.classList.add('success');

        gameMessagePopup.style.display = 'block'; // Make it visible before adding class for transition
        // Timeout to allow display:block to take effect before transition starts
        setTimeout(() => {
            gameMessagePopup.classList.add('visible');
        }, 10);

        setTimeout(() => {
            gameMessagePopup.classList.remove('visible');
            // Optionally hide with display:none after transition
            setTimeout(() => {
                 if (!gameMessagePopup.classList.contains('visible')) { // Check if it wasn't made visible again quickly
                    gameMessagePopup.style.display = 'none';
                 }
            }, 300); // Should match CSS transition duration for opacity/transform
        }, duration);
    }

    function resetGameUI(isNewRound = true) {
        console.log("SCRIPT: Resetting game UI, isNewRound:", isNewRound);
        currentHandCards = [];
        arrangedPilesData = { front: [], middle: [], back: [] };
        if(isNewRound) originalDealtHand = [];

        if(playerHandArea) playerHandArea.innerHTML = '';
        Object.values(pileWrappers).forEach(pw => { if(pw) pw.innerHTML = ''; });
        if(handAnalysisDisplay) handAnalysisDisplay.innerHTML = '';

        updatePileLabels();
        toggleActionButtons(false);
        if(dealBtn && !isAi托管Active) dealBtn.disabled = false;
        if(playerScoreDisplay && isNewRound) playerScoreDisplay.textContent = "本局得分: 0";
        if(ai托管Info) ai托管Info.style.display = 'none';
        console.log("SCRIPT: Game UI reset complete.");
    }

    function updatePileLabels() {
        for (const pileName in pileDropzones) {
            const zone = pileDropzones[pileName];
            const label = zone?.querySelector('.pile-label');
            if (label) {
                const max = zone.dataset.maxCards;
                // Preserve the first word of the label (e.g., "头墩")
                const labelPrefix = label.textContent.split(' ')[0];
                label.textContent = `${labelPrefix} (${arrangedPilesData[pileName].length}/${max})`;
            }
        }
    }

    function toggleActionButtons(showGameInProgressButtons) {
        if(sortBtn) sortBtn.style.display = showGameInProgressButtons ? 'inline-block' : 'none';
        if(resetBtn) resetBtn.style.display = showGameInProgressButtons ? 'inline-block' : 'none';
        if(aiSuggestBtn) aiSuggestBtn.style.display = showGameInProgressButtons ? 'inline-block' : 'none';
        if(ai托管Btn) ai托管Btn.style.display = showGameInProgressButtons && !isAi托管Active ? 'inline-block' : 'none'; // Hide if托管 active
        if(submitBtn) submitBtn.style.display = 'none'; // submitBtn visibility handled by checkIfReadyToSubmit
    }

    function displayAnalysis(analysisData) {
        if(!handAnalysisDisplay) { console.warn("Analysis display area not found."); return; }
        let html = '<h4>牌型分析:</h4>';
        const pilesOrder = ['front', 'middle', 'back'];
        const pilesDisplayNames = {'front': '头墩', 'middle': '中墩', 'back': '尾墩'};
        pilesOrder.forEach(pileKey => {
            const pileInfo = analysisData[pileKey];
            html += `<p><strong>${pilesDisplayNames[pileKey]}:</strong> 
                     ${pileInfo?.name || '-'} 
                     <em>(${pileInfo?.cards?.join(' ') || ''})</em></p>`;
        });
        handAnalysisDisplay.innerHTML = html;
    }

    // --- Card Element Creation & Rendering ---
    function createCardDOMElement(cardValue) {
        const [suitCharServer, rankChar] = cardValue.split(' ');
        const suitChar = suitCharServer.charAt(0).toUpperCase(); // Ensure it's a single character for consistency

        const el = document.createElement('div');
        el.className = 'card';
        el.classList.add(getSuitClass(suitChar)); // Use consistent suit char for class
        el.dataset.value = `${suitChar} ${rankChar}`; // Store normalized value
        el.draggable = true;
        el.innerHTML = `<span class="rank">${RANKS_DISPLAY[rankChar] || rankChar}</span>
                        <span class="suit">${SUITS_DISPLAY[suitChar] || suitChar}</span>`; // Use consistent suit char for display
        // Drag listeners will be added where the card is placed (hand or pile initially)
        return el;
    }

    function renderPlayerHand() {
        if(!playerHandArea) { console.error("Player hand area not found to render."); return; }
        playerHandArea.innerHTML = '';
        currentHandCards.forEach(cardObj => {
            // Ensure drag listeners are for 'hand' source when rendering to hand
            cardObj.element.removeEventListener('dragstart', handleDragStart); // Remove any old one
            cardObj.element.addEventListener('dragstart', (e) => handleDragStart(e, cardObj.element, 'hand'));
            cardObj.element.removeEventListener('dragend', handleDragEnd); // May not be necessary to remove if always same handler
            cardObj.element.addEventListener('dragend', handleDragEnd);
            playerHandArea.appendChild(cardObj.element);
        });
        console.log(`SCRIPT: Rendered ${currentHandCards.length} cards in player hand area.`);
    }

    function addCardToHandData(cardValue) {
        if (currentHandCards.some(c => c.value === cardValue)) {
             console.warn(`Card ${cardValue} already in hand data. Skipping.`); return;
        }
        const element = createCardDOMElement(cardValue);
        currentHandCards.push({ value: cardValue, element });
    }

    function removeCardFromHandData(cardValue) {
        currentHandCards = currentHandCards.filter(c => c.value !== cardValue);
    }

    function addCardToPileData(cardValue, pileName, cardElement) {
        if (!arrangedPilesData[pileName]) { console.error(`Invalid pile name "${pileName}" for adding card data.`); return; }
        // Ensure element's drag listeners are for 'pile' source
        cardElement.removeEventListener('dragstart', handleDragStart);
        cardElement.addEventListener('dragstart', (e) => handleDragStart(e, cardElement, 'pile', pileName));
        cardElement.removeEventListener('dragend', handleDragEnd);
        cardElement.addEventListener('dragend', handleDragEnd);
        arrangedPilesData[pileName].push({ value: cardValue, element: cardElement });
    }

    function removeCardFromPileData(cardValue, pileName) {
        if (!arrangedPilesData[pileName]) { console.error(`Invalid pile name "${pileName}" for removing card data.`); return; }
        arrangedPilesData[pileName] = arrangedPilesData[pileName].filter(c => c.value !== cardValue);
    }


    // --- Game Logic Handlers ---
    async function handleDealNewHand(isAiCall = false) {
        console.log("SCRIPT: handleDealNewHand called. AI Call:", isAiCall);
        if (!isAiCall && isAi托管Active) { // User clicks "New Game" while AI is active
            stopAi托管();
            showGameMessage("AI托管已因手动新局而取消。", "info");
        }
        resetGameUI(true);
        if(dealBtn) dealBtn.disabled = true;
        showGameMessage("正在发牌...", "info", 1500);

        try {
            const response = await fetch(`${API_URL}?action=deal`);
            if (!response.ok) {
                const errorText = await response.text().catch(() => "无法读取错误详情");
                throw new Error(`API发牌失败: ${response.status}. ${errorText}`);
            }
            const data = await response.json();
            if (!data.success || !data.hand || !Array.isArray(data.hand)) {
                throw new Error(data.message || "后端发牌数据格式错误");
            }

            originalDealtHand = [...data.hand];
            currentHandCards = []; // Clear before adding
            originalDealtHand.forEach(cv => addCardToHandData(cv)); // Add data
            renderPlayerHand(); // Then render all
            toggleActionButtons(true);
            if(dealBtn && !isAi托管Active) dealBtn.disabled = false;

            if (isAi托管Active && ai托管RoundsLeft > 0) {
                showGameMessage(`AI托管: 第 ${ai托管RoundsTotal - ai托管RoundsLeft + 1} 局理牌中...`, "info");
                setTimeout(ai托管ProcessRound, AI_OPERATION_DELAY);
            }
        } catch (err) {
            console.error("发牌错误:", err);
            showGameMessage(`发牌错误: ${err.message}`, "error");
            if(dealBtn) dealBtn.disabled = false;
        }
    }

    function handleSortHand() {
        currentHandCards.sort((a, b) => {
            const valA = RANK_VALUES_SORT[a.value.split(' ')[1]];
            const valB = RANK_VALUES_SORT[b.value.split(' ')[1]];
            if (valA !== valB) return valB - valA;
            return a.value.split(' ')[0].localeCompare(b.value.split(' ')[0]);
        });
        renderPlayerHand();
        showGameMessage("手牌已整理", "info", 1500);
    }

    function handleResetArrangement() {
        if(handAnalysisDisplay) handAnalysisDisplay.innerHTML = '';
        const cardsToReturn = [];
        for (const pileName in arrangedPilesData) {
            arrangedPilesData[pileName].forEach(cardObj => cardsToReturn.push(cardObj.value));
            arrangedPilesData[pileName] = [];
            if(pileWrappers[pileName]) pileWrappers[pileName].innerHTML = '';
        }
        // Re-add to hand data, then render. Avoid duplicates if already in hand.
        cardsToReturn.forEach(cv => {
            if(!currentHandCards.some(c => c.value === cv)) {
                addCardToHandData(cv);
            }
        });
        renderPlayerHand(); // Render after all data ops
        updatePileLabels();
        if(submitBtn) submitBtn.style.display = 'none';
        showGameMessage("牌墩已清空", "info");
    }

    async function handleAiSuggest(isAi托管Call = false) {
        let current13Cards = [];
        if (originalDealtHand.length === 13) { // Always use original hand for a fresh suggestion
            current13Cards = [...originalDealtHand];
        } else {
             showGameMessage("请先发牌", "error"); return Promise.reject("No cards for AI");
        }

        if(!isAi托管Call) showGameMessage("AI建议生成中...", "info", 2000);
        if(aiSuggestBtn && !isAi托管Call) aiSuggestBtn.disabled = true;

        try {
            const response = await fetch(`${API_URL}?action=aiSuggest`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ hand: current13Cards })
            });
            if (!response.ok) throw new Error(`AI建议API失败: ${response.status}`);
            const result = await response.json();
            if (!result.success || !result.suggestion) throw new Error(result.message || "AI建议数据错误");

            if(!isAi托管Call) showGameMessage("AI建议已应用 (仅供参考)", "success");
            handleResetArrangement(); // Clear board, all cards go to hand
            // Brief delay for DOM to update from reset, then place
            await new Promise(resolve => setTimeout(resolve, 50));

            placeCardsFromSuggestion(result.suggestion.front, 'front');
            placeCardsFromSuggestion(result.suggestion.middle, 'middle');
            placeCardsFromSuggestion(result.suggestion.back, 'back');

            updatePileLabels();
            checkIfReadyToSubmit();
            return Promise.resolve(result.suggestion);

        } catch (err) {
            console.error("AI建议错误:", err);
            if(!isAi托管Call) showGameMessage(`AI建议错误: ${err.message}`, "error");
            return Promise.reject(err.message);
        } finally {
            if(aiSuggestBtn && !isAi托管Call) aiSuggestBtn.disabled = false;
        }
    }

    function placeCardsFromSuggestion(suggestedCardValues, pileName) {
        const pileWrapper = pileWrappers[pileName];
        if (!pileWrapper) { console.error(`Pile wrapper for ${pileName} not found.`); return; }

        suggestedCardValues.forEach(cardValue => {
            const handCardIndex = currentHandCards.findIndex(c => c.value === cardValue);
            if (handCardIndex > -1) {
                const cardObj = currentHandCards.splice(handCardIndex, 1)[0]; // Remove from hand data
                addCardToPileData(cardValue, pileName, cardObj.element); // Add to pile data
                pileWrapper.appendChild(cardObj.element); // Move DOM element
            } else {
                console.warn(`Card ${cardValue} for AI suggestion not found in hand.`);
            }
        });
        renderPlayerHand(); // Update hand display after removing cards
    }


    async function handleSubmitHand(isAiCall = false) {
        const payload = {
            front: arrangedPilesData.front.map(c => c.value),
            middle: arrangedPilesData.middle.map(c => c.value),
            back: arrangedPilesData.back.map(c => c.value)
        };
        if (payload.front.length !== 3 || payload.middle.length !== 5 || payload.back.length !== 5) {
            showGameMessage("牌墩张数不正确！(3-5-5)", "error"); return Promise.reject("Invalid pile counts");
        }

        if(!isAiCall) showGameMessage("正在提交比牌...", "info");
        if(submitBtn) submitBtn.disabled = true;
        if(!isAiCall) { // Disable other buttons if user submits
            if(resetBtn) resetButton.disabled = true;
            if(sortBtn) sortBtn.disabled = true;
            if(aiSuggestBtn) aiSuggestBtn.disabled = true;
            if(ai托管Btn) ai托管Btn.disabled = true;
        }
        if(handAnalysisDisplay) handAnalysisDisplay.innerHTML = '';

        try {
            const response = await fetch(`${API_URL}?action=submitHand`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                 const errorData = await response.json().catch(()=>({message: `HTTP ${response.status}`}));
                 throw new Error(errorData.message || `提交API失败`);
            }
            const result = await response.json();

            if (result.success) {
                const scoreMsg = result.score !== undefined ? `得分: ${result.score}. ` : '';
                if(!isAiCall) showGameMessage(`比牌完成！${scoreMsg}${result.message || ''}`, "success");
                else showGameMessage(`AI托管: 本局完成. ${scoreMsg}`, "info", 2000);

                if (result.analysis) displayAnalysis(result.analysis);
                if(playerScoreDisplay && result.score !== undefined) playerScoreDisplay.textContent = `本局得分: ${result.score}`;
                if(roundResultButton) roundResultButton.style.display = 'inline-block';
                if(submitBtn) submitBtn.style.display = 'none'; // Hide after submit

                if(isAi托管Active) {
                    ai托管RoundsLeft--;
                    updateAi托管UIState();
                    if(ai托管RoundsLeft > 0) {
                        showGameMessage(`AI托管: ${AI_NEXT_ROUND_DELAY/1000}秒后开始下一局 (${ai托管RoundsLeft}/${ai托管RoundsTotal})`, "info");
                        setTimeout(() => handleDealNewHand(true), AI_NEXT_ROUND_DELAY);
                    } else {
                        showGameMessage("AI托管完成！", "success");
                        stopAi托管();
                    }
                }
                return Promise.resolve(result);
            } else { // Backend logical error (e.g.倒水)
                if(!isAiCall) showGameMessage(`提交被拒：${result.message}`, "error");
                else showGameMessage(`AI托管: 提交失败 - ${result.message}. 托管停止.`, "error");

                if (result.analysis) displayAnalysis(result.analysis);
                if (isAi托管Active) stopAi托管(); // Stop托管 on error
                else { // Re-enable buttons for user correction
                    if(submitBtn) submitBtn.disabled = false;
                    if(resetBtn) resetButton.disabled = false;
                    if(sortBtn) sortBtn.disabled = false;
                    if(aiSuggestBtn) aiSuggestBtn.disabled = false;
                    if(ai托管Btn) ai托管Btn.disabled = false;
                }
                return Promise.reject(result.message);
            }
        } catch (err) {
            console.error("提交错误:", err);
            if(!isAiCall) showGameMessage(`提交错误: ${err.message}`, "error");
            else showGameMessage(`AI托管: 提交异常 - ${err.message}. 托管停止.`, "error");

            if (isAi托管Active) stopAi托管();
            else {
                if(submitBtn) submitBtn.disabled = false;
                if(resetBtn) resetButton.disabled = false;
                if(sortBtn) sortBtn.disabled = false;
                if(aiSuggestBtn) aiSuggestBtn.disabled = false;
                if(ai托管Btn) ai托管Btn.disabled = false;
            }
            return Promise.reject(err.message);
        }
    }

    function checkIfReadyToSubmit() {
        const totalArranged = arrangedPilesData.front.length + arrangedPilesData.middle.length + arrangedPilesData.back.length;
        if (totalArranged === 13 && currentHandCards.length === 0) {
            if(submitBtn && !isAi托管Active) { // Only enable submit if not in AI托管
                submitBtn.style.display = 'inline-block';
                submitBtn.disabled = false;
            }
        } else {
            if(submitBtn) submitBtn.style.display = 'none';
        }
    }

    // --- Drag and Drop Handlers ---
    function handleDragStart(e, cardElement, sourceArea, sourcePileName = null) {
        // cardElement.classList.remove('selected-for-drag'); // If using click-select
        draggedCardInfo = {
            value: cardElement.dataset.value,
            element: cardElement,
            sourceArea: sourceArea, // 'hand' or 'pile'
            sourcePileName: sourcePileName
        };
        e.dataTransfer.setData('text/plain', draggedCardInfo.value);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => cardElement.classList.add('dragging'), 0); // Add dragging after a tick
    }
    function handleDragEnd(e) {
        if(draggedCardInfo && draggedCardInfo.element) {
            draggedCardInfo.element.classList.remove('dragging');
        }
        draggedCardInfo = null;
        Object.values(pileDropzones).forEach(zone => zone?.classList.remove('drag-over'));
    }
    function handleDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
    function handleDragEnter(e) {
        e.preventDefault();
        const dropzone = e.target.closest('.hand-pile-dropzone'); // Only highlight actual dropzones
        if (dropzone) dropzone.classList.add('drag-over');
    }
    function handleDragLeave(e) {
        const dropzone = e.target.closest('.hand-pile-dropzone');
        if (dropzone && !dropzone.contains(e.relatedTarget)) { // Check if mouse left the dropzone entirely
            dropzone.classList.remove('drag-over');
        }
    }

    function handleDropOnPile(e) {
        e.preventDefault();
        const dropzone = e.target.closest('.hand-pile-dropzone');
        if (!dropzone || !draggedCardInfo) return;
        dropzone.classList.remove('drag-over');

        const targetPileName = dropzone.dataset.pileName;
        const targetPileWrapper = pileWrappers[targetPileName];
        if(!targetPileWrapper) { console.error("Target pile wrapper not found:", targetPileName); return; }
        const maxCards = parseInt(dropzone.dataset.maxCards);

        if (arrangedPilesData[targetPileName].length < maxCards) {
            // Remove from source
            if (draggedCardInfo.sourceArea === 'hand') {
                removeCardFromHandData(draggedCardInfo.value);
                renderPlayerHand(); // Update hand display
            } else if (draggedCardInfo.sourceArea === 'pile' && draggedCardInfo.sourcePileName) {
                removeCardFromPileData(draggedCardInfo.value, draggedCardInfo.sourcePileName);
                // DOM element is already visually moved by drag, just update data
            }

            // Add to target pile
            addCardToPileData(draggedCardInfo.value, targetPileName, draggedCardInfo.element);
            targetPileWrapper.appendChild(draggedCardInfo.element); // Move DOM

            updatePileLabels();
            checkIfReadyToSubmit();
        } else {
            showGameMessage(`${targetPileName.charAt(0).toUpperCase() + targetPileName.slice(1)}墩已满!`, "error");
            // If dropped from hand and pile is full, card should remain in hand visually.
            // If dropped from another pile, it should revert (more complex, for now it might visually stay if not handled by dragend)
            // A simple revert if from hand:
            if (draggedCardInfo.sourceArea === 'hand' && playerHandArea) {
                // Ensure it's visually back in hand if not already
                if (!playerHandArea.contains(draggedCardInfo.element)) {
                    playerHandArea.appendChild(draggedCardInfo.element);
                }
            }
        }
        // draggedCardInfo cleared in dragend
    }

    function handleDropOnHandArea(e) {
        e.preventDefault();
        if (!draggedCardInfo || draggedCardInfo.sourceArea === 'hand') {
            // If from hand to hand (reordering), or invalid drag
            if (draggedCardInfo && draggedCardInfo.sourceArea === 'hand' && playerHandArea) {
                 playerHandArea.appendChild(draggedCardInfo.element); // Simple re-append
                 // For true reordering, update currentHandCards array order and re-render
            }
            return;
        }
        // Card is from a pile, returning to hand
        if (draggedCardInfo.sourceArea === 'pile' && draggedCardInfo.sourcePileName) {
            removeCardFromPileData(draggedCardInfo.value, draggedCardInfo.sourcePileName);
            addCardToHandData(draggedCardInfo.value); // This creates new element for hand
            renderPlayerHand(); // Re-render hand with the new card element

            updatePileLabels();
            checkIfReadyToSubmit();
        }
        // draggedCardInfo cleared in dragend
    }


    // --- AI 托管 Functions ---
    function toggleAi托管Modal() {
        if (isAi托管Active) { // If active, button acts as "Cancel 托管"
            stopAi托管();
            showGameMessage("AI托管已取消", "info");
        } else { // If inactive, show modal
            if(ai托管OptionsModal) ai托管OptionsModal.style.display = 'flex';
        }
    }

    function selectAi托管Rounds(rounds) {
        if(ai托管OptionsModal) ai托管OptionsModal.style.display = 'none';
        if (rounds > 0) {
            startAi托管(rounds);
        }
    }

    function startAi托管(rounds) {
        isAi托管Active = true;
        ai托管RoundsTotal = rounds;
        ai托管RoundsLeft = rounds;
        if(ai托管Btn) ai托管Btn.textContent = `取消托管 (${ai托管RoundsLeft}/${ai托管RoundsTotal})`;
        if(ai托管Info) ai托管Info.style.display = 'inline';
        updateAi托管UIState();

        // Disable manual controls during AI托管
        if(dealBtn) dealBtn.disabled = true;
        toggleActionButtons(false); // Hide sort, reset, suggest
        if(submitBtn) submitBtn.style.display = 'none'; // AI will handle submit

        showGameMessage(`AI托管已启动，共 ${rounds} 局。`, "success");
        // Start the first round if no game is in progress
        if (currentHandCards.length === 0 && arrangedPilesData.front.length === 0 && arrangedPilesData.middle.length === 0 && arrangedPilesData.back.length === 0) {
            handleDealNewHand(true); // Pass true for AI call
        } else {
            // If a game is in progress, AI will take over from next "deal" or current hand
            // For simplicity, let's assume it processes current hand if available, or waits for user to finish/reset
             showGameMessage(`AI将接管。当前手牌处理中...`, "info");
             ai托管ProcessRound(); // Process current state if cards are dealt
        }
    }

    function stopAi托管() {
        isAi托管Active = false;
        ai托管RoundsLeft = 0;
        if(ai托管Btn) {
            ai托管Btn.textContent = 'AI托管';
            ai托管Btn.style.display = (originalDealtHand.length > 0) ? 'inline-block' : 'none'; // Show if game started
        }
        if(ai托管Info) ai托管Info.style.display = 'none';
        if(dealBtn) dealBtn.disabled = false; // Re-enable manual deal
        toggleActionButtons(originalDealtHand.length > 0); // Show relevant buttons if game was in progress
        checkIfReadyToSubmit(); // Check if manual submit should be available
    }

    function updateAi托管UIState() {
        if(ai托管Info) {
            if(isAi托管Active) {
                ai托管Info.textContent = `托管中: ${ai托管RoundsLeft}/${ai托管RoundsTotal}`;
                ai托管Info.style.display = 'inline';
            } else {
                ai托管Info.style.display = 'none';
            }
        }
        if(ai托管Btn) {
            ai托管Btn.textContent = isAi托管Active ? `取消托管 (${ai托管RoundsLeft}/${ai托管RoundsTotal})` : 'AI托管';
        }
    }

    async function ai托管ProcessRound() {
        if (!isAi托管Active || ai托管RoundsLeft <= 0) {
            if (isAi托管Active) stopAi托管(); // Ensure it's stopped if rounds are 0
            return;
        }
        console.log(`SCRIPT: AI托管 processing round ${ai托管RoundsTotal - ai托管RoundsLeft + 1}`);
        updateAi托管UIState();

        try {
            // Step 1: AI Suggest and Place Cards
            showGameMessage(`AI托管: 理牌中... (${ai托管RoundsLeft}/${ai托管RoundsTotal})`, "info", AI_OPERATION_DELAY);
            await new Promise(resolve => setTimeout(resolve, AI_OPERATION_DELAY / 2)); // Simulate "thinking"
            await handleAiSuggest(true); // true for AI托管 call

            // Step 2: Submit Hand
            showGameMessage(`AI托管: 提交牌型... (${ai托管RoundsLeft}/${ai托管RoundsTotal})`, "info", AI_OPERATION_DELAY);
            await new Promise(resolve => setTimeout(resolve, AI_OPERATION_DELAY / 2));
            await handleSubmitHand(true); // true for AI托管 call
            // handleSubmitHand will handle next round if托管 is still active and rounds left
        } catch (error) {
            console.error("AI托管回合错误:", error);
            showGameMessage(`AI托管错误: ${error}. 托管已停止。`, "error");
            stopAi托管();
        }
    }

    // --- Utility ---
    function getSuitClass(suitKey) {
        const s = suitKey.charAt(0).toLowerCase();
        if (s === 'h') return 'hearts'; if (s === 'd') return 'diamonds';
        if (s === 's') return 'spades'; if (s === 'c') return 'clubs';
        return '';
    }

    // --- Start the game ---
    initGame();
});
