document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const dealButton = document.getElementById('deal-button');
    const submitButton = document.getElementById('submit-button');
    const resetButton = document.getElementById('reset-button');
    const sortButton = document.getElementById('sort-button');
    const aiSuggestButton = document.getElementById('ai-suggest-button');
    // const ai托管Button = document.getElementById('ai-托管-button');

    const myHandArea = document.getElementById('my-hand-area');
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

    const myPlayerNameElement = document.getElementById('my-player-name');
    const myPlayerScoreElement = document.getElementById('my-player-score');
    const myPlayerStatusElement = document.getElementById('my-player-status');

    // API URL - !!! 请务必替换为你实际的、可公网访问的后端API地址 !!!
    const API_URL = 'https://9526.ip-ddns.com/thirteen_api/api.php';
    console.log("Using API_URL:", API_URL); // 打印确认

    // Card visuals & values
    const suits = { 'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠' };
    const ranks = { 'A': 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', '8': '8', '9': '9', 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K' };
    const rankValues = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'T':10,'J':11,'Q':12,'K':13,'A':14};

    // Game State
    let originalHand = [];
    let currentMyHandCards = []; // 存储对象 {value: "S A", element: HTMLDivElement}
    let frontHandData = [];
    let middleHandData = [];
    let backHandData = [];
    let draggedCard = null;

    // --- Init ---
    setupEventListeners();
    resetGameUI();
    showGameMessage('点击“发牌/新局”开始。');
    myPlayerNameElement.textContent = "玩家_" + Math.random().toString(36).substring(2, 6);
    myPlayerStatusElement.textContent = "准备中";
    myPlayerStatusElement.className = 'player-status waiting';


    // --- Event Listeners Setup ---
    function setupEventListeners() {
        console.log("Setting up event listeners...");
        if(dealButton) dealButton.addEventListener('click', handleDealNewHand); else console.error("Deal button not found!");
        if(submitButton) submitButton.addEventListener('click', handleSubmitHand); else console.error("Submit button not found!");
        if(resetButton) resetButton.addEventListener('click', handleResetArrangement); else console.error("Reset button not found!");
        if(sortButton) sortButton.addEventListener('click', handleSortHand); else console.error("Sort button not found!");
        if(aiSuggestButton) aiSuggestButton.addEventListener('click', handleAiSuggest); else console.error("AI Suggest button not found!");


        pileDropzones.forEach(zone => {
            if(zone){
                zone.addEventListener('dragover', handleDragOver);
                zone.addEventListener('dragenter', handleDragEnter);
                zone.addEventListener('dragleave', handleDragLeave);
                zone.addEventListener('drop', handleDrop);
            } else {
                console.error("A pile dropzone element is missing!");
            }
        });

        if(myHandArea) {
            myHandArea.addEventListener('dragover', handleDragOver);
            myHandArea.addEventListener('drop', (e) => {
                e.preventDefault();
                if (draggedCard && draggedCard.sourcePile !== 'myHandArea') {
                    removeCardFromPile(draggedCard.value, draggedCard.sourcePile);
                    addCardToMyHand(draggedCard.value, true);
                    draggedCard = null;
                    updatePileCountsAndLabels();
                    checkIfReadyToSubmit();
                } else if (draggedCard) { // Reordering within hand
                    myHandArea.appendChild(draggedCard.element); // Element already exists
                    draggedCard = null; // Clear dragged card state
                }
            });
        } else {
            console.error("myHandArea element not found!");
        }
        console.log("Event listeners setup complete.");
    }

    // --- UI Update Functions ---
    function showGameMessage(message, type = 'info') {
        if (!gameMessageTextElement || !gameMessageOverlayElement) {
            console.error("Game message elements not found!");
            return;
        }
        gameMessageTextElement.textContent = message;
        gameMessageOverlayElement.classList.remove('error', 'success', 'visible');

        if (type === 'error') gameMessageOverlayElement.classList.add('error');
        else if (type === 'success') gameMessageOverlayElement.classList.add('success');

        gameMessageOverlayElement.classList.add('visible');
        setTimeout(() => {
            if(gameMessageOverlayElement) gameMessageOverlayElement.classList.remove('visible');
        }, message.length > 40 ? 5000 : 3500);
    }

    function resetGameUI() {
        console.log("Resetting game UI...");
        originalHand = [];
        currentMyHandCards = [];
        frontHandData = [];
        middleHandData = [];
        backHandData = [];

        if(myHandArea) myHandArea.innerHTML = '';
        if(frontHandPileWrapper) frontHandPileWrapper.innerHTML = '';
        if(middleHandPileWrapper) middleHandPileWrapper.innerHTML = '';
        if(backHandPileWrapper) backHandPileWrapper.innerHTML = '';

        if(dealButton) {
            dealButton.textContent = '发牌/新局';
            dealButton.disabled = false;
        }
        if(submitButton) submitButton.style.display = 'none';
        if(resetButton) resetButton.style.display = 'none';
        if(sortButton) sortButton.style.display = 'none';
        if(aiSuggestButton) aiSuggestButton.style.display = 'none';
        // if(document.getElementById('ai-托管-button')) document.getElementById('ai-托管-button').style.display = 'none';


        if(myPlayerStatusElement) {
            myPlayerStatusElement.textContent = "等待开始";
            myPlayerStatusElement.className = 'player-status waiting';
        }
        updatePileCountsAndLabels();
        // Clear previous analysis
        const oldAnalysis = document.getElementById('hand-analysis-display');
        if (oldAnalysis) oldAnalysis.remove();
        console.log("Game UI reset complete.");
    }

    function updatePileCountsAndLabels() {
        pileDropzones.forEach(zone => {
            if (!zone) return;
            const pileName = zone.id.split('-')[0];
            let currentPileData;
            let pileDisplayName;

            if (pileName === 'front') { currentPileData = frontHandData; pileDisplayName = "头"; }
            else if (pileName === 'middle') { currentPileData = middleHandData; pileDisplayName = "中"; }
            else { currentPileData = backHandData; pileDisplayName = "尾"; }

            const maxCards = parseInt(zone.dataset.maxCards);
            const labelElement = zone.querySelector('.pile-label');
            if(labelElement) labelElement.textContent = `${pileDisplayName}墩 (${currentPileData.length}/${maxCards})`;
        });
    }

    function displayHandAnalysis(analysis) {
        if (!analysis) return;
        // Clear previous analysis
        const oldAnalysisDisplay = document.getElementById('hand-analysis-display');
        if (oldAnalysisDisplay) oldAnalysisDisplay.remove();

        const displayArea = document.createElement('div');
        displayArea.id = 'hand-analysis-display'; // Give it an ID for easy removal
        displayArea.style.cssText = `
            margin-top: 15px;
            padding: 12px;
            border: 1px solid #445;
            background-color: rgba(0,0,0,0.2);
            color: #eee;
            border-radius: 6px;
            text-align: left;
        `;
        let analysisHTML = `<h4>牌型分析:</h4>`;
        const pilesOrder = ['front', 'middle', 'back'];
        const pilesDisplayNames = {'front': '头墩', 'middle': '中墩', 'back': '尾墩'};

        pilesOrder.forEach(pileKey => {
            if (analysis[pileKey]) {
                analysisHTML += `<p><strong>${pilesDisplayNames[pileKey]}:</strong> ${analysis[pileKey].name || '未知'} 
                                 <em>(${analysis[pileKey].cards.join(', ')})</em></p>`;
            }
        });
        displayArea.innerHTML = analysisHTML;

        const mainGameArea = document.getElementById('main-game-area');
        if (mainGameArea) {
             // Insert after player-arrangement-area or as the last child of main-game-area
            const arrangementArea = document.getElementById('player-arrangement-area');
            if(arrangementArea && arrangementArea.nextSibling) {
                mainGameArea.insertBefore(displayArea, arrangementArea.nextSibling);
            } else {
                mainGameArea.appendChild(displayArea);
            }
        } else {
            console.error("main-game-area not found for displaying analysis.");
        }
    }

    // --- Card Creation and Rendering ---
    function createCardElement(cardStr) {
        const [suitKeyFull, rankKey] = cardStr.split(' ');
        const suitKey = suitKeyFull.charAt(0).toUpperCase(); // Ensure single char like S, H, D, C

        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card');
        cardDiv.classList.add(getSuitClass(suitKey));
        cardDiv.dataset.value = `${suitKey} ${rankKey}`; // Store normalized value
        cardDiv.draggable = true;

        const rankSpan = document.createElement('span');
        rankSpan.classList.add('rank');
        rankSpan.textContent = ranks[rankKey] || rankKey;

        const suitSpan = document.createElement('span');
        suitSpan.classList.add('suit');
        suitSpan.textContent = suits[suitKey] || suitKey;

        cardDiv.appendChild(rankSpan);
        cardDiv.appendChild(suitSpan);

        cardDiv.addEventListener('dragstart', handleDragStart);
        cardDiv.addEventListener('dragend', handleDragEnd);
        return cardDiv;
    }
    function renderMyHandCards() {
        if(!myHandArea) return;
        myHandArea.innerHTML = '';
        currentMyHandCards.forEach(cardObj => {
            myHandArea.appendChild(cardObj.element);
        });
    }
    function addCardToMyHand(cardValue, doRender = true) {
        const cardElement = createCardElement(cardValue);
        currentMyHandCards.push({ value: cardValue, element: cardElement }); // Store original value if backend sends it
        if (doRender) renderMyHandCards();
    }
    function removeCardFromMyHand(cardValue) {
        currentMyHandCards = currentMyHandCards.filter(c => c.value !== cardValue);
    }


    // --- Game Action Handlers ---
    async function handleDealNewHand() {
        console.log("handleDealNewHand called");
        showGameMessage('正在发牌...', 'info');
        resetGameUI(); // This now also clears old analysis
        if(dealButton) dealButton.disabled = true;
        if(myPlayerStatusElement) {
            myPlayerStatusElement.textContent = "发牌中";
            myPlayerStatusElement.className = 'player-status';
        }

        try {
            const response = await fetch(`${API_URL}?action=deal`);
            console.log("Deal fetch response status:", response.status);
            if (!response.ok) throw new Error(`发牌服务请求失败: ${response.status}`);
            const data = await response.json();
            console.log("Deal data received:", data);

            if (data.success && data.hand) {
                originalHand = [...data.hand];
                originalHand.forEach(cardStr => addCardToMyHand(cardStr, false));
                renderMyHandCards();

                showGameMessage('请拖拽手牌理牌。', 'info');
                if(myPlayerStatusElement) {
                    myPlayerStatusElement.textContent = "理牌中";
                    myPlayerStatusElement.className = 'player-status';
                }
                if(dealButton) dealButton.textContent = '新局';
                if(resetButton) resetButton.style.display = 'inline-block';
                if(sortButton) sortButton.style.display = 'inline-block';
                if(aiSuggestButton) aiSuggestButton.style.display = 'inline-block';

            } else {
                throw new Error(data.message || '后端发牌逻辑错误');
            }
        } catch (error) {
            console.error('发牌请求操作失败:', error);
            showGameMessage(`发牌失败: ${error.message}`, 'error');
            if(myPlayerStatusElement) {
                myPlayerStatusElement.textContent = "发牌失败";
                myPlayerStatusElement.className = 'player-status error';
            }
        } finally {
            if(dealButton) dealButton.disabled = false;
        }
    }

    function handleSortHand() {
        currentMyHandCards.sort((a, b) => {
            const rankA = rankValues[a.value.split(' ')[1]];
            const rankB = rankValues[b.value.split(' ')[1]];
            if (rankA !== rankB) return rankB - rankA;
            const suitA = a.value.split(' ')[0];
            const suitB = b.value.split(' ')[0];
            return suitA.localeCompare(suitB);
        });
        renderMyHandCards();
        showGameMessage('手牌已整理。', 'info');
    }

    function handleResetArrangement() {
        [...frontHandData, ...middleHandData, ...backHandData].forEach(cardObj => {
            addCardToMyHand(cardObj.value, false);
        });
        renderMyHandCards();

        frontHandData = [];
        middleHandData = [];
        backHandData = [];

        if(frontHandPileWrapper) frontHandPileWrapper.innerHTML = '';
        if(middleHandPileWrapper) middleHandPileWrapper.innerHTML = '';
        if(backHandPileWrapper) backHandPileWrapper.innerHTML = '';

        showGameMessage('牌墩已清空，请重新理牌。', 'info');
        if(submitButton) submitButton.style.display = 'none';
        updatePileCountsAndLabels();
        const oldAnalysis = document.getElementById('hand-analysis-display');
        if (oldAnalysis) oldAnalysis.remove();
    }

    async function handleAiSuggest() {
        let handToSuggest = [];
        if (currentMyHandCards.length > 0 || frontHandData.length > 0 || middleHandData.length > 0 || backHandData.length > 0) {
            handToSuggest = currentMyHandCards.map(c => c.value)
                             .concat(frontHandData.map(c => c.value))
                             .concat(middleHandData.map(c => c.value))
                             .concat(backHandData.map(c => c.value));
            handToSuggest = [...new Set(handToSuggest)]; // Ensure unique cards

            if (handToSuggest.length !== 13 && originalHand.length === 13) {
                console.warn("AI Suggest: Reconstructed hand not 13 cards, using original hand.");
                handToSuggest = [...originalHand];
            } else if (handToSuggest.length !== 13) {
                 showGameMessage('AI建议需要完整的13张手牌。', 'error');
                 return;
            }
        } else if (originalHand.length === 13) {
            handToSuggest = [...originalHand];
        } else {
            showGameMessage('请先发牌后再使用AI建议。', 'error');
            return;
        }

        showGameMessage('AI正在思考建议...', 'info');
        if(aiSuggestButton) aiSuggestButton.disabled = true;

        try {
            const response = await fetch(`${API_URL}?action=aiSuggest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hand: handToSuggest }),
            });
            const result = await response.json();

            if (result.success && result.suggestion) {
                showGameMessage('AI建议已生成 (仅供参考！)', 'info');
                handleResetArrangement(); // Clear current arrangement, moves all to hand

                // Place suggested cards
                placeSuggestedCards(result.suggestion.front, frontHandPileWrapper, frontHandData);
                placeSuggestedCards(result.suggestion.middle, middleHandPileWrapper, middleHandData);
                placeSuggestedCards(result.suggestion.back, backHandPileWrapper, backHandData);

                updatePileCountsAndLabels();
                checkIfReadyToSubmit();
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
        if (!targetPileWrapper) { console.error("Target pile wrapper not found for placing cards"); return; }
        suggestedCardsArray.forEach(cardValueToPlace => {
            const cardIndexInHand = currentMyHandCards.findIndex(cardObj => cardObj.value === cardValueToPlace);
            if (cardIndexInHand > -1) {
                const cardObj = currentMyHandCards.splice(cardIndexInHand, 1)[0];
                targetPileDataArray.push(cardObj);
                targetPileWrapper.appendChild(cardObj.element);
            } else {
                console.warn(`AI Suggest: Card ${cardValueToPlace} not found in current hand.`);
            }
        });
        renderMyHandCards(); // Update hand area if any cards are left (should be 0)
    }

    async function handleSubmitHand() {
        const frontValues = frontHandData.map(c => c.value);
        const middleValues = middleHandData.map(c => c.value);
        const backValues = backHandData.map(c => c.value);

        if (frontValues.length !== 3 || middleValues.length !== 5 || backValues.length !== 5) {
            showGameMessage('牌墩张数不正确！头3中5尾5。', 'error');
            return;
        }

        const payload = { front: frontValues, middle: middleValues, back: backValues };
        showGameMessage('正在提交牌型...', 'info');

        if(submitButton) submitButton.disabled = true;
        if(resetButton) resetButton.disabled = true;
        if(sortButton) sortButton.disabled = true;
        if(aiSuggestButton) aiSuggestButton.disabled = true;
        if(myPlayerStatusElement) {
            myPlayerStatusElement.textContent = "比牌中...";
            myPlayerStatusElement.className = 'player-status';
        }
        const oldAnalysis = document.getElementById('hand-analysis-display');
        if (oldAnalysis) oldAnalysis.remove();

        try {
            const response = await fetch(`${API_URL}?action=submitHand`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await response.json();

            if (!response.ok) throw new Error(result.message || `提交失败: HTTP ${response.status}`);

            if (result.success) {
                showGameMessage(`比牌完成！得分: ${result.score || 0}. ${result.message || ''}`, 'success');
                if (result.analysis) displayHandAnalysis(result.analysis);
                if(myPlayerStatusElement) {
                    myPlayerStatusElement.textContent = "本局结束";
                    myPlayerStatusElement.className = 'player-status waiting';
                }
                if(myPlayerScoreElement && result.score !== undefined) { // Update score if available
                    // This assumes score is total for the round, not cumulative. Adjust as needed.
                    // let currentScore = parseInt(myPlayerScoreElement.textContent.split(': ')[1] || "0");
                    // myPlayerScoreElement.textContent = `积分: ${currentScore + result.score}`;
                     myPlayerScoreElement.textContent = `本局得分: ${result.score}`; // Or just show round score
                }
                if(submitButton) submitButton.style.display = 'none'; // Hide until new game
            } else {
                showGameMessage(`提交被拒：${result.message}`, 'error');
                if (result.analysis) displayHandAnalysis(result.analysis);
                if(myPlayerStatusElement) {
                    myPlayerStatusElement.textContent = "理牌错误";
                    myPlayerStatusElement.className = 'player-status error';
                }
                // Re-enable buttons for correction
                if(submitButton) submitButton.disabled = false;
                if(resetButton) resetButton.disabled = false;
                if(sortButton) sortButton.disabled = false;
                if(aiSuggestButton) aiSuggestButton.disabled = false;
            }
        } catch (error) {
            console.error('提交牌型操作失败:', error);
            showGameMessage(`提交出错：${error.message}`, 'error');
            if(myPlayerStatusElement) {
                myPlayerStatusElement.textContent = "提交异常";
                myPlayerStatusElement.className = 'player-status error';
            }
            if(submitButton) submitButton.disabled = false;
            if(resetButton) resetButton.disabled = false;
            if(sortButton) sortButton.disabled = false;
            if(aiSuggestButton) aiSuggestButton.disabled = false;
        }
    }

    function checkIfReadyToSubmit() {
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
    function handleDragStart(e) {
        draggedCard = {
            value: e.target.dataset.value,
            element: e.target,
            sourcePile: null
        };
        if (e.target.parentElement === myHandArea) {
            draggedCard.sourcePile = 'myHandArea';
        } else {
            pileDropzones.forEach(zone => {
                if (zone && zone.querySelector('.cards-wrapper').contains(e.target)) {
                    draggedCard.sourcePile = zone.dataset.pileName;
                }
            });
        }
        e.dataTransfer.setData('text/plain', draggedCard.value);
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
        setTimeout(() => { if(e.target) e.target.style.opacity = '0.6'; }, 0);
    }

    function handleDragEnd(e) {
        if (e.target) {
            e.target.classList.remove('dragging');
            e.target.style.opacity = '1';
        }
        draggedCard = null;
        pileDropzones.forEach(zone => { if(zone) zone.classList.remove('drag-over'); });
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    function handleDragEnter(e) {
        e.preventDefault();
        const dropzone = e.target.closest('.hand-pile-dropzone');
        if (dropzone) dropzone.classList.add('drag-over');
    }

    function handleDragLeave(e) {
        const dropzone = e.target.closest('.hand-pile-dropzone');
        if (dropzone) {
            if (!dropzone.contains(e.relatedTarget)) {
                dropzone.classList.remove('drag-over');
            }
        }
    }

    function handleDrop(e) {
        e.preventDefault();
        const dropzoneElement = e.target.closest('.hand-pile-dropzone');
        if (!dropzoneElement || !draggedCard) return;

        dropzoneElement.classList.remove('drag-over');
        const targetPileName = dropzoneElement.dataset.pileName;
        const targetPileWrapper = dropzoneElement.querySelector('.cards-wrapper');
        const maxCards = parseInt(dropzoneElement.dataset.maxCards);

        let targetPileData;
        if (targetPileName === 'front') targetPileData = frontHandData;
        else if (targetPileName === 'middle') targetPileData = middleHandData;
        else targetPileData = backHandData;

        if (targetPileData.length < maxCards) {
            if (draggedCard.sourcePile === 'myHandArea') {
                removeCardFromMyHand(draggedCard.value);
            } else if (draggedCard.sourcePile) {
                removeCardFromPile(draggedCard.value, draggedCard.sourcePile);
            }
            targetPileData.push({value: draggedCard.value, element: draggedCard.element});
            if(targetPileWrapper) targetPileWrapper.appendChild(draggedCard.element);

            updatePileCountsAndLabels();
            checkIfReadyToSubmit();
        } else {
            showGameMessage(`${targetPileName.charAt(0).toUpperCase() + targetPileName.slice(1)}墩已满!`, 'error');
        }
        draggedCard = null;
    }

    function removeCardFromPile(cardValue, pileName) {
        if (pileName === 'front') frontHandData = frontHandData.filter(c => c.value !== cardValue);
        else if (pileName === 'middle') middleHandData = middleHandData.filter(c => c.value !== cardValue);
        else if (pileName === 'back') backHandData = backHandData.filter(c => c.value !== cardValue);
    }

    // --- Utility ---
    function getSuitClass(suitKey) {
        const suitLower = suitKey.charAt(0).toLowerCase(); // Ensure single char and lower case
        if (suitLower === 'h') return 'hearts';
        if (suitLower === 'd') return 'diamonds';
        if (suitLower === 's') return 'spades';
        if (suitLower === 'c') return 'clubs';
        return '';
    }
});
