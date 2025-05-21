// 这部分代码与您上一轮提供的、我已确认无明显语法错误并补充了缺失部分的 script.js 基本一致。
// 为确保完整性，我会复制上一轮的最终版本。
// 请确认这里的 API_URL 是您正确的后端地址。

document.addEventListener('DOMContentLoaded', () => {
    console.log("十三水游戏脚本初始化 - 经典桌面布局 vFinal");

    // DOM Elements
    const dealBtn = document.getElementById('deal-btn');
    const sortBtn = document.getElementById('sort-btn');
    const resetBtn = document.getElementById('reset-btn');
    const aiSuggestBtn = document.getElementById('ai-suggest-btn');
    const ai托管Btn = document.getElementById('ai-托管-btn');
    const submitBtn = document.getElementById('submit-btn');

    const playerHandArea = document.getElementById('player-hand-cards-bottom-bar');
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
    const API_URL = 'https://9526.ip-ddns.com/thirteen_api/api.php'; // 您的API地址
    console.log("API URL:", API_URL);

    // Card Definitions
    const SUITS_DISPLAY = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
    const RANKS_DISPLAY = { 'A': 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K' };
    const RANK_VALUES_SORT = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14};

    // Game State
    let currentHandCards = [];
    let arrangedPilesData = { front: [], middle: [], back: [] };
    let originalDealtHand = [];
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
            zone.addEventListener('dragenter', handleDragEnter);
            zone.addEventListener('dragleave', handleDragLeave);
            zone.addEventListener('drop', handleDropOnPile);
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
            if (!zone) continue;
            const label = zone.querySelector('.pile-label');
            if (label) {
                const max = zone.dataset.maxCards;
                const labelPrefix = label.textContent.split(' ')[0];
                label.textContent = `${labelPrefix} (${arrangedPilesData[pileName].length}/${max})`;
            }
        }
    }

    function toggleActionButtons(showGameInProgressButtons) {
        if(sortBtn) sortBtn.style.display = showGameInProgressButtons ? 'inline-block' : 'none';
        if(resetBtn) resetBtn.style.display = showGameInProgressButtons ? 'inline-block' : 'none';
        if(aiSuggestBtn) aiSuggestBtn.style.display = showGameInProgressButtons ? 'inline-block' : 'none';
        if(ai托管Btn) ai托管Btn.style.display = showGameInProgressButtons && !isAi托管Active ? 'inline-block' : 'none';
        if(submitBtn) submitBtn.style.display = 'none';
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

    function createCardDOMElement(cardValue) {
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

    function renderPlayerHand() {
        if(!playerHandArea) { console.error("Player hand area not found to render."); return; }
        playerHandArea.innerHTML = '';
        currentHandCards.forEach(cardObj => {
            cardObj.element.removeEventListener('dragstart', handleDragStart);
            cardObj.element.addEventListener('dragstart', (e) => handleDragStart(e, cardObj.element, 'bottomHand'));
            cardObj.element.removeEventListener('dragend', handleDragEnd);
            cardObj.element.addEventListener('dragend', handleDragEnd);
            playerHandArea.appendChild(cardObj.element);
        });
    }

    function addCardToHandData(cardValue) {
        if (currentHandCards.some(c => c.value === cardValue)) { return; }
        const element = createCardDOMElement(cardValue);
        currentHandCards.push({ value: cardValue, element });
    }

    function removeCardFromHandData(cardValue) {
        currentHandCards = currentHandCards.filter(c => c.value !== cardValue);
    }

    function addCardToPileData(cardValue, pileName, cardElement) {
        if (!arrangedPilesData[pileName]) { console.error(`Invalid pile name "${pileName}"`); return; }
        cardElement.removeEventListener('dragstart', handleDragStart);
        cardElement.addEventListener('dragstart', (e) => handleDragStart(e, cardElement, 'pile', pileName));
        cardElement.removeEventListener('dragend', handleDragEnd);
        cardElement.addEventListener('dragend', handleDragEnd);
        arrangedPilesData[pileName].push({ value: cardValue, element: cardElement });
    }

    function removeCardFromPileData(cardValue, pileName) {
        if (!arrangedPilesData[pileName]) { console.error(`Invalid pile name "${pileName}"`); return; }
        arrangedPilesData[pileName] = arrangedPilesData[pileName].filter(c => c.value !== cardValue);
    }

    async function handleDealNewHand(isAiCall = false) {
        console.log("SCRIPT: handleDealNewHand called. AI Call:", isAiCall);
        if (!isAiCall && isAi托管Active) {
            stopAi托管();
            showGameMessage("AI托管已因手动新局而取消。", "info");
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

            originalDealtHand = [...data.hand];
            currentHandCards = [];
            originalDealtHand.forEach(cv => addCardToHandData(cv));
            renderPlayerHand();
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
        cardsToReturn.forEach(cv => {
            if(!currentHandCards.some(c => c.value === cv)) addCardToHandData(cv);
        });
        renderPlayerHand();
        updatePileLabels();
        if(submitBtn) submitBtn.style.display = 'none';
        showGameMessage("牌墩已清空，请重新理牌", "info");
    }

    async function handleAiSuggest(isAi托管Call = false) {
        let current13Cards = (originalDealtHand.length === 13) ? [...originalDealtHand] : [];
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
            handleResetArrangement();
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
                const cardObj = currentHandCards.splice(handCardIndex, 1)[0];
                addCardToPileData(cardValue, pileName, cardObj.element);
                pileWrapper.appendChild(cardObj.element);
            } else {
                console.warn(`Card ${cardValue} for AI suggestion not found in hand.`);
            }
        });
        renderPlayerHand();
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
            resultText = await response.text();
            const result = JSON.parse(resultText);

            if (!response.ok) throw new Error(result.message || `提交API失败: ${response.status}`);

            if (result.success) {
                const scoreMsg = result.score !== undefined ? `得分: ${result.score}. ` : '';
                const finalMsg = `比牌完成！${scoreMsg}${result.message || ''}`;
                if(!isAiCall) showGameMessage(finalMsg, "success");
                else showGameMessage(`AI托管: 本局完成. ${scoreMsg}`, "info", 2000);

                if (result.analysis) displayAnalysis(result.analysis);
                if(playerScoreDisplay && result.score !== undefined) playerScoreDisplay.textContent = `本局得分: ${result.score}`;
                // if(roundResultButton) roundResultButton.style.display = 'inline-block'; // Not used yet
                if(submitBtn) submitBtn.style.display = 'none';

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
            } else {
                const errMsg = `提交被拒：${result.message || "未知原因"}`;
                if(!isAiCall) showGameMessage(errMsg, "error");
                else showGameMessage(`AI托管: 提交失败 - ${result.message || "未知原因"}. 托管停止.`, "error");

                if (result.analysis) displayAnalysis(result.analysis);
                if (isAi托管Active) stopAi托管();
                else {
                    if(submitBtn) submitBtn.disabled = false; if(resetBtn) resetButton.disabled = false;
                    if(sortBtn) sortBtn.disabled = false; if(aiSuggestBtn) aiSuggestBtn.disabled = false;
                    if(ai托管Btn) ai托管Btn.disabled = false;
                }
                return Promise.reject(result.message || "后端逻辑错误");
            }
        } catch (err) {
            console.error("提交错误:", err, "Raw response text:", resultText);
            const displayError = err.message && err.message.includes("JSON.parse") ? "服务器响应格式错误" : (err.message || "未知提交错误");
            if(!isAiCall) showGameMessage(`提交错误: ${displayError}`, "error");
            else showGameMessage(`AI托管: 提交异常 - ${displayError}. 托管停止.`, "error");

            if (isAi托管Active) stopAi托管();
            else {
                if(submitBtn) submitBtn.disabled = false; if(resetBtn) resetButton.disabled = false;
                if(sortBtn) sortBtn.disabled = false; if(aiSuggestBtn) aiSuggestBtn.disabled = false;
                if(ai托管Btn) ai托管Btn.disabled = false;
            }
            return Promise.reject(err.message || "提交捕获异常");
        }
    }

    function checkIfReadyToSubmit() {
        const totalArranged = arrangedPilesData.front.length + arrangedPilesData.middle.length + arrangedPilesData.back.length;
        if (totalArranged === 13 && currentHandCards.length === 0) {
            if(submitBtn && !isAi托管Active) {
                submitBtn.style.display = 'inline-block';
                submitBtn.disabled = false;
            }
        } else {
            if(submitBtn) submitBtn.style.display = 'none';
        }
    }

    function handleDragStart(e, cardElement, sourceArea, sourcePileName = null) {
        draggedCardInfo = {
            value: cardElement.dataset.value,
            element: cardElement,
            sourceArea: sourceArea,
            sourcePileName: sourcePileName
        };
        try {
            e.dataTransfer.setData('text/plain', draggedCardInfo.value);
            e.dataTransfer.effectAllowed = 'move';
        } catch (ex) {
            console.warn("Error setting dataTransfer:", ex); // IE might have issues
        }
        setTimeout(() => cardElement.classList.add('dragging'), 0);
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
        const dropzone = e.target.closest('.hand-pile-dropzone');
        if (dropzone) dropzone.classList.add('drag-over');
    }
    function handleDragLeave(e) {
        const dropzone = e.target.closest('.hand-pile-dropzone');
        if (dropzone && !dropzone.contains(e.relatedTarget)) {
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
        if(!targetPileWrapper) { console.error("Target pile wrapper missing:", targetPileName); return; }
        const maxCards = parseInt(dropzone.dataset.maxCards);

        if (arrangedPilesData[targetPileName].length < maxCards) {
            if (draggedCardInfo.sourceArea === 'bottomHand') {
                removeCardFromHandData(draggedCardInfo.value);
                renderPlayerHand();
            } else if (draggedCardInfo.sourceArea === 'pile' && draggedCardInfo.sourcePileName !== targetPileName) { // Allow moving between piles
                removeCardFromPileData(draggedCardInfo.value, draggedCardInfo.sourcePileName);
                // No need to re-render source pile wrapper, element is moved directly
            } else if (draggedCardInfo.sourceArea === 'pile' && draggedCardInfo.sourcePileName === targetPileName) {
                // Dropped onto the same pile it came from - do nothing or just re-append
                targetPileWrapper.appendChild(draggedCardInfo.element); // Ensure it's visually there
                return;
            }


            addCardToPileData(draggedCardInfo.value, targetPileName, draggedCardInfo.element);
            targetPileWrapper.appendChild(draggedCardInfo.element);

            updatePileLabels();
            checkIfReadyToSubmit();
        } else {
            showGameMessage(`${targetPileName.charAt(0).toUpperCase() + targetPileName.slice(1)}墩已满!`, "error");
            // Revert card to its original place if drop failed
            if (draggedCardInfo.sourceArea === 'bottomHand' && playerHandArea && !playerHandArea.contains(draggedCardInfo.element)) {
                playerHandArea.appendChild(draggedCardInfo.element); // Put it back
            } else if (draggedCardInfo.sourceArea === 'pile' && draggedCardInfo.sourcePileName) {
                const sourcePileWrapper = pileWrappers[draggedCardInfo.sourcePileName];
                if (sourcePileWrapper && !sourcePileWrapper.contains(draggedCardInfo.element)) {
                    sourcePileWrapper.appendChild(draggedCardInfo.element); // Put it back
                }
            }
        }
    }

    function handleDropOnPlayerHandArea(e) {
        e.preventDefault();
        if (!draggedCardInfo || draggedCardInfo.sourceArea === 'bottomHand') {
             if (draggedCardInfo && draggedCardInfo.sourceArea === 'bottomHand' && playerHandArea) {
                 playerHandArea.appendChild(draggedCardInfo.element);
             }
            return;
        }
        if (draggedCardInfo.sourceArea === 'pile' && draggedCardInfo.sourcePileName) {
            removeCardFromPileData(draggedCardInfo.value, draggedCardInfo.sourcePileName);
            addCardToHandData(draggedCardInfo.value); // Creates new element for hand
            renderPlayerHand();

            updatePileLabels();
            checkIfReadyToSubmit();
        }
    }

    function toggleAi托管Modal() {
        if (isAi托管Active) {
            stopAi托管();
            showGameMessage("AI托管已取消", "info");
        } else {
            if(ai托管OptionsModal) ai托管OptionsModal.style.display = 'flex';
        }
    }
    function selectAi托管Rounds(rounds) {
        if(ai托管OptionsModal) ai托管OptionsModal.style.display = 'none';
        if (rounds > 0) startAi托管(rounds);
    }
    function startAi托管(rounds) {
        isAi托管Active = true;
        ai托管RoundsTotal = rounds;
        ai托管RoundsLeft = rounds;
        updateAi托管UIState();

        if(dealBtn) dealBtn.disabled = true;
        toggleActionButtons(false);
        if(submitBtn) submitBtn.style.display = 'none';

        showGameMessage(`AI托管启动，共 ${rounds} 局。`, "success");
        if (currentHandCards.length === 0 && arrangedPilesData.front.length === 0) {
            handleDealNewHand(true);
        } else {
             ai托管ProcessRound();
        }
    }
    function stopAi托管() {
        isAi托管Active = false;
        ai托管RoundsLeft = 0;
        updateAi托管UIState();
        if(dealBtn) dealBtn.disabled = false;
        toggleActionButtons(originalDealtHand.length > 0);
        checkIfReadyToSubmit();
    }
    function updateAi托管UIState() {
        if(ai托管Info) {
            ai托管Info.textContent = isAi托管Active ? `托管中: ${ai托管RoundsLeft}/${ai托管RoundsTotal}` : '';
            ai托管Info.style.display = isAi托管Active ? 'inline' : 'none';
        }
        if(ai托管Btn) {
            ai托管Btn.textContent = isAi托管Active ? `取消托管 (${ai托管RoundsLeft})` : 'AI托管';
            ai托管Btn.style.display = (originalDealtHand.length > 0 || isAi托管Active) ? 'inline-block' : 'none';
        }
    }
    async function ai托管ProcessRound() {
        if (!isAi托管Active || ai托管RoundsLeft <= 0) {
            if(isAi托管Active) stopAi托管(); return;
        }
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
});
