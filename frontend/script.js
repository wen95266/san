// 这份代码与我上一轮提供的最终版 script.js 基本一致，
// 但我会仔细检查第114行附近的赋值操作。

document.addEventListener('DOMContentLoaded', () => {
    console.log("十三水游戏脚本初始化 - 经典桌面最终版 (fix assignment error attempt)");

    // DOM Elements
    const dealBtn = document.getElementById('deal-btn');
    const sortBtn = document.getElementById('sort-btn');
    const resetBtn = document.getElementById('reset-btn');
    const aiSuggestBtn = document.getElementById('ai-suggest-btn');
    const ai托管Btn = document.getElementById('ai-托管-btn');
    const submitBtn = document.getElementById('submit-btn');

    const playerHandArea = document.getElementById('player-hand-cards-center-display');
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

    const API_URL = 'https://9526.ip-ddns.com/thirteen_api/api.php';
    console.log("API URL:", API_URL);

    const SUITS_DISPLAY = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
    const RANKS_DISPLAY = { 'A': 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K' };
    const RANK_VALUES_SORT = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14};

    let all13CardsData = [];
    let originalDealtHandStrings = [];
    let draggedCardInfo = null;

    let isAi托管Active = false;
    let ai托管RoundsTotal = 0;
    let ai托管RoundsLeft = 0;
    const AI_OPERATION_DELAY = 1200;
    const AI_NEXT_ROUND_DELAY = 2500;

    function initGame() {
        console.log("SCRIPT: Initializing game...");
        setupEventListeners();
        resetGameUI();
        if(playerNameDisplay) playerNameDisplay.textContent = "玩家_" + Math.random().toString(36).substring(2, 6);
        showGameMessage("点击“新局”开始游戏");
        console.log("SCRIPT: Game initialized.");
    }

    function setupEventListeners() {
        console.log("SCRIPT: Setting up event listeners...");
        dealBtn?.addEventListener('click', () => handleDealNewHand());
        sortBtn?.addEventListener('click', handleSortHand);
        resetBtn?.addEventListener('click', handleResetArrangement);
        aiSuggestBtn?.addEventListener('click', () => handleAiSuggest());
        ai托管Btn?.addEventListener('click', toggleAi托管Modal);
        submitBtn?.addEventListener('click', () => handleSubmitHand());

        Object.values(pileDropzones).forEach(zone => {
            if (!zone) { console.warn("A pile dropzone is null during listener setup."); return; }
            zone.addEventListener('dragover', handleDragOver);
            zone.addEventListener('dragenter', handleDragEnterGeneric);
            zone.addEventListener('dragleave', handleDragLeaveGeneric);
            zone.addEventListener('drop', handleDrop);
        });

        playerHandArea?.addEventListener('dragover', handleDragOver);
        playerHandArea?.addEventListener('drop', handleDropOnPlayerHandArea);

        ai托管OptionsModal?.querySelectorAll('button.game-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const rounds = parseInt(e.target.dataset.rounds);
                selectAi托管Rounds(rounds);
            });
        });
        console.log("SCRIPT: Event listeners setup complete.");
    }

    function showGameMessage(message, type = 'info', duration = 3000) {
        if (!gameMessagePopup || !gameMessagePopup.firstChild) {
            console.error("SCRIPT ERROR: Game message popup or its p tag not found for message:", message);
            return;
        }
        const p = gameMessagePopup.firstChild;
        p.textContent = message;
        gameMessagePopup.className = '';
        if (type === 'error') gameMessagePopup.classList.add('error');
        else if (type === 'success') gameMessagePopup.classList.add('success');

        gameMessagePopup.style.display = 'block';
        setTimeout(() => { gameMessagePopup.classList.add('visible'); }, 10);

        setTimeout(() => {
            gameMessagePopup.classList.remove('visible');
            setTimeout(() => {
                 if (!gameMessagePopup.classList.contains('visible')) {
                    gameMessagePopup.style.display = 'none';
                 }
            }, 350);
        }, duration);
    }

    function resetGameUI(isNewRound = true) {
        console.log("SCRIPT: Resetting game UI, isNewRound:", isNewRound);
        all13CardsData = [];
        if(isNewRound) originalDealtHandStrings = [];

        playerHandArea?.querySelectorAll('.card').forEach(c => c.remove()); // More robust clearing
        frontPileWrapper?.innerHTML = '';
        middlePileWrapper?.innerHTML = '';
        // pileWrappers.back is not used in this layout as back pile is playerHandArea
        // If playerHandArea has a specific label div like other piles, reset it:
        const handLabel = playerHandArea?.querySelector('.zone-label'); // Assuming you add such a label
        if (handLabel) handLabel.textContent = `手牌 / 尾墩 (0张)`;


        if(handAnalysisDisplay) handAnalysisDisplay.innerHTML = '';

        updateAllZoneLabels();
        toggleActionButtons(false);
        if(dealBtn && !isAi托管Active) dealBtn.disabled = false;
        if(playerScoreDisplay && isNewRound) playerScoreDisplay.textContent = "本局得分: 0";
        if(ai托管Info) ai托管Info.style.display = 'none';
        console.log("SCRIPT: Game UI reset complete.");
    }

    // *** 检查这里的赋值操作 ***
    function updateAllZoneLabels() {
        const frontCardsCount = all13CardsData.filter(c => c.currentZone === 'front').length;
        const middleCardsCount = all13CardsData.filter(c => c.currentZone === 'middle').length;
        const handBackCardsCount = all13CardsData.filter(c => c.currentZone === 'hand').length;

        const frontLabel = pileDropzones.front?.querySelector('.pile-label');
        if (frontLabel) {
            frontLabel.textContent = `头墩 (${frontCardsCount}/3)`; // 正确的赋值
        }

        const middleLabel = pileDropzones.middle?.querySelector('.pile-label');
        if (middleLabel) {
            middleLabel.textContent = `中墩 (${middleCardsCount}/5)`; // 正确的赋值
        }
        
        // For the hand/back pile zone, assuming it might have a label (added in HTML for consistency)
        const handBackZoneLabelElement = playerHandAndBackPileZone?.querySelector('.zone-label'); // If you added one with class 'zone-label'
        if (handBackZoneLabelElement) {
            let handBackLabelText = `手牌 (${handBackCardsCount}张)`;
            if (frontCardsCount === 3 && middleCardsCount === 5) {
                // Now the hand zone effectively becomes the back pile
                handBackLabelText = `尾墩 (${handBackCardsCount}/5)`;
            }
            handBackZoneLabelElement.textContent = handBackLabelText; // 正确的赋值
        }
    }

    function toggleActionButtons(showGameInProgressButtons) {
        // ... (之前的代码) ...
        if(sortBtn) sortBtn.style.display = showGameInProgressButtons ? 'inline-block' : 'none';
        if(resetBtn) resetBtn.style.display = showGameInProgressButtons ? 'inline-block' : 'none';
        if(aiSuggestBtn) aiSuggestBtn.style.display = showGameInProgressButtons ? 'inline-block' : 'none';
        if(ai托管Btn) ai托管Btn.style.display = showGameInProgressButtons && !isAi托管Active ? 'inline-block' : 'none';
        if(submitBtn) submitBtn.style.display = 'none'; // This will be handled by checkIfReadyToSubmit
    }

    function displayAnalysis(analysisData) {
        // ... (代码与上一轮相同) ...
        if(!handAnalysisDisplay) { return; } // Guard if element doesn't exist
        let html = '<h4>牌型分析:</h4>';
        const pilesOrder = ['front', 'middle', 'back'];
        const pilesDisplayNames = {'front': '头墩', 'middle': '中墩', 'back': '尾墩'};
        pilesOrder.forEach(pileKey => {
            const pileInfo = analysisData[pileKey];
            const displayName = pilesDisplayNames[pileKey] || pileKey;
            html += `<p><strong>${displayName}:</strong> 
                     ${pileInfo?.name || '-'} 
                     <em>(${pileInfo?.cards?.join(' ') || ''})</em></p>`;
        });
        handAnalysisDisplay.innerHTML = html;
    }

    function createBasicCardElement(cardValue){
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

    function createCardDOMElement(cardValue) {
        const el = createBasicCardElement(cardValue);
        return el;
    }

    function rerenderAllZones() {
        playerHandAndBackPileZone?.querySelectorAll('.card').forEach(c => c.remove());
        frontPileWrapper?.innerHTML = '';
        middlePileWrapper?.innerHTML = '';

        all13CardsData.forEach(cardObj => {
            cardObj.element.removeEventListener('dragstart', handleDragStart);
            cardObj.element.removeEventListener('dragend', handleDragEnd);

            let currentZoneForListener = cardObj.currentZone; // 'hand', 'front', 'middle'

            cardObj.element.addEventListener('dragstart', (e) => handleDragStart(e, cardObj.element, currentZoneForListener));
            cardObj.element.addEventListener('dragend', handleDragEnd);

            if (cardObj.currentZone === 'front' && frontPileWrapper) {
                frontPileWrapper.appendChild(cardObj.element);
            } else if (cardObj.currentZone === 'middle' && middlePileWrapper) {
                middlePileWrapper.appendChild(cardObj.element);
            } else if (cardObj.currentZone === 'hand' && playerHandAndBackPileZone) {
                playerHandAndBackPileZone.appendChild(cardObj.element);
            }
        });
        updateAllZoneLabels();
        checkIfReadyToSubmit();
        console.log("SCRIPT: All zones re-rendered.");
    }

    async function handleDealNewHand(isAiCall = false) {
        // ... (代码与上一轮相同, 确保 try...catch 完整) ...
        console.log("SCRIPT: handleDealNewHand called. AI Call:", isAiCall);
        if (!isAiCall && isAi托管Active) {
            stopAi托管(); showGameMessage("AI托管已因手动新局而取消。", "info");
        }
        resetGameUI(true);
        if(dealBtn) dealBtn.disabled = true;
        showGameMessage("正在发牌...", "info", 1500);

        try {
            const response = await fetch(`${API_URL}?action=deal`);
            if (!response.ok) {
                const errorText = await response.text().catch(() => `HTTP ${response.status}`);
                throw new Error(`API发牌失败: ${errorText}`);
            }
            const data = await response.json();
            if (!data.success || !data.hand || !Array.isArray(data.hand)) {
                throw new Error(data.message || "后端发牌数据格式错误");
            }

            originalDealtHandStrings = [...data.hand];
            all13CardsData = originalDealtHandStrings.map(val => ({
                value: val, element: createCardDOMElement(val), currentZone: 'hand'
            }));
            rerenderAllZones();
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
        // ... (代码与上一轮相同) ...
        const handCardsToSort = all13CardsData.filter(c => c.currentZone === 'hand');
        handCardsToSort.sort((a, b) => {
            const valA = RANK_VALUES_SORT[a.value.split(' ')[1]];
            const valB = RANK_VALUES_SORT[b.value.split(' ')[1]];
            if (valA !== valB) return valB - valA;
            return a.value.split(' ')[0].localeCompare(b.value.split(' ')[0]);
        });
        const pileCards = all13CardsData.filter(c => c.currentZone !== 'hand');
        all13CardsData = [...pileCards, ...handCardsToSort];
        rerenderAllZones();
        showGameMessage("手牌已整理", "info", 1500);
    }

    function handleResetArrangement() {
        // ... (代码与上一轮相同) ...
        if(handAnalysisDisplay) handAnalysisDisplay.innerHTML = '';
        all13CardsData.forEach(cardObj => cardObj.currentZone = 'hand');
        rerenderAllZones();
        if(submitBtn) submitBtn.style.display = 'none';
        showGameMessage("牌墩已清空，请重新理牌", "info");
    }

    async function handleAiSuggest(isAi托管Call = false) {
        // ... (代码与上一轮相同, 确保 try...catch...finally 完整) ...
        let current13Cards = (originalDealtHandStrings.length === 13) ? [...originalDealtHandStrings] : [];
        if (current13Cards.length !== 13) {
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

            all13CardsData.forEach(c => c.currentZone = 'hand');
            const { front, middle, back } = result.suggestion;

            const applySuggestionToZone = (cardsToPlace, zoneName) => {
                cardsToPlace.forEach(cardValue => {
                    const card = all13CardsData.find(c => c.value === cardValue && c.currentZone === 'hand');
                    if (card) card.currentZone = zoneName;
                    else console.warn(`AI Suggest: Card ${cardValue} for ${zoneName} not found or moved.`);
                });
            };
            applySuggestionToZone(front, 'front');
            applySuggestionToZone(middle, 'middle');
            // 'back' cards from AI remain in 'hand' zone

            rerenderAllZones();
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

    async function handleSubmitHand(isAiCall = false) {
        const payload = {
            front: all13CardsData.filter(c=>c.currentZone === 'front').map(c=>c.value),
            middle: all13CardsData.filter(c=>c.currentZone === 'middle').map(c=>c.value),
            back: all13CardsData.filter(c=>c.currentZone === 'hand').map(c=>c.value)
        };
        if (payload.front.length !== 3 || payload.middle.length !== 5 || payload.back.length !== 5) {
            showGameMessage("牌墩张数不正确！(头3, 中5, 尾5)", "error"); return Promise.reject("Invalid pile counts");
        }

        if(!isAiCall) showGameMessage("正在提交比牌...", "info");
        if(submitBtn) submitBtn.disabled = true;
        if(!isAiCall) {
            if(resetBtn) resetButton.disabled = true; if(sortBtn) sortBtn.disabled = true;
            if(aiSuggestBtn) aiSuggestBtn.disabled = true; if(ai托管Btn) ai托管Btn.disabled = true;
        }
        if(handAnalysisDisplay) handAnalysisDisplay.innerHTML = '';
        let resultText = ""; // For debugging raw response

        try {
            const response = await fetch(`${API_URL}?action=submitHand`, {
                method: 'POST', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(payload)
            });
            resultText = await response.text(); // Always get text first for debugging
            const result = JSON.parse(resultText);    // Then try to parse

            if (!response.ok) { // Check HTTP status code for errors (4xx, 5xx)
                throw new Error(result.message || `提交API失败: HTTP ${response.status}`);
            }

            if (result.success) {
                const scoreMsg = result.score !== undefined ? `得分: ${result.score}. ` : '';
                const finalMsg = `比牌完成！${scoreMsg}${result.message || ''}`;
                if(!isAiCall) showGameMessage(finalMsg, "success");
                else showGameMessage(`AI托管: 本局完成. ${scoreMsg}`, "info", 2000);

                if (result.analysis) displayAnalysis(result.analysis);
                if(playerScoreDisplay && result.score !== undefined) playerScoreDisplay.textContent = `本局得分: ${result.score}`;
                // if(roundResultButton) roundResultButton.style.display = 'inline-block'; // If you implement this
                if(submitBtn) submitBtn.style.display = 'none'; // Hide after successful submit

                if(isAi托管Active) {
                    ai托管RoundsLeft--;
                    updateAi托管UIState();
                    if(ai托管RoundsLeft > 0) {
                        showGameMessage(`AI托管: ${AI_NEXT_ROUND_DELAY/1000}秒后下一局 (${ai托管RoundsLeft}/${ai托管RoundsTotal})`, "info");
                        setTimeout(() => handleDealNewHand(true), AI_NEXT_ROUND_DELAY);
                    } else {
                        showGameMessage("AI托管完成！", "success");
                        stopAi托管();
                    }
                }
                return Promise.resolve(result);
            } else { // Backend returned success:false (e.g., 倒水)
                const errMsg = `提交被拒：${result.message || "未知原因"}`;
                if(!isAiCall) showGameMessage(errMsg, "error");
                else showGameMessage(`AI托管: 提交失败 - ${result.message || "未知原因"}. 托管停止.`, "error");

                if (result.analysis) displayAnalysis(result.analysis);
                if (isAi托管Active) {
                     stopAi托管();
                } else { // Re-enable buttons for user correction if not AI托管
                    if(submitBtn) submitBtn.disabled = false;
                    if(resetBtn) resetButton.disabled = false;
                    if(sortBtn) sortBtn.disabled = false;
                    if(aiSuggestBtn) aiSuggestBtn.disabled = false;
                    if(ai托管Btn) ai托管Btn.disabled = false;
                }
                return Promise.reject(result.message || "后端逻辑错误");
            }
        } catch (err) { // Catches network errors or JSON.parse errors
            console.error("提交错误:", err, "Raw response text was:", resultText);
            const displayError = err.message && err.message.toLowerCase().includes("json.parse") ? "服务器响应格式错误" : (err.message || "未知提交错误");

            if(!isAiCall) showGameMessage(`提交错误: ${displayError}`, "error");
            else showGameMessage(`AI托管: 提交异常 - ${displayError}. 托管停止.`, "error");

            if (isAi托管Active) {
                stopAi托管();
            } else { // Re-enable buttons for user correction if not AI托管
                if(submitBtn) submitBtn.disabled = false;
                if(resetBtn) resetButton.disabled = false;
                if(sortBtn) sortBtn.disabled = false;
                if(aiSuggestBtn) aiSuggestBtn.disabled = false;
                if(ai托管Btn) ai托管Btn.disabled = false;
            }
            return Promise.reject(err.message || "提交时捕获到异常");
        }
    }


    function checkIfReadyToSubmit() {
        // ... (代码与上一轮相同) ...
        const frontCount = all13CardsData.filter(c=>c.currentZone === 'front').length;
        const middleCount = all13CardsData.filter(c=>c.currentZone === 'middle').length;
        const handCount = all13CardsData.filter(c=>c.currentZone === 'hand').length;

        if (frontCount === 3 && middleCount === 5 && handCount === 5) { // All cards placed
            if(submitBtn && !isAi托管Active) {
                submitBtn.style.display = 'inline-block';
                submitBtn.disabled = false;
            }
        } else {
            if(submitBtn) submitBtn.style.display = 'none';
        }
    }

    function handleDragStart(e, cardElement, sourceZoneName) {
        // ... (代码与上一轮相同) ...
        draggedCardInfo = {
            value: cardElement.dataset.value,
            element: cardElement,
            originalZone: sourceZoneName
        };
        try { e.dataTransfer.setData('text/plain', draggedCardInfo.value); e.dataTransfer.effectAllowed = 'move'; }
        catch (ex) { console.warn("Drag setData error:", ex); }
        setTimeout(() => cardElement.classList.add('dragging'), 0);
    }
    function handleDragEnd(e) {
        // ... (代码与上一轮相同) ...
        if(draggedCardInfo && draggedCardInfo.element) {
            draggedCardInfo.element.classList.remove('dragging');
        }
        draggedCardInfo = null;
        // Clear drag-over from all potential dropzones
        [frontPileZone, middlePileZone, playerHandAndBackPileZone].forEach(zone => zone?.classList.remove('drag-over'));
    }
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

    function handleDrop(e) {
        // ... (代码与上一轮相同，确保 try...catch 完整) ...
        e.preventDefault();
        const targetZoneElement = e.target.closest('.droptarget-pile, .droptarget-hand');
        if (!targetZoneElement || !draggedCardInfo) return;
        targetZoneElement.classList.remove('drag-over');

        const targetZoneName = targetZoneElement.dataset.pileName || (targetZoneElement === playerHandAndBackPileZone ? 'hand' : null);
        if (!targetZoneName) { console.error("Drop target zone name not identified."); return; }

        const cardToMove = all13CardsData.find(c => c.value === draggedCardInfo.value);
        if (!cardToMove) { console.error("Dragged card data not found."); return; }

        if (cardToMove.currentZone === targetZoneName) { rerenderAllZones(); return; }

        const maxCardsForTarget = targetZoneElement.dataset.maxCards ? parseInt(targetZoneElement.dataset.maxCards) : (targetZoneName === 'hand' ? 13 : 0);
        const currentCardsInTarget = all13CardsData.filter(c => c.currentZone === targetZoneName).length;

        if (targetZoneName !== 'hand' && currentCardsInTarget >= maxCardsForTarget) {
            showGameMessage(`${targetZoneElement.querySelector('.zone-label').textContent.split('(')[0].trim()}已满!`, "error");
            rerenderAllZones();
            return;
        }
        cardToMove.currentZone = targetZoneName;
        rerenderAllZones();
    }

    // AI 托管 Functions (toggleAi托管Modal, selectAi托管Rounds, startAi托管, stopAi托管, updateAi托管UIState, ai托管ProcessRound)
    // 这些函数的逻辑与上一轮的完整版本相同，此处为简洁省略，但它们必须存在且正确。
    // 请参考上一轮提供的完整script.js中这些函数的实现。
    function toggleAi托管Modal() {
        if (isAi托管Active) {
            stopAi托管(); showGameMessage("AI托管已取消", "info");
        } else {
            if(ai托管OptionsModal) ai托管OptionsModal.style.display = 'flex';
        }
    }
    function selectAi托管Rounds(rounds) {
        if(ai托管OptionsModal) ai托管OptionsModal.style.display = 'none';
        if (rounds > 0) startAi托管(rounds);
    }
    function startAi托管(rounds) {
        isAi托管Active = true; ai托管RoundsTotal = rounds; ai托管RoundsLeft = rounds;
        updateAi托管UIState();
        if(dealBtn) dealBtn.disabled = true; toggleActionButtons(false);
        if(submitBtn) submitBtn.style.display = 'none';
        showGameMessage(`AI托管启动，共 ${rounds} 局。`, "success");
        if (all13CardsData.filter(c => c.currentZone === 'hand').length === 0 && all13CardsData.filter(c => c.currentZone !== 'hand').length === 0) { // No cards anywhere
            handleDealNewHand(true);
        } else { ai托管ProcessRound(); }
    }
    function stopAi托管() {
        isAi托管Active = false; ai托管RoundsLeft = 0;
        updateAi托管UIState();
        if(dealBtn) dealBtn.disabled = false;
        toggleActionButtons(originalDealtHandStrings.length > 0);
        checkIfReadyToSubmit();
    }
    function updateAi托管UIState() {
        if(ai托管Info) {
            ai托管Info.textContent = isAi托管Active ? `托管中: ${ai托管RoundsLeft}/${ai托管RoundsTotal}` : '';
            ai托管Info.style.display = isAi托管Active ? 'inline' : 'none';
        }
        if(ai托管Btn) {
            ai托管Btn.textContent = isAi托管Active ? `取消托管 (${ai托管RoundsLeft})` : 'AI托管';
            ai托管Btn.style.display = (originalDealtHandStrings.length > 0 || isAi托管Active) ? 'inline-block' : 'none';
        }
    }
    async function ai托管ProcessRound() {
        if (!isAi托管Active || ai托管RoundsLeft <= 0) { if(isAi托管Active) stopAi托管(); return; }
        updateAi托管UIState();
        try {
            showGameMessage(`AI托管: 理牌中... (${ai托管RoundsLeft}/${ai托管RoundsTotal})`, "info", AI_OPERATION_DELAY);
            await new Promise(resolve => setTimeout(resolve, AI_OPERATION_DELAY / 2));
            await handleAiSuggest(true);
            showGameMessage(`AI托管: 提交牌型... (${ai托管RoundsLeft}/${ai托管RoundsTotal})`, "info", AI_OPERATION_DELAY);
            await new Promise(resolve => setTimeout(resolve, AI_OPERATION_DELAY / 2));
            await handleSubmitHand(true);
        } catch (error) {
            console.error("AI托管回合错误:", error);
            showGameMessage(`AI托管错误: ${error}. 托管已停止。`, "error");
            stopAi托管();
        }
    }


    function getSuitClass(suitKey) {
        const s = suitKey.charAt(0).toLowerCase();
        if (s === 'h') return 'hearts'; if (s === 'd') return 'diamonds';
        if (s === 's') return 'spades'; if (s === 'c') return 'clubs';
        return '';
    }

    initGame();
}); // <<< इंश्योर थिस इस थे वेरी लास्ट लाइन ऑफ़ थे फाइल, नो एक्स्ट्रा chars AFTER आईटी
